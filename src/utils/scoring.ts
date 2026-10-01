import { Beer, PartyMode, Player, TastingRound, BeerStyle } from '../types';

export interface BeerRatingSummary {
  beer: Beer;
  averageScore: number;
  totalRatingsCount: number;
  allScores: { playerName: string; score: number }[];
  highestScore: number;
  lowestScore: number;
  rank: number;
}

export interface PlayerStatsSummary {
  player: Player;
  totalPoints: number;
  correctStyleGuesses: number;
  totalGuesses: number;
  matchedFlavorsCount: number;
  accuracyPercent: number;
  averageTimeSeconds: number;
  fastestTimeSeconds: number | null;
  averageRatingGiven: number;
  roundsAsHost: number;
  rank: number;
}

/**
 * Calculate speed bonus points.
 */
export function calculateSpeedBonus(timeSeconds: number, mode: PartyMode): number {
  if (!mode.speedBonusActive || mode.maxSpeedBonus <= 0) return 0;
  if (timeSeconds >= mode.speedCutoffSeconds) return 0;

  const ratio = Math.max(0, 1 - (timeSeconds / mode.speedCutoffSeconds));
  return Math.max(5, Math.round(mode.maxSpeedBonus * ratio));
}

/**
 * Calculate style & flavor points.
 */
export function calculateEvaluationPoints(
  guessedStyle: BeerStyle | undefined,
  chosenFlavorTags: string[],
  secretBeer: Beer,
  mode: PartyMode
): {
  isStyleMatch: boolean;
  stylePoints: number;
  matchedFlavors: string[];
  flavorPoints: number;
} {
  const isStyleMatch = guessedStyle === secretBeer.style;
  const stylePoints = isStyleMatch ? mode.styleAccuracyPoints : 0;

  const secretFlavors = secretBeer.flavorProfile || [];
  const matchedFlavors = chosenFlavorTags.filter((tag) =>
    secretFlavors.includes(tag)
  );

  const flavorPoints = matchedFlavors.length * (mode.flavorMatchPoints || 10);

  return {
    isStyleMatch,
    stylePoints,
    matchedFlavors,
    flavorPoints
  };
}

/**
 * Computes beer leaderboard sorted by average rating.
 */
export function computeBeerLeaderboard(
  beers: Beer[],
  rounds: TastingRound[],
  players: Player[]
): BeerRatingSummary[] {
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const beerScoresMap = new Map<string, { playerName: string; score: number }[]>();

  rounds.forEach((round) => {
    if (!round.isCompleted) return;
    const currentList = beerScoresMap.get(round.secretBeerId) || [];

    Object.values(round.ratings).forEach((rating) => {
      const playerName = playerMap.get(rating.playerId) || 'Unbekannt';
      currentList.push({
        playerName,
        score: rating.score
      });
    });

    beerScoresMap.set(round.secretBeerId, currentList);
  });

  const summaries: BeerRatingSummary[] = beers.map((beer) => {
    const scores = beerScoresMap.get(beer.id) || [];
    if (scores.length === 0) {
      return {
        beer,
        averageScore: 0,
        totalRatingsCount: 0,
        allScores: [],
        highestScore: 0,
        lowestScore: 0,
        rank: 999
      };
    }

    const sum = scores.reduce((acc, curr) => acc + curr.score, 0);
    const avg = Number((sum / scores.length).toFixed(1));
    const numericScores = scores.map((s) => s.score);

    return {
      beer,
      averageScore: avg,
      totalRatingsCount: scores.length,
      allScores: scores,
      highestScore: Math.max(...numericScores),
      lowestScore: Math.min(...numericScores),
      rank: 1
    };
  });

  summaries.sort((a, b) => {
    if (b.averageScore !== a.averageScore) {
      return b.averageScore - a.averageScore;
    }
    return b.totalRatingsCount - a.totalRatingsCount;
  });

  summaries.forEach((item, index) => {
    item.rank = index + 1;
  });

  return summaries;
}

/**
 * Computes player rankings.
 */
export function computePlayerLeaderboard(
  players: Player[],
  rounds: TastingRound[]
): PlayerStatsSummary[] {
  const playerMap = new Map<string, {
    totalPoints: number;
    correctStyleGuesses: number;
    totalGuesses: number;
    matchedFlavorsCount: number;
    times: number[];
    ratingsGiven: number[];
    roundsAsHost: number;
  }>();

  players.forEach((p) => {
    playerMap.set(p.id, {
      totalPoints: 0,
      correctStyleGuesses: 0,
      totalGuesses: 0,
      matchedFlavorsCount: 0,
      times: [],
      ratingsGiven: [],
      roundsAsHost: 0
    });
  });

  rounds.forEach((round) => {
    if (!round.isCompleted) return;

    const hostData = playerMap.get(round.hostPlayerId);
    if (hostData) {
      hostData.roundsAsHost += 1;
    }

    Object.values(round.ratings).forEach((r) => {
      const pData = playerMap.get(r.playerId);
      if (!pData) return;

      pData.totalPoints += r.totalPointsEarned;
      pData.ratingsGiven.push(r.score);

      if (!r.isHost) {
        pData.totalGuesses += 1;
        if (r.stylePoints > 0) {
          pData.correctStyleGuesses += 1;
        }
        pData.matchedFlavorsCount += r.matchedFlavors.length;
        if (r.timeSeconds > 0) {
          pData.times.push(r.timeSeconds);
        }
      }
    });
  });

  const summaries: PlayerStatsSummary[] = players.map((player) => {
    const data = playerMap.get(player.id)!;
    const avgScore = data.ratingsGiven.length > 0
      ? Number((data.ratingsGiven.reduce((a, b) => a + b, 0) / data.ratingsGiven.length).toFixed(1))
      : 0;

    const avgTime = data.times.length > 0
      ? Number((data.times.reduce((a, b) => a + b, 0) / data.times.length).toFixed(1))
      : 0;

    const fastest = data.times.length > 0 ? Math.min(...data.times) : null;
    const accuracy = data.totalGuesses > 0
      ? Math.round((data.correctStyleGuesses / data.totalGuesses) * 100)
      : 0;

    return {
      player,
      totalPoints: data.totalPoints,
      correctStyleGuesses: data.correctStyleGuesses,
      totalGuesses: data.totalGuesses,
      matchedFlavorsCount: data.matchedFlavorsCount,
      accuracyPercent: accuracy,
      averageTimeSeconds: avgTime,
      fastestTimeSeconds: fastest,
      averageRatingGiven: avgScore,
      roundsAsHost: data.roundsAsHost,
      rank: 1
    };
  });

  summaries.sort((a, b) => b.totalPoints - a.totalPoints);
  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return summaries;
}
