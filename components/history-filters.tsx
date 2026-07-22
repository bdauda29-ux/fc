"use client";

import { MultiSelectPopover } from "@/components/multi-select-popover";

type HistoryFiltersProps = {
  modelId: string;
  matchesShown: number;
  hasActiveFilters: boolean;
  clearHref: string;
  players: Array<{ id: string; name: string }>;
  playerAScoreOptions: number[];
  playerBScoreOptions: number[];
  matchDateOptions: string[];
  createdDateOptions: string[];
  filters: {
    playerAIds: string[];
    playerBIds: string[];
    playerAScores: number[];
    playerBScores: number[];
    matchDates: string[];
    createdDates: string[];
  };
};

export function HistoryFilters({
  matchesShown,
  hasActiveFilters,
  clearHref,
  players,
  playerAScoreOptions,
  playerBScoreOptions,
  matchDateOptions,
  createdDateOptions,
  filters,
}: HistoryFiltersProps) {
  const playerOptions = players.map((player) => ({ value: player.id, label: player.name }));
  const scoreAOptions = playerAScoreOptions.map((score) => ({ value: String(score), label: String(score) }));
  const scoreBOptions = playerBScoreOptions.map((score) => ({ value: String(score), label: String(score) }));
  const matchDateSelectOptions = matchDateOptions.map((date) => ({ value: date, label: date }));
  const createdDateSelectOptions = createdDateOptions.map((date) => ({ value: date, label: date }));

  return (
    <form className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-900">Filter Columns</h2>
          <p className="mt-1 text-sm text-slate-500">
            Search and pick multiple values. Player selections match either side, and multiple players show matches
            between the selected players.
          </p>
        </div>
        <div className="text-sm text-slate-500">{matchesShown} matches shown</div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MultiSelectPopover
          name="playerAId"
          label="Player A"
          options={playerOptions}
          defaultValue={filters.playerAIds}
          placeholder="Any player"
        />
        <MultiSelectPopover
          name="playerAScore"
          label="Player A Score"
          options={scoreAOptions}
          defaultValue={filters.playerAScores.map(String)}
          placeholder="Any score"
        />
        <MultiSelectPopover
          name="playerBId"
          label="Player B"
          options={playerOptions}
          defaultValue={filters.playerBIds}
          placeholder="Any player"
        />
        <MultiSelectPopover
          name="playerBScore"
          label="Player B Score"
          options={scoreBOptions}
          defaultValue={filters.playerBScores.map(String)}
          placeholder="Any score"
        />
        <MultiSelectPopover
          name="matchDate"
          label="Match Date"
          options={matchDateSelectOptions}
          defaultValue={filters.matchDates}
          placeholder="Any date"
        />
        <MultiSelectPopover
          name="createdDate"
          label="Saved Date"
          options={createdDateSelectOptions}
          defaultValue={filters.createdDates}
          placeholder="Any date"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        {hasActiveFilters ? (
          <a
            href={clearHref}
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
  );
}

