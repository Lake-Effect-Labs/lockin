// ============================================
// DATE UTILITIES
// Lock-In Fitness Competition App
// ============================================
//
// TIMEZONE STRATEGY (Updated: January 5, 2026)
// ============================================
// All competition week boundaries are calculated in UTC for determinism.
// This ensures that all users in a league have the same deadline regardless
// of their local timezone.
//
// Week Boundaries (UTC):
// - Week N starts: start_date + ((N-1) * 7 days) at 00:00:00 UTC
// - Week N ends: start_date + (N * 7 days) - 1 second at 23:59:59 UTC
//
// Critical Functions Using UTC:
// - getWeekNumber(): Calculates current week using UTC dates
// - getDaysRemainingInWeek(): Calculates days remaining using UTC timestamps
// - isResultsDay(): Checks if current UTC day is Sunday
//
// Display Functions (Local Time):
// - formatDate(), formatTime(), formatDateTime(): Display in user's local timezone
// - All other formatting functions use local time for user-friendly display
//
// ============================================

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    case 'full':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Format time to readable string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date, 'short')} at ${formatTime(date)}`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  
  return formatDate(d, 'short');
}

/**
 * Get start of day
 */
export function getStartOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 */
export function getEndOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of week (Sunday) - legacy function
 */
export function getStartOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get start of week (Monday) - for leagues
 */
export function getStartOfWeekMonday(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // If it's Sunday (0), go back 6 days to get Monday
  // Otherwise, go back (day - 1) days to get Monday
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of week (Saturday) - for leagues (Monday-Saturday scoring weeks)
 * Sunday is Results Day - view final scores and preview next opponent
 */
export function getEndOfWeekSaturday(date: Date = new Date()): Date {
  const weekStart = getStartOfWeekMonday(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5); // Saturday is 5 days after Monday
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get end of week (Sunday) - DEPRECATED: Use getEndOfWeekSaturday
 * Kept for backward compatibility
 */
export function getEndOfWeekSunday(date: Date = new Date()): Date {
  return getEndOfWeekSaturday(date);
}

/**
 * Get next Monday from a given date (always returns next Monday, never today)
 */
export function getNextMonday(fromDate: Date = new Date()): Date {
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  
  const day = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days until next Monday
  // If today is Monday (1), return NEXT Monday (+7 days, not today)
  // If today is Tuesday (2), return this coming Monday (+6 days)
  // If today is Sunday (0), return tomorrow Monday (+1 day)
  let daysUntilNextMonday;
  if (day === 1) {
    // Today is Monday, so next Monday is 7 days away
    daysUntilNextMonday = 7;
  } else if (day === 0) {
    // Today is Sunday, so next Monday is tomorrow
    daysUntilNextMonday = 1;
  } else {
    // Today is Tue-Sat, calculate days to next Monday
    daysUntilNextMonday = 8 - day;
  }
  
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  return nextMonday;
}

/**
 * Get end of week (Saturday) - legacy function
 */
export function getEndOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (6 - day));
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get week number from start date (Monday-Sunday weeks)
 * Returns the current week number based on calendar weeks since start_date
 * NOTE: startDate should always be a Monday (league start date)
 * USES UTC for deterministic week boundaries across all timezones
 */
export function getWeekNumber(startDate: Date | string, currentDate: Date = new Date()): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const current = new Date(currentDate);
  
  // Use UTC for deterministic week calculations
  // Create UTC timestamps at start of day (00:00:00 UTC)
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const currentUTC = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
  
  // Calculate which week we're currently in:
  // Week 1: startDate (Monday 00:00 UTC) through startDate + 6 days (Sunday 23:59 UTC)
  // Week 2: startDate + 7 days (Monday 00:00 UTC) through startDate + 13 days (Sunday 23:59 UTC)
  // etc.
  
  const diffMs = currentUTC - startUTC;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // If current date is before start date, we're in week 0 (not started yet)
  if (diffDays < 0) {
    return 0;
  }
  
  // Calculate week number: days since start / 7, then add 1
  // Days 0-6 = Week 1, Days 7-13 = Week 2, etc.
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  return weekNumber;
}

/**
 * Get days remaining in week
 * Uses Math.floor so that the last day of the week shows as "0 days" (ends today)
 * USES UTC for deterministic week boundaries across all timezones
 */
export function getDaysRemainingInWeek(startDate: Date | string, weekNumber: number): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  
  // Calculate week end in UTC
  // Week N ends at: start_date + (N * 7 days) - 1 second
  // But for day counting, we use start of the day after (start_date + N * 7 days)
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const weekEndUTC = startUTC + (weekNumber * 7 * 24 * 60 * 60 * 1000);
  
  // Get current time in UTC
  const nowUTC = Date.now();
  
  const diffMs = weekEndUTC - nowUTC;
  // Use Math.floor instead of Math.ceil so Saturday shows as "0 days"
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get week date range string
 */
export function getWeekRangeString(startDate: Date | string, weekNumber: number): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + ((weekNumber - 1) * 7));
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  return `${formatDate(weekStart, 'short')} - ${formatDate(weekEnd, 'short')}`;
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d > new Date();
}

/**
 * Check if today is Results Day (Sunday)
 * Results Day is when users can view final matchup results and preview next opponent
 * Scoring period is Mon-Sat, Sunday is for reviewing results
 * USES UTC to ensure consistent Results Day across all timezones
 */
export function isResultsDay(date: Date = new Date()): boolean {
  return date.getUTCDay() === 0; // 0 = Sunday in UTC
}

/**
 * Add days to date
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get countdown string
 */
export function getCountdownString(targetDate: Date | string): string {
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Now!';
  
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay}d ${diffHour % 24}h`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ${diffMin % 60}m`;
  }
  if (diffMin > 0) {
    return `${diffMin}m ${diffSec % 60}s`;
  }
  return `${diffSec}s`;
}

/**
 * Get array of dates for a week
 */
export function getWeekDates(startDate: Date = getStartOfWeek()): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
}

/**
 * Format day of week
 */
export function formatDayOfWeek(date: Date, format: 'short' | 'long' = 'short'): string {
  return date.toLocaleDateString('en-US', { 
    weekday: format === 'short' ? 'short' : 'long' 
  });
}

