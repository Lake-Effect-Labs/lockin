import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';
import {
  requestAuthorization,
  queryQuantitySamples,
  queryCategorySamples,
  queryWorkoutSamples,
  authorizationStatusFor,
  AuthorizationStatus,
} from '@kingstinct/react-native-healthkit';

// ============================================
// HEALTH DATA SERVICE
// iOS-only health data integration via Apple HealthKit
// Using @kingstinct/react-native-healthkit
// ============================================

export interface HealthPermissions {
  steps: boolean;
  sleep: boolean;
  calories: boolean;
  workouts: boolean;
  distance: boolean;
}

export interface DailyHealthData extends FitnessMetrics {
  date: string;
}

// Check if we're in Expo Go (which doesn't support HealthKit)
const isExpoGo = Constants?.executionEnvironment === 'storeClient';

/**
 * Get LOCAL start of day for a date
 * Uses local timezone to match how users think about "today"
 *
 * CRITICAL FIX: Previously used UTC which caused a timezone offset bug.
 * For EST (UTC-5) users at 11 PM, UTC queries would miss all data after 7 PM local.
 */
function getLocalStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get LOCAL end of day for a date
 * Uses local timezone to match how users think about "today"
 */
function getLocalEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Initialize health data access (iOS only)
 * Returns true if health data is available
 */
export async function initializeHealth(): Promise<boolean> {
  try {
    if (Platform.OS !== 'ios') {
      console.log('[Health] Not iOS, skipping');
      return false;
    }

    if (isExpoGo) {
      console.log('[Health] Running in Expo Go, skipping');
      return false;
    }

    console.log('[Health] Requesting authorization...');

    await requestAuthorization({
      toRead: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKCategoryTypeIdentifierSleepAnalysis',
        // Removed: 'HKCategoryTypeIdentifierAppleStandHour' - requires Apple Watch
        'HKWorkoutTypeIdentifier',
      ],
      toShare: [],
    });

    console.log('[Health] Authorization complete');
    return true;
  } catch (error: any) {
    console.error('[Health] Init error:', error?.message);
    return false;
  }
}

/**
 * Check if health services are available
 */
export function isHealthAvailable(): boolean {
  return Platform.OS === 'ios' && !isExpoGo;
}

/**
 * Get daily steps for a date
 */
export async function getDailySteps(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    // Use LOCAL timezone boundaries to match user's concept of "today"
    const from = getLocalStartOfDay(date);
    const to = getLocalEndOfDay(date);

    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples)) {
      const total = samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0);
      return Math.round(total);
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Steps error:', err?.message);
    throw new Error(`Failed to fetch steps: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get sleep hours for a date
 */
export async function getDailySleep(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    // Look at sleep from the night before (18:00 previous day to end of current day)
    // Use LOCAL timezone to match user's concept of sleep patterns
    const previousDay = new Date(date);
    previousDay.setDate(previousDay.getDate() - 1);
    const from = new Date(previousDay);
    from.setHours(18, 0, 0, 0);
    const to = getLocalEndOfDay(date);

    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples) && samples.length > 0) {
      let totalMinutes = 0;
      samples.forEach((s: any) => {
        // Skip "inBed" samples (value 0), only count actual sleep
        if (s?.value !== 0) {
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          totalMinutes += (end - start) / (1000 * 60);
        }
      });
      return totalMinutes / 60;
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Sleep error:', err?.message);
    throw new Error(`Failed to fetch sleep data: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get active calories for a date
 * 
 * BUG FIX: Removed invalid 'kilocalorie' unit parameter.
 * The @kingstinct/react-native-healthkit library auto-detects the unit.
 */
export async function getDailyCalories(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    // Use UTC boundaries for consistency (matching other metrics)
    const from = getUTCStartOfDay(date);
    const to = getUTCEndOfDay(date);

    // BUG FIX: Remove unit parameter - library auto-detects kilocalories
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples)) {
      const total = samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0);
      return Math.round(total);
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Calories error:', err?.message);
    throw new Error(`Failed to fetch calories: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get distance walked/run for a date (in miles)
 */
export async function getDailyDistance(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    // Use LOCAL timezone boundaries to match user's concept of "today"
    const from = getLocalStartOfDay(date);
    const to = getLocalEndOfDay(date);

    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples)) {
      const totalMeters = samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0);
      return totalMeters / 1609.34; // Convert to miles
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Distance error:', err?.message);
    throw new Error(`Failed to fetch distance: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get workout minutes for a date
 */
export async function getDailyWorkouts(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    // Use LOCAL timezone boundaries to match user's concept of "today"
    const from = getLocalStartOfDay(date);
    const to = getLocalEndOfDay(date);

    const samples = await queryWorkoutSamples({
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples) && samples.length > 0) {
      let totalMinutes = 0;
      samples.forEach((s: any) => {
        // Ensure both startDate and endDate exist and are valid
        if (s?.startDate && s?.endDate) {
          const start = new Date(s.startDate).getTime();
          const end = new Date(s.endDate).getTime();
          if (!isNaN(start) && !isNaN(end) && end > start) {
            totalMinutes += (end - start) / (1000 * 60);
          }
        }
      });
      return Math.round(totalMinutes);
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Workouts error:', err?.message);
    throw new Error(`Failed to fetch workouts: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Get all daily fitness metrics
 * Throws error if HealthKit is unavailable or queries fail
 */
export async function getDailyMetrics(date: Date = new Date()): Promise<DailyHealthData> {
  if (!isHealthAvailable()) {
    throw new Error('HealthKit is not available on this device');
  }

  try {
    const [steps, sleep, calories, workouts, distance] = await Promise.all([
      getDailySteps(date),
      getDailySleep(date),
      getDailyCalories(date),
      getDailyWorkouts(date),
      getDailyDistance(date),
    ]);

    return {
      date: date.toISOString().split('T')[0],
      steps,
      sleepHours: sleep,
      calories,
      workouts,
      distance,
    };
  } catch (error: any) {
    console.error('[Health] getDailyMetrics error:', error?.message);
    throw error; // Re-throw to let caller handle
  }
}

/**
 * Check health permissions status
 * Uses HealthKit's authorizationStatusFor to check actual permission state
 * 
 * BUG FIX #5: Returns detailed permission status including 'notDetermined' state.
 * This allows the UI to show appropriate prompts when permissions are revoked.
 */
export async function checkHealthPermissions(): Promise<HealthPermissions> {
  if (!isHealthAvailable()) {
    return {
      steps: false,
      sleep: false,
      calories: false,
      workouts: false,
      distance: false,
    };
  }
  
  try {
    return {
      steps: authorizationStatusFor('HKQuantityTypeIdentifierStepCount') === AuthorizationStatus.sharingAuthorized,
      sleep: authorizationStatusFor('HKCategoryTypeIdentifierSleepAnalysis') === AuthorizationStatus.sharingAuthorized,
      calories: authorizationStatusFor('HKQuantityTypeIdentifierActiveEnergyBurned') === AuthorizationStatus.sharingAuthorized,
      workouts: authorizationStatusFor('HKWorkoutTypeIdentifier') === AuthorizationStatus.sharingAuthorized,
      distance: authorizationStatusFor('HKQuantityTypeIdentifierDistanceWalkingRunning') === AuthorizationStatus.sharingAuthorized,
    };
  } catch (error: any) {
    console.error('[Health] Permission check error:', error?.message);
    return {
      steps: false,
      sleep: false,
      calories: false,
      workouts: false,
      distance: false,
    };
  }
}

/**
 * BUG FIX #5: Check if HealthKit permissions have been revoked
 * Returns true if any required permission is denied/revoked
 * Should be called on every sync to detect permission changes
 */
export async function areHealthPermissionsRevoked(): Promise<{
  revoked: boolean;
  missingPermissions: string[];
}> {
  if (!isHealthAvailable()) {
    return { revoked: true, missingPermissions: ['HealthKit not available'] };
  }
  
  try {
    const permissions = await checkHealthPermissions();
    const missingPermissions: string[] = [];
    
    // Check each permission - at minimum we need steps OR calories to be useful
    if (!permissions.steps) missingPermissions.push('Steps');
    if (!permissions.calories) missingPermissions.push('Active Calories');
    if (!permissions.sleep) missingPermissions.push('Sleep');
    if (!permissions.workouts) missingPermissions.push('Workouts');
    if (!permissions.distance) missingPermissions.push('Distance');
    
    // Consider revoked if we lost ALL permissions (user explicitly revoked)
    // Having at least one permission means partial data is still possible
    const allRevoked = !permissions.steps && !permissions.calories && 
                       !permissions.sleep && !permissions.workouts && !permissions.distance;
    
    return {
      revoked: allRevoked,
      missingPermissions,
    };
  } catch (error: any) {
    console.error('[Health] Permission revocation check error:', error?.message);
    return { revoked: true, missingPermissions: ['Error checking permissions'] };
  }
}

/**
 * Get fake/mock health data for testing
 */
export function getFakeHealthData(date: Date = new Date()): DailyHealthData {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const seed = dayOfYear;

  return {
    date: date.toISOString().split('T')[0],
    steps: 8000 + (seed * 137) % 4000,
    sleepHours: 6 + (seed * 73) % 3,
    calories: 400 + (seed * 97) % 300,
    distance: 3 + (seed * 53) % 5,
    workouts: (seed * 17) % 2,
  };
}

// For testing/development mode
export let fakeMode = false;

export function setFakeMode(enabled: boolean) {
  fakeMode = enabled;
}

/**
 * Alias for getDailyMetrics (used by health store)
 */
export async function getDailyHealthData(date: Date = new Date()): Promise<DailyHealthData> {
  return getDailyMetrics(date);
}

/**
 * Get health data for the current week (Monday to today)
 *
 * CRITICAL FIX: Query HealthKit directly instead of through getDailyMetrics()
 * The intermediate functions were failing silently, causing all 0s.
 * This mirrors the approach in getRawHealthDebug() which works correctly.
 */
export async function getCurrentWeekHealthData(): Promise<DailyHealthData[]> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const weekData: DailyHealthData[] = [];

  // Check if HealthKit is available once at the start
  if (!isHealthAvailable()) {
    console.log('[Health] getCurrentWeekHealthData: HealthKit not available, returning empty data');
    for (let i = 0; i <= daysFromMonday; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekData.push({
        date: date.toISOString().split('T')[0],
        steps: 0,
        sleepHours: 0,
        calories: 0,
        distance: 0,
        workouts: 0,
      });
    }
    return weekData;
  }

  for (let i = 0; i <= daysFromMonday; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    // Use LOCAL time boundaries (same as getRawHealthDebug which works)
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    // Sleep needs to look at previous day 6pm to end of current day
    const sleepFrom = new Date(date);
    sleepFrom.setDate(sleepFrom.getDate() - 1);
    sleepFrom.setHours(18, 0, 0, 0);

    let steps = 0;
    let sleepHours = 0;
    let calories = 0;
    let distance = 0;
    let workouts = 0;

    // Query each metric directly (like getRawHealthDebug does)
    try {
      const stepSamples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        limit: 10000,
        filter: { date: { startDate: from, endDate: to } },
      });
      if (stepSamples && Array.isArray(stepSamples)) {
        steps = Math.round(stepSamples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0));
      }
    } catch (e: any) {
      console.error(`[Health] Steps query failed for day ${i}:`, e?.message);
    }

    try {
      // BUG FIX: Remove unit parameter - library auto-detects kilocalories
      const calSamples = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
        limit: 10000,
        filter: { date: { startDate: from, endDate: to } },
      });
      if (calSamples && Array.isArray(calSamples)) {
        calories = Math.round(calSamples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0));
      }
    } catch (e: any) {
      console.error(`[Health] Calories query failed for day ${i}:`, e?.message);
    }

    try {
      const distSamples = await queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', {
        limit: 10000,
        filter: { date: { startDate: from, endDate: to } },
      });
      if (distSamples && Array.isArray(distSamples)) {
        const meters = distSamples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0);
        distance = meters / 1609.34; // Convert to miles
      }
    } catch (e: any) {
      console.error(`[Health] Distance query failed for day ${i}:`, e?.message);
    }

    try {
      const sleepSamples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        limit: 10000,
        filter: { date: { startDate: sleepFrom, endDate: to } },
      });
      if (sleepSamples && Array.isArray(sleepSamples)) {
        let totalMinutes = 0;
        sleepSamples.forEach((s: any) => {
          // Skip "inBed" samples (value 0), only count actual sleep
          if (s?.value !== 0) {
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            totalMinutes += (end - start) / (1000 * 60);
          }
        });
        sleepHours = totalMinutes / 60;
      }
    } catch (e: any) {
      console.error(`[Health] Sleep query failed for day ${i}:`, e?.message);
    }

    try {
      const workoutSamples = await queryWorkoutSamples({
        limit: 10000,
        filter: { date: { startDate: from, endDate: to } },
      });
      if (workoutSamples && Array.isArray(workoutSamples)) {
        let totalMinutes = 0;
        workoutSamples.forEach((s: any) => {
          if (s?.startDate && s?.endDate) {
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            if (!isNaN(start) && !isNaN(end) && end > start) {
              totalMinutes += (end - start) / (1000 * 60);
            }
          }
        });
        workouts = Math.round(totalMinutes);
      }
    } catch (e: any) {
      console.error(`[Health] Workouts query failed for day ${i}:`, e?.message);
    }

    weekData.push({
      date: date.toISOString().split('T')[0],
      steps,
      sleepHours,
      calories,
      distance,
      workouts,
    });
  }

  return weekData;
}

/**
 * DEBUG: Trace the exact flow of getCurrentWeekHealthData to find errors
 */
export async function debugWeekDataFlow(): Promise<{
  today: string;
  dayOfWeek: number;
  daysFromMonday: number;
  monday: string;
  days: {
    index: number;
    dateInput: string;
    dateLocal: string;
    success: boolean;
    data: DailyHealthData | null;
    error: string | null;
  }[];
  isHealthAvailable: boolean;
}> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const days: any[] = [];

  for (let i = 0; i <= daysFromMonday; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    let result: any = {
      index: i,
      dateInput: date.toISOString(),
      dateLocal: date.toLocaleString(),
      success: false,
      data: null,
      error: null,
    };

    try {
      const dayData = await getDailyMetrics(date);
      result.success = true;
      result.data = dayData;
    } catch (error: any) {
      result.error = error?.message || 'Unknown error';
    }

    days.push(result);
  }

  return {
    today: today.toISOString(),
    dayOfWeek,
    daysFromMonday,
    monday: monday.toISOString(),
    days,
    isHealthAvailable: isHealthAvailable(),
  };
}

/**
 * Get health data for a specific date range
 */
export async function getHealthDataRange(startDate: Date, endDate: Date): Promise<DailyHealthData[]> {
  const result: DailyHealthData[] = [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const current = new Date(start);
  while (current <= end) {
    try {
      const dayData = await getDailyMetrics(new Date(current));
      result.push(dayData);
    } catch (error) {
      result.push({
        date: current.toISOString().split('T')[0],
        steps: 0,
        sleepHours: 0,
        calories: 0,
        distance: 0,
        workouts: 0,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Get health diagnostics for debugging
 */
export function getHealthDiagnostics(): {
  platform: string;
  bundleId: string;
  moduleLoaded: boolean;
  deviceSupported: boolean;
  isExpoGo: boolean;
  isDevelopment: boolean;
  entitlementsConfigured: boolean;
  loadError: string | null;
  availableMethods: string[];
} {
  return {
    platform: Platform.OS,
    bundleId: Constants?.expoConfig?.ios?.bundleIdentifier || 'unknown',
    moduleLoaded: true,
    deviceSupported: Platform.OS === 'ios',
    isExpoGo: isExpoGo,
    isDevelopment: __DEV__,
    entitlementsConfigured: true,
    loadError: null,
    availableMethods: ['queryQuantitySamples', 'queryCategorySamples', 'queryWorkoutSamples', 'requestAuthorization'],
  };
}

/**
 * Get a detailed diagnostic report for in-app display
 */
export async function getHealthDiagnosticReport(): Promise<{
  status: 'working' | 'partial' | 'not_working';
  message: string;
  details: {
    moduleStatus: string;
    authStatus: string;
    dataStatus: string;
    todayData: {
      steps: number;
      sleep: number;
      calories: number;
      distance: number;
      workouts: number;
    } | null;
    rawSampleInfo: string | null;
    errors: string[];
  };
}> {
  const errors: string[] = [];
  let moduleStatus = '✅ Loaded';
  let authStatus = '✅ Available';
  let dataStatus = '❌ No data';
  let todayData = null;
  let rawSampleInfo: string | null = null;

  if (!isHealthAvailable()) {
    return {
      status: 'not_working',
      message: Platform.OS !== 'ios' ? 'Not iOS' : 'Running in Expo Go',
      details: { moduleStatus: '❌ Not available', authStatus, dataStatus, todayData, rawSampleInfo, errors },
    };
  }

  // Try to get raw sample data
  try {
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const rawSamples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (rawSamples && rawSamples.length > 0) {
      const firstSample = rawSamples[0];
      const keys = Object.keys(firstSample);
      rawSampleInfo = `Found ${rawSamples.length} samples. Keys: [${keys.join(', ')}]. First: ${JSON.stringify(firstSample).substring(0, 200)}`;
    } else {
      rawSampleInfo = `Query returned ${rawSamples?.length || 0} samples`;
    }
  } catch (err: any) {
    rawSampleInfo = `Raw query error: ${err.message}`;
    errors.push(err.message);
  }

  // Try to get today's data
  try {
    const data = await getDailyMetrics(new Date());
    todayData = {
      steps: data.steps,
      sleep: data.sleepHours,
      calories: data.calories,
      distance: data.distance,
      workouts: data.workouts,
    };

    const hasAnyData = data.steps > 0 || data.sleepHours > 0 || data.calories > 0;
    dataStatus = hasAnyData ? '✅ Reading data' : '⚠️ No data (permissions needed or no activity today)';
  } catch (err: any) {
    errors.push('Data fetch error: ' + err.message);
    dataStatus = '❌ Error fetching';
  }

  const status = errors.length === 0 ? 'working' : 'partial';
  const message = errors.length === 0
    ? 'HealthKit is working correctly!'
    : `Found ${errors.length} issue(s): ${errors[0]}`;

  return {
    status,
    message,
    details: { moduleStatus, authStatus, dataStatus, todayData, rawSampleInfo, errors },
  };
}

/**
 * Get RAW health data debug info for in-app display
 */
export async function getRawHealthDebug(): Promise<{
  timestamp: string;
  queries: {
    metric: string;
    queryParams: string;
    rawResponse: string;
    sampleCount: number;
    firstSample: string;
    calculatedValue: number | string;
    error: string | null;
  }[];
}> {
  const queries: any[] = [];
  const now = new Date();

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const queryParams = `from: ${from.toISOString()}, to: ${to.toISOString()}`;

  if (!isHealthAvailable()) {
    return {
      timestamp: now.toISOString(),
      queries: [{
        metric: 'MODULE',
        queryParams: 'N/A',
        rawResponse: Platform.OS !== 'ios' ? 'Not iOS' : 'Running in Expo Go',
        sampleCount: 0,
        firstSample: 'N/A',
        calculatedValue: 0,
        error: 'HealthKit not available',
      }],
    };
  }

  // Test Steps
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });
    const total = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0)
      : 0;
    queries.push({
      metric: 'STEPS',
      queryParams,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: Math.round(total),
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'STEPS',
      queryParams,
      rawResponse: 'ERROR',
      sampleCount: 0,
      firstSample: 'N/A',
      calculatedValue: 0,
      error: e.message,
    });
  }

  // Test Calories
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });
    const total = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0)
      : 0;
    queries.push({
      metric: 'CALORIES',
      queryParams,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: Math.round(total),
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'CALORIES',
      queryParams,
      rawResponse: 'ERROR',
      sampleCount: 0,
      firstSample: 'N/A',
      calculatedValue: 0,
      error: e.message,
    });
  }

  // Test Distance
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });
    const totalMeters = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0)
      : 0;
    queries.push({
      metric: 'DISTANCE',
      queryParams,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: `${totalMeters.toFixed(0)}m = ${(totalMeters / 1609.34).toFixed(2)}mi`,
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'DISTANCE',
      queryParams,
      rawResponse: 'ERROR',
      sampleCount: 0,
      firstSample: 'N/A',
      calculatedValue: 0,
      error: e.message,
    });
  }

  // Test Sleep
  try {
    const sleepFrom = new Date(now);
    sleepFrom.setDate(sleepFrom.getDate() - 1);
    sleepFrom.setHours(18, 0, 0, 0);

    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 10000,
      filter: { date: { startDate: sleepFrom, endDate: to } },
    });

    let totalMinutes = 0;
    if (Array.isArray(samples)) {
      samples.forEach((s: any) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        totalMinutes += (end - start) / (1000 * 60);
      });
    }

    queries.push({
      metric: 'SLEEP',
      queryParams: `from: ${sleepFrom.toISOString()}, to: ${to.toISOString()}`,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: `${(totalMinutes / 60).toFixed(1)} hrs`,
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'SLEEP',
      queryParams,
      rawResponse: 'ERROR',
      sampleCount: 0,
      firstSample: 'N/A',
      calculatedValue: 0,
      error: e.message,
    });
  }

  // Test Workouts
  try {
    const samples = await queryWorkoutSamples({
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    let totalMinutes = 0;
    if (Array.isArray(samples)) {
      samples.forEach((s: any) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        totalMinutes += (end - start) / (1000 * 60);
      });
    }

    queries.push({
      metric: 'WORKOUTS',
      queryParams,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: `${Math.round(totalMinutes)} mins`,
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'WORKOUTS',
      queryParams,
      rawResponse: 'ERROR',
      sampleCount: 0,
      firstSample: 'N/A',
      calculatedValue: 0,
      error: e.message,
    });
  }

  return {
    timestamp: now.toISOString(),
    queries,
  };
}

/**
 * Get TIMEZONE DEBUG info to verify the fix is working
 * Shows what query boundaries the dashboard is using vs raw debug
 */
export async function getTimezoneDebug(): Promise<{
  currentTime: {
    iso: string;
    local: string;
    timezone: string;
    utcOffset: number;
  };
  dashboardQueryBoundaries: {
    from: string;
    fromLocal: string;
    to: string;
    toLocal: string;
  };
  rawDebugQueryBoundaries: {
    from: string;
    fromLocal: string;
    to: string;
    toLocal: string;
  };
  comparison: {
    boundariesMatch: boolean;
    issue: string | null;
  };
  dashboardStepsResult: {
    sampleCount: number;
    total: number;
    error: string | null;
  };
}> {
  const now = new Date();

  // Dashboard query boundaries (using the fixed LOCAL timezone functions)
  const dashboardFrom = getLocalStartOfDay(now);
  const dashboardTo = getLocalEndOfDay(now);

  // Raw debug query boundaries (what getRawHealthDebug uses)
  const rawFrom = new Date(now);
  rawFrom.setHours(0, 0, 0, 0);
  const rawTo = new Date(now);
  rawTo.setHours(23, 59, 59, 999);

  // Check if they match
  const boundariesMatch =
    dashboardFrom.getTime() === rawFrom.getTime() &&
    dashboardTo.getTime() === rawTo.getTime();

  // Get dashboard steps result
  let dashboardStepsResult = { sampleCount: 0, total: 0, error: null as string | null };

  if (isHealthAvailable()) {
    try {
      const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        limit: 10000,
        filter: { date: { startDate: dashboardFrom, endDate: dashboardTo } },
      });

      if (samples && Array.isArray(samples)) {
        const total = samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? 0), 0);
        dashboardStepsResult = {
          sampleCount: samples.length,
          total: Math.round(total),
          error: null,
        };
      }
    } catch (e: any) {
      dashboardStepsResult.error = e.message;
    }
  } else {
    dashboardStepsResult.error = 'HealthKit not available';
  }

  return {
    currentTime: {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcOffset: -now.getTimezoneOffset() / 60,
    },
    dashboardQueryBoundaries: {
      from: dashboardFrom.toISOString(),
      fromLocal: dashboardFrom.toLocaleString(),
      to: dashboardTo.toISOString(),
      toLocal: dashboardTo.toLocaleString(),
    },
    rawDebugQueryBoundaries: {
      from: rawFrom.toISOString(),
      fromLocal: rawFrom.toLocaleString(),
      to: rawTo.toISOString(),
      toLocal: rawTo.toLocaleString(),
    },
    comparison: {
      boundariesMatch,
      issue: boundariesMatch
        ? null
        : 'MISMATCH! Dashboard and raw debug are using different time boundaries',
    },
    dashboardStepsResult,
  };
}
