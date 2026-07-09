import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { LeagueTable } from "@/components/league-table";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable } from "@/lib/league";
import { getModelPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelTablePageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ sort?: string; dir?: string }>;
};

export default async function LeagueTablePage({ params, searchParams }: ModelTablePageProps) {
  await connection();

  const { modelId } = await params;
  const query = await searchParams;

  let dbError: string | null = null;
  let model: Awaited<ReturnType<typeof prisma.model.findUnique>> = null;
  let players: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let matches: Awaited<ReturnType<typeof prisma.match.findMany>> = [];

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
  const needsSetup = !dbError && players.length === 0;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          modelId={modelId}
          title="Setup Required Before League Table"
          description="Create your first player to unlock standings and statistics in this model."
          redirectTo={getModelPath(modelId, "table")}
          playerSetupPath={getModelPath(modelId, "players")}
        />
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          League Table
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Current Standings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Standings for <span className="font-medium">{model?.name}</span>.
        </p>
      </section>

      <LeagueTable
        rows={table}
        modelId={modelId}
        pathname={getModelPath(modelId, "table")}
        query={query}
        sort={query.sort}
        dir={query.dir}
        emptyMessage="No matches yet in this model, so the table is still empty."
      />
    </div>
  );
}
