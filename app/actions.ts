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

  let playerA: Awaited<ReturnType<typeof prisma.player.findUnique>>;
  let playerB: Awaited<ReturnType<typeof prisma.player.findUnique>>;

  try {
    [playerA, playerB] = await Promise.all([
      prisma.player.findFirst({ where: { id: validated.data.playerAId, modelId: validated.data.modelId } }),
      prisma.player.findFirst({ where: { id: validated.data.playerBId, modelId: validated.data.modelId } }),
    ]);
  } catch (error) {
    redirectWithMessage(matchesPath, "error", getDatabaseErrorMessage(error));
  }

  if (!playerA || !playerB) {
    redirectWithMessage(matchesPath, "error", "Match must have two valid players.");
  }

  if (!playerA.isActive || !playerB.isActive) {
    redirectWithMessage(
      matchesPath,
      "error",
      "Only active players can be selected for a new match.",
    );
  }

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
