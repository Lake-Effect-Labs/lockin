import { LeagueMember, PlayoffMatch, User } from './supabase';

// ============================================
// PLAYOFF ENGINE
// Lock-In Fitness Competition App
// ============================================

export interface PlayoffBracket {
  semifinals: {
    match1: PlayoffMatchDisplay;
    match2: PlayoffMatchDisplay;
  };
  finals: PlayoffMatchDisplay | null;
  champion: User | null;
}

export interface PlayoffMatchDisplay {
  id: string;
  round: 1 | 2;
  matchNumber: 1 | 2;
  player1: {
    user: User;
    seed: number;
    score: number;
    isWinner: boolean;
  };
  player2: {
    user: User;
    seed: number;
    score: number;
    isWinner: boolean;
  };
  isFinalized: boolean;
  weekNumber: number;
}

/**
 * Get playoff qualifiers based on league size
 * All league sizes: top 4 qualify
 */
export function getPlayoffQualifiers(members: LeagueMember[], leagueSize?: number): LeagueMember[] {
  // Sort by wins (desc), then total points (desc)
  const sorted = [...members].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  
  // Always return top 4 for all league sizes
  const playoffSize = 4;
  
  return sorted.slice(0, Math.min(playoffSize, sorted.length));
}

/**
 * Generate playoff matchups for any league size
 * All leagues: 2 semifinals (1v4, 2v3), 1 final
 */
export function generatePlayoffMatchups(qualifiers: LeagueMember[]): {
  semifinal1: { player1: LeagueMember; player2: LeagueMember };
  semifinal2: { player1: LeagueMember; player2: LeagueMember };
} {
  const count = qualifiers.length;
  
  if (count < 4) {
    throw new Error('Need at least 4 players for playoffs');
  }
  
  // Standard 4-player bracket: 1vs4, 2vs3
  return {
    semifinal1: {
      player1: qualifiers[0], // 1st seed
      player2: qualifiers[3], // 4th seed
    },
    semifinal2: {
      player1: qualifiers[1], // 2nd seed
      player2: qualifiers[2], // 3rd seed
    },
  };
}

/**
 * Transform playoff matches into display bracket
 */
export function buildPlayoffBracket(
  matches: PlayoffMatch[],
  members: LeagueMember[]
): PlayoffBracket {
  const memberMap = new Map(members.map(m => [m.user_id, m]));
  
  const semifinals = matches.filter(m => m.round === 1);
  const finals = matches.find(m => m.round === 2);
  
  const semi1 = semifinals.find(m => m.match_number === 1);
  const semi2 = semifinals.find(m => m.match_number === 2);
  
  const bracket: PlayoffBracket = {
    semifinals: {
      match1: semi1 ? transformMatch(semi1, memberMap) : createEmptyMatch(1, 1),
      match2: semi2 ? transformMatch(semi2, memberMap) : createEmptyMatch(1, 2),
    },
    finals: finals ? transformMatch(finals, memberMap) : null,
    champion: finals?.winner_id ? (finals.player1?.id === finals.winner_id ? finals.player1 : finals.player2) || null : null,
  };
  
  return bracket;
}

function transformMatch(
  match: PlayoffMatch,
  memberMap: Map<string, LeagueMember>
): PlayoffMatchDisplay {
  const member1 = memberMap.get(match.player1_id);
  const member2 = memberMap.get(match.player2_id);
  
  return {
    id: match.id,
    round: match.round,
    matchNumber: match.match_number,
    player1: {
      user: match.player1 || createPlaceholderUser(match.player1_id),
      seed: member1?.playoff_seed || 0,
      score: match.player1_score,
      isWinner: match.winner_id === match.player1_id,
    },
    player2: {
      user: match.player2 || createPlaceholderUser(match.player2_id),
      seed: member2?.playoff_seed || 0,
      score: match.player2_score,
      isWinner: match.winner_id === match.player2_id,
    },
    isFinalized: match.is_finalized,
    weekNumber: match.week_number,
  };
}

function createEmptyMatch(round: 1 | 2, matchNumber: 1 | 2): PlayoffMatchDisplay {
  const placeholder = createPlaceholderUser('');
  return {
    id: '',
    round,
    matchNumber,
    player1: { user: placeholder, seed: 0, score: 0, isWinner: false },
    player2: { user: placeholder, seed: 0, score: 0, isWinner: false },
    isFinalized: false,
    weekNumber: 0,
  };
}

function createPlaceholderUser(id: string): User {
  return {
    id,
    email: '',
    username: 'TBD',
    avatar_url: null,
    push_token: null,
    created_at: '',
    updated_at: '',
  };
}

/**
 * Check if playoffs should start
 * @param currentWeek - The current week number
 * @param seasonLength - Total weeks in the regular season
 * @param playoffsStarted - Whether playoffs have already started
 * @param playerCount - Optional: Number of players in the league (need at least 4)
 */
export function shouldStartPlayoffs(
  currentWeek: number,
  seasonLength: number,
  playoffsStarted: boolean,
  playerCount?: number
): boolean {
  // Need at least 4 players for playoffs
  if (playerCount !== undefined && playerCount < 4) {
    return false;
  }
  return currentWeek > seasonLength && !playoffsStarted;
}

/**
 * Get current playoff round
 */
export function getCurrentPlayoffRound(matches: PlayoffMatch[]): 0 | 1 | 2 | 3 {
  if (matches.length === 0) return 0;
  
  const finals = matches.find(m => m.round === 2);
  if (finals?.is_finalized) return 3; // Champion crowned
  if (finals) return 2; // Finals in progress
  
  const semifinals = matches.filter(m => m.round === 1);
  if (semifinals.every(m => m.is_finalized)) return 2; // Ready for finals
  
  return 1; // Semifinals in progress
}

/**
 * Get playoff status text
 */
export function getPlayoffStatusText(round: 0 | 1 | 2 | 3): string {
  switch (round) {
    case 0:
      return 'Playoffs Not Started';
    case 1:
      return 'Semifinals';
    case 2:
      return 'Finals';
    case 3:
      return 'Season Complete';
    default:
      return '';
  }
}

/**
 * Determine if a user made the playoffs
 */
export function didMakePlayoffs(userId: string, members: LeagueMember[]): boolean {
  const qualifiers = getPlayoffQualifiers(members);
  return qualifiers.some(q => q.user_id === userId);
}

/**
 * Get user's playoff seed (1-4) or null if not in playoffs
 */
export function getUserPlayoffSeed(userId: string, members: LeagueMember[]): number | null {
  const qualifiers = getPlayoffQualifiers(members);
  const index = qualifiers.findIndex(q => q.user_id === userId);
  return index >= 0 ? index + 1 : null;
}

/**
 * Check if user is eliminated from playoffs
 */
export function isUserEliminated(userId: string, matches: PlayoffMatch[]): boolean {
  return matches.some(m => 
    m.is_finalized && 
    (m.player1_id === userId || m.player2_id === userId) &&
    m.winner_id !== userId
  );
}

/**
 * Check if user is the champion
 */
export function isUserChampion(userId: string, matches: PlayoffMatch[]): boolean {
  const finals = matches.find(m => m.round === 2 && m.is_finalized);
  return finals?.winner_id === userId;
}

/**
 * Get playoff match for a specific user
 */
export function getUserPlayoffMatch(
  userId: string,
  matches: PlayoffMatch[],
  round: 1 | 2
): PlayoffMatch | null {
  return matches.find(m => 
    m.round === round && 
    (m.player1_id === userId || m.player2_id === userId)
  ) || null;
}

