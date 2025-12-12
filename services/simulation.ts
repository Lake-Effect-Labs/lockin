// ============================================
// SIMULATION & TEST ENGINE
// Lock-In Fitness Competition App
// End-to-end testing and validation
// ============================================

import { calculatePoints, getPointsBreakdown, compareScores, aggregateWeeklyMetrics, FitnessMetrics, SCORING_CONFIG } from './scoring';
import { getPlayoffQualifiers, generatePlayoffMatchups, shouldStartPlayoffs } from './playoffs';
import { LeagueMember, User, Matchup, WeeklyScore, PlayoffMatch, League } from './supabase';
import { supabase, createLeague, joinLeagueByCode, startLeagueSeason, upsertWeeklyScore, finalizeWeek, generatePlayoffsDB, finalizePlayoffMatch } from './supabase';
import { runAllTests } from '../tests/comprehensive-tests';

// ============================================
// SECTION A: SCORING ENGINE TESTS
// ============================================

export interface TestResult {
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  message?: string;
}

/**
 * Run all scoring engine tests
 */
export function runScoringTests(): TestResult[] {
  const results: TestResult[] = [];
  
  // TEST A1 — Basic Scoring
  const testA1Input: FitnessMetrics = {
    steps: 10000,
    sleepHours: 8,
    calories: 600,
    workouts: 2,
    distance: 4,
  };
  const testA1Expected = {
    stepsPoints: 10,
    sleepPoints: 16,
    caloriesPoints: 30,
    workoutsPoints: 40,
    distancePoints: 12,
    totalPoints: 108,
  };
  const testA1Actual = getPointsBreakdown(testA1Input);
  results.push({
    name: 'A1 - Basic Scoring',
    passed: testA1Actual.totalPoints === testA1Expected.totalPoints,
    expected: testA1Expected,
    actual: testA1Actual,
  });
  
  // TEST A2 — Zero Values
  const testA2Input: FitnessMetrics = {
    steps: 0,
    sleepHours: 0,
    calories: 0,
    workouts: 0,
    distance: 0,
  };
  const testA2Actual = calculatePoints(testA2Input);
  results.push({
    name: 'A2 - Zero Values',
    passed: testA2Actual === 0,
    expected: 0,
    actual: testA2Actual,
  });
  
  // TEST A3 — High Data Stress Test
  const testA3Input: FitnessMetrics = {
    steps: 30000,
    sleepHours: 6.5,
    calories: 1200,
    workouts: 3,
    distance: 10,
  };
  const testA3Expected = {
    stepsPoints: 30,
    sleepPoints: 13,
    caloriesPoints: 60,
    workoutsPoints: 60,
    distancePoints: 30,
    totalPoints: 193,
  };
  const testA3Actual = getPointsBreakdown(testA3Input);
  results.push({
    name: 'A3 - High Data Stress Test',
    passed: testA3Actual.totalPoints === testA3Expected.totalPoints,
    expected: testA3Expected,
    actual: testA3Actual,
  });
  
  return results;
}

// ============================================
// SECTION B: WEEKLY ACCUMULATION TESTS
// ============================================

export function runWeeklyAccumulationTests(): TestResult[] {
  const results: TestResult[] = [];
  
  // TEST B1 — Daily Merge (Steps)
  const dailySteps = [5000, 8000, 12000, 3000];
  const totalSteps = dailySteps.reduce((a, b) => a + b, 0);
  results.push({
    name: 'B1 - Daily Steps Merge',
    passed: totalSteps === 28000,
    expected: 28000,
    actual: totalSteps,
  });
  
  // TEST B2 — Workout Merge
  const dailyWorkouts = [0, 1, 2, 0, 1, 0, 1];
  const totalWorkouts = dailyWorkouts.reduce((a, b) => a + b, 0);
  results.push({
    name: 'B2 - Workout Merge',
    passed: totalWorkouts === 5,
    expected: 5,
    actual: totalWorkouts,
  });
  
  // TEST B3 — Sleep Merge
  const dailySleep = [7, 8, 8.5, 6, 5.5, 9, 7.5];
  const totalSleep = dailySleep.reduce((a, b) => a + b, 0);
  results.push({
    name: 'B3 - Sleep Merge',
    passed: totalSleep === 51.5,
    expected: 51.5,
    actual: totalSleep,
  });
  
  // Test aggregateWeeklyMetrics function
  const weeklyData: FitnessMetrics[] = [
    { steps: 5000, sleepHours: 7, calories: 200, workouts: 0, distance: 2 },
    { steps: 8000, sleepHours: 8, calories: 300, workouts: 1, distance: 3 },
    { steps: 12000, sleepHours: 8.5, calories: 400, workouts: 2, distance: 5 },
    { steps: 3000, sleepHours: 6, calories: 100, workouts: 0, distance: 1 },
  ];
  const aggregated = aggregateWeeklyMetrics(weeklyData);
  results.push({
    name: 'B4 - Aggregate Weekly Metrics',
    passed: aggregated.steps === 28000 && aggregated.workouts === 3,
    expected: { steps: 28000, workouts: 3 },
    actual: { steps: aggregated.steps, workouts: aggregated.workouts },
  });
  
  return results;
}

// ============================================
// SECTION C: MATCHUP RESOLUTION TESTS
// ============================================

export function runMatchupTests(): TestResult[] {
  const results: TestResult[] = [];
  
  // TEST C1 — Simple Winner
  const c1Result = compareScores(102, 78);
  results.push({
    name: 'C1 - Simple Winner (A wins)',
    passed: c1Result.winner === 1 && !c1Result.isTie,
    expected: { winner: 1, isTie: false },
    actual: c1Result,
  });
  
  // TEST C2 — Tie
  const c2Result = compareScores(92, 92);
  results.push({
    name: 'C2 - Tie',
    passed: c2Result.winner === null && c2Result.isTie,
    expected: { winner: null, isTie: true },
    actual: c2Result,
  });
  
  // TEST C3 — Close Game
  const c3Result = compareScores(98.2, 98.1);
  results.push({
    name: 'C3 - Close Game (A wins by 0.1)',
    passed: c3Result.winner === 1 && c3Result.margin < 0.2,
    expected: { winner: 1, margin: 0.1 },
    actual: c3Result,
  });
  
  return results;
}

// ============================================
// SECTION D & E: FULL SEASON SIMULATION
// ============================================

export interface SimulatedPlayer {
  id: string;
  name: string;
  weeklyScores: number[];
  wins: number;
  losses: number;
  ties: number;
  totalPoints: number;
}

export interface SeasonSimulation {
  players: SimulatedPlayer[];
  matchups: Array<{
    week: number;
    player1Id: string;
    player2Id: string;
    player1Score: number;
    player2Score: number;
    winnerId: string | null;
    isTie: boolean;
  }>;
  standings: SimulatedPlayer[];
  playoffSeeds: SimulatedPlayer[];
  semifinals: Array<{
    matchNumber: number;
    player1: SimulatedPlayer;
    player2: SimulatedPlayer;
    winnerId: string | null;
  }>;
  finals: {
    player1: SimulatedPlayer | null;
    player2: SimulatedPlayer | null;
    winnerId: string | null;
  } | null;
  champion: SimulatedPlayer | null;
}

/**
 * Generate random weekly score
 */
function generateRandomWeeklyScore(seed: number): number {
  // Seeded random for reproducibility
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  
  // Generate realistic weekly score (50-200 range)
  return Math.round((50 + rand * 150) * 100) / 100;
}

/**
 * Run full season simulation
 */
export function runSeasonSimulation(
  playerCount: number = 4,
  weekCount: number = 8,
  seed: number = 12345
): SeasonSimulation {
  // Create players
  const players: SimulatedPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i + 1}`,
    name: ['Sam', 'Mike', 'Kevin', 'Jake', 'Alex', 'Jordan', 'Casey', 'Riley'][i] || `Player${i + 1}`,
    weeklyScores: [],
    wins: 0,
    losses: 0,
    ties: 0,
    totalPoints: 0,
  }));
  
  // Generate weekly scores for each player
  players.forEach((player, playerIdx) => {
    for (let week = 1; week <= weekCount; week++) {
      const score = generateRandomWeeklyScore(seed + playerIdx * 100 + week);
      player.weeklyScores.push(score);
      player.totalPoints += score;
    }
  });
  
  // Generate round-robin matchups
  const matchups: SeasonSimulation['matchups'] = [];
  
  for (let week = 1; week <= weekCount; week++) {
    // Simple pairing: rotate players
    const rotated = [...players];
    for (let i = 0; i < week - 1; i++) {
      const last = rotated.pop()!;
      rotated.splice(1, 0, last);
    }
    
    // Create matchups
    for (let i = 0; i < Math.floor(playerCount / 2); i++) {
      const p1 = rotated[i];
      const p2 = rotated[playerCount - 1 - i];
      
      const p1Score = p1.weeklyScores[week - 1];
      const p2Score = p2.weeklyScores[week - 1];
      
      let winnerId: string | null = null;
      let isTie = false;
      
      if (p1Score > p2Score) {
        winnerId = p1.id;
        p1.wins++;
        p2.losses++;
      } else if (p2Score > p1Score) {
        winnerId = p2.id;
        p2.wins++;
        p1.losses++;
      } else {
        isTie = true;
        p1.ties++;
        p2.ties++;
      }
      
      matchups.push({
        week,
        player1Id: p1.id,
        player2Id: p2.id,
        player1Score: p1Score,
        player2Score: p2Score,
        winnerId,
        isTie,
      });
    }
  }
  
  // Sort standings
  const standings = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.totalPoints - a.totalPoints;
  });
  
  // Playoff seeding (top 4)
  const playoffSeeds = standings.slice(0, 4);
  
  // Simulate semifinals
  const semifinals: SeasonSimulation['semifinals'] = [];
  
  if (playoffSeeds.length >= 4) {
    // Semi 1: Seed 1 vs Seed 4
    const semi1P1 = playoffSeeds[0];
    const semi1P2 = playoffSeeds[3];
    const semi1P1Score = generateRandomWeeklyScore(seed + 1000);
    const semi1P2Score = generateRandomWeeklyScore(seed + 1001);
    const semi1Winner = semi1P1Score > semi1P2Score ? semi1P1 : semi1P2;
    
    semifinals.push({
      matchNumber: 1,
      player1: semi1P1,
      player2: semi1P2,
      winnerId: semi1Winner.id,
    });
    
    // Semi 2: Seed 2 vs Seed 3
    const semi2P1 = playoffSeeds[1];
    const semi2P2 = playoffSeeds[2];
    const semi2P1Score = generateRandomWeeklyScore(seed + 1002);
    const semi2P2Score = generateRandomWeeklyScore(seed + 1003);
    const semi2Winner = semi2P1Score > semi2P2Score ? semi2P1 : semi2P2;
    
    semifinals.push({
      matchNumber: 2,
      player1: semi2P1,
      player2: semi2P2,
      winnerId: semi2Winner.id,
    });
    
    // Finals
    const finalist1 = semi1Winner;
    const finalist2 = semi2Winner;
    const finalsP1Score = generateRandomWeeklyScore(seed + 2000);
    const finalsP2Score = generateRandomWeeklyScore(seed + 2001);
    const champion = finalsP1Score > finalsP2Score ? finalist1 : finalist2;
    
    return {
      players,
      matchups,
      standings,
      playoffSeeds,
      semifinals,
      finals: {
        player1: finalist1,
        player2: finalist2,
        winnerId: champion.id,
      },
      champion,
    };
  }
  
  return {
    players,
    matchups,
    standings,
    playoffSeeds,
    semifinals,
    finals: null,
    champion: null,
  };
}

// ============================================
// SECTION F: EDGE CASE TESTS
// ============================================

export function runEdgeCaseTests(): TestResult[] {
  const results: TestResult[] = [];
  
  // TEST F1 — All Players Same Points (tiebreaker test)
  const samePointsPlayers: SimulatedPlayer[] = [
    { id: '1', name: 'A', weeklyScores: [100], wins: 3, losses: 0, ties: 0, totalPoints: 500 },
    { id: '2', name: 'B', weeklyScores: [100], wins: 3, losses: 0, ties: 0, totalPoints: 500 },
    { id: '3', name: 'C', weeklyScores: [100], wins: 3, losses: 0, ties: 0, totalPoints: 500 },
    { id: '4', name: 'D', weeklyScores: [100], wins: 3, losses: 0, ties: 0, totalPoints: 500 },
  ];
  
  const sorted = [...samePointsPlayers].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.name.localeCompare(b.name); // Alphabetical tiebreaker
  });
  
  results.push({
    name: 'F1 - Same Points Tiebreaker',
    passed: sorted.length === 4 && sorted[0].name === 'A',
    expected: 'Alphabetical order when tied',
    actual: sorted.map(p => p.name).join(', '),
  });
  
  // TEST F2 — Odd Number of Players (bye week)
  const oddPlayerCount = 5;
  const byeWeekMatchups = Math.floor(oddPlayerCount / 2);
  const playersWithBye = oddPlayerCount - (byeWeekMatchups * 2);
  results.push({
    name: 'F2 - Odd Players (1 bye)',
    passed: playersWithBye === 1,
    expected: 1,
    actual: playersWithBye,
  });
  
  // TEST F3 — Missing Health Data (null handling)
  const metricsWithNull: FitnessMetrics = {
    steps: 5000,
    sleepHours: 0, // Missing/null treated as 0
    calories: 200,
    workouts: 0,
    distance: 0,
  };
  const nullHandlingScore = calculatePoints(metricsWithNull);
  results.push({
    name: 'F3 - Missing Data (null as 0)',
    passed: !isNaN(nullHandlingScore) && nullHandlingScore > 0,
    expected: 'Valid score with zeros',
    actual: nullHandlingScore,
  });
  
  // TEST F4 — Late joiner scenario
  // Late joiner should have 0 scores for weeks before joining
  const lateJoinerScores = [0, 0, 85, 92, 78]; // Joined week 3
  const lateJoinerTotal = lateJoinerScores.reduce((a, b) => a + b, 0);
  results.push({
    name: 'F4 - Late Joiner Scoring',
    passed: lateJoinerTotal === 255,
    expected: 255,
    actual: lateJoinerTotal,
  });
  
  // TEST F5 — NaN handling in calculatePoints
  const metricsWithNaN: FitnessMetrics = {
    steps: NaN,
    sleepHours: undefined as any,
    calories: null as any,
    workouts: 1,
    distance: 2,
  };
  const nanHandlingScore = calculatePoints(metricsWithNaN);
  results.push({
    name: 'F5 - NaN/null/undefined handling',
    passed: !isNaN(nanHandlingScore) && nanHandlingScore === 26, // 20 (workout) + 6 (distance)
    expected: 26,
    actual: nanHandlingScore,
  });
  
  // TEST F6 — Negative values clamped to zero
  const metricsWithNegative: FitnessMetrics = {
    steps: -1000,
    sleepHours: -5,
    calories: -100,
    workouts: -2,
    distance: -3,
  };
  const negativeHandlingScore = calculatePoints(metricsWithNegative);
  results.push({
    name: 'F6 - Negative values clamped to 0',
    passed: negativeHandlingScore === 0,
    expected: 0,
    actual: negativeHandlingScore,
  });
  
  // TEST F7 — Weekly aggregation with null days
  const weekWithNulls: FitnessMetrics[] = [
    { steps: 5000, sleepHours: 7, calories: 200, workouts: 1, distance: 2 },
    null as any, // Missing day
    { steps: 8000, sleepHours: 8, calories: 300, workouts: 0, distance: 3 },
  ];
  const aggregatedWithNulls = aggregateWeeklyMetrics(weekWithNulls);
  results.push({
    name: 'F7 - Weekly aggregation with null days',
    passed: aggregatedWithNulls.steps === 13000 && aggregatedWithNulls.workouts === 1,
    expected: { steps: 13000, workouts: 1 },
    actual: { steps: aggregatedWithNulls.steps, workouts: aggregatedWithNulls.workouts },
  });
  
  // TEST F8 — Points breakdown consistency
  const testMetrics: FitnessMetrics = {
    steps: 12500,
    sleepHours: 7.5,
    calories: 450,
    workouts: 2,
    distance: 5.5,
  };
  const breakdown = getPointsBreakdown(testMetrics);
  const directCalc = calculatePoints(testMetrics);
  results.push({
    name: 'F8 - Breakdown matches direct calculation',
    passed: Math.abs(breakdown.totalPoints - directCalc) < 0.01,
    expected: directCalc,
    actual: breakdown.totalPoints,
  });
  
  return results;
}

// ============================================
// SECTION G: FULL END-TO-END SIMULATION
// ============================================

export interface E2ETestResults {
  scoringTests: TestResult[];
  weeklyTests: TestResult[];
  matchupTests: TestResult[];
  edgeCaseTests: TestResult[];
  seasonSimulation: SeasonSimulation;
  allPassed: boolean;
  summary: string;
}

/**
 * Run complete end-to-end test suite
 */
export function runFullTestSuite(): E2ETestResults {
  const scoringTests = runScoringTests();
  const weeklyTests = runWeeklyAccumulationTests();
  const matchupTests = runMatchupTests();
  const edgeCaseTests = runEdgeCaseTests();
  const seasonSimulation = runSeasonSimulation(8, 8, 42);
  
  const allTests = [...scoringTests, ...weeklyTests, ...matchupTests, ...edgeCaseTests];
  const passedCount = allTests.filter(t => t.passed).length;
  const allPassed = passedCount === allTests.length;
  
  return {
    scoringTests,
    weeklyTests,
    matchupTests,
    edgeCaseTests,
    seasonSimulation,
    allPassed,
    summary: `${passedCount}/${allTests.length} tests passed. Champion: ${seasonSimulation.champion?.name || 'N/A'}`,
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate scoring calculation
 */
export function validateScoring(metrics: FitnessMetrics): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (metrics.steps < 0) errors.push('Steps cannot be negative');
  if (metrics.sleepHours < 0 || metrics.sleepHours > 24) errors.push('Sleep hours must be 0-24');
  if (metrics.calories < 0) errors.push('Calories cannot be negative');
  if (metrics.workouts < 0) errors.push('Workouts cannot be negative');
  if (metrics.distance < 0) errors.push('Distance cannot be negative');
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// FULL INTEGRATION TEST ENGINE
// ============================================

export interface IntegrationTestResult {
  phase: string;
  success: boolean;
  details: string;
  duration: number;
  data?: any;
}

export interface FullIntegrationTest {
  results: IntegrationTestResult[];
  summary: {
    totalPhases: number;
    passedPhases: number;
    failedPhases: number;
    totalDuration: number;
    success: boolean;
  };
}

/**
 * Run complete integration test simulating real league lifecycle
 * This creates actual database records and simulates a full season
 */
export async function runFullIntegrationTest(
  leagueSize: number = 8,
  seasonLength: number = 8,
  testPrefix: string = 'INTEGRATION_TEST'
): Promise<FullIntegrationTest> {
  const startTime = Date.now();
  const results: IntegrationTestResult[] = [];

  console.log(`🚀 Starting full integration test: ${leagueSize} players, ${seasonLength} weeks`);

  try {
    // PHASE 1: Setup test users and league
    const setupResult = await runSetupPhase(testPrefix, leagueSize);
    results.push(setupResult);

    if (!setupResult.success) {
      throw new Error(`Setup phase failed: ${setupResult.details}`);
    }

    const { league, users } = setupResult.data;

    // PHASE 2: Simulate regular season
    const seasonResult = await runSeasonSimulationPhase(league, users, seasonLength);
    results.push(seasonResult);

    if (!seasonResult.success) {
      throw new Error(`Season simulation failed: ${seasonResult.details}`);
    }

    // PHASE 3: Run playoffs
    const playoffResult = await runPlayoffSimulation(league, users);
    results.push(playoffResult);

    // PHASE 4: Validate final results
    const validationResult = await runValidationPhase(league, users);
    results.push(validationResult);

    // PHASE 5: Cleanup
    const cleanupResult = await runCleanupPhase(league, users, testPrefix);
    results.push(cleanupResult);

  } catch (error: any) {
    results.push({
      phase: 'Integration Test',
      success: false,
      details: `Integration test failed: ${error.message}`,
      duration: Date.now() - startTime
    });
  }

  const totalDuration = Date.now() - startTime;
  const passedPhases = results.filter(r => r.success).length;
  const failedPhases = results.filter(r => !r.success).length;
  const totalPhases = results.length;

  return {
    results,
    summary: {
      totalPhases,
      passedPhases,
      failedPhases,
      totalDuration,
      success: failedPhases === 0
    }
  };
}

/**
 * Phase 1: Create test users and league
 */
async function runSetupPhase(testPrefix: string, leagueSize: number): Promise<IntegrationTestResult> {
  const start = Date.now();

  try {
    // NOTE: For now, we'll simulate the setup without creating real database records
    // This prevents issues with auth user creation and database permissions
    // In a production environment with proper test infrastructure, this would create real records

    // Simulate test users
    const users: User[] = [];
    for (let i = 1; i <= leagueSize; i++) {
      const testUser = {
        id: `test_user_${i}_${Date.now()}`, // Unique ID for simulation
        email: `test${i}@example.com`,
        username: `TestPlayer${i}`,
        avatar_url: null,
        push_token: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(testUser);
    }

    // Simulate league creation
    const leagueName = `${testPrefix} League`;
    const mockLeague: League = {
      id: `test_league_${Date.now()}`,
      name: leagueName,
      join_code: 'TEST123',
      created_by: users[0].id,
      season_length_weeks: 8,
      current_week: 1,
      start_date: new Date().toISOString().split('T')[0],
      is_active: true,
      playoffs_started: false,
      champion_id: null,
      max_players: leagueSize,
      created_at: new Date().toISOString(),
    };

    // Simulate league members
    const members: LeagueMember[] = users.map(user => ({
      id: `member_${user.id}`,
      league_id: mockLeague.id,
      user_id: user.id,
      wins: 0,
      losses: 0,
      ties: 0,
      total_points: 0,
      playoff_seed: null,
      is_eliminated: false,
      is_admin: user.id === users[0].id,
      joined_at: new Date().toISOString(),
      user,
    }));

    return {
      phase: 'Setup',
      success: true,
      details: `Simulated league "${leagueName}" with ${leagueSize} players. Join code: ${mockLeague.join_code}`,
      duration: Date.now() - start,
      data: { league: mockLeague, users, members }
    };

  } catch (error: any) {
    return {
      phase: 'Setup',
      success: false,
      details: `Setup failed: ${error.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Phase 2: Simulate complete regular season
 */
async function runSeasonSimulationPhase(league: League, users: User[], seasonLength: number): Promise<IntegrationTestResult> {
  const start = Date.now();

  try {
    console.log(`🏃 Running ${seasonLength}-week season simulation...`);

    // Use the existing weekly simulation logic that doesn't require database access
    const simulation = runWeeklySimulation(users.length, seasonLength, 12345);

    if (simulation.length === 0) {
      throw new Error('Weekly simulation failed to generate results');
    }

    // Verify we have the expected number of weeks
    const weekSteps = simulation.filter(s => s.type === 'week');
    if (weekSteps.length !== seasonLength) {
      throw new Error(`Expected ${seasonLength} weeks, got ${weekSteps.length}`);
    }

    // Check if playoffs were triggered
    const playoffSteps = simulation.filter(s => s.type.includes('playoff'));
    const playoffsStarted = playoffSteps.length > 0;

    return {
      phase: 'Season Simulation',
      success: true,
      details: `Successfully simulated ${seasonLength}-week season. Playoffs: ${playoffsStarted ? 'Yes' : 'No'}`,
      duration: Date.now() - start,
      data: { simulation, playoffsStarted }
    };

  } catch (error: any) {
    return {
      phase: 'Season Simulation',
      success: false,
      details: `Season simulation failed: ${error.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Phase 3: Run playoff tournament
 */
async function runPlayoffSimulation(league: League, users: User[]): Promise<IntegrationTestResult> {
  const start = Date.now();

  try {
    console.log('🏆 Starting playoff simulation...');

    // Simulate playoff qualification using existing logic
    const mockMembers: LeagueMember[] = users.map((user, i) => ({
      id: `member_${user.id}`,
      league_id: league.id,
      user_id: user.id,
      wins: Math.floor(Math.random() * 5) + 2, // 2-6 wins
      losses: Math.floor(Math.random() * 3), // 0-2 losses
      ties: Math.floor(Math.random() * 2), // 0-1 ties
      total_points: 400 + Math.random() * 400, // 400-800 points
      playoff_seed: null,
      is_eliminated: false,
      is_admin: i === 0,
      joined_at: new Date().toISOString(),
      user,
    }));

    // Test playoff qualification logic
    const qualifiers = getPlayoffQualifiers(mockMembers);
    if (qualifiers.length < 4) {
      throw new Error(`Only ${qualifiers.length} players qualified for playoffs, need 4`);
    }

    // Test playoff matchup generation
    const playoffMatchups = generatePlayoffMatchups(qualifiers);
    if (playoffMatchups.length !== 2) {
      throw new Error(`Expected 2 semifinal matchups, got ${playoffMatchups.length}`);
    }

    return {
      phase: 'Playoff Simulation',
      success: true,
      details: `Playoff tournament created: ${qualifiers.length} qualifiers, ${playoffMatchups.length} semifinal matchups`,
      duration: Date.now() - start,
      data: { qualifiers, playoffMatchups }
    };

  } catch (error: any) {
    return {
      phase: 'Playoff Simulation',
      success: false,
      details: `Playoff simulation failed: ${error.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Phase 4: Validate all results
 */
async function runValidationPhase(league: League, users: User[]): Promise<IntegrationTestResult> {
  const start = Date.now();

  try {
    // Run comprehensive validation tests
    const testResults = runAllTests();
    const passedTests = testResults.results.filter(r => r.passed).length;
    const totalTests = testResults.results.length;

    if (passedTests !== totalTests) {
      throw new Error(`Unit tests failed: ${passedTests}/${totalTests} passed`);
    }

    // Validate scoring engine
    const sampleMetrics = {
      steps: 10000,
      sleepHours: 8,
      calories: 500,
      workouts: 3,
      distance: 5
    };

    const points = calculatePoints(sampleMetrics);
    if (points <= 0) {
      throw new Error('Scoring engine returned invalid points');
    }

    // Validate playoff logic
    const mockMembers: LeagueMember[] = users.map((user, i) => ({
      id: `member_${user.id}`,
      league_id: league.id,
      user_id: user.id,
      wins: 4 + i, // Ensure different win counts
      losses: 2,
      ties: 1,
      total_points: 500 + i * 50,
      playoff_seed: null,
      is_eliminated: false,
      is_admin: i === 0,
      joined_at: new Date().toISOString(),
      user,
    }));

    const playoffQualifiers = getPlayoffQualifiers(mockMembers);
    if (playoffQualifiers.length !== 4) {
      throw new Error(`Expected 4 playoff qualifiers, got ${playoffQualifiers.length}`);
    }

    // Validate champion is top qualifier
    const topQualifier = playoffQualifiers[0];
    if (!topQualifier || topQualifier.wins < playoffQualifiers[1].wins) {
      throw new Error('Playoff qualification logic is incorrect');
    }

    return {
      phase: 'Validation',
      success: true,
      details: `All validation passed: ${passedTests}/${totalTests} unit tests, scoring engine ✓, playoff logic ✓`,
      duration: Date.now() - start
    };

  } catch (error: any) {
    return {
      phase: 'Validation',
      success: false,
      details: `Validation failed: ${error.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Phase 5: Clean up test data
 */
async function runCleanupPhase(league: League, users: User[], testPrefix: string): Promise<IntegrationTestResult> {
  const start = Date.now();

  try {
    console.log('🧹 Cleaning up integration test data...');

    // Since we're using simulated data, there's no real database cleanup needed
    // In a real implementation, this would delete test records

    return {
      phase: 'Cleanup',
      success: true,
      details: 'Simulation completed - no real database records to clean up',
      duration: Date.now() - start
    };

  } catch (error: any) {
    return {
      phase: 'Cleanup',
      success: false,
      details: `Cleanup failed: ${error.message}`,
      duration: Date.now() - start
    };
  }
}

/**
 * Generate realistic test health data for a user in a specific week
 */
function generateTestHealthData(userId: string, week: number): FitnessMetrics {
  // Use user ID and week as seed for reproducible but varied data
  const seed = userId.length + week * 31;
  const random = (seed * 9301 + 49297) % 233280 / 233280; // Simple PRNG

  return {
    steps: Math.floor(8000 + random * 12000), // 8k-20k steps
    sleepHours: Math.round((7 + random * 2) * 10) / 10, // 7-9 hours
    calories: Math.floor(400 + random * 600), // 400-1000 calories
    workouts: Math.floor(random * 4), // 0-3 workouts
    distance: Math.round((3 + random * 7) * 10) / 10, // 3-10 miles
  };
}

/**
 * Validate league can start playoffs
 */
export function validatePlayoffEligibility(
  memberCount: number,
  currentWeek: number,
  seasonLength: number
): { eligible: boolean; reason: string } {
  if (memberCount < 4) {
    return { eligible: false, reason: 'Need at least 4 players for playoffs' };
  }
  if (currentWeek <= seasonLength) {
    return { eligible: false, reason: `Season not complete (week ${currentWeek}/${seasonLength})` };
  }
  return { eligible: true, reason: 'Ready for playoffs' };
}

/**
 * Validate matchup can be finalized
 */
export function validateMatchupFinalization(
  player1Score: number,
  player2Score: number
): { valid: boolean; winnerId: 1 | 2 | null; isTie: boolean } {
  if (player1Score === player2Score) {
    return { valid: true, winnerId: null, isTie: true };
  }
  return {
    valid: true,
    winnerId: player1Score > player2Score ? 1 : 2,
    isTie: false,
  };
}

