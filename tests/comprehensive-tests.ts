// ============================================
// COMPREHENSIVE TEST SUITE
// Lock-In Fitness Competition App
// Tests all core functionality
// ============================================

import { 
  calculatePoints, 
  getPointsBreakdown, 
  compareScores, 
  aggregateWeeklyMetrics,
  projectWeeklyScore,
  calculateWinProbability,
  formatPoints,
  SCORING_CONFIG,
  FitnessMetrics,
} from '../services/scoring';

import {
  getPlayoffQualifiers,
  generatePlayoffMatchups,
  shouldStartPlayoffs,
  getCurrentPlayoffRound,
  didMakePlayoffs,
  getUserPlayoffSeed,
  isUserEliminated,
  isUserChampion,
} from '../services/playoffs';

import { LeagueMember, PlayoffMatch } from '../services/supabase';

// ============================================
// TEST RUNNER
// ============================================

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
}

const results: TestResult[] = [];

function test(category: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ category, name, passed: true, expected: 'pass', actual: 'pass' });
  } catch (e: any) {
    results.push({ 
      category, 
      name, 
      passed: false, 
      expected: e.expected,
      actual: e.actual,
      error: e.message,
    });
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    const error: any = new Error(message || `Expected ${expected} but got ${actual}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertClose(actual: number, expected: number, tolerance: number = 0.01) {
  if (Math.abs(actual - expected) > tolerance) {
    const error: any = new Error(`Expected ${expected} ± ${tolerance} but got ${actual}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    const error: any = new Error(message || 'Expected true but got false');
    error.expected = true;
    error.actual = false;
    throw error;
  }
}

function assertFalse(condition: boolean, message?: string) {
  if (condition) {
    const error: any = new Error(message || 'Expected false but got true');
    error.expected = false;
    error.actual = true;
    throw error;
  }
}

// ============================================
// SCORING ENGINE TESTS
// ============================================

// Test A1: Basic Scoring Calculation
test('Scoring', 'A1 - Basic scoring with typical values', () => {
  const metrics: FitnessMetrics = {
    steps: 10000,
    sleepHours: 8,
    calories: 600,
    workouts: 2,
    distance: 4,
  };
  
  // Expected:
  // Steps: 10000/1000 * 1 = 10
  // Sleep: 8 * 2 = 16
  // Calories: 600/100 * 5 = 30
  // Workouts: 2 * 20 = 40
  // Distance: 4 * 3 = 12
  // Total: 108
  
  const points = calculatePoints(metrics);
  assertEqual(points, 108, 'Basic scoring should equal 108');
});

// Test A2: Zero Values
test('Scoring', 'A2 - Zero values return zero points', () => {
  const metrics: FitnessMetrics = {
    steps: 0,
    sleepHours: 0,
    calories: 0,
    workouts: 0,
    distance: 0,
  };
  
  const points = calculatePoints(metrics);
  assertEqual(points, 0, 'Zero metrics should return 0 points');
});

// Test A3: High Values Stress Test
test('Scoring', 'A3 - High values stress test', () => {
  const metrics: FitnessMetrics = {
    steps: 30000,
    sleepHours: 6.5,
    calories: 1200,
    workouts: 3,
    distance: 10,
  };
  
  // Steps: 30 + Sleep: 13 + Calories: 60 + Workouts: 60 + Distance: 30 = 193
  const points = calculatePoints(metrics);
  assertEqual(points, 193, 'High values should calculate correctly');
});

// Test A4: Decimal Precision
test('Scoring', 'A4 - Decimal precision handling', () => {
  const metrics: FitnessMetrics = {
    steps: 7500,
    sleepHours: 7.5,
    calories: 350,
    workouts: 1,
    distance: 3.5,
  };
  
  // Steps: 7.5 + Sleep: 15 + Calories: 17.5 + Workouts: 20 + Distance: 10.5 = 70.5
  const points = calculatePoints(metrics);
  assertClose(points, 70.5, 0.01);
});

// Test A5: Null/NaN Handling
test('Scoring', 'A5 - Null/NaN values treated as zero', () => {
  const metrics: FitnessMetrics = {
    steps: NaN,
    sleepHours: undefined as any,
    calories: null as any,
    workouts: 1,
    distance: 2,
  };
  
  // Only workouts (20) and distance (6) should count
  const points = calculatePoints(metrics);
  assertEqual(points, 26, 'NaN/null should be treated as 0');
});

// Test A6: Negative Values Protection
test('Scoring', 'A6 - Negative values clamped to zero', () => {
  const metrics: FitnessMetrics = {
    steps: -1000,
    sleepHours: -5,
    calories: -100,
    workouts: -2,
    distance: -3,
  };
  
  const points = calculatePoints(metrics);
  assertEqual(points, 0, 'Negative values should be clamped to 0');
});

// Test A7: Points Breakdown Accuracy
test('Scoring', 'A7 - Points breakdown matches total', () => {
  const metrics: FitnessMetrics = {
    steps: 12000,
    sleepHours: 7,
    calories: 500,
    workouts: 2,
    distance: 5,
  };
  
  const breakdown = getPointsBreakdown(metrics);
  const sumOfParts = breakdown.stepsPoints + breakdown.sleepPoints + 
                     breakdown.caloriesPoints + breakdown.workoutsPoints + 
                     breakdown.distancePoints;
  
  assertClose(breakdown.totalPoints, sumOfParts, 0.01);
});

// ============================================
// WEEKLY ACCUMULATION TESTS
// ============================================

// Test B1: Daily Steps Aggregation
test('Weekly', 'B1 - Daily steps aggregate correctly', () => {
  const days: FitnessMetrics[] = [
    { steps: 8000, sleepHours: 7, calories: 300, workouts: 0, distance: 3 },
    { steps: 12000, sleepHours: 8, calories: 400, workouts: 1, distance: 5 },
    { steps: 6000, sleepHours: 6, calories: 200, workouts: 0, distance: 2 },
    { steps: 10000, sleepHours: 7.5, calories: 350, workouts: 1, distance: 4 },
    { steps: 9000, sleepHours: 8, calories: 300, workouts: 0, distance: 3.5 },
    { steps: 15000, sleepHours: 9, calories: 500, workouts: 2, distance: 6 },
    { steps: 5000, sleepHours: 7, calories: 250, workouts: 0, distance: 2 },
  ];
  
  const totals = aggregateWeeklyMetrics(days);
  assertEqual(totals.steps, 65000, 'Weekly steps should sum to 65000');
});

// Test B2: Sleep Hours Aggregation
test('Weekly', 'B2 - Sleep hours aggregate correctly', () => {
  const days: FitnessMetrics[] = [
    { steps: 0, sleepHours: 7, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 8, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 6.5, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 7.5, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 8, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 9, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 5.5, calories: 0, workouts: 0, distance: 0 },
  ];
  
  const totals = aggregateWeeklyMetrics(days);
  assertClose(totals.sleepHours, 51.5, 0.01);
});

// Test B3: Workouts Aggregate as Integers
test('Weekly', 'B3 - Workouts aggregate as integers', () => {
  const days: FitnessMetrics[] = [
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 1, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 2, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 1, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 1, distance: 0 },
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 },
  ];
  
  const totals = aggregateWeeklyMetrics(days);
  assertEqual(totals.workouts, 5, 'Weekly workouts should sum to 5');
});

// Test B4: Empty Array Returns Zeros
test('Weekly', 'B4 - Empty array returns zero totals', () => {
  const totals = aggregateWeeklyMetrics([]);
  assertEqual(totals.steps, 0);
  assertEqual(totals.sleepHours, 0);
  assertEqual(totals.calories, 0);
  assertEqual(totals.workouts, 0);
  assertEqual(totals.distance, 0);
});

// Test B5: Weekly Projection
test('Weekly', 'B5 - Weekly projection accuracy', () => {
  const partialWeek: FitnessMetrics = {
    steps: 30000,  // 3 days
    sleepHours: 21,
    calories: 900,
    workouts: 3,
    distance: 12,
  };
  
  const projected = projectWeeklyScore(partialWeek, 3);
  // Daily average points projected to 7 days
  const dailyPoints = calculatePoints(partialWeek) / 3;
  const expectedProjection = dailyPoints * 7;
  
  assertClose(projected, expectedProjection, 0.01);
});

// ============================================
// MATCHUP RESOLUTION TESTS
// ============================================

// Test C1: Clear Winner
test('Matchup', 'C1 - Clear winner determination', () => {
  const result = compareScores(120, 90);
  assertEqual(result.winner, 1, 'Player 1 should win');
  assertFalse(result.isTie);
  assertEqual(result.margin, 30);
});

// Test C2: Clear Winner (Player 2)
test('Matchup', 'C2 - Player 2 wins when higher', () => {
  const result = compareScores(85, 110);
  assertEqual(result.winner, 2, 'Player 2 should win');
  assertFalse(result.isTie);
  assertEqual(result.margin, 25);
});

// Test C3: Exact Tie
test('Matchup', 'C3 - Exact tie handling', () => {
  const result = compareScores(100, 100);
  assertEqual(result.winner, null, 'No winner on tie');
  assertTrue(result.isTie);
  assertEqual(result.margin, 0);
});

// Test C4: Close Game (0.1 difference)
test('Matchup', 'C4 - Close game with decimal difference', () => {
  const result = compareScores(98.2, 98.1);
  assertEqual(result.winner, 1, 'Player 1 wins by 0.1');
  assertFalse(result.isTie);
  assertClose(result.margin, 0.1, 0.001);
});

// Test C5: Zero vs Zero
test('Matchup', 'C5 - Zero vs zero is a tie', () => {
  const result = compareScores(0, 0);
  assertTrue(result.isTie);
  assertEqual(result.winner, null);
});

// Test C6: Win Probability at End of Week
test('Matchup', 'C6 - Win probability at week end', () => {
  const prob = calculateWinProbability(100, 90, 0);
  assertEqual(prob, 100, 'Leading player has 100% at week end');
  
  const probLosing = calculateWinProbability(90, 100, 0);
  assertEqual(probLosing, 0, 'Trailing player has 0% at week end');
  
  const probTied = calculateWinProbability(100, 100, 0);
  assertEqual(probTied, 50, 'Tied players have 50% each');
});

// Test C7: Win Probability Mid-Week
test('Matchup', 'C7 - Win probability mid-week', () => {
  const prob = calculateWinProbability(100, 90, 3);
  assertTrue(prob > 50 && prob < 100, 'Leader should have >50% but <100%');
});

// ============================================
// PLAYOFF TESTS
// ============================================

function createMockMember(id: string, wins: number, totalPoints: number): LeagueMember {
  return {
    id: `member-${id}`,
    league_id: 'test-league',
    user_id: id,
    wins,
    losses: 8 - wins,
    ties: 0,
    total_points: totalPoints,
    playoff_seed: null,
    is_eliminated: false,
    joined_at: new Date().toISOString(),
  };
}

// Test D1: Top 4 Selection by Wins
test('Playoffs', 'D1 - Top 4 selected by wins', () => {
  const members: LeagueMember[] = [
    createMockMember('1', 7, 800),
    createMockMember('2', 6, 750),
    createMockMember('3', 5, 700),
    createMockMember('4', 4, 650),
    createMockMember('5', 3, 600),
    createMockMember('6', 2, 550),
  ];
  
  const qualifiers = getPlayoffQualifiers(members);
  assertEqual(qualifiers.length, 4);
  assertEqual(qualifiers[0].user_id, '1');
  assertEqual(qualifiers[1].user_id, '2');
  assertEqual(qualifiers[2].user_id, '3');
  assertEqual(qualifiers[3].user_id, '4');
});

// Test D2: Tiebreaker by Total Points
test('Playoffs', 'D2 - Tiebreaker uses total points', () => {
  const members: LeagueMember[] = [
    createMockMember('1', 5, 800),  // Same wins, higher points
    createMockMember('2', 5, 750),  // Same wins, lower points
    createMockMember('3', 5, 700),
    createMockMember('4', 5, 650),
    createMockMember('5', 4, 900),  // More points but fewer wins
    createMockMember('6', 3, 950),
  ];
  
  const qualifiers = getPlayoffQualifiers(members);
  assertEqual(qualifiers[0].user_id, '1', 'Highest points with 5 wins should be first');
  assertEqual(qualifiers[1].user_id, '2');
  assertEqual(qualifiers[2].user_id, '3');
  assertEqual(qualifiers[3].user_id, '4');
});

// Test D3: Playoff Matchup Seeding (1v4, 2v3)
test('Playoffs', 'D3 - Correct playoff seeding', () => {
  const qualifiers: LeagueMember[] = [
    createMockMember('seed1', 7, 800),
    createMockMember('seed2', 6, 750),
    createMockMember('seed3', 5, 700),
    createMockMember('seed4', 4, 650),
  ];
  
  const matchups = generatePlayoffMatchups(qualifiers);
  
  // Semifinal 1: Seed 1 vs Seed 4
  assertEqual(matchups.semifinal1.player1.user_id, 'seed1');
  assertEqual(matchups.semifinal1.player2.user_id, 'seed4');
  
  // Semifinal 2: Seed 2 vs Seed 3
  assertEqual(matchups.semifinal2.player1.user_id, 'seed2');
  assertEqual(matchups.semifinal2.player2.user_id, 'seed3');
});

// Test D4: Playoffs Should Start After Regular Season
test('Playoffs', 'D4 - Playoffs start timing', () => {
  assertFalse(shouldStartPlayoffs(8, 8, false), 'Should not start during week 8 of 8');
  assertTrue(shouldStartPlayoffs(9, 8, false), 'Should start after week 8');
  assertFalse(shouldStartPlayoffs(9, 8, true), 'Should not restart if already started');
});

// Test D5: Did Make Playoffs
test('Playoffs', 'D5 - Check if user made playoffs', () => {
  const members: LeagueMember[] = [
    createMockMember('1', 7, 800),
    createMockMember('2', 6, 750),
    createMockMember('3', 5, 700),
    createMockMember('4', 4, 650),
    createMockMember('5', 3, 600),
  ];
  
  assertTrue(didMakePlayoffs('1', members));
  assertTrue(didMakePlayoffs('4', members));
  assertFalse(didMakePlayoffs('5', members));
});

// Test D6: Get User Playoff Seed
test('Playoffs', 'D6 - Get playoff seed', () => {
  const members: LeagueMember[] = [
    createMockMember('1', 7, 800),
    createMockMember('2', 6, 750),
    createMockMember('3', 5, 700),
    createMockMember('4', 4, 650),
    createMockMember('5', 3, 600),
  ];
  
  assertEqual(getUserPlayoffSeed('1', members), 1);
  assertEqual(getUserPlayoffSeed('4', members), 4);
  assertEqual(getUserPlayoffSeed('5', members), null);
});

// Test D7: Playoff Round Detection
test('Playoffs', 'D7 - Current playoff round detection', () => {
  const noMatches: PlayoffMatch[] = [];
  assertEqual(getCurrentPlayoffRound(noMatches), 0);
  
  const semisInProgress: PlayoffMatch[] = [
    { 
      id: '1', league_id: 'l', round: 1, match_number: 1, 
      player1_id: 'a', player2_id: 'b', player1_score: 0, player2_score: 0,
      winner_id: null, is_finalized: false, week_number: 9, created_at: ''
    },
    { 
      id: '2', league_id: 'l', round: 1, match_number: 2, 
      player1_id: 'c', player2_id: 'd', player1_score: 0, player2_score: 0,
      winner_id: null, is_finalized: false, week_number: 9, created_at: ''
    },
  ];
  assertEqual(getCurrentPlayoffRound(semisInProgress), 1);
  
  const semisComplete: PlayoffMatch[] = [
    { 
      id: '1', league_id: 'l', round: 1, match_number: 1, 
      player1_id: 'a', player2_id: 'b', player1_score: 100, player2_score: 90,
      winner_id: 'a', is_finalized: true, week_number: 9, created_at: ''
    },
    { 
      id: '2', league_id: 'l', round: 1, match_number: 2, 
      player1_id: 'c', player2_id: 'd', player1_score: 95, player2_score: 105,
      winner_id: 'd', is_finalized: true, week_number: 9, created_at: ''
    },
  ];
  assertEqual(getCurrentPlayoffRound(semisComplete), 2);
});

// ============================================
// EDGE CASE TESTS
// ============================================

// Test E1: Minimum Players for Playoffs
test('Edge Cases', 'E1 - Minimum 4 players for playoffs', () => {
  const threeMembers: LeagueMember[] = [
    createMockMember('1', 5, 500),
    createMockMember('2', 4, 400),
    createMockMember('3', 3, 300),
  ];
  
  let errorThrown = false;
  try {
    generatePlayoffMatchups(getPlayoffQualifiers(threeMembers));
  } catch (e) {
    errorThrown = true;
  }
  assertTrue(errorThrown, 'Should throw error with < 4 players');
});

// Test E2: All Players Same Record
test('Edge Cases', 'E2 - All players same record tiebreaker', () => {
  const members: LeagueMember[] = [
    createMockMember('a', 4, 500),
    createMockMember('b', 4, 600),  // Higher points
    createMockMember('c', 4, 550),
    createMockMember('d', 4, 450),
    createMockMember('e', 4, 400),
  ];
  
  const qualifiers = getPlayoffQualifiers(members);
  assertEqual(qualifiers[0].user_id, 'b', 'Highest points should be seed 1');
});

// Test E3: Format Points Display
test('Edge Cases', 'E3 - Points formatting', () => {
  assertEqual(formatPoints(50), '50.0');
  assertEqual(formatPoints(999), '999.0');
  assertEqual(formatPoints(1000), '1.0k');
  assertEqual(formatPoints(1500), '1.5k');
  assertEqual(formatPoints(10000), '10.0k');
});

// Test E4: Very Large Numbers
test('Edge Cases', 'E4 - Very large step counts', () => {
  const metrics: FitnessMetrics = {
    steps: 100000,  // 100k steps (marathon runner)
    sleepHours: 10,
    calories: 5000,
    workouts: 10,
    distance: 50,
  };
  
  const points = calculatePoints(metrics);
  // 100 + 20 + 250 + 200 + 150 = 720
  assertEqual(points, 720);
});

// Test E5: Elimination Tracking
test('Edge Cases', 'E5 - User elimination tracking', () => {
  const matches: PlayoffMatch[] = [
    { 
      id: '1', league_id: 'l', round: 1, match_number: 1, 
      player1_id: 'winner', player2_id: 'loser', player1_score: 100, player2_score: 90,
      winner_id: 'winner', is_finalized: true, week_number: 9, created_at: ''
    },
  ];
  
  assertTrue(isUserEliminated('loser', matches));
  assertFalse(isUserEliminated('winner', matches));
  assertFalse(isUserEliminated('other', matches));
});

// Test E6: Champion Detection
test('Edge Cases', 'E6 - Champion detection', () => {
  const matches: PlayoffMatch[] = [
    { 
      id: '1', league_id: 'l', round: 2, match_number: 1, 
      player1_id: 'finalist1', player2_id: 'finalist2', player1_score: 150, player2_score: 140,
      winner_id: 'finalist1', is_finalized: true, week_number: 10, created_at: ''
    },
  ];
  
  assertTrue(isUserChampion('finalist1', matches));
  assertFalse(isUserChampion('finalist2', matches));
});

// ============================================
// RUN ALL TESTS
// ============================================

export function runAllTests(): { results: TestResult[]; summary: string } {
  // Clear previous results
  results.length = 0;
  
  console.log('🧪 Running comprehensive test suite...\n');
  
  // Tests are already registered via test() calls above
  // They run when this module is imported
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${total}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - [${r.category}] ${r.name}`);
      console.log(`     Expected: ${r.expected}`);
      console.log(`     Actual: ${r.actual}`);
      if (r.error) console.log(`     Error: ${r.error}`);
    });
  }
  
  return {
    results,
    summary: `${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`,
  };
}

// Export individual test functions for selective running
export {
  test,
  assertEqual,
  assertClose,
  assertTrue,
  assertFalse,
  results,
};

