import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { createMatch } from "@/app/actions";
import { BulkMatchImporter } from "@/components/bulk-match-importer";
import { DatabaseNotice } from "@/components/database-notice";
import { LeagueTable } from "@/components/league-table";
import { SetupModal } from "@/components/setup-modal";
import { SubmitButton } from "@/components/submit-button";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable, formatMatchScore, formatMatchTimestamp } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type MatchesPageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ success?: string; error?: string; sort?: string; dir?: string }>;
};

export default async function MatchesPage({ params, searchParams }: MatchesPageProps) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const { modelId } = await params;
  const query = await searchParams;

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
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.match.findMany({
        where: { modelId },
        include: {
          playerA: true,
          playerB: true,
        },
        orderBy: [{ createdAt: "desc" }, { matchDate: "desc" }],
      }),
    ]);
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  if (!model && !dbError) {
    notFound();
  }

  const activePlayers = players.filter((player) => player.isActive);
  const table = computeLeagueTable(players, matches);
  const recentMatches = matches.slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);
  const matchesPath = getModelPath(modelId, "matches");
  const playersPath = getModelPath(modelId, "players");
  const needsSetup = !dbError && players.length === 0;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          modelId={modelId}
          title="Setup Required Before Saving Matches"
          description="Create your first player to unlock the match recorder and league workflow for this model."
          redirectTo={matchesPath}
          playerSetupPath={playersPath}
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Record Match
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Record a New Score</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Save results for <span className="font-medium">{model?.name}</span> and update the
            table automatically.
          </p>

          {query.success ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {query.success}
            </p>
          ) : null}

          {query.error ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {query.error}
            </p>
          ) : null}

          {activePlayers.length < 2 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              You need at least two active players in this model before a match can be recorded.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <form action={createMatch} className="space-y-4">
                <input type="hidden" name="modelId" value={modelId} />
                <div>
                  <label htmlFor="playerAId" className="mb-2 block text-sm font-medium text-slate-700">
                    Player A
                  </label>
                  <select
                    id="playerAId"
                    name="playerAId"
                    required
                    defaultValue=""
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                  >
                    <option value="" disabled>
                      Select player
                    </option>
                    {activePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="playerBId" className="mb-2 block text-sm font-medium text-slate-700">
                    Player B
                  </label>
                  <select
                    id="playerBId"
                    name="playerBId"
                    required
                    defaultValue=""
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                  >
                    <option value="" disabled>
                      Select player
                    </option>
                    {activePlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="playerAScore"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Player A Score
                    </label>
                    <input
                      id="playerAScore"
                      name="playerAScore"
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="playerBScore"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Player B Score
                    </label>
                    <input
                      id="playerBScore"
                      name="playerBScore"
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="matchDate" className="mb-2 block text-sm font-medium text-slate-700">
                    Match Date
                  </label>
                  <input
                    id="matchDate"
                    name="matchDate"
                    type="date"
                    required
                    defaultValue={today}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                  />
                </div>

                <SubmitButton label="Save Match" pendingLabel="Saving match..." className="w-full" />
              </form>

              <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Bulk Import Matches
                </summary>
                <BulkMatchImporter modelId={modelId} players={players.map((player) => ({ name: player.name }))} />
              </details>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Updated League Table</h2>
                <p className="text-sm text-slate-500">
                  Calculated live from this model&apos;s matches and sorted by rating.
                </p>
              </div>
            </div>
            <LeagueTable
              rows={table}
              modelId={modelId}
              pathname={matchesPath}
              query={query}
              sort={query.sort}
              dir={query.dir}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Recent Recorded Scores</h2>
            <p className="mt-1 text-sm text-slate-500">
              Showing the 5 newest saved results, listed newest to oldest.
            </p>
            {recentMatches.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentMatches.map((match) => (
                  <div key={match.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-base font-semibold text-slate-950">
                        {formatMatchScore(match)}
                      </p>
                      <p className="shrink-0 text-xs font-medium text-slate-500">
                        {formatMatchTimestamp(match)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Save a new match to show the newest recorded scores here.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
