"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDatabaseErrorMessage } from "@/lib/database";
import { prisma } from "@/lib/prisma";

const playerSchema = z.object({
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

const matchSchema = z
  .object({
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

function refreshLeagueViews(playerId?: string) {
  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath("/matches");
  revalidatePath("/history");
  revalidatePath("/table");
  revalidatePath("/head-to-head");

  if (playerId) {
    revalidatePath(`/players/${playerId}`);
  }
}

export async function createPlayer(formData: FormData) {
  const redirectTo = getSafeRedirectPath(formData.get("redirectTo"), "/players");
  const validated = playerSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validated.success) {
    redirectWithMessage(redirectTo, "error", validated.error.issues[0]?.message ?? "Invalid player.");
  }

  try {
    await prisma.player.create({
      data: {
        name: validated.data.name,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithMessage(redirectTo, "error", "A player with that name already exists.");
    }

    redirectWithMessage(redirectTo, "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews();
  redirectWithMessage(redirectTo, "success", "Player added successfully.");
}

export async function togglePlayerStatus(playerId: string, nextActive: boolean) {
  try {
    await prisma.player.update({
      where: { id: playerId },
      data: { isActive: nextActive },
    });
  } catch (error) {
    redirectWithMessage("/players", "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(playerId);
}

export async function createMatch(formData: FormData) {
  const validated = matchSchema.safeParse({
    playerAId: formData.get("playerAId"),
    playerBId: formData.get("playerBId"),
    playerAScore: formData.get("playerAScore"),
    playerBScore: formData.get("playerBScore"),
    matchDate: formData.get("matchDate"),
  });

  if (!validated.success) {
    redirectWithMessage("/matches", "error", validated.error.issues[0]?.message ?? "Invalid match.");
  }

  let playerA: Awaited<ReturnType<typeof prisma.player.findUnique>>;
  let playerB: Awaited<ReturnType<typeof prisma.player.findUnique>>;

  try {
    [playerA, playerB] = await Promise.all([
      prisma.player.findUnique({ where: { id: validated.data.playerAId } }),
      prisma.player.findUnique({ where: { id: validated.data.playerBId } }),
    ]);
  } catch (error) {
    redirectWithMessage("/matches", "error", getDatabaseErrorMessage(error));
  }

  if (!playerA || !playerB) {
    redirectWithMessage("/matches", "error", "Match must have two valid players.");
  }

  if (!playerA.isActive || !playerB.isActive) {
    redirectWithMessage("/matches", "error", "Only active players can be selected for a new match.");
  }

  const matchDate = new Date(validated.data.matchDate);

  if (Number.isNaN(matchDate.getTime())) {
    redirectWithMessage("/matches", "error", "Match date is invalid.");
  }

  let match: Awaited<ReturnType<typeof prisma.match.create>>;

  try {
    match = await prisma.match.create({
      data: {
        playerAId: playerA.id,
        playerBId: playerB.id,
        playerAScore: validated.data.playerAScore,
        playerBScore: validated.data.playerBScore,
        matchDate,
      },
    });
  } catch (error) {
    redirectWithMessage("/matches", "error", getDatabaseErrorMessage(error));
  }

  refreshLeagueViews(playerA.id);
  refreshLeagueViews(playerB.id);

  const searchParams = new URLSearchParams({
    success: "Match recorded successfully.",
    latest: match.id,
  });

  redirect(`/matches?${searchParams.toString()}`);
}
