import Link from "next/link";

import { formatDecimal, type LeagueRow } from "@/lib/league";

type LeagueTableProps = {
  rows: LeagueRow[];
  emptyMessage?: string;
  compact?: boolean;
};

export function LeagueTable({
  rows,
  emptyMessage = "No matches recorded yet.",
  compact = false,
}: LeagueTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">MP</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">W</th>
              <th className="px-4 py-3">D</th>
              <th className="px-4 py-3">L</th>
              <th className="px-4 py-3">Pts</th>
              <th className="px-4 py-3">AP</th>
              <th className="px-4 py-3">GD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.playerId} className="text-slate-700">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.pos}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${row.playerId}`}
                    className="font-medium text-slate-900 hover:text-sky-600"
                  >
                    {row.playerName}
                  </Link>
                  {!row.isActive ? (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                      Inactive
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3">{row.mp}</td>
                <td className="px-4 py-3 font-semibold text-sky-700">
                  {formatDecimal(row.rating)}
                </td>
                <td className="px-4 py-3">{row.wins}</td>
                <td className="px-4 py-3">{row.draws}</td>
                <td className="px-4 py-3">{row.losses}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{row.points}</td>
                <td className="px-4 py-3">{formatDecimal(row.ap)}</td>
                <td className="px-4 py-3">{row.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compact ? (
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Ratings are computed from points per match plus goal difference weighting.
        </div>
      ) : null}
    </div>
  );
}
