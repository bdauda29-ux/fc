import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { createPlayer, togglePlayerStatus } from "@/app/actions";
import { DatabaseNotice } from "@/components/database-notice";
import { SubmitButton } from "@/components/submit-button";
import { getDatabaseErrorMessage } from "@/lib/database";
import { computeLeagueTable } from "@/lib/league";
import { getModelPath, getModelPlayerPath } from "@/lib/model-paths";
import { prisma } from "@/lib/prisma";

type ModelPlayersPageProps = {
  params: Promise<{ modelId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ModelPlayersPage({ params, searchParams }: ModelPlayersPageProps) {
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
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
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

  const table = computeLeagueTable(players, matches, { includeInactive: true });
  const rowsByPlayerId = new Map(table.map((row) => [row.playerId, row]));

  return (
    <div className="grid gap-6">
      {dbError ? <DatabaseNotice message={dbError} /> : null}

      <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
            Add Player
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Player Management</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add and manage players for <span className="font-medium">{model?.name}</span> only.
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

          <form action={createPlayer} className="mt-6 space-y-4">
            <input type="hidden" name="modelId" value={modelId} />
            <input type="hidden" name="redirectTo" value={getModelPath(modelId, "players")} />
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                Player Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter player name"
                required
                maxLength={50}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
              />
            </div>
            <SubmitButton label="Add Player" pendingLabel="Adding player..." className="w-full" />
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Registered Players</h2>
              <p className="text-sm text-slate-500">
                Track active status, position, and profile access inside this model.
              </p>
            </div>
            <p className="text-sm text-slate-500">{players.length} players total</p>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Rating</th>
                    <th className="px-4 py-3">Matches</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {players.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No players yet. Add your first player to this model.
                      </td>
                    </tr>
                  ) : (
                    players.map((player) => {
                      const row = rowsByPlayerId.get(player.id);
                      const boundToggle = togglePlayerStatus.bind(null, player.id, modelId, !player.isActive);

                      return (
                        <tr key={player.id}>
                          <td className="px-4 py-4">
                            <Link
                              href={getModelPlayerPath(modelId, player.id)}
                              className="font-medium text-slate-900 hover:text-sky-700"
                            >
                              {player.name}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                player.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {player.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-4">{row?.pos ?? "-"}</td>
                          <td className="px-4 py-4">{row ? row.rating.toFixed(2) : "0.00"}</td>
                          <td className="px-4 py-4">{row?.mp ?? 0}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={getModelPlayerPath(modelId, player.id)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                              >
                                View Profile
                              </Link>
                              <form action={boundToggle}>
                                <button
                                  type="submit"
                                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                                >
                                  {player.isActive ? "Deactivate" : "Activate"}
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
