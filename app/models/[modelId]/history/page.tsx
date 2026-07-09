import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { deleteMatch, updateMatch } from "@/app/actions";
import { AdminAuthSubmitButton } from "@/components/admin-auth-submit-button";
import { DatabaseNotice } from "@/components/database-notice";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { formatMatchScore, formatMatchTimestamp } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelHistoryPageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
    playerAId?: string;
    playerAScore?: string;
    playerBId?: string;
    playerBScore?: string;
    matchDate?: string;
    createdDate?: string;
  }>;
};

export default async function MatchHistoryPage({ params, searchParams }: ModelHistoryPageProps) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const { modelId } = await params;
  const query = await searchParams;

  function getQueryValue(value?: string) {
    return typeof value === "string" ? value.trim() : "";
  }

  function getDayRange(value: string) {
    const start = new Date(`${value}T00:00:00`);
    if (Number.isNaN(start.getTime())) {
      return null;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { gte: start, lt: end };
  }

  function getScoreFilter(value: string) {
    if (value === "") {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  const filters = {
    playerAId: getQueryValue(query.playerAId),
    playerAScore: getQueryValue(query.playerAScore),
    playerBId: getQueryValue(query.playerBId),
    playerBScore: getQueryValue(query.playerBScore),
    matchDate: getQueryValue(query.matchDate),
    createdDate: getQueryValue(query.createdDate),
  };
  const matchDateRange = filters.matchDate ? getDayRange(filters.matchDate) : null;
  const createdDateRange = filters.createdDate ? getDayRange(filters.createdDate) : null;
  const playerAScoreFilter = getScoreFilter(filters.playerAScore);
  const playerBScoreFilter = getScoreFilter(filters.playerBScore);
  const matchWhere: Prisma.MatchWhereInput = {
    modelId,
    ...(filters.playerAId ? { playerAId: filters.playerAId } : {}),
    ...(filters.playerBId ? { playerBId: filters.playerBId } : {}),
    ...(playerAScoreFilter !== undefined ? { playerAScore: playerAScoreFilter } : {}),
    ...(playerBScoreFilter !== undefined ? { playerBScore: playerBScoreFilter } : {}),
    ...(matchDateRange ? { matchDate: matchDateRange } : {}),
    ...(createdDateRange ? { createdAt: createdDateRange } : {}),
  };

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
        where: matchWhere,
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

  const needsSetup = !dbError && players.length === 0;
  const playersPath = getModelPath(modelId, "players");
  const hasActiveFilters = Object.values(filters).some((value) => value !== "");

  function getPlayerOptions(selectedPlayerId: string) {
    return players.filter((player) => player.isActive || player.id === selectedPlayerId);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Match History
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">All Recorded Matches</h1>
        <p className="mt-2 text-sm text-slate-500">
          Browse every result stored inside <span className="font-medium">{model?.name}</span>,
          newest first.
        </p>
      </div>

      <form className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">
              Filter Columns
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter by every match history column and keep newest saved matches first.
            </p>
          </div>
          <div className="text-sm text-slate-500">{matches.length} matches shown</div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="playerAId" className="mb-2 block text-sm font-medium text-slate-700">
              Player A
            </label>
            <select
              id="playerAId"
              name="playerAId"
              defaultValue={filters.playerAId}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            >
              <option value="">All players</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="playerAScore" className="mb-2 block text-sm font-medium text-slate-700">
              Player A Score
            </label>
            <input
              id="playerAScore"
              name="playerAScore"
              type="number"
              min="0"
              step="1"
              defaultValue={filters.playerAScore}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="playerBId" className="mb-2 block text-sm font-medium text-slate-700">
              Player B
            </label>
            <select
              id="playerBId"
              name="playerBId"
              defaultValue={filters.playerBId}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            >
              <option value="">All players</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="playerBScore" className="mb-2 block text-sm font-medium text-slate-700">
              Player B Score
            </label>
            <input
              id="playerBScore"
              name="playerBScore"
              type="number"
              min="0"
              step="1"
              defaultValue={filters.playerBScore}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="matchDate" className="mb-2 block text-sm font-medium text-slate-700">
              Match Date
            </label>
            <input
              id="matchDate"
              name="matchDate"
              type="date"
              defaultValue={filters.matchDate}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            />
          </div>

          <div>
            <label htmlFor="createdDate" className="mb-2 block text-sm font-medium text-slate-700">
              Saved Date
            </label>
            <input
              id="createdDate"
              name="createdDate"
              type="date"
              defaultValue={filters.createdDate}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {hasActiveFilters ? (
            <a
              href={getModelPath(modelId, "history")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
            >
              Clear Filters
            </a>
          ) : null}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            {hasActiveFilters
              ? "No matches found for the selected filters."
              : "No matches have been recorded in this model yet."}
          </div>
        ) : (
          matches.map((match) => (
            <div
              key={match.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2 shadow-sm shadow-slate-200/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
                      {formatMatchScore(match)}
                    </p>
                    <p className="shrink-0 text-[11px] font-medium text-slate-500 sm:text-xs">
                      {formatMatchTimestamp(match)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <details className="relative">
                    <summary
                      title="Edit match"
                      aria-label="Edit match"
                      className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-sm text-slate-800 transition hover:border-sky-200 hover:bg-slate-50"
                    >
                      ✏️
                    </summary>
                    <div className="absolute right-0 top-full z-10 mt-2 w-[42rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                      <div className="mb-3 text-sm font-semibold text-slate-900">Edit match</div>
                      <form action={updateMatch} className="grid gap-3">
                        <input type="hidden" name="modelId" value={modelId} />
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="adminUsername" value="" />

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
                          <AdminAuthSubmitButton
                            label="Save Changes"
                            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                          />
                        </div>
                      </form>
                    </div>
                  </details>

                  <form action={deleteMatch}>
                    <input type="hidden" name="modelId" value={modelId} />
                    <input type="hidden" name="matchId" value={match.id} />
                    <input type="hidden" name="adminUsername" value="" />
                    <AdminAuthSubmitButton
                      label="🗑️"
                      title="Delete match"
                      ariaLabel="Delete match"
                      confirmMessage={`Delete ${match.playerA.name} ${match.playerAScore} - ${match.playerBScore} ${match.playerB.name}?`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-sm text-rose-700 transition hover:bg-rose-50"
                    />
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
