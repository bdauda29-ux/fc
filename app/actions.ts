"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabaseErrorMessage } from "@/lib/database";
import { getModelPath, getModelPlayerPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

const modelSchema = z.object({
  name: z.string().trim().min(2, "Model name must be at least 2 characters.").max(50),
});

const playerSchema = z.object({
  modelId: z.string().min(1, "Select a league model."),
  name: z.string().trim().min(2, "Player name must be at least 2 characters.").max(50),
});

function getSafeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

const renameModelSchema = z.object({
  modelId: z.string().min(1, "Select a league model."),
  name: z.string().trim().min(2, "Model name must be at least 2 characters.").max(50),
});

const deleteModelSchema = z.object({
  modelId: z.string().min(1, "Select a league model."),
});

const matchIdentitySchema = z.object({
  modelId: z.string().min(1, "Select a league model."),
  matchId: z.string().min(1, "Select a valid match."),
});

const adminAuthSchema = z.object({
  adminUsername: z.string().min(1, "Username is required."),
});

const bulkMatchesSchema = z.object({
  modelId: z.string().min(1, "Select a league model."),
  matchesText: z
    .string()
    .trim()
    .min(1, "Paste matches to import.")
    .max(25000, "Bulk input is too large."),
});

const matchSchema = z
  .object({
    modelId: z.string().min(1, "Select a league model."),
    playerAId: z.string().min(1, "Select the first player."),
    playerBId: z.string().min(1, "Select the second player."),
    playerAScore: z.coerce
      .number()
      .int("Scores must be whole numbers.")
      .min(0, "Scores must be non-negative."),
    playerBScore: z.coerce
      .number()
      .int("Scores must be whole numbers.")
      .min(0, "Scores must be non-negative."),
    matchDate: z.string().min(1, "Choose a match date."),
  })
  .refine((value) => value.playerAId !== value.playerBId, {
    message: "A player cannot play against himself.",
    path: ["playerBId"],
  });

function redirectWithMessage(path: string, key: "success" | "error", message: string): never {
  const searchParams = new URLSearchParams({ [key]: message });
  redirect(`${path}?${searchParams.toString()}`);
}

function requireAdminOrRedirect(
  formData: FormData,
  redirectPath: string,
  missingMessage = "Username is required to edit or delete matches.",
  invalidMessage = "Invalid admin username.",
) {
  const validated = adminAuthSchema.safeParse({
    adminUsername: formData.get("adminUsername"),
  });

  if (!validated.success) {
    redirectWithMessage(redirectPath, "error", missingMessage);
  }

  if (validated.data.adminUsername !== "admin") {
    redirectWithMessage(redirectPath, "error", invalidMessage);
  }
}

async function findValidatedMatchPlayers(
  modelId: string,
  playerAId: string,
  playerBId: string,
  errorPath: string,
  allowedInactivePlayerIds: string[] = [],
) {
  let playerA: Awaited<ReturnType<typeof prisma.player.findUnique>>;
  let playerB: Awaited<ReturnType<typeof prisma.player.findUnique>>;

  try {
    [playerA, playerB] = await Promise.all([
      prisma.player.findFirst({ where: { id: playerAId, modelId } }),
      prisma.player.findFirst({ where: { id: playerBId, modelId } }),
    ]);
  } catch (error) {
    redirectWithMessage(errorPath, "error", getDatabaseErrorMessage(error));
  }

  if (!playerA || !playerB) {
    redirectWithMessage(errorPath, "error", "Match must have two valid players.");
  }

  const allowedInactiveIds = new Set(allowedInactivePlayerIds);

  if (
    (!playerA.isActive && !allowedInactiveIds.has(playerA.id)) ||
    (!playerB.isActive && !allowedInactiveIds.has(playerB.id))
  ) {
    redirectWithMessage(errorPath, "error", "Only active players can be selected for a match.");
  }

  return { playerA, playerB };
}

async function getScopedMatchOrRedirect(matchId: string, modelId: string, errorPath: string) {
  let match: {
    id: string;
    modelId: string;
    playerAId: string;
    playerBId: string;
  } | null = null;

  try {
    match = await prisma.match.findFirst({
      where: { id: matchId, modelId },
      select: {
        id: true,
        modelId: true,
        playerAId: true,
        playerBId: true,
      },
    });
  } catch (error) {
    redirectWithMessage(errorPath, "error", getDatabaseErrorMessage(error));
  }

  if (!match) {
    redirectWithMessage(errorPath, "error", "Match not found in this model.");
  }

  return match;
}

function refreshLeagueViews(modelId: string, playerId?: string) {
  revalidatePath("/models");
  revalidatePath(`/models/${modelId}`);
  revalidatePath(getModelPath(modelId));
  revalidatePath(getModelPath(modelId, "players"));
  revalidatePath(getModelPath(modelId, "matches"));
  revalidatePath(getModelPath(modelId, "history"));
  revalidatePath(getModelPath(modelId, "table"));
  revalidatePath(getModelPath(modelId, "head-to-head"));

  if (playerId) {
    revalidatePath(getModelPlayerPath(modelId, playerId));
  }
}

export async function createModel(formData: FormData) {
  const validated = modelSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    redirectWithMessage("/models", "error", validated.error.issues[0]?.message ?? "Invalid model.");
  }

  let model: Awaited<ReturnType<typeof prisma.model.create>>;

  try {
    model = await prisma.model.create({
      data: {
        name: validated.data.name,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithMessage("/models", "error", "A league model with that name already exists.");
    }

    redirectWithMessage("/models", "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(model.id);
  redirectWithMessage(getModelPath(model.id), "success", "League model created successfully.");
}

export async function renameModel(formData: FormData) {
  requireAdminOrRedirect(
    formData,
    "/models",
    "Username is required to edit a model.",
    "Invalid admin username for model edit.",
  );
  const validated = renameModelSchema.safeParse({
    modelId: formData.get("modelId"),
    name: formData.get("name"),
  });

  if (!validated.success) {
    redirectWithMessage("/models", "error", validated.error.issues[0]?.message ?? "Invalid model.");
  }

  try {
    await prisma.model.update({
      where: { id: validated.data.modelId },
      data: { name: validated.data.name },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectWithMessage("/models", "error", "A league model with that name already exists.");
    }

    redirectWithMessage("/models", "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(validated.data.modelId);
  redirectWithMessage("/models", "success", "League model renamed successfully.");
}

export async function deleteModel(formData: FormData) {
  requireAdminOrRedirect(
    formData,
    "/models",
    "Username is required to delete a model.",
    "Invalid admin username for model deletion.",
  );
  const validated = deleteModelSchema.safeParse({
    modelId: formData.get("modelId"),
  });

  if (!validated.success) {
    redirectWithMessage("/models", "error", "Invalid model selection.");
  }

  try {
    await prisma.model.delete({
      where: { id: validated.data.modelId },
    });
  } catch (error) {
    redirectWithMessage("/models", "error", getDatabaseErrorMessage(error));
  }

  revalidatePath("/models");
  redirectWithMessage("/models", "success", "League model deleted successfully.");
}

export async function createPlayer(formData: FormData) {
  const modelId = typeof formData.get("modelId") === "string" ? (formData.get("modelId") as string) : "";
  const redirectTo = getSafeRedirectPath(
    formData.get("redirectTo"),
    modelId ? getModelPath(modelId, "players") : "/models",
  );
  const validated = playerSchema.safeParse({
    modelId: formData.get("modelId"),
    name: formData.get("name"),
  });

  if (!validated.success) {
    redirectWithMessage(redirectTo, "error", validated.error.issues[0]?.message ?? "Invalid player.");
  }

  try {
    const model = await prisma.model.findUnique({
      where: { id: validated.data.modelId },
      select: { id: true },
    });

    if (!model) {
      redirectWithMessage("/models", "error", "Select a valid league model first.");
    }

    await prisma.player.create({
      data: {
        modelId: validated.data.modelId,
        name: validated.data.name,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithMessage(redirectTo, "error", "A player with that name already exists in this model.");
    }

    redirectWithMessage(redirectTo, "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(validated.data.modelId);
  redirectWithMessage(redirectTo, "success", "Player added successfully.");
}

export async function togglePlayerStatus(playerId: string, modelId: string, nextActive: boolean) {
  let updatedCount = 0;

  try {
    const result = await prisma.player.updateMany({
      where: { id: playerId, modelId },
      data: { isActive: nextActive },
    });

    updatedCount = result.count;
  } catch (error) {
    redirectWithMessage(getModelPath(modelId, "players"), "error", getDatabaseErrorMessage(error));
  }

  if (updatedCount === 0) {
    redirectWithMessage(getModelPath(modelId, "players"), "error", "Player not found in this model.");
  }

  refreshLeagueViews(modelId, playerId);
}

export async function createMatch(formData: FormData) {
  const modelId = typeof formData.get("modelId") === "string" ? (formData.get("modelId") as string) : "";
  const matchesPath = getModelPath(modelId, "matches");
  const validated = matchSchema.safeParse({
    modelId: formData.get("modelId"),
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId"),
    playerAScore: formData.get("playerAScore"),
    playerBScore: formData.get("playerBScore"),
    matchDate: formData.get("matchDate"),
  });

  if (!validated.success) {
    redirectWithMessage(matchesPath, "error", validated.error.issues[0]?.message ?? "Invalid match.");
  }

  const { playerA, playerB } = await findValidatedMatchPlayers(
    validated.data.modelId,
    validated.data.playerAId,
    validated.data.playerBId,
    matchesPath,
  );

  const matchDate = new Date(validated.data.matchDate);

  if (Number.isNaN(matchDate.getTime())) {
    redirectWithMessage(matchesPath, "error", "Match date is invalid.");
  }

  let match: Awaited<ReturnType<typeof prisma.match.create>>;

  try {
    match = await prisma.match.create({
      data: {
        modelId: validated.data.modelId,
        playerAId: playerA.id,
        playerBId: playerB.id,
        playerAScore: validated.data.playerAScore,
        playerBScore: validated.data.playerBScore,
        matchDate,
      },
    });
  } catch (error) {
    redirectWithMessage(matchesPath, "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(validated.data.modelId, playerA.id);
  refreshLeagueViews(validated.data.modelId, playerB.id);

  const searchParams = new URLSearchParams({
    success: "Match recorded successfully.",
    latest: match.id,
  });

  redirect(`${matchesPath}?${searchParams.toString()}`);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const BULK_SCORE_SEPARATOR = "[-–—−]";

function parseBulkScore(rawValue: string) {
  const cleaned = rawValue.trim().replace(/\s+/g, "");
  const match = cleaned.match(new RegExp(`^(\\d+)(?:${BULK_SCORE_SEPARATOR}|:)(\\d+)$`));

  if (!match) {
    return null;
  }

  const a = Number(match[1]);
  const b = Number(match[2]);

  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return null;
  }

  return { playerAScore: a, playerBScore: b };
}

function parseBulkDate(rawValue: string) {
  const trimmed = rawValue.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const slashMatch = trimmed.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);
  if (!slashMatch) {
    return null;
  }

  let year = 0;
  let month = 0;
  let day = 0;

  if (slashMatch[1].length === 4) {
    year = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    day = Number(slashMatch[3]);
  } else {
    day = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    year = Number(slashMatch[3]);

    if (slashMatch[3].length === 2) {
      year += 2000;
    }
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function splitBulkDatePrefix(line: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})\s*(?:[,|]\s*|\s+)(.+)$/);

  if (!match) {
    return { date: null as Date | null, remainder: trimmed };
  }

  const date = parseBulkDate(match[1]);
  if (!date) {
    return { date: null as Date | null, remainder: trimmed };
  }

  return { date, remainder: match[2].trim() };
}

function parseInlineMatchLine(line: string) {
  const cleaned = line.trim().replace(/\s+/g, " ");
  const dashMatch = cleaned.match(new RegExp(`^(.+?)\\s+(\\d+)\\s*${BULK_SCORE_SEPARATOR}\\s*(\\d+)\\s+(.+)$`));
  if (dashMatch) {
    return {
      playerAName: dashMatch[1].trim(),
      playerAScore: Number(dashMatch[2]),
      playerBScore: Number(dashMatch[3]),
      playerBName: dashMatch[4].trim(),
    };
  }

  const crossMatch = cleaned.match(new RegExp(`^(.+?)\\s+(\\d+)\\s*${BULK_SCORE_SEPARATOR}\\s*(.+?)\\s+(\\d+)$`));
  if (crossMatch) {
    return {
      playerAName: crossMatch[1].trim(),
      playerAScore: Number(crossMatch[2]),
      playerBScore: Number(crossMatch[4]),
      playerBName: crossMatch[3].trim(),
    };
  }

  const vsTrailingScoreMatch = cleaned.match(
    new RegExp(`^(.+?)\\s+vs\\s+(.+?)\\s+(\\d+)\\s*(?:${BULK_SCORE_SEPARATOR}|:)\\s*(\\d+)$`, "i"),
  );
  if (vsTrailingScoreMatch) {
    return {
      playerAName: vsTrailingScoreMatch[1].trim(),
      playerAScore: Number(vsTrailingScoreMatch[3]),
      playerBScore: Number(vsTrailingScoreMatch[4]),
      playerBName: vsTrailingScoreMatch[2].trim(),
    };
  }

  const vsMiddleScoreMatch = cleaned.match(
    new RegExp(`^(.+?)\\s+(\\d+)\\s*(?:${BULK_SCORE_SEPARATOR}|:)\\s*(\\d+)\\s+vs\\s+(.+)$`, "i"),
  );
  if (vsMiddleScoreMatch) {
    return {
      playerAName: vsMiddleScoreMatch[1].trim(),
      playerAScore: Number(vsMiddleScoreMatch[2]),
      playerBScore: Number(vsMiddleScoreMatch[3]),
      playerBName: vsMiddleScoreMatch[4].trim(),
    };
  }

  const vsSeparatorScoreMatch = cleaned.match(/^(.+?)\s+(\d+)\s+vs\s+(\d+)\s+(.+)$/i);
  if (vsSeparatorScoreMatch) {
    return {
      playerAName: vsSeparatorScoreMatch[1].trim(),
      playerAScore: Number(vsSeparatorScoreMatch[2]),
      playerBScore: Number(vsSeparatorScoreMatch[3]),
      playerBName: vsSeparatorScoreMatch[4].trim(),
    };
  }

  return null;
}

export async function createMatchesBulk(formData: FormData) {
  const modelId = typeof formData.get("modelId") === "string" ? (formData.get("modelId") as string) : "";
  const matchesPath = getModelPath(modelId, "matches");
  const validated = bulkMatchesSchema.safeParse({
    modelId: formData.get("modelId"),
    matchesText: formData.get("matchesText"),
  });

  if (!validated.success) {
    redirectWithMessage(matchesPath, "error", validated.error.issues[0]?.message ?? "Invalid bulk input.");
  }

  let players: Array<{ id: string; name: string; isActive: boolean }> = [];

  try {
    players = await prisma.player.findMany({
      where: { modelId: validated.data.modelId },
      select: { id: true, name: true, isActive: true },
    });
  } catch (error) {
    redirectWithMessage(matchesPath, "error", getDatabaseErrorMessage(error));
  }

  if (players.length === 0) {
    redirectWithMessage(matchesPath, "error", "Create players in this model before importing matches.");
  }

  const playerByName = new Map<string, { id: string; isActive: boolean; name: string }>();
  for (const player of players) {
    playerByName.set(normalizeName(player.name), { id: player.id, isActive: player.isActive, name: player.name });
  }

  const rawLines = validated.data.matchesText.split(/\r?\n/).map((line) => line.trim());
  const lines = rawLines.filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) {
    redirectWithMessage(matchesPath, "error", "Paste at least one match line.");
  }

  if (lines.length > 500) {
    redirectWithMessage(matchesPath, "error", "Bulk import is limited to 500 matches at a time.");
  }

  const systemDate = new Date();
  systemDate.setHours(12, 0, 0, 0);

  const data: Array<{
    modelId: string;
    playerAId: string;
    playerBId: string;
    playerAScore: number;
    playerBScore: number;
    matchDate: Date;
  }> = [];
  const affectedPlayerIds = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    const { date: datePrefix, remainder } = splitBulkDatePrefix(rawLine);
    const matchDate = datePrefix ?? new Date(systemDate);

    let playerAName = "";
    let playerBName = "";
    let playerAScore = 0;
    let playerBScore = 0;

    const inline = parseInlineMatchLine(remainder);
    if (inline) {
      if (
        !Number.isInteger(inline.playerAScore) ||
        !Number.isInteger(inline.playerBScore) ||
        inline.playerAScore < 0 ||
        inline.playerBScore < 0
      ) {
        redirectWithMessage(matchesPath, "error", `Line ${lineNumber}: Scores must be non-negative integers.`);
      }

      playerAName = inline.playerAName;
      playerBName = inline.playerBName;
      playerAScore = inline.playerAScore;
      playerBScore = inline.playerBScore;
    } else {
      const tokens = remainder
        .split(/[|,]/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

      if (tokens.length !== 3) {
        redirectWithMessage(
          matchesPath,
          "error",
          `Line ${lineNumber}: Use "oc 2 - 3 Dr" or "oc 2 - Dr 3". Optionally prefix date: "YYYY-MM-DD oc 2 - 3 Dr".`,
        );
      }

      playerAName = tokens[0];
      playerBName = tokens[1];
      const score = parseBulkScore(tokens[2]);
      if (!score) {
        redirectWithMessage(matchesPath, "error", `Line ${lineNumber}: Score must look like 3-0 or 3:0.`);
      }
      playerAScore = score.playerAScore;
      playerBScore = score.playerBScore;
    }

    const playerA = playerByName.get(normalizeName(playerAName));
    const playerB = playerByName.get(normalizeName(playerBName));

    if (!playerA || !playerB) {
      redirectWithMessage(matchesPath, "error", `Line ${lineNumber}: Player name not found in this model.`);
    }

    if (playerA.id === playerB.id) {
      redirectWithMessage(matchesPath, "error", `Line ${lineNumber}: A player cannot play against himself.`);
    }

    if (!playerA.isActive || !playerB.isActive) {
      redirectWithMessage(matchesPath, "error", `Line ${lineNumber}: Both players must be active to import a match.`);
    }

    data.push({
      modelId: validated.data.modelId,
      playerAId: playerA.id,
      playerBId: playerB.id,
      playerAScore,
      playerBScore,
      matchDate,
    });
    affectedPlayerIds.add(playerA.id);
    affectedPlayerIds.add(playerB.id);
  }

  try {
    await prisma.match.createMany({ data });
  } catch (error) {
    redirectWithMessage(matchesPath, "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(validated.data.modelId);
  for (const playerId of affectedPlayerIds) {
    refreshLeagueViews(validated.data.modelId, playerId);
  }

  redirectWithMessage(matchesPath, "success", `Imported ${data.length} matches successfully.`);
}

export async function updateMatch(formData: FormData) {
  const modelId = typeof formData.get("modelId") === "string" ? (formData.get("modelId") as string) : "";
  const historyPath = getModelPath(modelId, "history");
  requireAdminOrRedirect(formData, historyPath);
  const identity = matchIdentitySchema.safeParse({
    modelId: formData.get("modelId"),
    matchId: formData.get("matchId"),
  });
  const validated = matchSchema.safeParse({
    modelId: formData.get("modelId"),
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId"),
    playerAScore: formData.get("playerAScore"),
    playerBScore: formData.get("playerBScore"),
    matchDate: formData.get("matchDate"),
  });

  if (!identity.success) {
    redirectWithMessage(historyPath, "error", "Invalid match selection.");
  }

  if (!validated.success) {
    redirectWithMessage(historyPath, "error", validated.error.issues[0]?.message ?? "Invalid match.");
  }

  const existingMatch = await getScopedMatchOrRedirect(identity.data.matchId, identity.data.modelId, historyPath);
  const { playerA, playerB } = await findValidatedMatchPlayers(
    validated.data.modelId,
    validated.data.playerAId,
    validated.data.playerBId,
    historyPath,
    [existingMatch.playerAId, existingMatch.playerBId],
  );
  const matchDate = new Date(validated.data.matchDate);

  if (Number.isNaN(matchDate.getTime())) {
    redirectWithMessage(historyPath, "error", "Match date is invalid.");
  }

  try {
    await prisma.match.update({
      where: { id: existingMatch.id },
      data: {
        playerAId: playerA.id,
        playerBId: playerB.id,
        playerAScore: validated.data.playerAScore,
        playerBScore: validated.data.playerBScore,
        matchDate,
      },
    });
  } catch (error) {
    redirectWithMessage(historyPath, "error", getDatabaseErrorMessage(error));
  }

  const affectedPlayers = new Set([
    existingMatch.playerAId,
    existingMatch.playerBId,
    playerA.id,
    playerB.id,
  ]);

  for (const playerId of affectedPlayers) {
    refreshLeagueViews(validated.data.modelId, playerId);
  }

  redirectWithMessage(historyPath, "success", "Match updated successfully.");
}

export async function deleteMatch(formData: FormData) {
  const modelId = typeof formData.get("modelId") === "string" ? (formData.get("modelId") as string) : "";
  const historyPath = getModelPath(modelId, "history");
  requireAdminOrRedirect(formData, historyPath);
  const validated = matchIdentitySchema.safeParse({
    modelId: formData.get("modelId"),
    matchId: formData.get("matchId"),
  });

  if (!validated.success) {
    redirectWithMessage(historyPath, "error", "Invalid match selection.");
  }

  const existingMatch = await getScopedMatchOrRedirect(validated.data.matchId, validated.data.modelId, historyPath);

  try {
    await prisma.match.delete({
      where: { id: existingMatch.id },
    });
  } catch (error) {
    redirectWithMessage(historyPath, "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(validated.data.modelId, existingMatch.playerAId);
  refreshLeagueViews(validated.data.modelId, existingMatch.playerBId);
  redirectWithMessage(historyPath, "success", "Match deleted successfully.");
}
