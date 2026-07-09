import Link from "next/link";

import {
  formatDecimal,
  getDefaultLeagueTableSortDir,
  isLeagueTableSortKey,
  sortLeagueRows,
  type LeagueRow,
  type LeagueTableSortDir,
  type LeagueTableSortKey,
} from "@/lib/league";
import { getModelPlayerPath } from "@/lib/model-paths";

type LeagueTableProps = {
  rows: LeagueRow[];
  modelId: string;
  emptyMessage?: string;
  compact?: boolean;
  pathname: string;
  query?: Record<string, string | string[] | undefined>;
  sort?: string;
  dir?: string;
};

export function LeagueTable({
  rows,
  modelId,
  emptyMessage = "No matches recorded yet.",
  compact = false,
  pathname,
  query = {},
  sort,
  dir,
}: LeagueTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const sortKey: LeagueTableSortKey = isLeagueTableSortKey(sort) ? sort : "rating";
  const sortDir: LeagueTableSortDir = dir === "asc" || dir === "desc" ? dir : "desc";
  const sortedRows = sortLeagueRows(rows, sortKey, sortDir);
  const columns: Array<{ key: LeagueTableSortKey; label: string }> = [
    { key: "pos", label: "Pos" },
    { key: "playerName", label: "Player" },
    { key: "mp", label: "MP" },
    { key: "rating", label: "Rating" },
    { key: "wins", label: "W" },
    { key: "draws", label: "D" },
    { key: "losses", label: "L" },
    { key: "points", label: "Pts" },
    { key: "ap", label: "AP" },
    { key: "gd", label: "GD" },
  ];

  function getSortHref(columnKey: LeagueTableSortKey) {
    const nextDir =
      sortKey === columnKey
        ? (sortDir === "asc" ? "desc" : "asc")
        : getDefaultLeagueTableSortDir(columnKey);

    return {
      pathname,
      query: {
        ...query,
        sort: columnKey,
        dir: nextDir,
      },
    };
  }

  function getSortIcon(columnKey: LeagueTableSortKey) {
    if (sortKey !== columnKey) {
      return "↕";
    }

    return sortDir === "asc" ? "↑" : "↓";
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <Link
                    href={getSortHref(column.key)}
                    className={`inline-flex items-center gap-1 transition hover:text-slate-700 ${
                      sortKey === column.key ? "font-semibold text-slate-700" : ""
                    }`}
                  >
                    <span>{column.label}</span>
                    <span aria-hidden="true">{getSortIcon(column.key)}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row) => (
              <tr key={row.playerId} className="text-slate-700">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.pos}</td>
                <td className="px-4 py-3">
                  <Link
                    href={getModelPlayerPath(modelId, row.playerId)}
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
