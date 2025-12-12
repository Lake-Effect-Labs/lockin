import { FitnessMetrics } from '@/services/scoring';
import { DailyHealthData } from '@/services/health';
import { User, League, LeagueMember, Matchup, WeeklyScore, PlayoffMatch } from '@/services/supabase';

// ============================================
// FAKE DATA GENERATOR
// For Windows development and testing
// ============================================

// Random number generator with seed for consistency
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

// Get random number in range
function randomInRange(min: number, max: number, random: () => number = Math.random): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

// Get random float in range
function randomFloatInRange(min: number, max: number, random: () => number = Math.random): number {
  return Math.round((random() * (max - min) + min) * 100) / 100;
}

// ============================================
// DAILY METRICS GENERATION
// ============================================

/**
 * Generate realistic daily fitness metrics
 */
export function generateDailyMetrics(seed?: number): FitnessMetrics {
  const random = seed !== undefined ? seededRandom(seed) : Math.random;
  
  // Realistic ranges based on average active person
  const isActiveDay = random() > 0.3; // 70% chance of being active
  const isWorkoutDay = random() > 0.6; // 40% chance of workout
  
  return {
    steps: isActiveDay 
      ? randomInRange(5000, 15000, random) 
      : randomInRange(1000, 5000, random),
    sleepHours: randomFloatInRange(5, 9, random),
    calories: isActiveDay 
      ? randomInRange(200, 600, random) 
      : randomInRange(50, 200, random),
    workouts: isWorkoutDay ? randomInRange(1, 2, random) : 0,
    distance: isActiveDay 
      ? randomFloatInRange(2, 8, random) 
      : randomFloatInRange(0.5, 2, random),
  };
}

/**
 * Generate a week's worth of daily data
 */
export function generateWeekData(startDate?: Date): DailyHealthData[] {
  const start = startDate || getStartOfCurrentWeek();
  const data: DailyHealthData[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Only generate data up to today
    if (date <= today) {
      // Use date as seed for consistent data per day
      // This ensures the same date always generates the same data
      const seed = date.getTime();
      const metrics = generateDailyMetrics(seed);
      
      data.push({
        date: date.toISOString().split('T')[0],
        ...metrics,
      });
    }
  }
  
  return data;
}

function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.setDate(diff));
}

// ============================================
// OPPONENT DATA GENERATION
// ============================================

/**
 * Generate opponent stats for a matchup
 */
export function generateOpponentStats(weekNumber: number, opponentId: string): FitnessMetrics {
  const seed = weekNumber * 1000 + opponentId.charCodeAt(0);
  return generateDailyMetrics(seed);
}

/**
 * Generate weekly score for opponent
 */
export function generateOpponentWeeklyScore(weekNumber: number, opponentId: string): WeeklyScore {
  const metrics = generateOpponentStats(weekNumber, opponentId);
  const totalPoints = calculateMockPoints(metrics);
  
  return {
    id: `mock-score-${opponentId}-${weekNumber}`,
    league_id: 'mock-league',
    user_id: opponentId,
    week_number: weekNumber,
    steps: metrics.steps * 7, // Weekly total
    sleep_hours: metrics.sleepHours * 7,
    calories: metrics.calories * 7,
    workouts: Math.floor(metrics.workouts * 3), // ~3 workouts per week
    distance: metrics.distance * 7,
    total_points: totalPoints * 7,
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
}

function calculateMockPoints(metrics: FitnessMetrics): number {
  return (
    (metrics.steps / 1000) * 1 +
    metrics.sleepHours * 2 +
    (metrics.calories / 100) * 5 +
    metrics.workouts * 20 +
    metrics.distance * 3
  );
}

// ============================================
// MOCK USER GENERATION
// ============================================

const MOCK_NAMES = [
  'Alex Thunder', 'Jordan Storm', 'Casey Blaze', 'Morgan Steel',
  'Taylor Swift', 'Riley Champion', 'Quinn Victory', 'Avery Power',
  'Blake Force', 'Drew Lightning', 'Sage Warrior', 'Reese Titan',
];

const MOCK_AVATARS = [
  '🏃', '💪', '🏋️', '🚴', '⚡', '🔥', '🏆', '🎯', '🥇', '🦾', '🏅', '💥',
];

/**
 * Generate mock user
 */
export function generateMockUser(index: number): User {
  return {
    id: `mock-user-${index}`,
    email: `user${index}@lockin.app`,
    username: MOCK_NAMES[index % MOCK_NAMES.length],
    avatar_url: null,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Generate mock users for a league
 */
export function generateMockUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => generateMockUser(i));
}

// ============================================
// MOCK LEAGUE GENERATION
// ============================================

/**
 * Generate mock league
 */
export function generateMockLeague(userId: string): League {
  return {
    id: 'mock-league-1',
    name: 'Fitness Warriors',
    join_code: 'FIT123',
    created_by: userId,
    season_length_weeks: 8,
    current_week: 3,
    start_date: getWeeksAgoDate(3),
    is_active: true,
    playoffs_started: false,
    champion_id: null,
    max_players: 8,
    created_at: getWeeksAgoDate(3),
  };
}

function getWeeksAgoDate(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (weeks * 7));
  return date.toISOString().split('T')[0];
}

/**
 * Generate mock league members
 */
export function generateMockMembers(league: League, users: User[]): LeagueMember[] {
  const gamesPlayed = Math.max(0, league.current_week - 1);
  
  return users.map((user, index) => {
    // Generate realistic record (wins + losses + ties = games played)
    const wins = randomInRange(0, gamesPlayed);
    const remainingGames = gamesPlayed - wins;
    const ties = Math.random() > 0.8 ? randomInRange(0, Math.min(2, remainingGames)) : 0;
    const losses = remainingGames - ties;
    
    return {
      id: `mock-member-${index}`,
      league_id: league.id,
      user_id: user.id,
      wins,
      losses,
      ties,
      total_points: randomInRange(50, 200) * league.current_week,
      playoff_seed: null,
      is_eliminated: false,
      is_admin: index === 0, // First user is admin
      joined_at: league.created_at,
      user,
    };
  });
}

// ============================================
// MOCK MATCHUP GENERATION
// ============================================

/**
 * Generate mock matchup for current week
 */
export function generateMockMatchup(
  league: League,
  userId: string,
  opponent: User
): Matchup {
  return {
    id: `mock-matchup-${league.current_week}`,
    league_id: league.id,
    week_number: league.current_week,
    player1_id: userId,
    player2_id: opponent.id,
    player1_score: randomInRange(50, 150),
    player2_score: randomInRange(50, 150),
    winner_id: null,
    is_tie: false,
    is_finalized: false,
    created_at: new Date().toISOString(),
    player1: generateMockUser(0),
    player2: opponent,
  };
}

/**
 * Generate all matchups for a league
 */
export function generateMockMatchups(
  league: League,
  members: LeagueMember[]
): Matchup[] {
  const matchups: Matchup[] = [];
  
  for (let week = 1; week <= league.current_week; week++) {
    // Simple round-robin pairing
    for (let i = 0; i < members.length; i += 2) {
      if (i + 1 < members.length) {
        const isFinalized = week < league.current_week;
        const p1Score = randomInRange(50, 150);
        const p2Score = randomInRange(50, 150);
        
        matchups.push({
          id: `mock-matchup-${week}-${i}`,
          league_id: league.id,
          week_number: week,
          player1_id: members[i].user_id,
          player2_id: members[i + 1].user_id,
          player1_score: p1Score,
          player2_score: p2Score,
          winner_id: isFinalized 
            ? (p1Score > p2Score ? members[i].user_id : members[i + 1].user_id)
            : null,
          is_tie: isFinalized && p1Score === p2Score,
          is_finalized: isFinalized,
          created_at: new Date().toISOString(),
          player1: members[i].user,
          player2: members[i + 1].user,
        });
      }
    }
  }
  
  return matchups;
}

// ============================================
// MOCK PLAYOFFS GENERATION
// ============================================

/**
 * Generate mock playoff bracket
 */
export function generateMockPlayoffs(
  league: League,
  members: LeagueMember[],
  isComplete: boolean = false
): PlayoffMatch[] {
  // Sort members by wins to get top 4
  const sorted = [...members].sort((a, b) => b.wins - a.wins);
  const top4 = sorted.slice(0, 4);
  
  const playoffs: PlayoffMatch[] = [];
  
  // Semifinals: 1 vs 4, 2 vs 3
  const semi1Winner = isComplete ? top4[0] : null;
  const semi2Winner = isComplete ? top4[1] : null;
  
  playoffs.push({
    id: 'mock-playoff-semi-1',
    league_id: league.id,
    round: 1,
    match_number: 1,
    player1_id: top4[0].user_id,
    player2_id: top4[3].user_id,
    player1_score: isComplete ? randomInRange(100, 200) : 0,
    player2_score: isComplete ? randomInRange(80, 180) : 0,
    winner_id: semi1Winner?.user_id || null,
    is_finalized: isComplete,
    week_number: league.season_length_weeks + 1,
    created_at: new Date().toISOString(),
    player1: top4[0].user,
    player2: top4[3].user,
  });
  
  playoffs.push({
    id: 'mock-playoff-semi-2',
    league_id: league.id,
    round: 1,
    match_number: 2,
    player1_id: top4[1].user_id,
    player2_id: top4[2].user_id,
    player1_score: isComplete ? randomInRange(100, 200) : 0,
    player2_score: isComplete ? randomInRange(80, 180) : 0,
    winner_id: semi2Winner?.user_id || null,
    is_finalized: isComplete,
    week_number: league.season_length_weeks + 1,
    created_at: new Date().toISOString(),
    player1: top4[1].user,
    player2: top4[2].user,
  });
  
  // Finals (only if semis complete)
  if (isComplete && semi1Winner && semi2Winner) {
    const champion = Math.random() > 0.5 ? semi1Winner : semi2Winner;
    
    playoffs.push({
      id: 'mock-playoff-finals',
      league_id: league.id,
      round: 2,
      match_number: 1,
      player1_id: semi1Winner.user_id,
      player2_id: semi2Winner.user_id,
      player1_score: randomInRange(120, 220),
      player2_score: randomInRange(100, 200),
      winner_id: champion.user_id,
      is_finalized: true,
      week_number: league.season_length_weeks + 2,
      created_at: new Date().toISOString(),
      player1: semi1Winner.user,
      player2: semi2Winner.user,
    });
  }
  
  return playoffs;
}

// ============================================
// COMPLETE MOCK DATA SET
// ============================================

export interface MockDataSet {
  users: User[];
  league: League;
  members: LeagueMember[];
  matchups: Matchup[];
  playoffs: PlayoffMatch[];
  currentMatchup: Matchup | null;
  userWeeklyScore: WeeklyScore;
  opponentWeeklyScore: WeeklyScore;
}

/**
 * Generate complete mock data set for testing
 */
export function generateMockDataSet(userId: string): MockDataSet {
  const users = generateMockUsers(8);
  users[0] = { ...users[0], id: userId }; // Replace first user with actual user
  
  const league = generateMockLeague(userId);
  const members = generateMockMembers(league, users);
  const matchups = generateMockMatchups(league, members);
  const playoffs = league.playoffs_started 
    ? generateMockPlayoffs(league, members)
    : [];
  
  const currentMatchup = matchups.find(
    m => m.week_number === league.current_week && 
    (m.player1_id === userId || m.player2_id === userId)
  ) || null;
  
  const opponentId = currentMatchup
    ? (currentMatchup.player1_id === userId 
        ? currentMatchup.player2_id 
        : currentMatchup.player1_id)
    : users[1].id;
  
  const weekData = generateWeekData();
  const weeklyTotals = weekData.reduce(
    (acc, day) => ({
      steps: acc.steps + day.steps,
      sleepHours: acc.sleepHours + day.sleepHours,
      calories: acc.calories + day.calories,
      workouts: acc.workouts + day.workouts,
      distance: acc.distance + day.distance,
    }),
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 }
  );
  
  return {
    users,
    league,
    members,
    matchups,
    playoffs,
    currentMatchup,
    userWeeklyScore: {
      id: `mock-score-${userId}`,
      league_id: league.id,
      user_id: userId,
      week_number: league.current_week,
      steps: weeklyTotals.steps,
      sleep_hours: weeklyTotals.sleepHours,
      calories: weeklyTotals.calories,
      workouts: weeklyTotals.workouts,
      distance: weeklyTotals.distance,
      total_points: calculateMockPoints(weeklyTotals),
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    opponentWeeklyScore: generateOpponentWeeklyScore(league.current_week, opponentId),
  };
}

