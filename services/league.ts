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
  if (league.start_date && league.current_week < league.season_length_weeks) {
    const { getWeekNumber } = await import('../utils/dates');
    const actualWeek = getWeekNumber(league.start_date);
    
    if (actualWeek > league.current_week) {
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
      // The generate_matchups function generates for the current week if matchups don't exist
      // So we call it after each week finalization to generate the next week's matchups
      for (let week = league.current_week + 1; week <= actualWeek; week++) {
        const weekMatchups = allMatchups.filter(m => m.week_number === week);
        if (weekMatchups.length === 0 && week <= league.season_length_weeks) {
          // Generating matchups for new week
          try {
            // The generate_matchups function checks current_week and generates matchups for it
            // So we need to update current_week first, then generate
            const { supabase } = await import('./supabase');
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
      const { supabase } = await import('./supabase');
      await supabase
        .from('leagues')
        .update({ current_week: actualWeek })
        .eq('id', leagueId);
      
      // Refresh league to get updated current_week
      league = await getLeague(leagueId);
      if (!league) throw new Error('League not found after update');
    }
  }
  
  const currentWeek = league.current_week;
  const isPlayoffs = league.playoffs_started;
  
  // Get current matchup
  let currentMatchup = allMatchups.find(
    m => m.week_number === currentWeek && 
    (m.player1_id === userId || m.player2_id === userId)
  ) || null;
  
  // If demo league (opponent is same as user), generate fake opponent
  if (currentMatchup && currentMatchup.player1_id === currentMatchup.player2_id) {
    const fakeOpponentNames = [
      'Alex Runner', 'Jordan Fit', 'Sam Active', 'Taylor Swift', 
      'Casey Strong', 'Morgan Pace', 'Riley Endurance', 'Quinn Power'
    ];
    const opponentIndex = currentWeek % fakeOpponentNames.length;
    const fakeOpponent: User = {
      id: `fake-opponent-${currentWeek}`,
      email: `opponent${currentWeek}@demo.com`,
      username: fakeOpponentNames[opponentIndex],
      avatar_url: null,
      push_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Replace opponent with fake user
    const isPlayer1 = currentMatchup.player1_id === userId;
    currentMatchup = {
      ...currentMatchup,
      player2_id: isPlayer1 ? fakeOpponent.id : currentMatchup.player2_id,
      player1_id: !isPlayer1 ? fakeOpponent.id : currentMatchup.player1_id,
      player2: isPlayer1 ? fakeOpponent : currentMatchup.player2,
      player1: !isPlayer1 ? fakeOpponent : currentMatchup.player1,
    };
  }
  
  // Get weekly scores
  let userScore: WeeklyScore | null = null;
  let opponentScore: WeeklyScore | null = null;
  
  if (currentMatchup) {
    try {
      const isPlayer1 = currentMatchup.player1_id === userId;
      const opponentId = isPlayer1 
        ? currentMatchup.player2_id 
        : currentMatchup.player1_id;
      
      // Only fetch real scores if opponent is not fake
      const isFakeOpponent = opponentId.startsWith('fake-opponent-') || opponentId.startsWith('fake-member-');
      
      [userScore, opponentScore] = await Promise.all([
        getWeeklyScore(leagueId, userId, currentWeek).catch(() => null),
        isFakeOpponent ? Promise.resolve(null) : getWeeklyScore(leagueId, opponentId, currentWeek).catch(() => null),
      ]);
      
      // Generate fake opponent score if needed
      if (isFakeOpponent && !opponentScore && currentMatchup) {
        const fakeScore = isPlayer1 ? (currentMatchup.player2_score || 0) : (currentMatchup.player1_score || 0);
        opponentScore = {
          id: `fake-score-${currentWeek}`,
          league_id: leagueId,
          user_id: opponentId,
          week_number: currentWeek,
          steps: Math.floor(fakeScore * 100),
          sleep_hours: Math.floor(fakeScore / 20),
          calories: Math.floor(fakeScore * 50),
          workouts: Math.floor(fakeScore / 20),
          distance: Math.floor(fakeScore / 10),
          total_points: fakeScore || 0,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      }
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
  
  // If demo league (only one real member), generate fake members for standings
  let displayMembers = [...members];
  if (members.length === 1 && league.name?.includes('Demo')) {
    const fakeOpponentNames = [
      'Alex Runner', 'Jordan Fit', 'Sam Active', 'Casey Strong', 
      'Morgan Pace', 'Riley Endurance', 'Quinn Power', 'Taylor Swift'
    ];
    const fakeMembers: LeagueMember[] = fakeOpponentNames.slice(0, 7).map((name, index) => {
      const fakeUserId = `fake-member-${index + 1}`;
      const fakeUser: User = {
        id: fakeUserId,
        email: `member${index + 1}@demo.com`,
        username: name,
        avatar_url: null,
        push_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return {
        id: `fake-member-${index + 1}`,
        league_id: leagueId,
        user_id: fakeUserId,
        wins: Math.floor(Math.random() * 3),
        losses: Math.floor(Math.random() * 3),
        ties: 0,
        total_points: 200 + Math.random() * 300,
        playoff_seed: null,
        is_eliminated: false,
        is_admin: false,
        joined_at: new Date().toISOString(),
        user: fakeUser,
      };
    });
    displayMembers = [...members, ...fakeMembers];
  }
  
  // Sort standings
  const standings = displayMembers.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  
  // Check if user is admin (creator is always admin)
  const isAdmin = league.created_by === userId;
  
  return {
    league,
    members: displayMembers,
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

