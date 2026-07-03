import type { Prisma } from "@prisma/client";
import { connection } from "next/server";

import { createMatch } from "@/app/actions";
import { DatabaseNotice } from "@/components/database-notice";
import { LeagueTable } from "@/components/league-table";
import { SetupModal } from "@/components/setup-modal";
import { SubmitButton } from "@/components/submit-button";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable, formatMatchScore } from "@/lib/league";
import { prisma } from "@/lib/prisma";

type MatchesPageProps = {
  searchParams: Promise<{ success?: string; error?: string; latest?: string }>;
};

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const params = await searchParams;
  let dbError: string | null = null;
  let players: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let matches: MatchWithPlayers[] = [];
  let latestMatch: MatchWithPlayers | null = null;

  try {
    [players, matches, latestMatch] = await Promise.all([
      prisma.player.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.match.findMany({
        include: {
          playerA: true,
          playerB: true,
        },
        orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      }),
      params.latest
        ? prisma.match.findUnique({
            where: { id: params.latest },
            include: {
              playerA: true,
              playerB: true,
            },
          })
        : Promise.resolve(null),
    ]);
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  const activePlayers = players.filter((player) => player.isActive);
  const table = computeLeagueTable(players, matches);
  const today = new Date().toISOString().slice(0, 10);
  const needsSetup = !dbError && players.length === 0;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          title="Setup Required Before Saving Matches"
          description="Create your first player to unlock the match recorder and the rest of the league workflow."
          redirectTo="/matches"
        />
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Add Match
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Record a New Score</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Once a match is saved, the league table updates automatically from the recorded results.
          </p>

          {params.success ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {params.success}
            </p>
          ) : null}

          {params.error ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {params.error}
            </p>
          ) : null}

          {activePlayers.length < 2 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              You need at least two active players before a match can be recorded.
            </p>
          ) : (
            <form action={createMatch} className="mt-6 space-y-4">
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
          )}
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Updated League Table</h2>
                <p className="text-sm text-slate-500">
                  Calculated live from the matches table and sorted by rating.
                </p>
              </div>
            </div>
            <LeagueTable rows={table} />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Newest Recorded Score</h2>
            {latestMatch ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-950">{formatMatchScore(latestMatch)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Played on {new Date(latestMatch.matchDate).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Save a new match to highlight the latest recorded score here.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
