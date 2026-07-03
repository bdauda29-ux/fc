import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { LeagueTable } from "@/components/league-table";
import { SetupModal } from "@/components/setup-modal";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable } from "@/lib/league";
import { prisma } from "@/lib/prisma";

export default async function LeagueTablePage() {
  await connection();

  let dbError: string | null = null;
  let players: Awaited<ReturnType<typeof prisma.player.findMany>> = [];
  let matches: Awaited<ReturnType<typeof prisma.match.findMany>> = [];

  try {
    [players, matches] = await Promise.all([
      prisma.player.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.match.findMany({
        orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
      }),
    ]);
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  const table = computeLeagueTable(players, matches);
  const needsSetup = !dbError && players.length === 0;

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}
      {needsSetup ? (
        <SetupModal
          title="Setup Required Before League Table"
          description="Create your first player to unlock standings and the rest of the tracking experience."
          redirectTo="/table"
        />
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          League Table
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Current Standings</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          The table is calculated dynamically from saved matches. Points = (Wins x 3) + Draws,
          AP = Points / MP, GD = GF - GA, and Rating = (Points / MP) + (GD x 0.1).
        </p>
      </section>

      <LeagueTable rows={table} emptyMessage="No matches yet, so the table is still empty." />
    </div>
  );
}
