import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { LeagueTable } from "@/components/league-table";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable, formatMatchScore } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

export default async function ModelDashboardPage(props: PageProps<"/models/[modelId]/dashboard">) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const { modelId } = await props.params;

  let dbError: string | null = null;
  let model: Awaited<ReturnType<typeof prisma.model.findUnique>> = null;
  let players: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let matches: MatchWithPlayers[] = [];

  try {
    [model, players, matches] = await Promise.all([
      prisma.model.findUnique({
        where: { id: modelId },
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

  if (!model && !dbError) {
    notFound();
  }

  const table = computeLeagueTable(players, matches);
  const activePlayers = players.filter((player) => player.isActive).length;
  const totalGoals = matches.reduce((sum, match) => sum + match.playerAScore + match.playerBScore, 0);
  const playersPath = getModelPath(modelId, "players");
  const matchesPath = getModelPath(modelId, "matches");
  const historyPath = getModelPath(modelId, "history");
  const tablePath = getModelPath(modelId, "table");
  const headToHeadPath = getModelPath(modelId, "head-to-head");
  const needsSetup = !dbError && players.length === 0;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          modelId={modelId}
          title="Create Your First Player"
          description="Before any records can be saved, create the first player for this league model."
          redirectTo={getModelPath(modelId)}
          playerSetupPath={playersPath}
        />
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
          <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
            Dashboard
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {model?.name ?? "League Model"} workspace
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            This dashboard only reflects players, results, standings, head-to-head records, and
            statistics saved inside the selected model.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={playersPath}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Add Player
            </Link>
            <Link
              href={matchesPath}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-sky-400"
            >
              Record Match
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Players</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{players.length}</p>
            <p className="mt-2 text-sm text-slate-500">{activePlayers} active and available</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Matches Played</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{matches.length}</p>
            <p className="mt-2 text-sm text-slate-500">{totalGoals} total goals recorded</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Top of the Table</h2>
              <p className="text-sm text-slate-500">Sorted dynamically by rating, highest to lowest.</p>
            </div>
            <Link href={tablePath} className="text-sm font-medium text-sky-700 hover:text-sky-600">
              View full table
            </Link>
          </div>
          <LeagueTable rows={table.slice(0, 8)} compact modelId={modelId} />
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Recent Matches</h2>
                <p className="text-sm text-slate-500">Latest recorded results in this model.</p>
              </div>
              <Link href={historyPath} className="text-sm font-medium text-sky-700 hover:text-sky-600">
                See history
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {matches.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
                  No matches recorded in this model yet.
                </p>
              ) : (
                matches.slice(0, 6).map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="font-medium text-slate-900">{formatMatchScore(match)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(match.matchDate).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Quick Navigation</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { href: playersPath, label: "Player Management" },
                { href: headToHeadPath, label: "Head-to-Head" },
                { href: tablePath, label: "League Table" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
