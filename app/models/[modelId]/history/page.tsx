import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { formatMatchScore } from "@/lib/league";
import { getModelPath, getModelPlayerPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelHistoryPageProps = {
  params: Promise<{ modelId: string }>;
};

export default async function MatchHistoryPage({ params }: ModelHistoryPageProps) {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  const { modelId } = await params;

  let dbError: string | null = null;
  let model: Awaited<ReturnType<typeof prisma.model.findUnique>> = null;
  let playersCount = 0;
  let matches: MatchWithPlayers[] = [];

  try {
    [model, playersCount, matches] = await Promise.all([
      prisma.model.findUnique({
        where: { id: modelId },
      }),
      prisma.player.count({
        where: { modelId },
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

  const needsSetup = !dbError && playersCount === 0;
  const playersPath = getModelPath(modelId, "players");
  const matchesPath = getModelPath(modelId, "matches");

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{formatMatchScore(match)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(match.matchDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
