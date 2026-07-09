import type { Match, Player } from "@prisma/client";

export type MatchSummary = Pick<
  Match,
  "id" | "playerAId" | "playerBId" | "playerAScore" | "playerBScore" | "matchDate"
>;

export type LeagueRow = {
  pos: number;
  playerId: string;
  playerName: string;
  isActive: boolean;
  mp: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  gd: number;
  ap: number;
  rating: number;
};

export type LeagueTableSortKey =
  | "pos"
  | "playerName"
  | "mp"
  | "rating"
  | "wins"
  | "draws"
  | "losses"
  | "points"
  | "ap"
  | "gd";

export type LeagueTableSortDir = "asc" | "desc";

export type HeadToHeadSummary = {
  totalMatches: number;
  playerA: {
    id: string;
    name: string;
    wins: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
  playerB: {
    id: string;
    name: string;
    wins: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
  draws: number;
};

type PlayerLike = Pick<Player, "id" | "name" | "isActive">;

function roundTo(value: number, places = 2) {
  return Number(value.toFixed(places));
}

function buildBaseRow(player: PlayerLike): Omit<LeagueRow, "pos"> {
  return {
    playerId: player.id,
    playerName: player.name,
    isActive: player.isActive,
    mp: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    gd: 0,
    ap: 0,
    rating: 0,
  };
}

function finalizeRow(row: Omit<LeagueRow, "pos">, pos: number): LeagueRow {
  const gd = row.goalsFor - row.goalsAgainst;
  const ap = row.mp === 0 ? 0 : row.points / row.mp;
  const rating = row.mp === 0 ? 0 : ap + gd * 0.1;

  return {
    ...row,
    pos,
    gd,
    ap: roundTo(ap),
    rating: roundTo(rating),
  };
}

export function computeLeagueTable(players: PlayerLike[], matches: MatchSummary[]): LeagueRow[] {
  const table = new Map<string, Omit<LeagueRow, "pos">>();

  for (const player of players) {
    table.set(player.id, buildBaseRow(player));
  }

  for (const match of matches) {
    const playerA = table.get(match.playerAId);
    const playerB = table.get(match.playerBId);

    if (!playerA || !playerB) {
      continue;
    }

    playerA.mp += 1;
    playerB.mp += 1;

    playerA.goalsFor += match.playerAScore;
    playerA.goalsAgainst += match.playerBScore;
    playerB.goalsFor += match.playerBScore;
    playerB.goalsAgainst += match.playerAScore;

    if (match.playerAScore > match.playerBScore) {
      playerA.wins += 1;
      playerA.points += 3;
      playerB.losses += 1;
    } else if (match.playerAScore < match.playerBScore) {
      playerB.wins += 1;
      playerB.points += 3;
      playerA.losses += 1;
    } else {
      playerA.draws += 1;
      playerB.draws += 1;
      playerA.points += 1;
      playerB.points += 1;
    }
  }

  return [...table.values()]
    .sort((left, right) => {
      const leftGd = left.goalsFor - left.goalsAgainst;
      const rightGd = right.goalsFor - right.goalsAgainst;
      const leftRating = left.mp === 0 ? 0 : left.points / left.mp + leftGd * 0.1;
      const rightRating = right.mp === 0 ? 0 : right.points / right.mp + rightGd * 0.1;

      return (
        rightRating - leftRating ||
        right.points - left.points ||
        rightGd - leftGd ||
        right.goalsFor - left.goalsFor ||
        left.playerName.localeCompare(right.playerName)
      );
    })
    .map((row, index) => finalizeRow(row, index + 1));
}

export function getPlayerLeagueRow(
  playerId: string,
  players: PlayerLike[],
  matches: MatchSummary[],
): LeagueRow | undefined {
  return computeLeagueTable(players, matches).find((row) => row.playerId === playerId);
}

export function getHeadToHeadSummary(
  playerA: PlayerLike,
  playerB: PlayerLike,
  matches: MatchSummary[],
): HeadToHeadSummary {
  const relevantMatches = matches.filter(
    (match) =>
      (match.playerAId === playerA.id && match.playerBId === playerB.id) ||
      (match.playerAId === playerB.id && match.playerBId === playerA.id),
  );

  const summary: HeadToHeadSummary = {
    totalMatches: relevantMatches.length,
    playerA: {
      id: playerA.id,
      name: playerA.name,
      wins: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
    playerB: {
      id: playerB.id,
      name: playerB.name,
      wins: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    },
    draws: 0,
  };

  for (const match of relevantMatches) {
    const playerAIsHome = match.playerAId === playerA.id;
    const playerAGoals = playerAIsHome ? match.playerAScore : match.playerBScore;
    const playerBGoals = playerAIsHome ? match.playerBScore : match.playerAScore;

    summary.playerA.goalsFor += playerAGoals;
    summary.playerA.goalsAgainst += playerBGoals;
    summary.playerB.goalsFor += playerBGoals;
    summary.playerB.goalsAgainst += playerAGoals;

    if (playerAGoals > playerBGoals) {
      summary.playerA.wins += 1;
      summary.playerA.points += 3;
    } else if (playerAGoals < playerBGoals) {
      summary.playerB.wins += 1;
      summary.playerB.points += 3;
    } else {
      summary.draws += 1;
      summary.playerA.points += 1;
      summary.playerB.points += 1;
    }
  }

  return summary;
}

export function formatDecimal(value: number) {
  return value.toFixed(2);
}

export function isLeagueTableSortKey(value: string | undefined): value is LeagueTableSortKey {
  return (
    value === "pos" ||
    value === "playerName" ||
    value === "mp" ||
    value === "rating" ||
    value === "wins" ||
    value === "draws" ||
    value === "losses" ||
    value === "points" ||
    value === "ap" ||
    value === "gd"
  );
}

export function getDefaultLeagueTableSortDir(key: LeagueTableSortKey): LeagueTableSortDir {
  return key === "playerName" || key === "pos" ? "asc" : "desc";
}

export function sortLeagueRows(
  rows: LeagueRow[],
  sortKey: LeagueTableSortKey,
  sortDir: LeagueTableSortDir,
) {
  const direction = sortDir === "asc" ? 1 : -1;

  return [...rows].sort((left, right) => {
    let comparison = 0;

    switch (sortKey) {
      case "playerName":
        comparison = left.playerName.localeCompare(right.playerName);
        break;
      case "pos":
        comparison = left.pos - right.pos;
        break;
      case "mp":
        comparison = left.mp - right.mp;
        break;
      case "rating":
        comparison = left.rating - right.rating;
        break;
      case "wins":
        comparison = left.wins - right.wins;
        break;
      case "draws":
        comparison = left.draws - right.draws;
        break;
      case "losses":
        comparison = left.losses - right.losses;
        break;
      case "points":
        comparison = left.points - right.points;
        break;
      case "ap":
        comparison = left.ap - right.ap;
        break;
      case "gd":
        comparison = left.gd - right.gd;
        break;
    }

    if (comparison === 0) {
      comparison = left.pos - right.pos || left.playerName.localeCompare(right.playerName);
    }

    return comparison * direction;
  });
}

export function formatMatchScore(
  match: MatchSummary & {
    playerA?: Pick<Player, "name">;
    playerB?: Pick<Player, "name">;
  },
) {
  return `${match.playerA?.name ?? "Player A"} ${match.playerAScore} - ${match.playerBScore} ${
    match.playerB?.name ?? "Player B"
  }`;
}

export function formatMatchTimestamp(match: Pick<Match, "matchDate" | "createdAt">) {
  const date = new Date(match.matchDate).toLocaleDateString();
  const createdAt = new Date(match.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${date} ${createdAt}`;
}
