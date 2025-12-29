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
  POINTS_PER_MILE: 3,
} as const;

// Legacy export for backwards compatibility
export const SCORING_CONFIG = DEFAULT_SCORING_CONFIG;

// Scoring config type
export interface ScoringConfig {
  points_per_1000_steps?: number;
  points_per_sleep_hour?: number;
  points_per_100_active_cal?: number;
  points_per_workout?: number;
  points_per_mile?: number;
}

/**
 * Get scoring config from league or use defaults
 */
export function getScoringConfig(leagueConfig?: ScoringConfig | null): typeof DEFAULT_SCORING_CONFIG {
  if (!leagueConfig) return DEFAULT_SCORING_CONFIG;
  
  return {
    POINTS_PER_1000_STEPS: (leagueConfig.points_per_1000_steps ?? DEFAULT_SCORING_CONFIG.POINTS_PER_1000_STEPS) as 1,
    POINTS_PER_SLEEP_HOUR: (leagueConfig.points_per_sleep_hour ?? DEFAULT_SCORING_CONFIG.POINTS_PER_SLEEP_HOUR) as 2,
    POINTS_PER_100_ACTIVE_CAL: (leagueConfig.points_per_100_active_cal ?? DEFAULT_SCORING_CONFIG.POINTS_PER_100_ACTIVE_CAL) as 5,
    POINTS_PER_WORKOUT_MINUTE: (leagueConfig.points_per_workout ?? DEFAULT_SCORING_CONFIG.POINTS_PER_WORKOUT_MINUTE) as 0.2,
    POINTS_PER_MILE: (leagueConfig.points_per_mile ?? DEFAULT_SCORING_CONFIG.POINTS_PER_MILE) as 3,
  };
}

export interface FitnessMetrics {
  steps: number;
  sleepHours: number;
  calories: number;
  workouts: number;
  distance: number; // in miles
}

export interface PointsBreakdown {
  stepsPoints: number;
  sleepPoints: number;
  caloriesPoints: number;
  workoutsPoints: number;
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
  const distancePoints = safe.distance * scoringConfig.POINTS_PER_MILE;
  
  return Math.round((stepsPoints + sleepPoints + caloriesPoints + workoutsPoints + distancePoints) * 100) / 100;
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
  const distancePoints = Math.round(safe.distance * scoringConfig.POINTS_PER_MILE * 100) / 100;
  
  return {
    stepsPoints,
    sleepPoints,
    caloriesPoints,
    workoutsPoints,
    distancePoints,
    totalPoints: stepsPoints + sleepPoints + caloriesPoints + workoutsPoints + distancePoints,
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
    return { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 };
  }
  
  return dailyMetrics.reduce(
    (acc, day) => ({
      steps: acc.steps + (Number(day?.steps) || 0),
      sleepHours: acc.sleepHours + (Number(day?.sleepHours) || 0),
      calories: acc.calories + (Number(day?.calories) || 0),
      workouts: acc.workouts + (Number(day?.workouts) || 0),
      distance: acc.distance + (Number(day?.distance) || 0),
    }),
    { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 }
  );
}

