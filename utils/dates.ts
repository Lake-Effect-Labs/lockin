// ============================================
// DATE UTILITIES
// Lock-In Fitness Competition App
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
 * Get end of week (Sunday) - for leagues (Monday-Sunday weeks)
 */
export function getEndOfWeekSunday(date: Date = new Date()): Date {
  const weekStart = getStartOfWeekMonday(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday is 6 days after Monday
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get next Monday from a given date (or today if Monday, return next Monday)
 */
export function getNextMonday(fromDate: Date = new Date()): Date {
  const nextMonday = getStartOfWeekMonday(fromDate);
  // If today is already Monday, check if we want this Monday or next Monday
  // For league start, if it's Monday and before noon, use today; otherwise next Monday
  const today = new Date(fromDate);
  const isMonday = today.getDay() === 1;
  
  if (isMonday) {
    // If it's Monday, use next Monday (gives a full week to prepare)
    nextMonday.setDate(nextMonday.getDate() + 7);
  } else {
    // If it's not Monday, get the next Monday
    const day = today.getDay();
    const daysToAdd = day === 0 ? 1 : 8 - day; // Sunday: +1, Tue-Sat: 8-day
    nextMonday.setDate(today.getDate() + daysToAdd);
  }
  
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
 */
export function getWeekNumber(startDate: Date | string, currentDate: Date = new Date()): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const current = new Date(currentDate);
  
  // Normalize to start of day
  start.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  // Get the Monday of the start week
  const startMonday = getStartOfWeekMonday(start);
  
  // Get the Monday of the current week
  const currentMonday = getStartOfWeekMonday(current);
  
  // Calculate difference in weeks
  const diffMs = currentMonday.getTime() - startMonday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;
  
  // Week number should be at least 1
  return Math.max(1, weekNumber);
}

/**
 * Get days remaining in week
 */
export function getDaysRemainingInWeek(startDate: Date | string, weekNumber: number): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  // Week N ends at: start_date + (N * 7) days
  // Use getTime() to avoid date mutation issues
  const weekEnd = new Date(start.getTime() + (weekNumber * 7 * 24 * 60 * 60 * 1000));
  
  const now = new Date();
  const diffMs = weekEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
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

