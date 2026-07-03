import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { deleteMatch, updateMatch } from "@/app/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { DatabaseNotice } from "@/components/database-notice";
import { SetupModal } from "@/components/setup-modal";
import { SubmitButton } from "@/components/submit-button";
import { getDatabaseErrorMessage } from "@/lib/database";
import { formatMatchScore } from "@/lib/league";
import { getModelPath, getModelPlayerPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelHistoryPageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function MatchHistoryPage({ params, searchParams }: ModelHistoryPageProps) {
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
        orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  if (!model && !dbError) {
    notFound();
  }

  const needsSetup = !dbError && players.length === 0;
  const playersPath = getModelPath(modelId, "players");
  const matchesPath = getModelPath(modelId, "matches");

  function getPlayerOptions(selectedPlayerId: string) {
    return players.filter((player) => player.isActive || player.id === selectedPlayerId);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          modelId={modelId}
          title="Setup Required Before Match History"
          description="Create your first player before accessing match history in this model."
          redirectTo={getModelPath(modelId, "history")}
          playerSetupPath={playersPath}
        />
      ) : null}

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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Match History
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">All Recorded Fixtures</h1>
          <p className="mt-2 text-sm text-slate-500">
            Browse every result stored inside <span className="font-medium">{model?.name}</span>,
            newest first.
          </p>
        </div>
        <Link
          href={matchesPath}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Add Match
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No matches have been recorded in this model yet.
          </div>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="lg:max-w-xs">
                  <p className="text-lg font-semibold text-slate-950">{formatMatchScore(match)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(match.matchDate).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={getModelPlayerPath(modelId, match.playerAId)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                    >
                      {match.playerA.name}
                    </Link>
                    <Link
                      href={getModelPlayerPath(modelId, match.playerBId)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                    >
                      {match.playerB.name}
                    </Link>
                  </div>
                </div>

                <div className="w-full lg:max-w-3xl">
                  <form
                    action={updateMatch}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <input type="hidden" name="modelId" value={modelId} />
                    <input type="hidden" name="matchId" value={match.id} />

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label
                          htmlFor={`playerAId-${match.id}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Player A
                        </label>
                        <select
                          id={`playerAId-${match.id}`}
                          name="playerAId"
                          required
                          defaultValue={match.playerAId}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                        >
                          {getPlayerOptions(match.playerAId).map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                              {player.isActive ? "" : " (Inactive)"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`playerBId-${match.id}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Player B
                        </label>
                        <select
                          id={`playerBId-${match.id}`}
                          name="playerBId"
                          required
                          defaultValue={match.playerBId}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                        >
                          {getPlayerOptions(match.playerBId).map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                              {player.isActive ? "" : " (Inactive)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <label
                          htmlFor={`playerAScore-${match.id}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Player A Score
                        </label>
                        <input
                          id={`playerAScore-${match.id}`}
                          name="playerAScore"
                          type="number"
                          min="0"
                          step="1"
                          required
                          defaultValue={match.playerAScore}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`playerBScore-${match.id}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Player B Score
                        </label>
                        <input
                          id={`playerBScore-${match.id}`}
                          name="playerBScore"
                          type="number"
                          min="0"
                          step="1"
                          required
                          defaultValue={match.playerBScore}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`matchDate-${match.id}`}
                          className="mb-2 block text-sm font-medium text-slate-700"
                        >
                          Match Date
                        </label>
                        <input
                          id={`matchDate-${match.id}`}
                          name="matchDate"
                          type="date"
                          required
                          defaultValue={new Date(match.matchDate).toISOString().slice(0, 10)}
                          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <SubmitButton
                        label="Save Changes"
                        pendingLabel="Saving changes..."
                      />
                    </div>
                  </form>

                  <div className="mt-3 flex justify-end">
                    <form action={deleteMatch}>
                      <input type="hidden" name="modelId" value={modelId} />
                      <input type="hidden" name="matchId" value={match.id} />
                      <ConfirmSubmitButton
                        label="Delete Match"
                        message={`Delete the saved result ${match.playerA.name} ${match.playerAScore} - ${match.playerBScore} ${match.playerB.name}?`}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      />
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
