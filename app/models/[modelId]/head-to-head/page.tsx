import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { getHeadToHeadSummary } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type HeadToHeadPageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ playerA?: string; playerB?: string }>;
};

export default async function HeadToHeadPage({ params, searchParams }: HeadToHeadPageProps) {
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

  const defaultPlayerA = query.playerA ?? players[0]?.id;
  const defaultPlayerB = query.playerB ?? players[1]?.id;

  const playerA = players.find((player) => player.id === defaultPlayerA);
  const playerB = players.find((player) => player.id === defaultPlayerB);

  const relevantMatches =
    playerA && playerB
      ? matches.filter(
          (match) =>
            (match.playerAId === playerA.id && match.playerBId === playerB.id) ||
            (match.playerAId === playerB.id && match.playerBId === playerA.id),
        )
      : [];

  const summary =
    playerA && playerB && playerA.id !== playerB.id
      ? getHeadToHeadSummary(playerA, playerB, matches)
      : null;
  const needsSetup = !dbError && players.length === 0;
  const playersPath = getModelPath(modelId, "players");
  const comparePath = getModelPath(modelId, "head-to-head");

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          modelId={modelId}
          title="Setup Required Before Head-to-Head"
          description="Create your first player before comparing direct meetings in this model."
          redirectTo={comparePath}
          playerSetupPath={playersPath}
        />
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Head-to-Head
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Compare Two Players</h1>
        <p className="mt-2 text-sm text-slate-500">
          Pick any two players from <span className="font-medium">{model?.name}</span> to compare
          results, goals, and points from direct meetings only.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="playerA" className="mb-2 block text-sm font-medium text-slate-700">
              Player A
            </label>
            <select
              id="playerA"
              name="playerA"
              defaultValue={defaultPlayerA}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="playerB" className="mb-2 block text-sm font-medium text-slate-700">
              Player B
            </label>
            <select
              id="playerB"
              name="playerB"
              defaultValue={defaultPlayerB}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-500"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Compare
            </button>
          </div>
        </form>
      </section>

      {players.length < 2 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-8 text-sm text-slate-500">
          Add at least two players to unlock head-to-head comparisons in this model.
        </div>
      ) : playerA && playerB && playerA.id === playerB.id ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-8 text-sm text-rose-700">
          Choose two different players to compare.
        </div>
      ) : summary ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{summary.playerA.name}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{summary.playerA.wins} wins</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Goals For</p>
                  <p className="mt-1 font-semibold text-slate-950">{summary.playerA.goalsFor}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Goals Against</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {summary.playerA.goalsAgainst}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Points</p>
                  <p className="mt-1 font-semibold text-slate-950">{summary.playerA.points}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center text-center">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Meetings</p>
                <p className="mt-2 text-4xl font-bold text-slate-950">{summary.totalMatches}</p>
                <p className="mt-2 text-sm text-slate-500">{summary.draws} draws</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">{summary.playerB.name}</p>
              <p className="mt-2 text-3xl font-bold text-slate-950">{summary.playerB.wins} wins</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Goals For</p>
                  <p className="mt-1 font-semibold text-slate-950">{summary.playerB.goalsFor}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Goals Against</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {summary.playerB.goalsAgainst}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Points</p>
                  <p className="mt-1 font-semibold text-slate-950">{summary.playerB.points}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Direct Match History</h2>
            <div className="mt-4 space-y-3">
              {relevantMatches.length === 0 ? (
                <p className="text-sm text-slate-500">These players have not met yet in this model.</p>
              ) : (
                relevantMatches.map((match) => (
                  <div
                    key={match.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="font-medium text-slate-900">
                      {match.playerA.name} {match.playerAScore} - {match.playerBScore}{" "}
                      {match.playerB.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(match.matchDate).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
