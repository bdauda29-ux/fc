import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable, formatMatchScore } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type PlayerProfilePageProps = {
  params: Promise<{ modelId: string; id: string }>;
};

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const { modelId, id } = await params;

  let dbError: string | null = null;
  let model: Awaited<ReturnType<typeof prisma.model.findUnique>> = null;
  let player: Awaited<ReturnType<typeof prisma.player.findFirst>> = null;
  let players: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let matches: MatchWithPlayers[] = [];

  try {
    [model, player, players, matches] = await Promise.all([
      prisma.model.findUnique({
        where: { id: modelId },
      }),
      prisma.player.findFirst({
        where: { id, modelId },
      }),
      prisma.player.findMany({
        where: { modelId },
        orderBy: { name: "asc" },
      }),
      prisma.match.findMany({
        where: { modelId },
        include: {
          playerA: true,
          playerB: true,
        },
        orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  if ((!model || !player) && !dbError) {
    notFound();
  }

  if (!player) {
    return <DatabaseNotice message={dbError ?? "Player not found."} />;
  }

  const table = computeLeagueTable(players, matches);
  const row = table.find((entry) => entry.playerId === player.id);
  const playerMatches = matches.filter(
    (match) => match.playerAId === player.id || match.playerBId === player.id,
  );
  const playersPath = getModelPath(modelId, "players");
  const tablePath = getModelPath(modelId, "table");
  const headToHeadPath = `${getModelPath(modelId, "head-to-head")}?playerA=${player.id}`;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
              Player Profile
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">{player.name}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {player.isActive ? "Currently active for new matches." : "Currently inactive."}
            </p>
            <p className="mt-1 text-sm text-slate-500">Model: {model?.name}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={playersPath}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Back to Players
            </Link>
            <Link
              href={headToHeadPath}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Compare Head-to-Head
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Position", value: row?.pos ?? "-" },
          { label: "Matches Played", value: row?.mp ?? 0 },
          { label: "Points", value: row?.points ?? 0 },
          { label: "Goal Difference", value: row?.gd ?? 0 },
          { label: "Rating", value: row ? row.rating.toFixed(2) : "0.00" },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Performance Summary</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Wins", value: row?.wins ?? 0 },
              { label: "Draws", value: row?.draws ?? 0 },
              { label: "Losses", value: row?.losses ?? 0 },
              { label: "Average Points", value: row ? row.ap.toFixed(2) : "0.00" },
              { label: "Goals For", value: row?.goalsFor ?? 0 },
              { label: "Goals Against", value: row?.goalsAgainst ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">League Context</h2>
            <Link href={tablePath} className="text-sm font-medium text-sky-700 hover:text-sky-600">
              Full table
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {table.slice(0, 5).map((entry) => (
              <div
                key={entry.playerId}
                className={`rounded-2xl px-4 py-3 ${
                  entry.playerId === player.id
                    ? "border border-sky-200 bg-sky-50"
                    : "border border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">
                    {entry.pos}. {entry.playerName}
                  </p>
                  <p className="text-sm text-slate-500">Rating {entry.rating.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-950">Recent Results</h2>
          <span className="text-sm text-slate-500">{playerMatches.length} total matches</span>
        </div>
        <div className="mt-4 space-y-3">
          {playerMatches.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              No matches recorded for this player yet.
            </p>
          ) : (
            playerMatches.slice(0, 10).map((match) => (
              <div
                key={match.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <p className="font-medium text-slate-900">{formatMatchScore(match)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(match.matchDate).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
