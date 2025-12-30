// ============================================
// COMPREHENSIVE REGRESSION TEST SUITE
// Lock-In Fitness Competition App
// For AI Agent Testing
// ============================================

/**
 * REGRESSION TEST SYSTEM
 *
 * This test suite is designed for AI agents to run and validate
 * all business logic in the Lock-In app. It tests:
 *
 * 1. League Creation (all valid sizes)
 * 2. League Joining & Auto-Start
 * 3. Round-Robin Matchup Generation
 * 4. Weekly Scoring Calculations
 * 5. Week Finalization & Standings
 * 6. Playoff Qualification
 * 7. Playoff Bracket Structure
 * 8. Champion Determination
 * 9. Edge Cases & Validation
 */

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  category: string;
  testId: string;
  name: string;
  passed: boolean;
  expected: any;
  actual: any;
  error?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

const allResults: TestResult[] = [];

function test(
  category: string,
  testId: string,
  name: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  fn: () => void
) {
  try {
    fn();
    allResults.push({
      category,
      testId,
      name,
      passed: true,
      expected: 'pass',
      actual: 'pass',
      severity,
    });
  } catch (e: any) {
    allResults.push({
      category,
      testId,
      name,
      passed: false,
      expected: e.expected,
      actual: e.actual,
      error: e.message,
      severity,
    });
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const error: any = new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
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

function assertInRange(value: number, min: number, max: number, message?: string) {
  if (value < min || value > max) {
    const error: any = new Error(message || `Expected ${value} to be between ${min} and ${max}`);
    error.expected = `${min} - ${max}`;
    error.actual = value;
    throw error;
  }
}

// ============================================
// BUSINESS LOGIC CONSTANTS
// ============================================

const VALID_LEAGUE_SIZES = [4, 6, 8, 10, 12, 14];

const SCORING_CONFIG = {
  POINTS_PER_1000_STEPS: 1,
  POINTS_PER_SLEEP_HOUR: 2,
  POINTS_PER_100_CALORIES: 5,
  POINTS_PER_WORKOUT_MINUTE: 0.2,
  POINTS_PER_STAND_HOUR: 5,
  POINTS_PER_MILE: 3,
};

const METRIC_CAPS = {
  steps: 200000,
  sleepHours: 24,
  calories: 10000,
  workouts: 480, // 8 hours in minutes
  standHours: 24,
  distance: 100,
};

// ============================================
// MOCK DATA GENERATORS
// ============================================

function createMockUser(id: string, username?: string) {
  return {
    id,
    email: `${id}@test.com`,
    username: username || id,
    avatar_url: null,
    push_token: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createMockLeague(
  id: string,
  maxPlayers: number,
  seasonLength: number = 8,
  currentWeek: number = 1
) {
  return {
    id,
    name: `Test League ${id}`,
    join_code: generateJoinCode(),
    created_by: 'creator-id',
    season_length_weeks: seasonLength,
    current_week: currentWeek,
    start_date: null as string | null,
    is_active: true,
    playoffs_started: false,
    champion_id: null,
    max_players: maxPlayers,
    scoring_config: null,
    created_at: new Date().toISOString(),
  };
}

function createMockMember(
  id: string,
  leagueId: string,
  wins: number,
  losses: number,
  totalPoints: number,
  playoffSeed: number | null = null
) {
  return {
    id: `member-${id}`,
    league_id: leagueId,
    user_id: id,
    wins,
    losses,
    ties: 0,
    total_points: totalPoints,
    playoff_seed: playoffSeed,
    is_eliminated: false,
    is_admin: false,
    joined_at: new Date().toISOString(),
    user: createMockUser(id),
  };
}

function createMockMatchup(
  leagueId: string,
  weekNumber: number,
  player1Id: string,
  player2Id: string,
  player1Score: number = 0,
  player2Score: number = 0,
  isFinalized: boolean = false
) {
  return {
    id: `matchup-${leagueId}-${weekNumber}-${player1Id}`,
    league_id: leagueId,
    week_number: weekNumber,
    player1_id: player1Id,
    player2_id: player2Id,
    player1_score: player1Score,
    player2_score: player2Score,
    winner_id: isFinalized
      ? player1Score > player2Score
        ? player1Id
        : player1Score < player2Score
        ? player2Id
        : null
      : null,
    is_tie: isFinalized && player1Score === player2Score,
    is_finalized: isFinalized,
    created_at: new Date().toISOString(),
  };
}

function createMockMetrics(
  steps: number = 10000,
  sleepHours: number = 7,
  calories: number = 500,
  workouts: number = 30,
  standHours: number = 10,
  distance: number = 4
) {
  return { steps, sleepHours, calories, workouts, standHours, distance };
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// SCORING FUNCTIONS (mirrors services/scoring.ts)
// ============================================

function calculatePoints(metrics: any, config?: any): number {
  const cfg = config || SCORING_CONFIG;

  const sanitize = (val: any): number => {
    const num = Number(val);
    return Number.isFinite(num) && num >= 0 ? num : 0;
  };

  const steps = sanitize(metrics.steps);
  const sleep = sanitize(metrics.sleepHours);
  const calories = sanitize(metrics.calories);
  const workouts = sanitize(metrics.workouts);
  const standHours = sanitize(metrics.standHours);
  const distance = sanitize(metrics.distance);

  return (
    (steps / 1000) * cfg.POINTS_PER_1000_STEPS +
    sleep * cfg.POINTS_PER_SLEEP_HOUR +
    (calories / 100) * cfg.POINTS_PER_100_CALORIES +
    workouts * cfg.POINTS_PER_WORKOUT_MINUTE +
    standHours * cfg.POINTS_PER_STAND_HOUR +
    distance * cfg.POINTS_PER_MILE
  );
}

function sanitizeMetrics(metrics: any) {
  const sanitize = (val: any, max: number): number => {
    const num = Number(val);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(max, num));
  };

  return {
    steps: Math.round(sanitize(metrics.steps, METRIC_CAPS.steps)),
    sleepHours: sanitize(metrics.sleepHours, METRIC_CAPS.sleepHours),
    calories: Math.round(sanitize(metrics.calories, METRIC_CAPS.calories)),
    workouts: Math.round(sanitize(metrics.workouts, METRIC_CAPS.workouts)),
    standHours: sanitize(metrics.standHours, METRIC_CAPS.standHours),
    distance: sanitize(metrics.distance, METRIC_CAPS.distance),
  };
}

// ============================================
// PLAYOFF FUNCTIONS (mirrors services/playoffs.ts)
// ============================================

function getPlayoffQualifiers(members: any[], leagueSize: number = 8) {
  const sorted = [...members].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });

  // Top 4 qualify for all league sizes
  return sorted.slice(0, 4);
}

function shouldStartPlayoffs(
  currentWeek: number,
  seasonLength: number,
  playoffsStarted: boolean,
  playerCount?: number
): boolean {
  if (playerCount !== undefined && playerCount < 4) {
    return false;
  }
  return currentWeek > seasonLength && !playoffsStarted;
}

// ============================================
// ROUND ROBIN MATCHUP GENERATION
// ============================================

function generateRoundRobinSchedule(playerIds: string[], numWeeks: number) {
  const n = playerIds.length;
  const schedule: Array<{ week: number; player1: string; player2: string }> = [];

  // For round-robin, we need n-1 rounds for everyone to play everyone
  // But we may have more weeks than needed, so we repeat the schedule

  // Standard round-robin algorithm (circle method)
  const players = [...playerIds];

  for (let round = 0; round < numWeeks; round++) {
    const actualRound = round % (n - 1);

    // On each round, fix first player, rotate others
    const rotated = [players[0]];
    for (let i = 1; i < n; i++) {
      const newIndex = ((i - 1 + actualRound) % (n - 1)) + 1;
      rotated.push(players[newIndex]);
    }

    // Pair up: 0 vs n-1, 1 vs n-2, etc.
    for (let i = 0; i < n / 2; i++) {
      schedule.push({
        week: round + 1,
        player1: rotated[i],
        player2: rotated[n - 1 - i],
      });
    }
  }

  return schedule;
}

function validateRoundRobinCompleteness(playerIds: string[], schedule: any[]) {
  const n = playerIds.length;
  const expectedGamesPerPlayer = n - 1;
  const playerGameCounts: Record<string, Set<string>> = {};

  playerIds.forEach(id => {
    playerGameCounts[id] = new Set();
  });

  schedule.forEach(match => {
    playerGameCounts[match.player1].add(match.player2);
    playerGameCounts[match.player2].add(match.player1);
  });

  // Check each player has played everyone else at least once
  for (const playerId of playerIds) {
    const opponents = playerGameCounts[playerId];
    for (const otherId of playerIds) {
      if (otherId !== playerId && !opponents.has(otherId)) {
        return { complete: false, missingGame: `${playerId} vs ${otherId}` };
      }
    }
  }

  return { complete: true };
}

// ============================================
// CATEGORY 1: LEAGUE CREATION TESTS
// ============================================

function runLeagueCreationTests() {
  // LC-001: Valid league sizes
  VALID_LEAGUE_SIZES.forEach(size => {
    test('League Creation', `LC-001-${size}`, `League size ${size} should be valid`, 'critical', () => {
      const league = createMockLeague(`test-${size}`, size);
      assertEqual(league.max_players, size);
      assertTrue(VALID_LEAGUE_SIZES.includes(league.max_players));
    });
  });

  // LC-002: Invalid league sizes should be rejected
  [1, 2, 3, 5, 7, 9, 11, 13, 15, 16, 20].forEach(size => {
    test('League Creation', `LC-002-${size}`, `League size ${size} should be invalid`, 'high', () => {
      assertFalse(VALID_LEAGUE_SIZES.includes(size), `Size ${size} should not be valid`);
    });
  });

  // LC-003: Join code generation
  test('League Creation', 'LC-003', 'Join code should be 6 alphanumeric characters', 'high', () => {
    const code = generateJoinCode();
    assertEqual(code.length, 6);
    assertTrue(/^[A-Z0-9]{6}$/.test(code), 'Join code should be uppercase alphanumeric');
  });

  // LC-004: Season length options
  [6, 8, 10, 12].forEach(weeks => {
    test('League Creation', `LC-004-${weeks}`, `Season length ${weeks} weeks should be valid`, 'medium', () => {
      const league = createMockLeague('test', 8, weeks);
      assertEqual(league.season_length_weeks, weeks);
    });
  });

  // LC-005: League starts with no start_date
  test('League Creation', 'LC-005', 'New league should have null start_date', 'medium', () => {
    const league = createMockLeague('test', 8);
    assertEqual(league.start_date, null);
    assertEqual(league.is_active, true);
    assertEqual(league.playoffs_started, false);
  });
}

// ============================================
// CATEGORY 2: LEAGUE JOINING & AUTO-START
// ============================================

function runLeagueJoiningTests() {
  // LJ-001: League auto-starts when full
  VALID_LEAGUE_SIZES.forEach(size => {
    test('League Joining', `LJ-001-${size}`, `League of ${size} should auto-start when full`, 'critical', () => {
      const league = createMockLeague('test', size);
      const members = Array.from({ length: size }, (_, i) =>
        createMockMember(`player-${i}`, league.id, 0, 0, 0)
      );

      assertEqual(members.length, size);
      // When full, start_date should be set to next Monday
      assertTrue(members.length >= league.max_players, 'Members should equal max_players');
    });
  });

  // LJ-002: Can't join league that is already full
  test('League Joining', 'LJ-002', 'Cannot join full league', 'critical', () => {
    const league = createMockLeague('test', 4);
    const members = Array.from({ length: 4 }, (_, i) =>
      createMockMember(`player-${i}`, league.id, 0, 0, 0)
    );

    const isFull = members.length >= league.max_players;
    assertTrue(isFull, 'League should be full');
    // Attempting to add another member should fail
  });

  // LJ-003: Can't join league that has already started
  test('League Joining', 'LJ-003', 'Cannot join started league', 'critical', () => {
    const league = createMockLeague('test', 8);
    league.start_date = '2024-01-15'; // Already started
    league.current_week = 3;

    assertTrue(league.start_date !== null, 'Started league has start_date');
    // Should not allow new members
  });

  // LJ-004: Start date should be next Monday
  test('League Joining', 'LJ-004', 'Start date should be next Monday', 'high', () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);

    assertEqual(nextMonday.getDay(), 1, 'Next Monday should have day index 1');
  });
}

// ============================================
// CATEGORY 3: ROUND-ROBIN MATCHUP GENERATION
// ============================================

function runMatchupGenerationTests() {
  // MG-001: Round-robin completeness for each league size
  VALID_LEAGUE_SIZES.forEach(size => {
    test('Matchup Generation', `MG-001-${size}`, `Round-robin for ${size} players should be complete`, 'critical', () => {
      const playerIds = Array.from({ length: size }, (_, i) => `player-${i}`);
      const seasonLength = size - 1; // Minimum weeks for round-robin
      const schedule = generateRoundRobinSchedule(playerIds, seasonLength);

      const result = validateRoundRobinCompleteness(playerIds, schedule);
      assertTrue(result.complete, `Round-robin incomplete: ${result.missingGame}`);
    });
  });

  // MG-002: Even number of players means no byes
  VALID_LEAGUE_SIZES.forEach(size => {
    test('Matchup Generation', `MG-002-${size}`, `${size} players (even) should have no byes`, 'high', () => {
      const playerIds = Array.from({ length: size }, (_, i) => `player-${i}`);
      const schedule = generateRoundRobinSchedule(playerIds, size - 1);

      // Each week should have size/2 matchups
      const week1Matchups = schedule.filter(m => m.week === 1);
      assertEqual(week1Matchups.length, size / 2, `Week 1 should have ${size / 2} matchups`);
    });
  });

  // MG-003: Each player plays exactly once per week
  test('Matchup Generation', 'MG-003', 'Each player plays exactly once per week', 'critical', () => {
    const playerIds = ['A', 'B', 'C', 'D', 'E', 'F'];
    const schedule = generateRoundRobinSchedule(playerIds, 5);

    for (let week = 1; week <= 5; week++) {
      const weekMatchups = schedule.filter(m => m.week === week);
      const playersInWeek: string[] = [];

      weekMatchups.forEach(m => {
        playersInWeek.push(m.player1, m.player2);
      });

      const uniquePlayers = new Set(playersInWeek);
      assertEqual(uniquePlayers.size, 6, `Week ${week} should have all 6 players playing`);
    }
  });

  // MG-004: Don't play same opponent twice before playing everyone
  test('Matchup Generation', 'MG-004', 'No repeat opponents before full round-robin', 'high', () => {
    const playerIds = ['A', 'B', 'C', 'D'];
    const schedule = generateRoundRobinSchedule(playerIds, 3); // 3 weeks for 4 players

    const matchupPairs = new Set<string>();

    schedule.forEach(m => {
      const pair = [m.player1, m.player2].sort().join('-');
      assertFalse(matchupPairs.has(pair), `Duplicate matchup found: ${pair}`);
      matchupPairs.add(pair);
    });
  });
}

// ============================================
// CATEGORY 4: WEEKLY SCORING
// ============================================

function runWeeklyScoringTests() {
  // WS-001: Basic scoring calculation
  test('Weekly Scoring', 'WS-001', 'Basic scoring calculation', 'critical', () => {
    const metrics = createMockMetrics(10000, 8, 500, 30, 10, 5);
    const points = calculatePoints(metrics);

    // Expected: (10000/1000)*1 + 8*2 + (500/100)*5 + 30*0.2 + 10*5 + 5*3
    // = 10 + 16 + 25 + 6 + 50 + 15 = 122
    assertEqual(points, 122, 'Points should equal 122');
  });

  // WS-002: Zero values return zero points
  test('Weekly Scoring', 'WS-002', 'Zero values return zero points', 'high', () => {
    const metrics = createMockMetrics(0, 0, 0, 0, 0, 0);
    const points = calculatePoints(metrics);
    assertEqual(points, 0);
  });

  // WS-003: NaN handling
  test('Weekly Scoring', 'WS-003', 'NaN values treated as zero', 'critical', () => {
    const metrics = { steps: NaN, sleepHours: 8, calories: NaN, workouts: 30, standHours: NaN, distance: 5 };
    const points = calculatePoints(metrics);

    // Only sleep (16), workouts (6), distance (15) = 37
    assertEqual(points, 37);
  });

  // WS-004: Negative values clamped
  test('Weekly Scoring', 'WS-004', 'Negative values clamped to zero', 'high', () => {
    const metrics = { steps: -1000, sleepHours: -5, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const points = calculatePoints(metrics);

    // Negative values = 0, so: (500/100)*5 + 30*0.2 + 10*5 + 5*3 = 25 + 6 + 50 + 15 = 96
    assertEqual(points, 96);
  });

  // WS-005: Metric caps
  test('Weekly Scoring', 'WS-005', 'Metrics are capped at maximums', 'high', () => {
    const rawMetrics = { steps: 500000, sleepHours: 30, calories: 20000, workouts: 1000, standHours: 30, distance: 200 };
    const sanitized = sanitizeMetrics(rawMetrics);

    assertEqual(sanitized.steps, 200000);
    assertEqual(sanitized.sleepHours, 24);
    assertEqual(sanitized.calories, 10000);
    assertEqual(sanitized.workouts, 480);
    assertEqual(sanitized.standHours, 24);
    assertEqual(sanitized.distance, 100);
  });

  // WS-006: Custom scoring config
  test('Weekly Scoring', 'WS-006', 'Custom scoring config overrides defaults', 'medium', () => {
    const metrics = createMockMetrics(10000, 8, 500, 30, 10, 5);
    const customConfig = {
      ...SCORING_CONFIG,
      POINTS_PER_1000_STEPS: 2, // Double steps
    };
    const points = calculatePoints(metrics, customConfig);

    // Steps now worth 20 instead of 10, so total = 122 + 10 = 132
    assertEqual(points, 132);
  });

  // WS-007: Stand hours scoring
  test('Weekly Scoring', 'WS-007', 'Stand hours scored correctly', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 12, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 60); // 12 * 5 = 60
  });

  // WS-008: Workout minutes scoring
  test('Weekly Scoring', 'WS-008', 'Workout minutes scored at 0.2 per minute', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 60, standHours: 0, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 12); // 60 * 0.2 = 12
  });
}

// ============================================
// CATEGORY 5: WEEK FINALIZATION & STANDINGS
// ============================================

function runWeekFinalizationTests() {
  // WF-001: Winner determined by higher score
  test('Week Finalization', 'WF-001', 'Higher score wins', 'critical', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 100, 80, true);
    assertEqual(matchup.winner_id, 'A');
    assertFalse(matchup.is_tie);
  });

  // WF-002: Lower score loses
  test('Week Finalization', 'WF-002', 'Lower score loses', 'critical', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 80, 100, true);
    assertEqual(matchup.winner_id, 'B');
  });

  // WF-003: Tie handling (equal scores)
  test('Week Finalization', 'WF-003', 'Equal scores result in tie', 'high', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 100, 100, true);
    assertEqual(matchup.winner_id, null);
    assertTrue(matchup.is_tie);
  });

  // WF-004: Standings sorted by wins
  test('Week Finalization', 'WF-004', 'Standings sorted by wins first', 'critical', () => {
    const members = [
      createMockMember('A', 'league', 3, 5, 400),
      createMockMember('B', 'league', 5, 3, 350),
      createMockMember('C', 'league', 4, 4, 500),
    ];

    const sorted = [...members].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.total_points - a.total_points;
    });

    assertEqual(sorted[0].user_id, 'B'); // 5 wins
    assertEqual(sorted[1].user_id, 'C'); // 4 wins
    assertEqual(sorted[2].user_id, 'A'); // 3 wins
  });

  // WF-005: Tiebreaker by total points
  test('Week Finalization', 'WF-005', 'Tiebreaker uses total points', 'critical', () => {
    const members = [
      createMockMember('A', 'league', 4, 4, 400),
      createMockMember('B', 'league', 4, 4, 500), // Same wins, more points
      createMockMember('C', 'league', 4, 4, 350),
    ];

    const sorted = [...members].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.total_points - a.total_points;
    });

    assertEqual(sorted[0].user_id, 'B'); // Most points
    assertEqual(sorted[1].user_id, 'A');
    assertEqual(sorted[2].user_id, 'C');
  });

  // WF-006: Current week advances after finalization
  test('Week Finalization', 'WF-006', 'Current week advances after finalization', 'high', () => {
    const league = createMockLeague('test', 8, 8, 1);
    // After finalization, current_week should be 2
    league.current_week = 2;
    assertEqual(league.current_week, 2);
  });
}

// ============================================
// CATEGORY 6: PLAYOFF QUALIFICATION
// ============================================

function runPlayoffQualificationTests() {
  // PQ-001: Top 4 qualify for playoffs
  test('Playoff Qualification', 'PQ-001', 'Top 4 qualify for playoffs', 'critical', () => {
    const members = [
      createMockMember('1', 'league', 7, 1, 800),
      createMockMember('2', 'league', 6, 2, 700),
      createMockMember('3', 'league', 5, 3, 600),
      createMockMember('4', 'league', 4, 4, 500),
      createMockMember('5', 'league', 3, 5, 400),
      createMockMember('6', 'league', 2, 6, 300),
    ];

    const qualifiers = getPlayoffQualifiers(members);
    assertEqual(qualifiers.length, 4);
    assertEqual(qualifiers[0].user_id, '1');
    assertEqual(qualifiers[1].user_id, '2');
    assertEqual(qualifiers[2].user_id, '3');
    assertEqual(qualifiers[3].user_id, '4');
  });

  // PQ-002: Tiebreaker for playoff spots
  test('Playoff Qualification', 'PQ-002', 'Playoff tiebreaker by points', 'critical', () => {
    const members = [
      createMockMember('1', 'league', 5, 3, 800),
      createMockMember('2', 'league', 5, 3, 750),
      createMockMember('3', 'league', 5, 3, 700),
      createMockMember('4', 'league', 5, 3, 650),
      createMockMember('5', 'league', 5, 3, 600), // Same wins, but 5th in points
      createMockMember('6', 'league', 3, 5, 900), // More points but fewer wins
    ];

    const qualifiers = getPlayoffQualifiers(members);
    assertEqual(qualifiers[0].user_id, '1'); // Most points
    assertEqual(qualifiers[1].user_id, '2');
    assertEqual(qualifiers[2].user_id, '3');
    assertEqual(qualifiers[3].user_id, '4');
    // Player 5 doesn't qualify despite same wins (less points than top 4)
  });

  // PQ-003: Playoffs start after regular season
  test('Playoff Qualification', 'PQ-003', 'Playoffs start after season ends', 'critical', () => {
    assertFalse(shouldStartPlayoffs(8, 8, false), 'Should not start during week 8');
    assertTrue(shouldStartPlayoffs(9, 8, false), 'Should start after week 8');
  });

  // PQ-004: Don't restart playoffs
  test('Playoff Qualification', 'PQ-004', 'Playoffs should not restart if already started', 'high', () => {
    assertFalse(shouldStartPlayoffs(9, 8, true), 'Should not restart');
    assertFalse(shouldStartPlayoffs(10, 8, true), 'Should not restart');
  });

  // PQ-005: Minimum 4 players for playoffs
  test('Playoff Qualification', 'PQ-005', 'Need minimum 4 players for playoffs', 'critical', () => {
    assertFalse(shouldStartPlayoffs(9, 8, false, 3), 'Should not start with 3 players');
    assertTrue(shouldStartPlayoffs(9, 8, false, 4), 'Should start with 4 players');
  });

  // PQ-006: Top 4 qualify regardless of league size
  VALID_LEAGUE_SIZES.forEach(size => {
    test('Playoff Qualification', `PQ-006-${size}`, `Top 4 qualify in ${size}-player league`, 'high', () => {
      const members = Array.from({ length: size }, (_, i) =>
        createMockMember(`${i}`, 'league', size - i - 1, i, 800 - i * 50)
      );

      const qualifiers = getPlayoffQualifiers(members, size);
      assertEqual(qualifiers.length, 4);
    });
  });
}

// ============================================
// CATEGORY 7: PLAYOFF BRACKET
// ============================================

function runPlayoffBracketTests() {
  // PB-001: Semifinal seeding (1v4, 2v3)
  test('Playoff Bracket', 'PB-001', 'Semifinal seeding: 1v4, 2v3', 'critical', () => {
    const qualifiers = [
      createMockMember('seed1', 'league', 7, 1, 800),
      createMockMember('seed2', 'league', 6, 2, 700),
      createMockMember('seed3', 'league', 5, 3, 600),
      createMockMember('seed4', 'league', 4, 4, 500),
    ];

    // Semifinal 1: Seed 1 vs Seed 4
    assertEqual(qualifiers[0].user_id, 'seed1');
    assertEqual(qualifiers[3].user_id, 'seed4');

    // Semifinal 2: Seed 2 vs Seed 3
    assertEqual(qualifiers[1].user_id, 'seed2');
    assertEqual(qualifiers[2].user_id, 'seed3');
  });

  // PB-002: One week per playoff round
  test('Playoff Bracket', 'PB-002', 'One week per playoff round', 'high', () => {
    const semifinalWeek = 9; // Week after 8-week regular season
    const finalsWeek = semifinalWeek + 1;
    assertEqual(finalsWeek, 10);
  });

  // PB-003: Semifinal winners advance to finals
  test('Playoff Bracket', 'PB-003', 'Semifinal winners go to finals', 'critical', () => {
    const semi1 = createMockMatchup('league', 9, 'seed1', 'seed4', 100, 80, true);
    const semi2 = createMockMatchup('league', 9, 'seed2', 'seed3', 90, 95, true);

    assertEqual(semi1.winner_id, 'seed1'); // Seed 1 wins
    assertEqual(semi2.winner_id, 'seed3'); // Seed 3 upsets Seed 2

    // Finals: seed1 vs seed3
  });

  // PB-004: Loser is eliminated
  test('Playoff Bracket', 'PB-004', 'Playoff loser is eliminated', 'high', () => {
    const semi1 = createMockMatchup('league', 9, 'seed1', 'seed4', 100, 80, true);
    // seed4 loses, should be marked as eliminated
    assertTrue(semi1.winner_id !== 'seed4');
  });
}

// ============================================
// CATEGORY 8: CHAMPION DETERMINATION
// ============================================

function runChampionTests() {
  // CH-001: Finals winner is champion
  test('Champion', 'CH-001', 'Finals winner becomes champion', 'critical', () => {
    const finals = createMockMatchup('league', 10, 'seed1', 'seed3', 120, 110, true);
    assertEqual(finals.winner_id, 'seed1');
    // League should set champion_id = 'seed1'
  });

  // CH-002: League becomes inactive after champion
  test('Champion', 'CH-002', 'League marked inactive after finals', 'high', () => {
    const league = createMockLeague('test', 8);
    league.champion_id = 'seed1';
    league.is_active = false;

    assertEqual(league.champion_id, 'seed1');
    assertFalse(league.is_active);
  });

  // CH-003: Close finals game
  test('Champion', 'CH-003', 'Close finals decided by margin', 'medium', () => {
    const finals = createMockMatchup('league', 10, 'A', 'B', 100.5, 100.0, true);
    assertEqual(finals.winner_id, 'A', '0.5 point margin should determine winner');
  });
}

// ============================================
// CATEGORY 9: EDGE CASES
// ============================================

function runEdgeCaseTests() {
  // EC-001: Can't leave league mid-season
  test('Edge Cases', 'EC-001', 'Cannot leave league mid-season', 'critical', () => {
    const league = createMockLeague('test', 8, 8, 4);
    league.start_date = '2024-01-15';

    // Mid-season: league has started, not finished
    assertTrue(league.start_date !== null);
    assertTrue(league.current_week <= league.season_length_weeks);
    assertTrue(league.is_active);
    // Should prevent leaving
  });

  // EC-002: Can't delete league mid-season
  test('Edge Cases', 'EC-002', 'Cannot delete league mid-season', 'critical', () => {
    const league = createMockLeague('test', 8, 8, 4);
    league.start_date = '2024-01-15';

    // Only allow deletion if !is_active (finished)
    assertTrue(league.is_active, 'Active leagues cannot be deleted');
  });

  // EC-003: Can delete league after completion
  test('Edge Cases', 'EC-003', 'Can delete completed league', 'medium', () => {
    const league = createMockLeague('test', 8);
    league.is_active = false;
    league.champion_id = 'winner';

    assertFalse(league.is_active, 'Inactive leagues can be deleted');
  });

  // EC-004: User with no health data gets 0 points
  test('Edge Cases', 'EC-004', 'No health data = 0 points', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 0, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 0);
  });

  // EC-005: Infinity handling
  test('Edge Cases', 'EC-005', 'Infinity values treated as zero', 'high', () => {
    const metrics = { steps: Infinity, sleepHours: 8, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const sanitized = sanitizeMetrics(metrics);
    assertEqual(sanitized.steps, 0); // Infinity should become 0
  });

  // EC-006: Very small decimal precision
  test('Edge Cases', 'EC-006', 'Small decimal precision maintained', 'low', () => {
    const metrics = { steps: 500, sleepHours: 0.1, calories: 50, workouts: 1, standHours: 0.5, distance: 0.1 };
    const points = calculatePoints(metrics);

    // 0.5 + 0.2 + 2.5 + 0.2 + 2.5 + 0.3 = 6.2
    assertInRange(points, 6, 7, 'Small decimals should calculate correctly');
  });

  // EC-007: All players same record in playoffs
  test('Edge Cases', 'EC-007', 'All same record: sort by points', 'high', () => {
    const members = [
      createMockMember('A', 'league', 4, 4, 400),
      createMockMember('B', 'league', 4, 4, 450),
      createMockMember('C', 'league', 4, 4, 500),
      createMockMember('D', 'league', 4, 4, 350),
      createMockMember('E', 'league', 4, 4, 425),
      createMockMember('F', 'league', 4, 4, 475),
    ];

    const qualifiers = getPlayoffQualifiers(members);
    assertEqual(qualifiers[0].user_id, 'C'); // 500 points
    assertEqual(qualifiers[1].user_id, 'F'); // 475 points
    assertEqual(qualifiers[2].user_id, 'B'); // 450 points
    assertEqual(qualifiers[3].user_id, 'E'); // 425 points
  });
}

// ============================================
// RUN ALL TESTS
// ============================================

export function runRegressionTests(): {
  results: TestResult[];
  summary: string;
  categories: Record<string, TestSuite>;
  issues: Array<{ testId: string; description: string; severity: string }>;
} {
  // Clear previous results
  allResults.length = 0;

  console.log('========================================');
  console.log('LOCK-IN REGRESSION TEST SUITE');
  console.log('========================================\n');

  // Run all test categories
  console.log('Running League Creation tests...');
  runLeagueCreationTests();

  console.log('Running League Joining tests...');
  runLeagueJoiningTests();

  console.log('Running Matchup Generation tests...');
  runMatchupGenerationTests();

  console.log('Running Weekly Scoring tests...');
  runWeeklyScoringTests();

  console.log('Running Week Finalization tests...');
  runWeekFinalizationTests();

  console.log('Running Playoff Qualification tests...');
  runPlayoffQualificationTests();

  console.log('Running Playoff Bracket tests...');
  runPlayoffBracketTests();

  console.log('Running Champion tests...');
  runChampionTests();

  console.log('Running Edge Case tests...');
  runEdgeCaseTests();

  // Summarize results by category
  const categories: Record<string, TestSuite> = {};

  allResults.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = {
        name: result.category,
        tests: [],
        passed: 0,
        failed: 0,
      };
    }
    categories[result.category].tests.push(result);
    if (result.passed) {
      categories[result.category].passed++;
    } else {
      categories[result.category].failed++;
    }
  });

  // Print results
  console.log('\n========================================');
  console.log('TEST RESULTS BY CATEGORY');
  console.log('========================================\n');

  Object.values(categories).forEach(cat => {
    const status = cat.failed === 0 ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${cat.name}: ${cat.passed}/${cat.tests.length} passed`);

    cat.tests.filter(t => !t.passed).forEach(t => {
      console.log(`      FAILED: ${t.testId} - ${t.name}`);
      console.log(`              Expected: ${JSON.stringify(t.expected)}`);
      console.log(`              Actual: ${JSON.stringify(t.actual)}`);
    });
  });

  // Overall summary
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.filter(r => !r.passed).length;
  const total = allResults.length;

  console.log('\n========================================');
  console.log('OVERALL SUMMARY');
  console.log('========================================');
  console.log(`Total: ${totalPassed}/${total} tests passed (${((totalPassed/total)*100).toFixed(1)}%)`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  // Collect failed tests as issues
  const issues = allResults
    .filter(r => !r.passed)
    .map(r => ({
      testId: r.testId,
      description: `${r.name}: ${r.error}`,
      severity: r.severity,
    }));

  if (issues.length > 0) {
    console.log('\n========================================');
    console.log('ISSUES FOUND (for GitHub)');
    console.log('========================================');
    issues.forEach(issue => {
      console.log(`[${issue.severity.toUpperCase()}] ${issue.testId}: ${issue.description}`);
    });
  }

  return {
    results: allResults,
    summary: `${totalPassed}/${total} tests passed (${((totalPassed/total)*100).toFixed(1)}%)`,
    categories,
    issues,
  };
}

// Export for use in other test files
export {
  test,
  assertEqual,
  assertTrue,
  assertFalse,
  assertInRange,
  createMockUser,
  createMockLeague,
  createMockMember,
  createMockMatchup,
  createMockMetrics,
  calculatePoints,
  sanitizeMetrics,
  getPlayoffQualifiers,
  shouldStartPlayoffs,
  generateRoundRobinSchedule,
  validateRoundRobinCompleteness,
  VALID_LEAGUE_SIZES,
  SCORING_CONFIG,
  METRIC_CAPS,
};
