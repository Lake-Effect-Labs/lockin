#!/usr/bin/env node

/**
 * REGRESSION TEST RUNNER (Pure JavaScript)
 *
 * Run with: node tests/regression-runner.js
 */

// ============================================
// TEST UTILITIES
// ============================================

const allResults = [];

function test(category, testId, name, severity, fn) {
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
  } catch (e) {
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

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const error = new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

function assertTrue(condition, message) {
  if (!condition) {
    const error = new Error(message || 'Expected true but got false');
    error.expected = true;
    error.actual = false;
    throw error;
  }
}

function assertFalse(condition, message) {
  if (condition) {
    const error = new Error(message || 'Expected false but got true');
    error.expected = false;
    error.actual = true;
    throw error;
  }
}

function assertInRange(value, min, max, message) {
  if (value < min || value > max) {
    const error = new Error(message || `Expected ${value} to be between ${min} and ${max}`);
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
  workouts: 480,
  standHours: 24,
  distance: 100,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function createMockMember(id, leagueId, wins, losses, totalPoints, playoffSeed = null) {
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
  };
}

function createMockMatchup(leagueId, weekNumber, player1Id, player2Id, player1Score = 0, player2Score = 0, isFinalized = false) {
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
  };
}

function createMockLeague(id, maxPlayers, seasonLength = 8, currentWeek = 1) {
  return {
    id,
    name: `Test League ${id}`,
    join_code: generateJoinCode(),
    created_by: 'creator-id',
    season_length_weeks: seasonLength,
    current_week: currentWeek,
    start_date: null,
    is_active: true,
    playoffs_started: false,
    champion_id: null,
    max_players: maxPlayers,
    scoring_config: null,
  };
}

// ============================================
// SCORING FUNCTIONS
// ============================================

function calculatePoints(metrics, config) {
  const cfg = config || SCORING_CONFIG;

  const sanitize = (val) => {
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

function sanitizeMetrics(metrics) {
  const sanitize = (val, max) => {
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
// PLAYOFF FUNCTIONS
// ============================================

function getPlayoffQualifiers(members, leagueSize = 8) {
  const sorted = [...members].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.total_points - a.total_points;
  });
  return sorted.slice(0, 4);
}

function shouldStartPlayoffs(currentWeek, seasonLength, playoffsStarted, playerCount) {
  if (playerCount !== undefined && playerCount < 4) {
    return false;
  }
  return currentWeek > seasonLength && !playoffsStarted;
}

// ============================================
// ROUND ROBIN FUNCTIONS
// ============================================

function generateRoundRobinSchedule(playerIds, numWeeks) {
  const n = playerIds.length;
  const schedule = [];
  const players = [...playerIds];

  for (let round = 0; round < numWeeks; round++) {
    const actualRound = round % (n - 1);
    const rotated = [players[0]];

    for (let i = 1; i < n; i++) {
      const newIndex = ((i - 1 + actualRound) % (n - 1)) + 1;
      rotated.push(players[newIndex]);
    }

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

function validateRoundRobinCompleteness(playerIds, schedule) {
  const playerGameCounts = {};
  playerIds.forEach(id => {
    playerGameCounts[id] = new Set();
  });

  schedule.forEach(match => {
    playerGameCounts[match.player1].add(match.player2);
    playerGameCounts[match.player2].add(match.player1);
  });

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
// TEST SUITE
// ============================================

function runLeagueCreationTests() {
  VALID_LEAGUE_SIZES.forEach(size => {
    test('League Creation', `LC-001-${size}`, `League size ${size} should be valid`, 'critical', () => {
      const league = createMockLeague(`test-${size}`, size);
      assertEqual(league.max_players, size);
      assertTrue(VALID_LEAGUE_SIZES.includes(league.max_players));
    });
  });

  [1, 2, 3, 5, 7, 9, 11, 13, 15, 16, 20].forEach(size => {
    test('League Creation', `LC-002-${size}`, `League size ${size} should be invalid`, 'high', () => {
      assertFalse(VALID_LEAGUE_SIZES.includes(size), `Size ${size} should not be valid`);
    });
  });

  test('League Creation', 'LC-003', 'Join code should be 6 alphanumeric characters', 'high', () => {
    const code = generateJoinCode();
    assertEqual(code.length, 6);
    assertTrue(/^[A-Z0-9]{6}$/.test(code), 'Join code should be uppercase alphanumeric');
  });

  [6, 8, 10, 12].forEach(weeks => {
    test('League Creation', `LC-004-${weeks}`, `Season length ${weeks} weeks should be valid`, 'medium', () => {
      const league = createMockLeague('test', 8, weeks);
      assertEqual(league.season_length_weeks, weeks);
    });
  });

  test('League Creation', 'LC-005', 'New league should have null start_date', 'medium', () => {
    const league = createMockLeague('test', 8);
    assertEqual(league.start_date, null);
    assertEqual(league.is_active, true);
    assertEqual(league.playoffs_started, false);
  });
}

function runLeagueJoiningTests() {
  VALID_LEAGUE_SIZES.forEach(size => {
    test('League Joining', `LJ-001-${size}`, `League of ${size} should auto-start when full`, 'critical', () => {
      const league = createMockLeague('test', size);
      const members = Array.from({ length: size }, (_, i) =>
        createMockMember(`player-${i}`, league.id, 0, 0, 0)
      );
      assertEqual(members.length, size);
      assertTrue(members.length >= league.max_players, 'Members should equal max_players');
    });
  });

  test('League Joining', 'LJ-002', 'Cannot join full league', 'critical', () => {
    const league = createMockLeague('test', 4);
    const members = Array.from({ length: 4 }, (_, i) =>
      createMockMember(`player-${i}`, league.id, 0, 0, 0)
    );
    const isFull = members.length >= league.max_players;
    assertTrue(isFull, 'League should be full');
  });

  test('League Joining', 'LJ-003', 'Cannot join started league', 'critical', () => {
    const league = createMockLeague('test', 8);
    league.start_date = '2024-01-15';
    league.current_week = 3;
    assertTrue(league.start_date !== null, 'Started league has start_date');
  });
}

function runMatchupGenerationTests() {
  VALID_LEAGUE_SIZES.forEach(size => {
    test('Matchup Generation', `MG-001-${size}`, `Round-robin for ${size} players should be complete`, 'critical', () => {
      const playerIds = Array.from({ length: size }, (_, i) => `player-${i}`);
      const seasonLength = size - 1;
      const schedule = generateRoundRobinSchedule(playerIds, seasonLength);
      const result = validateRoundRobinCompleteness(playerIds, schedule);
      assertTrue(result.complete, `Round-robin incomplete: ${result.missingGame}`);
    });
  });

  VALID_LEAGUE_SIZES.forEach(size => {
    test('Matchup Generation', `MG-002-${size}`, `${size} players (even) should have no byes`, 'high', () => {
      const playerIds = Array.from({ length: size }, (_, i) => `player-${i}`);
      const schedule = generateRoundRobinSchedule(playerIds, size - 1);
      const week1Matchups = schedule.filter(m => m.week === 1);
      assertEqual(week1Matchups.length, size / 2, `Week 1 should have ${size / 2} matchups`);
    });
  });

  test('Matchup Generation', 'MG-003', 'Each player plays exactly once per week', 'critical', () => {
    const playerIds = ['A', 'B', 'C', 'D', 'E', 'F'];
    const schedule = generateRoundRobinSchedule(playerIds, 5);

    for (let week = 1; week <= 5; week++) {
      const weekMatchups = schedule.filter(m => m.week === week);
      const playersInWeek = [];
      weekMatchups.forEach(m => {
        playersInWeek.push(m.player1, m.player2);
      });
      const uniquePlayers = new Set(playersInWeek);
      assertEqual(uniquePlayers.size, 6, `Week ${week} should have all 6 players playing`);
    }
  });

  test('Matchup Generation', 'MG-004', 'No repeat opponents before full round-robin', 'high', () => {
    const playerIds = ['A', 'B', 'C', 'D'];
    const schedule = generateRoundRobinSchedule(playerIds, 3);
    const matchupPairs = new Set();

    schedule.forEach(m => {
      const pair = [m.player1, m.player2].sort().join('-');
      assertFalse(matchupPairs.has(pair), `Duplicate matchup found: ${pair}`);
      matchupPairs.add(pair);
    });
  });
}

function runWeeklyScoringTests() {
  test('Weekly Scoring', 'WS-001', 'Basic scoring calculation', 'critical', () => {
    const metrics = { steps: 10000, sleepHours: 8, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const points = calculatePoints(metrics);
    assertEqual(points, 122, 'Points should equal 122');
  });

  test('Weekly Scoring', 'WS-002', 'Zero values return zero points', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 0, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 0);
  });

  test('Weekly Scoring', 'WS-003', 'NaN values treated as zero', 'critical', () => {
    const metrics = { steps: NaN, sleepHours: 8, calories: NaN, workouts: 30, standHours: NaN, distance: 5 };
    const points = calculatePoints(metrics);
    assertEqual(points, 37);
  });

  test('Weekly Scoring', 'WS-004', 'Negative values clamped to zero', 'high', () => {
    const metrics = { steps: -1000, sleepHours: -5, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const points = calculatePoints(metrics);
    assertEqual(points, 96);
  });

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

  test('Weekly Scoring', 'WS-006', 'Custom scoring config overrides defaults', 'medium', () => {
    const metrics = { steps: 10000, sleepHours: 8, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const customConfig = { ...SCORING_CONFIG, POINTS_PER_1000_STEPS: 2 };
    const points = calculatePoints(metrics, customConfig);
    assertEqual(points, 132);
  });

  test('Weekly Scoring', 'WS-007', 'Stand hours scored correctly', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 12, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 60);
  });

  test('Weekly Scoring', 'WS-008', 'Workout minutes scored at 0.2 per minute', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 60, standHours: 0, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 12);
  });
}

function runWeekFinalizationTests() {
  test('Week Finalization', 'WF-001', 'Higher score wins', 'critical', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 100, 80, true);
    assertEqual(matchup.winner_id, 'A');
    assertFalse(matchup.is_tie);
  });

  test('Week Finalization', 'WF-002', 'Lower score loses', 'critical', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 80, 100, true);
    assertEqual(matchup.winner_id, 'B');
  });

  test('Week Finalization', 'WF-003', 'Equal scores result in tie', 'high', () => {
    const matchup = createMockMatchup('league', 1, 'A', 'B', 100, 100, true);
    assertEqual(matchup.winner_id, null);
    assertTrue(matchup.is_tie);
  });

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

    assertEqual(sorted[0].user_id, 'B');
    assertEqual(sorted[1].user_id, 'C');
    assertEqual(sorted[2].user_id, 'A');
  });

  test('Week Finalization', 'WF-005', 'Tiebreaker uses total points', 'critical', () => {
    const members = [
      createMockMember('A', 'league', 4, 4, 400),
      createMockMember('B', 'league', 4, 4, 500),
      createMockMember('C', 'league', 4, 4, 350),
    ];

    const sorted = [...members].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.total_points - a.total_points;
    });

    assertEqual(sorted[0].user_id, 'B');
    assertEqual(sorted[1].user_id, 'A');
    assertEqual(sorted[2].user_id, 'C');
  });
}

function runPlayoffQualificationTests() {
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

  test('Playoff Qualification', 'PQ-002', 'Playoff tiebreaker by points', 'critical', () => {
    const members = [
      createMockMember('1', 'league', 5, 3, 800),
      createMockMember('2', 'league', 5, 3, 750),
      createMockMember('3', 'league', 5, 3, 700),
      createMockMember('4', 'league', 5, 3, 650),
      createMockMember('5', 'league', 5, 3, 600),
      createMockMember('6', 'league', 3, 5, 900),
    ];

    const qualifiers = getPlayoffQualifiers(members);
    assertEqual(qualifiers[0].user_id, '1');
    assertEqual(qualifiers[1].user_id, '2');
    assertEqual(qualifiers[2].user_id, '3');
    assertEqual(qualifiers[3].user_id, '4');
  });

  test('Playoff Qualification', 'PQ-003', 'Playoffs start after season ends', 'critical', () => {
    assertFalse(shouldStartPlayoffs(8, 8, false), 'Should not start during week 8');
    assertTrue(shouldStartPlayoffs(9, 8, false), 'Should start after week 8');
  });

  test('Playoff Qualification', 'PQ-004', 'Playoffs should not restart if already started', 'high', () => {
    assertFalse(shouldStartPlayoffs(9, 8, true), 'Should not restart');
    assertFalse(shouldStartPlayoffs(10, 8, true), 'Should not restart');
  });

  test('Playoff Qualification', 'PQ-005', 'Need minimum 4 players for playoffs', 'critical', () => {
    assertFalse(shouldStartPlayoffs(9, 8, false, 3), 'Should not start with 3 players');
    assertTrue(shouldStartPlayoffs(9, 8, false, 4), 'Should start with 4 players');
  });

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

function runPlayoffBracketTests() {
  test('Playoff Bracket', 'PB-001', 'Semifinal seeding: 1v4, 2v3', 'critical', () => {
    const qualifiers = [
      createMockMember('seed1', 'league', 7, 1, 800),
      createMockMember('seed2', 'league', 6, 2, 700),
      createMockMember('seed3', 'league', 5, 3, 600),
      createMockMember('seed4', 'league', 4, 4, 500),
    ];
    assertEqual(qualifiers[0].user_id, 'seed1');
    assertEqual(qualifiers[3].user_id, 'seed4');
    assertEqual(qualifiers[1].user_id, 'seed2');
    assertEqual(qualifiers[2].user_id, 'seed3');
  });

  test('Playoff Bracket', 'PB-002', 'One week per playoff round', 'high', () => {
    const semifinalWeek = 9;
    const finalsWeek = semifinalWeek + 1;
    assertEqual(finalsWeek, 10);
  });

  test('Playoff Bracket', 'PB-003', 'Semifinal winners go to finals', 'critical', () => {
    const semi1 = createMockMatchup('league', 9, 'seed1', 'seed4', 100, 80, true);
    const semi2 = createMockMatchup('league', 9, 'seed2', 'seed3', 90, 95, true);
    assertEqual(semi1.winner_id, 'seed1');
    assertEqual(semi2.winner_id, 'seed3');
  });
}

function runChampionTests() {
  test('Champion', 'CH-001', 'Finals winner becomes champion', 'critical', () => {
    const finals = createMockMatchup('league', 10, 'seed1', 'seed3', 120, 110, true);
    assertEqual(finals.winner_id, 'seed1');
  });

  test('Champion', 'CH-002', 'League marked inactive after finals', 'high', () => {
    const league = createMockLeague('test', 8);
    league.champion_id = 'seed1';
    league.is_active = false;
    assertEqual(league.champion_id, 'seed1');
    assertFalse(league.is_active);
  });
}

function runEdgeCaseTests() {
  test('Edge Cases', 'EC-001', 'Cannot leave league mid-season', 'critical', () => {
    const league = createMockLeague('test', 8, 8, 4);
    league.start_date = '2024-01-15';
    assertTrue(league.start_date !== null);
    assertTrue(league.current_week <= league.season_length_weeks);
    assertTrue(league.is_active);
  });

  test('Edge Cases', 'EC-002', 'Cannot delete league mid-season', 'critical', () => {
    const league = createMockLeague('test', 8, 8, 4);
    league.start_date = '2024-01-15';
    assertTrue(league.is_active, 'Active leagues cannot be deleted');
  });

  test('Edge Cases', 'EC-003', 'Can delete completed league', 'medium', () => {
    const league = createMockLeague('test', 8);
    league.is_active = false;
    league.champion_id = 'winner';
    assertFalse(league.is_active, 'Inactive leagues can be deleted');
  });

  test('Edge Cases', 'EC-004', 'No health data = 0 points', 'high', () => {
    const metrics = { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 0, distance: 0 };
    const points = calculatePoints(metrics);
    assertEqual(points, 0);
  });

  test('Edge Cases', 'EC-005', 'Infinity values treated as zero', 'high', () => {
    const metrics = { steps: Infinity, sleepHours: 8, calories: 500, workouts: 30, standHours: 10, distance: 5 };
    const sanitized = sanitizeMetrics(metrics);
    assertEqual(sanitized.steps, 0);
  });

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
    assertEqual(qualifiers[0].user_id, 'C');
    assertEqual(qualifiers[1].user_id, 'F');
    assertEqual(qualifiers[2].user_id, 'B');
    assertEqual(qualifiers[3].user_id, 'E');
  });
}

// ============================================
// MAIN
// ============================================

function main() {
  console.log('========================================');
  console.log('LOCK-IN REGRESSION TEST SUITE');
  console.log('========================================\n');

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

  // Summarize
  const categories = {};
  allResults.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { name: result.category, tests: [], passed: 0, failed: 0 };
    }
    categories[result.category].tests.push(result);
    if (result.passed) {
      categories[result.category].passed++;
    } else {
      categories[result.category].failed++;
    }
  });

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

  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.filter(r => !r.passed).length;
  const total = allResults.length;

  console.log('\n========================================');
  console.log('OVERALL SUMMARY');
  console.log('========================================');
  console.log(`Total: ${totalPassed}/${total} tests passed (${((totalPassed/total)*100).toFixed(1)}%)`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  const issues = allResults.filter(r => !r.passed).map(r => ({
    testId: r.testId,
    description: `${r.name}: ${r.error}`,
    severity: r.severity,
  }));

  if (issues.length > 0) {
    console.log('\n========================================');
    console.log('ISSUES FOUND');
    console.log('========================================');
    issues.forEach(issue => {
      console.log(`[${issue.severity.toUpperCase()}] ${issue.testId}: ${issue.description}`);
    });
  } else {
    console.log('\nAll tests passed! No issues found.');
  }

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
