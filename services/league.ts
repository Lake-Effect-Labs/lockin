import {
  League,
  LeagueMember,
  Matchup,
  WeeklyScore,
  PlayoffMatch,
  createLeague as createLeagueDB,
  getLeague,
  getUserLeagues,
  joinLeagueByCode,
  leaveLeague as leaveLeagueDB,
  getLeagueMembers,
  startLeagueSeason,
  getMatchups,
  getUserMatchup,
  getWeeklyScore,
  upsertWeeklyScore,
  getLeagueWeeklyScores,
  finalizeWeek,
  getPlayoffs,
  generatePlayoffs as generatePlayoffsDB,
  updatePlayoffScores,
  finalizePlayoffMatch,
  User,
} from './supabase';
import { calculatePoints, FitnessMetrics } from './scoring';
import { getPlayoffQualifiers, shouldStartPlayoffs, buildPlayoffBracket, PlayoffBracket } from './playoffs';

// ============================================
// LEAGUE SERVICE
// High-level league management functions
// ============================================

export interface LeagueWithDetails extends League {
  members: LeagueMember[];
  memberCount: number;
  userMember: LeagueMember | null;
}

export interface MatchupWithScores extends Matchup {
  player1WeeklyScore: WeeklyScore | null;
  player2WeeklyScore: WeeklyScore | null;
}

export interface LeagueDashboard {
  league: League;
  members: LeagueMember[];
  currentMatchup: Matchup | null;
  userScore: WeeklyScore | null;
  opponentScore: WeeklyScore | null;
  standings: LeagueMember[];
  daysRemaining: number;
  isPlayoffs: boolean;
  playoffBracket: PlayoffBracket | null;
}

/**
 * Create a new league
 */
export async function createNewLeague(
  name: string,
  seasonLength: 6 | 8 | 10 | 12,
  userId: string,
  scoringConfig?: {
    points_per_1000_steps?: number;
    points_per_sleep_hour?: number;
    points_per_100_active_cal?: number;
    points_per_workout?: number;
    points_per_mile?: number;
  } | null
): Promise<League> {
  const league = await createLeagueDB(name, seasonLength, userId, scoringConfig);
  return league;
}

/**
 * Join a league by code
 */
export async function joinLeague(joinCode: string, userId: string): Promise<LeagueMember> {
  return joinLeagueByCode(joinCode, userId);
}

/**
 * Leave a league
 */
export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
  return leaveLeagueDB(leagueId, userId);
}

/**
 * Get all leagues for a user with details
 */
export async function getUserLeaguesWithDetails(userId: string): Promise<LeagueWithDetails[]> {
  const leagues = await getUserLeagues(userId);
  
  const leaguesWithDetails = await Promise.all(
    leagues.map(async (league) => {
      const members = await getLeagueMembers(league.id);
      const userMember = members.find(m => m.user_id === userId) || null;
      
      return {
        ...league,
        members,
        memberCount: members.length,
        userMember,
      };
    })
  );
  
  return leaguesWithDetails;
}

/**
 * Get full league dashboard data
 */
export async function getLeagueDashboard(
  leagueId: string,
  userId: string
): Promise<LeagueDashboard> {
  const [league, members, allMatchups, playoffs] = await Promise.all([
    getLeague(leagueId),
    getLeagueMembers(leagueId),
    getMatchups(leagueId),
    getPlayoffs(leagueId),
  ]);
  
  if (!league) throw new Error('League not found');
  
  const currentWeek = league.current_week;
  const isPlayoffs = league.playoffs_started;
  
  // Get current matchup
  const currentMatchup = allMatchups.find(
    m => m.week_number === currentWeek && 
    (m.player1_id === userId || m.player2_id === userId)
  ) || null;
  
  // Get weekly scores
  let userScore: WeeklyScore | null = null;
  let opponentScore: WeeklyScore | null = null;
  
  if (currentMatchup) {
    const opponentId = currentMatchup.player1_id === userId 
      ? currentMatchup.player2_id 
      : currentMatchup.player1_id;
    
    [userScore, opponentScore] = await Promise.all([
      getWeeklyScore(leagueId, userId, currentWeek),
      getWeeklyScore(leagueId, opponentId, currentWeek),
    ]);
  }
  
  // Calculate days remaining in week
  const daysRemaining = calculateDaysRemainingInWeek(league.start_date, currentWeek);
  
  // Build playoff bracket if in playoffs
  const playoffBracket = isPlayoffs ? buildPlayoffBracket(playoffs, members) : null;
  
  // Sort standings
  const standings = [...members].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  
  return {
    league,
    members,
    currentMatchup,
    userScore,
    opponentScore,
    standings,
    daysRemaining,
    isPlayoffs,
    playoffBracket,
  };
}

/**
 * Sync user's fitness data and update weekly score
 */
export async function syncUserScore(
  leagueId: string,
  userId: string,
  weekNumber: number,
  metrics: FitnessMetrics
): Promise<WeeklyScore> {
  return upsertWeeklyScore(leagueId, userId, weekNumber, {
    steps: metrics.steps,
    sleep_hours: metrics.sleepHours,
    calories: metrics.calories,
    workouts: metrics.workouts,
    distance: metrics.distance,
  });
}

/**
 * Check and process end of week
 */
export async function processWeekEnd(leagueId: string): Promise<boolean> {
  const league = await getLeague(leagueId);
  if (!league) return false;
  
  const currentWeek = league.current_week;
  const daysRemaining = calculateDaysRemainingInWeek(league.start_date, currentWeek);
  
  if (daysRemaining > 0) return false;
  
  // Finalize the week
  await finalizeWeek(leagueId, currentWeek);
  
  // Check if playoffs should start
  if (shouldStartPlayoffs(currentWeek + 1, league.season_length_weeks, league.playoffs_started)) {
    await generatePlayoffsDB(leagueId);
  }
  
  return true;
}

/**
 * Get matchup details with full scores
 */
export async function getMatchupDetails(
  leagueId: string,
  matchupId: string
): Promise<MatchupWithScores | null> {
  const matchups = await getMatchups(leagueId);
  const matchup = matchups.find(m => m.id === matchupId);
  
  if (!matchup) return null;
  
  const [player1Score, player2Score] = await Promise.all([
    getWeeklyScore(leagueId, matchup.player1_id, matchup.week_number),
    getWeeklyScore(leagueId, matchup.player2_id, matchup.week_number),
  ]);
  
  return {
    ...matchup,
    player1WeeklyScore: player1Score,
    player2WeeklyScore: player2Score,
  };
}

/**
 * Start the league season (generate matchups)
 */
export async function startSeason(leagueId: string): Promise<void> {
  await startLeagueSeason(leagueId);
}

/**
 * Get user's record in a league
 */
export function getUserRecord(member: LeagueMember): string {
  return `${member.wins}-${member.losses}${member.ties > 0 ? `-${member.ties}` : ''}`;
}

/**
 * Get standings position for a user
 */
export function getUserStandingsPosition(userId: string, members: LeagueMember[]): number {
  const sorted = [...members].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  
  return sorted.findIndex(m => m.user_id === userId) + 1;
}

/**
 * Check if user is the league creator
 */
export function isLeagueCreator(league: League, userId: string): boolean {
  return league.created_by === userId;
}

/**
 * Calculate days remaining in the current week
 */
function calculateDaysRemainingInWeek(startDate: string | null, currentWeek: number): number {
  if (!startDate) return 7;
  
  const start = new Date(startDate);
  const weekEnd = new Date(start);
  weekEnd.setDate(start.getDate() + (currentWeek * 7));
  
  const now = new Date();
  const diffTime = weekEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Format countdown text
 */
export function formatCountdown(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Week ends today!';
  if (daysRemaining === 1) return '1 day remaining';
  return `${daysRemaining} days remaining`;
}

/**
 * Get week date range
 */
export function getWeekDateRange(startDate: string | null, weekNumber: number): { start: Date; end: Date } {
  const start = startDate ? new Date(startDate) : new Date();
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + ((weekNumber - 1) * 7));
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return { start: weekStart, end: weekEnd };
}

