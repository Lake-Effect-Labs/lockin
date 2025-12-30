// ============================================
// SCORING ENGINE
// Lock-In Fitness Competition App
// ============================================

// Default Scoring Constants
export const DEFAULT_SCORING_CONFIG = {
  POINTS_PER_1000_STEPS: 1,
  POINTS_PER_SLEEP_HOUR: 2,
  POINTS_PER_100_ACTIVE_CAL: 5,
  POINTS_PER_WORKOUT_MINUTE: 0.2, // 1 point per 5 minutes of exercise
  POINTS_PER_STAND_HOUR: 5, // 5 points per hour stood
  POINTS_PER_MILE: 3,
} as const;

// Legacy export for backwards compatibility
export const SCORING_CONFIG = DEFAULT_SCORING_CONFIG;

// Valid league sizes
export const VALID_LEAGUE_SIZES = [4, 6, 8, 10, 12, 14] as const;
export type ValidLeagueSize = typeof VALID_LEAGUE_SIZES[number];

// Scoring config type
export interface ScoringConfig {
  points_per_1000_steps?: number;
  points_per_sleep_hour?: number;
  points_per_100_active_cal?: number;
  points_per_workout?: number;
  points_per_stand_hour?: number;
  points_per_mile?: number;
}

/**
 * Sanitize a scoring config value to be a valid positive number
 */
export function sanitizeScoringValue(value: unknown, defaultValue: number): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return defaultValue;
  }
  // Cap at 100 points max per unit
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Sanitize an entire scoring config
 */
export function sanitizeScoringConfig(config: ScoringConfig | null | undefined): ScoringConfig {
  if (!config) return {};

  return {
    points_per_1000_steps: sanitizeScoringValue(config.points_per_1000_steps, DEFAULT_SCORING_CONFIG.POINTS_PER_1000_STEPS),
    points_per_sleep_hour: sanitizeScoringValue(config.points_per_sleep_hour, DEFAULT_SCORING_CONFIG.POINTS_PER_SLEEP_HOUR),
    points_per_100_active_cal: sanitizeScoringValue(config.points_per_100_active_cal, DEFAULT_SCORING_CONFIG.POINTS_PER_100_ACTIVE_CAL),
    points_per_workout: sanitizeScoringValue(config.points_per_workout, DEFAULT_SCORING_CONFIG.POINTS_PER_WORKOUT_MINUTE),
    points_per_stand_hour: sanitizeScoringValue(config.points_per_stand_hour, DEFAULT_SCORING_CONFIG.POINTS_PER_STAND_HOUR),
    points_per_mile: sanitizeScoringValue(config.points_per_mile, DEFAULT_SCORING_CONFIG.POINTS_PER_MILE),
  };
}

/**
 * Sanitize fitness metrics to handle NaN, Infinity, and unreasonable values
 */
export function sanitizeMetrics(metrics: Partial<FitnessMetrics>): FitnessMetrics {
  const sanitizeNumber = (val: unknown, max: number): number => {
    const num = Number(val);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(max, num));
  };

  return {
    steps: Math.round(sanitizeNumber(metrics.steps, 200000)),      // Max 200k steps/day
    sleepHours: sanitizeNumber(metrics.sleepHours, 24),            // Max 24 hrs
    calories: Math.round(sanitizeNumber(metrics.calories, 10000)), // Max 10k cal
    workouts: Math.round(sanitizeNumber(metrics.workouts, 480)),   // Max 480 mins (8 hrs) workout/day
    standHours: sanitizeNumber(metrics.standHours, 24),            // Max 24 stand hours/day
    distance: sanitizeNumber(metrics.distance, 100),               // Max 100 miles/day
  };
}

/**
 * Get scoring config from league or use defaults
 */
export function getScoringConfig(leagueConfig?: ScoringConfig | null): typeof DEFAULT_SCORING_CONFIG {
  if (!leagueConfig) return DEFAULT_SCORING_CONFIG;

  return {
    POINTS_PER_1000_STEPS: sanitizeScoringValue(leagueConfig.points_per_1000_steps, DEFAULT_SCORING_CONFIG.POINTS_PER_1000_STEPS) as 1,
    POINTS_PER_SLEEP_HOUR: sanitizeScoringValue(leagueConfig.points_per_sleep_hour, DEFAULT_SCORING_CONFIG.POINTS_PER_SLEEP_HOUR) as 2,
    POINTS_PER_100_ACTIVE_CAL: sanitizeScoringValue(leagueConfig.points_per_100_active_cal, DEFAULT_SCORING_CONFIG.POINTS_PER_100_ACTIVE_CAL) as 5,
    POINTS_PER_WORKOUT_MINUTE: sanitizeScoringValue(leagueConfig.points_per_workout, DEFAULT_SCORING_CONFIG.POINTS_PER_WORKOUT_MINUTE) as 0.2,
    POINTS_PER_STAND_HOUR: sanitizeScoringValue(leagueConfig.points_per_stand_hour, DEFAULT_SCORING_CONFIG.POINTS_PER_STAND_HOUR) as 5,
    POINTS_PER_MILE: sanitizeScoringValue(leagueConfig.points_per_mile, DEFAULT_SCORING_CONFIG.POINTS_PER_MILE) as 3,
  };
}

export interface FitnessMetrics {
  steps: number;
  sleepHours: number;
  calories: number;
  workouts: number; // in minutes
  standHours: number; // hours stood up
  distance: number; // in miles
}

export interface PointsBreakdown {
  stepsPoints: number;
  sleepPoints: number;
  caloriesPoints: number;
  workoutsPoints: number;
  standHoursPoints: number;
  distancePoints: number;
  totalPoints: number;
}

// ============================================
// SANITIZATION & VALIDATION
// ============================================

/**
 * Sanitization caps to prevent unrealistic values
 * (e.g., 50,000 steps = 25 miles of walking)
 */
const SANITIZATION_CAPS = {
  MAX_STEPS: 100000, // ~47 miles/day (humanly possible)
  MAX_SLEEP_HOURS: 24, // can't sleep more than 24 hours
  MAX_CALORIES: 10000, // ~5x average daily burn
  MAX_WORKOUT_MINUTES: 1440, // can't exercise more than 24 hours/day (1440 minutes)
  MAX_STAND_HOURS: 16, // can't stand more than 16 hours/day (need sleep)
  MAX_DISTANCE: 150, // ~ultra-marathon distance
} as const;

/**
 * Sanitize fitness metrics - handles NaN, Infinity, negative, and unrealistic values
 * @param metrics - Raw fitness metrics (may contain invalid values)
 * @returns Sanitized metrics with values capped and normalized
 */
export function sanitizeMetrics(metrics: FitnessMetrics): FitnessMetrics {
  const sanitize = (value: any, max: number): number => {
    // Convert to number, handle NaN/Infinity/null/undefined
    const num = Number(value);
    if (!isFinite(num)) return 0;
    
    // No negative values
    if (num < 0) return 0;
    
    // Cap at maximum
    return Math.min(num, max);
  };

  return {
    steps: sanitize(metrics.steps, SANITIZATION_CAPS.MAX_STEPS),
    sleepHours: sanitize(metrics.sleepHours, SANITIZATION_CAPS.MAX_SLEEP_HOURS),
    calories: sanitize(metrics.calories, SANITIZATION_CAPS.MAX_CALORIES),
    workouts: sanitize(metrics.workouts, SANITIZATION_CAPS.MAX_WORKOUT_MINUTES),
    standHours: sanitize(metrics.standHours, SANITIZATION_CAPS.MAX_STAND_HOURS),
    distance: sanitize(metrics.distance, SANITIZATION_CAPS.MAX_DISTANCE),
  };
}

/**
 * Calculate total points from fitness metrics
 * Handles null/undefined/NaN values gracefully and caps unrealistic values
 * @param metrics - Fitness metrics to calculate points for
 * @param config - Optional scoring config (defaults to DEFAULT_SCORING_CONFIG)
 */
export function calculatePoints(metrics: FitnessMetrics, config?: typeof DEFAULT_SCORING_CONFIG): number {
  const scoringConfig = config || DEFAULT_SCORING_CONFIG;
  // Sanitize inputs - handles NaN, Infinity, negative values, and caps
  const safe = sanitizeMetrics(metrics);

  const stepsPoints = (safe.steps / 1000) * scoringConfig.POINTS_PER_1000_STEPS;
  const sleepPoints = safe.sleepHours * scoringConfig.POINTS_PER_SLEEP_HOUR;
  const caloriesPoints = (safe.calories / 100) * scoringConfig.POINTS_PER_100_ACTIVE_CAL;
  const workoutsPoints = safe.workouts * scoringConfig.POINTS_PER_WORKOUT_MINUTE;
  const standHoursPoints = safe.standHours * scoringConfig.POINTS_PER_STAND_HOUR;
  const distancePoints = safe.distance * scoringConfig.POINTS_PER_MILE;

  return Math.round((stepsPoints + sleepPoints + caloriesPoints + workoutsPoints + standHoursPoints + distancePoints) * 100) / 100;
}

/**
 * Get detailed breakdown of points by category
 * Handles null/undefined/NaN values gracefully and caps unrealistic values
 * @param metrics - Fitness metrics to calculate breakdown for
 * @param config - Optional scoring config (defaults to DEFAULT_SCORING_CONFIG)
 */
export function getPointsBreakdown(metrics: FitnessMetrics, config?: typeof DEFAULT_SCORING_CONFIG): PointsBreakdown {
  const scoringConfig = config || DEFAULT_SCORING_CONFIG;
  // Sanitize inputs - handles NaN, Infinity, negative values, and caps
  const safe = sanitizeMetrics(metrics);

  const stepsPoints = Math.round((safe.steps / 1000) * scoringConfig.POINTS_PER_1000_STEPS * 100) / 100;
  const sleepPoints = Math.round(safe.sleepHours * scoringConfig.POINTS_PER_SLEEP_HOUR * 100) / 100;
  const caloriesPoints = Math.round((safe.calories / 100) * scoringConfig.POINTS_PER_100_ACTIVE_CAL * 100) / 100;
  const workoutsPoints = Math.round(safe.workouts * scoringConfig.POINTS_PER_WORKOUT_MINUTE * 100) / 100;
  const standHoursPoints = Math.round(safe.standHours * scoringConfig.POINTS_PER_STAND_HOUR * 100) / 100;
  const distancePoints = Math.round(safe.distance * scoringConfig.POINTS_PER_MILE * 100) / 100;

  return {
    stepsPoints,
    sleepPoints,
    caloriesPoints,
    workoutsPoints,
    standHoursPoints,
    distancePoints,
    totalPoints: stepsPoints + sleepPoints + caloriesPoints + workoutsPoints + standHoursPoints + distancePoints,
  };
}

/**
 * Calculate projected weekly score based on daily average
 */
export function projectWeeklyScore(dailyMetrics: FitnessMetrics, daysCompleted: number): number {
  if (daysCompleted === 0) return 0;
  
  const dailyPoints = calculatePoints(dailyMetrics) / daysCompleted;
  return Math.round(dailyPoints * 7 * 100) / 100;
}

/**
 * Compare two scores and determine winner
 */
export function compareScores(
  player1Score: number,
  player2Score: number
): { winner: 1 | 2 | null; isTie: boolean; margin: number } {
  const margin = Math.abs(player1Score - player2Score);
  
  if (player1Score === player2Score) {
    return { winner: null, isTie: true, margin: 0 };
  }
  
  return {
    winner: player1Score > player2Score ? 1 : 2,
    isTie: false,
    margin,
  };
}

/**
 * Calculate win probability based on current scores and time remaining
 */
export function calculateWinProbability(
  currentScore: number,
  opponentScore: number,
  daysRemaining: number
): number {
  const scoreDiff = currentScore - opponentScore;
  const avgDailySwing = 15; // Average daily score variance
  const maxSwing = avgDailySwing * daysRemaining;
  
  if (daysRemaining === 0) {
    return scoreDiff > 0 ? 100 : scoreDiff < 0 ? 0 : 50;
  }
  
  // Simple probability model
  const probability = 50 + (scoreDiff / maxSwing) * 50;
  return Math.max(0, Math.min(100, Math.round(probability)));
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`;
  }
  return points.toFixed(1);
}

/**
 * Get scoring rule description
 * @param config - Optional scoring config (defaults to DEFAULT_SCORING_CONFIG)
 */
export function getScoringRules(config?: typeof DEFAULT_SCORING_CONFIG): { metric: string; rule: string; icon: string }[] {
  const scoringConfig = config || DEFAULT_SCORING_CONFIG;
  
  return [
    {
      metric: 'Steps',
      rule: `${scoringConfig.POINTS_PER_1000_STEPS} point per 1,000 steps`,
      icon: '👟',
    },
    {
      metric: 'Sleep',
      rule: `${scoringConfig.POINTS_PER_SLEEP_HOUR} points per hour of sleep`,
      icon: '😴',
    },
    {
      metric: 'Calories',
      rule: `${scoringConfig.POINTS_PER_100_ACTIVE_CAL} points per 100 active calories`,
      icon: '🔥',
    },
    {
      metric: 'Workouts',
      rule: `${scoringConfig.POINTS_PER_WORKOUT} points per workout`,
      icon: '💪',
    },
    {
      metric: 'Distance',
      rule: `${scoringConfig.POINTS_PER_MILE} points per mile`,
      icon: '🏃',
    },
  ];
}

/**
 * Aggregate daily metrics into weekly totals
 * Handles null/undefined/NaN values gracefully
 */
export function aggregateWeeklyMetrics(dailyMetrics: FitnessMetrics[]): FitnessMetrics {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 0, distance: 0 };
  }
  
  return dailyMetrics.reduce(
    (acc, day) => ({
      steps: acc.steps + (Number(day?.steps) || 0),
      sleepHours: acc.sleepHours + (Number(day?.sleepHours) || 0),
      calories: acc.calories + (Number(day?.calories) || 0),
      workouts: acc.workouts + (Number(day?.workouts) || 0),
      standHours: acc.standHours + (Number(day?.standHours) || 0),
      distance: acc.distance + (Number(day?.distance) || 0),
    }),
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, standHours: 0, distance: 0 }
  );
}

