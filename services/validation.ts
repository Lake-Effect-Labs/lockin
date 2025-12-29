// ============================================
// INPUT VALIDATION SERVICE
// Scoring, Health Data, and League Validation
// ============================================

import { FitnessMetrics } from './scoring';

/**
 * League size constants - only these sizes are allowed
 */
export const ALLOWED_LEAGUE_SIZES = [4, 6, 8, 10, 12, 14] as const;
export type AllowedLeagueSize = typeof ALLOWED_LEAGUE_SIZES[number];

/**
 * Validate that a league size is allowed
 */
export function isValidLeagueSize(size: number): size is AllowedLeagueSize {
  return ALLOWED_LEAGUE_SIZES.includes(size as AllowedLeagueSize);
}

/**
 * Validate health metrics for NaN, Infinity, and bad values
 * @param metrics - Raw health metrics
 * @returns true if metrics are valid
 */
export function validateHealthMetrics(metrics: FitnessMetrics | null | undefined): boolean {
  if (!metrics) return false;

  // Check each field
  const fields = ['steps', 'sleepHours', 'calories', 'workouts', 'distance'] as const;
  
  for (const field of fields) {
    const value = metrics[field];
    
    // Must be a number
    if (typeof value !== 'number') return false;
    
    // Must be finite
    if (!isFinite(value)) return false;
    
    // Must not be negative
    if (value < 0) return false;
  }
  
  return true;
}

/**
 * Validate score is safe to display
 * @param score - Score to validate
 * @returns true if score is valid and safe to display
 */
export function validateScore(score: number | null | undefined): boolean {
  if (score === null || score === undefined) return false;
  if (typeof score !== 'number') return false;
  if (!isFinite(score)) return false;
  if (score < 0) return false;
  return true;
}

/**
 * Safely format score for display, with fallback
 * @param score - Score to format
 * @param fallback - Value to show if score is invalid
 * @returns Formatted score string
 */
export function formatScoreForDisplay(score: number | null | undefined, fallback: string = '--'): string {
  if (!validateScore(score)) {
    return fallback;
  }
  return score!.toFixed(1);
}

/**
 * Validate playoff bracket requirements
 * @param memberCount - Number of members in league
 * @returns { valid: boolean, minRequired: number }
 */
export function validatePlayoffRequirements(memberCount: number): { valid: boolean; minRequired: number } {
  const MIN_FOR_PLAYOFFS = 4;
  
  return {
    valid: memberCount >= MIN_FOR_PLAYOFFS,
    minRequired: MIN_FOR_PLAYOFFS,
  };
}

/**
 * Check if league is full (ready to start)
 * @param currentMembers - Current number of members
 * @param maxPlayers - Maximum allowed players
 * @returns true if league is full
 */
export function isLeagueFull(currentMembers: number, maxPlayers: number): boolean {
  return currentMembers >= maxPlayers;
}

/**
 * Validate league can start
 * @param memberCount - Current number of members
 * @param maxPlayers - Maximum allowed players
 * @param hasStarted - Whether league has already started
 * @returns { canStart: boolean, reason?: string }
 */
export function validateLeagueCanStart(memberCount: number, maxPlayers: number, hasStarted: boolean): { canStart: boolean; reason?: string } {
  if (hasStarted) {
    return { canStart: false, reason: 'League has already started' };
  }
  
  if (memberCount < maxPlayers) {
    return { canStart: false, reason: `League must be full (${memberCount}/${maxPlayers})` };
  }
  
  return { canStart: true };
}

/**
 * Check if ad banner can be shown (need at least 2 leagues)
 * @param leagueCount - Number of user leagues
 * @returns true if ad banner can be shown safely
 */
export function canShowAdBanner(leagueCount: number): boolean {
  return leagueCount >= 2;
}

