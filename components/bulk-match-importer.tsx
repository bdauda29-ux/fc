"use client";

import { useMemo, useState } from "react";

import { createMatchesBulk } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

type BulkMatchImporterProps = {
  modelId: string;
  players: Array<{ name: string }>;
};

type BulkIssue =
  | {
      lineNumber: number;
      lineIndex: number;
      kind: "missing-player";
      role: "Player A" | "Player B";
      rawName: string;
      suggestions: string[];
    }
  | {
      lineNumber: number;
      lineIndex: number;
      kind: "invalid-date";
      rawDate: string;
    }
  | {
      lineNumber: number;
      lineIndex: number;
      kind: "invalid-format";
      rawLine: string;
    }
  | {
      lineNumber: number;
      lineIndex: number;
      kind: "invalid-score";
      rawScore: string;
    }
  | {
      lineNumber: number;
      lineIndex: number;
      kind: "same-player";
      rawName: string;
    };

const BULK_SCORE_SEPARATOR = "[-–—−]";

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getEditDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const leftChars = [...left];
  const rightChars = [...right];
  const prev = new Array<number>(rightChars.length + 1).fill(0);
  const curr = new Array<number>(rightChars.length + 1).fill(0);

  for (let j = 0; j <= rightChars.length; j += 1) {
    prev[j] = j;
  }

  for (let i = 1; i <= leftChars.length; i += 1) {
    curr[0] = i;
    const leftChar = leftChars[i - 1];

    for (let j = 1; j <= rightChars.length; j += 1) {
      const cost = leftChar === rightChars[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }

    for (let j = 0; j <= rightChars.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[rightChars.length];
}

function getPlayerNameSuggestions(rawName: string, players: Array<{ name: string }>, limit = 5) {
  const query = normalizeName(rawName);
  if (!query) {
    return [];
  }

  const scored = players
    .map((player) => {
      const normalized = normalizeName(player.name);
      const distance = getEditDistance(query, normalized);
      const isPrefix = normalized.startsWith(query) || query.startsWith(normalized);
      const isSubstring = normalized.includes(query) || query.includes(normalized);

      let bonus = 0;
      if (isPrefix) {
        bonus += 4;
      } else if (isSubstring) {
        bonus += 2;
      }

      return { name: player.name, score: distance - bonus };
    })
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));

  return scored.slice(0, Math.min(limit, scored.length)).map((entry) => entry.name);
}

function splitBulkDatePrefix(line: string) {
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})\s*(?:[,|]\s*|\s+)(.+)$/);

  if (!match) {
    return { remainder: trimmed, rawDate: null as string | null };
  }

  return { remainder: match[2].trim(), rawDate: match[1] };
}

function parseBulkDate(rawValue: string) {
  const trimmed = rawValue.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const slashMatch = trimmed.match(/^(\d{1,4})\/(\d{1,2})\/(\d{1,4})$/);
  if (!slashMatch) {
    return null;
  }

  let year = 0;
  let month = 0;
  let day = 0;

  if (slashMatch[1].length === 4) {
    year = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    day = Number(slashMatch[3]);
  } else {
    day = Number(slashMatch[1]);
    month = Number(slashMatch[2]);
    year = Number(slashMatch[3]);

    if (slashMatch[3].length === 2) {
      year += 2000;
    }
  }

  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function parseBulkScore(rawValue: string) {
  const cleaned = rawValue.trim().replace(/\s+/g, "");
  const match = cleaned.match(new RegExp(`^(\\d+)(?:${BULK_SCORE_SEPARATOR}|:)(\\d+)$`));

  if (!match) {
    return null;
  }

  const a = Number(match[1]);
  const b = Number(match[2]);

  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
    return null;
  }

  return { playerAScore: a, playerBScore: b };
}

function parseInlineMatchLine(line: string) {
  const cleaned = line.trim().replace(/\s+/g, " ");
  const dashMatch = cleaned.match(new RegExp(`^(.+?)\\s+(\\d+)\\s*${BULK_SCORE_SEPARATOR}\\s*(\\d+)\\s+(.+)$`));
  if (dashMatch) {
    return { playerAName: dashMatch[1].trim(), playerBName: dashMatch[4].trim() };
  }

  const crossMatch = cleaned.match(new RegExp(`^(.+?)\\s+(\\d+)\\s*${BULK_SCORE_SEPARATOR}\\s*(.+?)\\s+(\\d+)$`));
  if (crossMatch) {
    return { playerAName: crossMatch[1].trim(), playerBName: crossMatch[3].trim() };
  }

  const vsTrailingScoreMatch = cleaned.match(
    new RegExp(`^(.+?)\\s+vs\\s+(.+?)\\s+(\\d+)\\s*(?:${BULK_SCORE_SEPARATOR}|:)\\s*(\\d+)$`, "i"),
  );
  if (vsTrailingScoreMatch) {
    return { playerAName: vsTrailingScoreMatch[1].trim(), playerBName: vsTrailingScoreMatch[2].trim() };
  }

  const vsMiddleScoreMatch = cleaned.match(
    new RegExp(`^(.+?)\\s+(\\d+)\\s*(?:${BULK_SCORE_SEPARATOR}|:)\\s*(\\d+)\\s+vs\\s+(.+)$`, "i"),
  );
  if (vsMiddleScoreMatch) {
    return { playerAName: vsMiddleScoreMatch[1].trim(), playerBName: vsMiddleScoreMatch[4].trim() };
  }

  const vsSeparatorScoreMatch = cleaned.match(/^(.+?)\s+(\d+)\s+vs\s+(\d+)\s+(.+)$/i);
  if (vsSeparatorScoreMatch) {
    return { playerAName: vsSeparatorScoreMatch[1].trim(), playerBName: vsSeparatorScoreMatch[4].trim() };
  }

  return null;
}

function parseBulkLine(remainder: string) {
  const inline = parseInlineMatchLine(remainder);
  if (inline) {
    return { playerAName: inline.playerAName, playerBName: inline.playerBName, rawScore: null as string | null };
  }

  const tokens = remainder
    .split(/[|,]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length !== 3) {
    return { error: "invalid-format" as const };
  }

  const score = parseBulkScore(tokens[2]);
  if (!score) {
    return { error: "invalid-score" as const, rawScore: tokens[2] };
  }

  return {
    playerAName: tokens[0],
    playerBName: tokens[1],
    rawScore: tokens[2],
  };
}

function getBulkIssues(text: string, players: Array<{ name: string }>) {
  const known = new Set(players.map((player) => normalizeName(player.name)));
  const rawLines = text.split(/\r?\n/);

  const issues: BulkIssue[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = rawLines[index].trim();
    if (rawLine.length === 0 || rawLine.startsWith("#")) {
      continue;
    }

    const { remainder, rawDate } = splitBulkDatePrefix(rawLine);
    if (rawDate) {
      const parsed = parseBulkDate(rawDate);
      if (!parsed) {
        issues.push({
          lineNumber,
          lineIndex: index,
          kind: "invalid-date",
          rawDate,
        });
        continue;
      }
    }

    const parsedLine = parseBulkLine(remainder);
    if ("error" in parsedLine) {
      issues.push({
        lineNumber,
        lineIndex: index,
        kind: parsedLine.error,
        ...(parsedLine.error === "invalid-score" ? { rawScore: parsedLine.rawScore } : { rawLine }),
      } as BulkIssue);
      continue;
    }

    const aNorm = normalizeName(parsedLine.playerAName);
    const bNorm = normalizeName(parsedLine.playerBName);

    if (aNorm && aNorm === bNorm) {
      issues.push({
        lineNumber,
        lineIndex: index,
        kind: "same-player",
        rawName: parsedLine.playerAName,
      });
      continue;
    }

    if (!known.has(aNorm)) {
      issues.push({
        lineNumber,
        lineIndex: index,
        kind: "missing-player",
        role: "Player A",
        rawName: parsedLine.playerAName,
        suggestions: getPlayerNameSuggestions(parsedLine.playerAName, players),
      });
    }

    if (!known.has(bNorm)) {
      issues.push({
        lineNumber,
        lineIndex: index,
        kind: "missing-player",
        role: "Player B",
        rawName: parsedLine.playerBName,
        suggestions: getPlayerNameSuggestions(parsedLine.playerBName, players),
      });
    }
  }

  return issues;
}

export function BulkMatchImporter({ modelId, players }: BulkMatchImporterProps) {
  const [text, setText] = useState("");

  const issues = useMemo(() => getBulkIssues(text, players), [players, text]);
  const blockingIssues = issues.filter((issue) => issue.kind !== "missing-player" || issue.suggestions.length === 0);
  const canSubmit = issues.length === 0 || blockingIssues.length === 0;

  function applySuggestion(lineIndex: number, rawName: string, suggestion: string) {
    const lines = text.split(/\r?\n/);
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return;
    }

    lines[lineIndex] = lines[lineIndex].replace(rawName, suggestion);
    setText(lines.join("\n"));
  }

  return (
    <div className="mt-4 space-y-4">
      <form action={createMatchesBulk} className="space-y-4">
        <input type="hidden" name="modelId" value={modelId} />
        <div>
          <label htmlFor="matchesText" className="mb-2 block text-sm font-medium text-slate-700">
            Bulk Matches
          </label>
          <textarea
            id="matchesText"
            name="matchesText"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste bulk matches here, one per line. Example: oc 2 vs 3 wakili"
            required
            className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500"
          />
        </div>
        {canSubmit ? <SubmitButton label="Import Matches" pendingLabel="Importing..." className="w-full" /> : null}
        {!canSubmit ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-white"
            disabled
          >
            Fix issues to import
          </button>
        ) : null}
      </form>

      {issues.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-900">Bulk import issues</p>
              <p className="mt-1 text-sm text-amber-800">
                Fix these before importing. For unknown names, click a suggestion to auto-replace in the textarea.
              </p>
            </div>
            <p className="text-xs font-semibold text-amber-900">{issues.length} issue(s)</p>
          </div>
          <div className="mt-3 space-y-2">
            {issues.slice(0, 25).map((issue, index) => (
              <div key={`${issue.lineNumber}-${issue.kind}-${index}`} className="rounded-xl bg-white/70 p-3">
                {issue.kind === "missing-player" ? (
                  <>
                    <p className="text-sm font-medium text-slate-900">
                      Line {issue.lineNumber}: {issue.role} "{issue.rawName}" not found
                    </p>
                    {issue.suggestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issue.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => applySuggestion(issue.lineIndex, issue.rawName, suggestion)}
                            className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-amber-800">No close matches found in this model.</p>
                    )}
                  </>
                ) : issue.kind === "invalid-date" ? (
                  <p className="text-sm font-medium text-slate-900">
                    Line {issue.lineNumber}: Invalid date prefix "{issue.rawDate}"
                  </p>
                ) : issue.kind === "invalid-score" ? (
                  <p className="text-sm font-medium text-slate-900">
                    Line {issue.lineNumber}: Invalid score "{issue.rawScore}"
                  </p>
                ) : issue.kind === "same-player" ? (
                  <p className="text-sm font-medium text-slate-900">
                    Line {issue.lineNumber}: A player cannot play against himself ("{issue.rawName}")
                  </p>
                ) : (
                  <p className="text-sm font-medium text-slate-900">
                    Line {issue.lineNumber}: Line format not recognized
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
