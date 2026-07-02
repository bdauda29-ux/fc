import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { connection } from "next/server";

import { DatabaseNotice } from "@/components/database-notice";
import { getDatabaseErrorMessage } from "@/lib/database";
import { formatMatchScore } from "@/lib/league";
import { prisma } from "@/lib/prisma";

export default async function MatchHistoryPage() {
  await connection();

  type MatchWithPlayers = Prisma.MatchGetPayload<{
    include: { playerA: true; playerB: true };
  }>;

  let dbError: string | null = null;
  let matches: MatchWithPlayers[] = [];

  try {
    matches = await prisma.match.findMany({
      include: {
        playerA: true,
        playerB: true,
      },
      orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    dbError = getDatabaseErrorMessage(error);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {dbError ? <DatabaseNotice message={dbError} /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Match History
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">All Recorded Fixtures</h1>
          <p className="mt-2 text-sm text-slate-500">
            Browse every result stored in the database, newest first.
          </p>
        </div>
        <Link
          href="/matches"
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Add Match
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            No matches have been recorded yet.
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
                    href={`/players/${match.playerAId}`}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                  >
                    {match.playerA.name}
                  </Link>
                  <Link
                    href={`/players/${match.playerBId}`}
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
