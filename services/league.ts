import {
  League,
  LeagueMember,
  Matchup,
  WeeklyScore,
  PlayoffMatch,
  User,
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
} from './supabase';
import { calculatePoints, FitnessMetrics, sanitizeMetrics } from './scoring';
import { getPlayoffQualifiers, shouldStartPlayoffs, buildPlayoffBracket, PlayoffBracket } from './playoffs';
import { isValidLeagueSize, validateLeagueCanStart, isLeagueFull } from './validation';

// ============================================
// LEAGUE SERVICE
// High-level league management functions
// ============================================

// Lock map to prevent race conditions on week advancement
const leagueWeekLocks = new Map<string, Promise<void>>();

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
  isAdmin: boolean;
}

/**
 * Validate league can start
 * @returns { canStart: boolean, message: string }
 */
export async function validateLeagueStart(leagueId: string, league: League): Promise<{ canStart: boolean; message: string }> {
  const members = await getLeagueMembers(leagueId);
  
  if (league.start_date) {
    return { canStart: false, message: 'League has already started' };
  }
  
  if (members.length < league.max_players) {
    const needed = league.max_players - members.length;
    return {
      canStart: false,
      message: `League not full: ${members.length}/${league.max_players}. Need ${needed} more player(s).`,
    };
  }
  
  return { canStart: true, message: 'League is ready to start' };
}

/**
 * Join a league by code (with validation for full leagues)
 * @throws Error if league is full, already started, or invalid code
 */
export async function joinLeague(joinCode: string, userId: string): Promise<LeagueMember> {
  // First, get the league by join code to validate it
  const { supabase } = await import('./supabase');
  const { data: leagueData, error: leagueError } = await supabase
    .from('leagues')
    .select('*')
    .eq('join_code', joinCode)
    .single();
  
  if (leagueError || !leagueData) {
    throw new Error('Invalid join code');
  }
  
  const league = leagueData as League;
  
  // Check if league has already started
  if (league.start_date) {
    const startDate = new Date(league.start_date);
    const now = new Date();
    if (startDate <= now) {
      throw new Error('Cannot join a league that has already started');
    }
  }
  
  // Check if league is full
  const members = await getLeagueMembers(league.id);
  if (members.length >= league.max_players) {
    throw new Error('This league is full. Cannot join.');
  }
  
  // Check if user is already in the league
  const existingMember = members.find(m => m.user_id === userId);
  if (existingMember) {
    throw new Error('You are already a member of this league');
  }
  
  // All validations passed - join the league
  return joinLeagueByCode(joinCode, userId);
}

/**
 * Create a new league
 * @throws Error if league size is invalid
 */
export async function createNewLeague(
  name: string,
  seasonLength: 6 | 8 | 10 | 12,
  userId: string,
  maxPlayers: 4 | 6 | 8 | 10 | 12 | 14,
  scoringConfig?: {
    points_per_1000_steps?: number;
    points_per_sleep_hour?: number;
    points_per_100_active_cal?: number;
    points_per_workout?: number;
    points_per_mile?: number;
  } | null
): Promise<League> {
  // Validate league size
  if (!isValidLeagueSize(maxPlayers)) {
    throw new Error(`Invalid league size: ${maxPlayers}. Allowed sizes: 4, 6, 8, 10, 12, 14`);
  }
  
  const league = await createLeagueDB(name, seasonLength, userId, maxPlayers, scoringConfig);
  return league;
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
  let league, members, allMatchups, playoffs;
  
  try {
    [league, members, allMatchups, playoffs] = await Promise.all([
      getLeague(leagueId),
      getLeagueMembers(leagueId),
      getMatchups(leagueId),
      getPlayoffs(leagueId).catch(() => []), // Playoffs might not exist, that's OK
    ]);
  } catch (error: any) {
    // Error fetching league dashboard data
    throw new Error(`Failed to load league: ${error.message || 'Unknown error'}`);
  }
  
  if (!league) throw new Error('League not found');
  
  // Auto-advance week if calendar week has advanced beyond current_week
  // Use a lock to prevent race conditions when multiple users load the dashboard simultaneously
  if (league.start_date && league.current_week < league.season_length_weeks) {
    const { getWeekNumber } = await import('../utils/dates');
    const actualWeek = getWeekNumber(league.start_date);
    
    if (actualWeek > league.current_week) {
      // Acquire lock for this league to prevent concurrent week advancement
      const lockKey = `week-advance-${leagueId}`;
      let lockPromise = leagueWeekLocks.get(lockKey);
      
      if (!lockPromise) {
        // Create new lock promise
        lockPromise = (async () => {
          try {
            // League auto-advanced to new week
            
            // Finalize any incomplete weeks between current_week and actualWeek
            const { finalizeWeek, startLeagueSeason } = await import('./supabase');
            for (let week = league.current_week; week < actualWeek; week++) {
              try {
                await finalizeWeek(leagueId, week);
                // Week finalized successfully
              } catch (error: any) {
                // Error finalizing week
              }
            }
            
            // Generate matchups for any missing weeks
            for (let week = league.current_week + 1; week <= actualWeek; week++) {
              const weekMatchups = allMatchups.filter(m => m.week_number === week);
              if (weekMatchups.length === 0 && week <= league.season_length_weeks) {
                // Generating matchups for new week
                try {
                  const { supabase } = await import('./supabase') as any;
                  const { error: updateError } = await supabase
                    .from('leagues')
                    .update({ current_week: week })
                    .eq('id', leagueId);
                  
                  if (updateError) throw updateError;
                  
                  // Generate matchups (will generate for current_week, which we just set)
                  await startLeagueSeason(leagueId);
                  
                  // Refresh matchups after generation
                  allMatchups = await getMatchups(leagueId);
                } catch (error: any) {
                  // Error generating matchups
                }
              }
            }
            
            // Ensure current_week is set to actualWeek after all processing
            const { supabase: sb } = await import('./supabase') as any;
            await sb
              .from('leagues')
              .update({ current_week: actualWeek })
              .eq('id', leagueId);
            
            // Refresh league to get updated current_week
            league = await getLeague(leagueId);
            if (!league) throw new Error('League not found after update');
          } finally {
            // Release lock
            leagueWeekLocks.delete(lockKey);
          }
        })();
        
        leagueWeekLocks.set(lockKey, lockPromise);
      }
      
      // Wait for lock to complete
      await lockPromise;
    }
  }
  
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
    try {
      const isPlayer1 = currentMatchup.player1_id === userId;
      const opponentId = isPlayer1
        ? currentMatchup.player2_id
        : currentMatchup.player1_id;


      [userScore, opponentScore] = await Promise.all([
        getWeeklyScore(leagueId, userId, currentWeek).catch(() => null),
        getWeeklyScore(leagueId, opponentId, currentWeek).catch(() => null),
      ]);
    } catch (error) {
      // Error fetching weekly scores
      // Continue with null scores - UI will handle gracefully
    }
  }
  
  // Calculate days remaining
  // If league hasn't started yet (start_date is in the future), show days until start
  // If league has started (start_date is today or in the past), show days remaining in current week
  let daysRemaining = 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to start of day
  
  if (!league.start_date) {
    // League hasn't been scheduled - show days until next Monday
    const { getNextMonday } = require('../utils/dates');
    const nextMonday = getNextMonday();
    const diffTime = nextMonday.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } else {
    const startDate = new Date(league.start_date);
    startDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    if (startDate > now) {
      // League is scheduled but hasn't started yet - show days until start
      const diffTime = startDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      // League has started - show days remaining in current week
      daysRemaining = calculateDaysRemainingInWeek(league.start_date, currentWeek);
    }
  }
  
  // Build playoff bracket if in playoffs
  const playoffBracket = isPlayoffs ? buildPlayoffBracket(playoffs, members) : null;
  
  // Sort standings (only real members, no fake demo members)
  const standings = members.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  
  // Check if user is admin (creator is always admin)
  const isAdmin = league.created_by === userId;
  
  return {
    league,
    members: standings,
    currentMatchup,
    userScore,
    opponentScore,
    standings,
    daysRemaining,
    isPlayoffs,
    playoffBracket: playoffBracket || null,
    isAdmin,
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
  // Sanitize metrics before syncing
  const sanitized = sanitizeMetrics(metrics);
  
  // Calculate points for the sanitized metrics
  const points = calculatePoints(sanitized);
  
  // Upsert the weekly score with sanitized data
  return upsertWeeklyScore(leagueId, userId, weekNumber, {
    steps: sanitized.steps,
    sleep_hours: sanitized.sleepHours,
    calories: sanitized.calories,
    workouts: sanitized.workouts,
    standHours: sanitized.standHours,
    distance: sanitized.distance,
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
  
  // Check if playoffs should start BEFORE finalizing (since finalizeWeek advances current_week)
  // After finalization, currentWeek will be currentWeek + 1
  const nextWeek = currentWeek + 1;
  const shouldStartPlayoffsAfterFinalization = shouldStartPlayoffs(nextWeek, league.season_length_weeks, league.playoffs_started);
  
  // Finalize the week (this advances current_week by 1)
  await finalizeWeek(leagueId, currentWeek);
  
  // Verify matchups exist for the new week (they should have been generated at league start)
  // But if they don't exist (e.g., demo league wasn't seeded properly), generate them
  const { getMatchups, startLeagueSeason } = await import('./supabase');
  const newWeekMatchups = await getMatchups(leagueId, nextWeek);
  if (newWeekMatchups.length === 0 && nextWeek <= league.season_length_weeks) {
    // No matchups found, generating them
    // Matchups should already exist, but if they don't, generate them
    // This can happen if the league wasn't seeded properly
    await startLeagueSeason(leagueId);
  }
  
  // Check if playoffs should start (after week advancement)
  if (shouldStartPlayoffsAfterFinalization) {
    try {
      await generatePlayoffsDB(leagueId);
    } catch (error: any) {
      // Handle case where league has < 4 players gracefully
      if (error.message?.includes('Not enough players')) {
        // Cannot start playoffs - insufficient players
        // Don't throw - league can continue without playoffs
      } else {
        throw error;
      }
    }
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
  
  // startDate should be a Monday, and weeks run Monday-Sunday
  const start = new Date(startDate);
  
  // Calculate the start of the current week (Monday)
  // Week 1 starts on startDate (which is a Monday)
  // Week N starts on startDate + (N-1) * 7 days
  const weekStart = new Date(start.getTime() + ((currentWeek - 1) * 7 * 24 * 60 * 60 * 1000));
  
  // Week ends on Sunday (6 days after Monday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
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
  // startDate should be a Monday, and weeks run Monday-Sunday
  let start: Date;
  
  if (startDate) {
    start = new Date(startDate);
  } else {
    // If no start date, use current Monday (shouldn't happen for active leagues)
    const { getStartOfWeekMonday } = require('../utils/dates');
    start = getStartOfWeekMonday(new Date());
  }
  
  // Week 1 starts on startDate (Monday)
  // Week N starts on startDate + (N-1) * 7 days
  const weekStart = new Date(start.getTime() + ((weekNumber - 1) * 7 * 24 * 60 * 60 * 1000));
  weekStart.setHours(0, 0, 0, 0);
  
  // Week ends on Sunday (6 days after Monday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

