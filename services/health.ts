import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';
import {
  requestAuthorization,
  queryQuantitySamples,
  queryCategorySamples,
  queryWorkoutSamples,
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
  standHours: boolean;
}

export interface DailyHealthData extends FitnessMetrics {
  date: string;
}

// Check if we're in Expo Go (which doesn't support HealthKit)
const isExpoGo = Constants?.executionEnvironment === 'storeClient';

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
        'HKCategoryTypeIdentifierAppleStandHour',
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
  if (!isHealthAvailable()) return 0;

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

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
    return 0;
  }
}

/**
 * Get sleep hours for a date
 */
export async function getDailySleep(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) return 0;

  try {
    // Look at sleep from the night before
    const from = new Date(date);
    from.setDate(from.getDate() - 1);
    from.setHours(18, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

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
    return 0;
  }
}

/**
 * Get active calories for a date
 */
export async function getDailyCalories(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) return 0;

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

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
    return 0;
  }
}

/**
 * Get distance walked/run for a date (in miles)
 */
export async function getDailyDistance(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) return 0;

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

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
    return 0;
  }
}

/**
 * Get workout minutes for a date
 */
export async function getDailyWorkouts(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) return 0;

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    const samples = await queryWorkoutSamples({
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples) && samples.length > 0) {
      let totalMinutes = 0;
      samples.forEach((s: any) => {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        totalMinutes += (end - start) / (1000 * 60);
      });
      return Math.round(totalMinutes);
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Workouts error:', err?.message);
    return 0;
  }
}

/**
 * Get stand hours for a date
 */
export async function getDailyStandHours(date: Date = new Date()): Promise<number> {
  if (!isHealthAvailable()) return 0;

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    const samples = await queryCategorySamples('HKCategoryTypeIdentifierAppleStandHour', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (samples && Array.isArray(samples)) {
      return samples.length; // Each sample = 1 stand hour
    }
    return 0;
  } catch (err: any) {
    console.error('[Health] Stand hours error:', err?.message);
    return 0;
  }
}

/**
 * Get all daily fitness metrics
 */
export async function getDailyMetrics(date: Date = new Date()): Promise<DailyHealthData> {
  const [steps, sleep, calories, standHours, workouts, distance] = await Promise.all([
    getDailySteps(date),
    getDailySleep(date),
    getDailyCalories(date),
    getDailyStandHours(date),
    getDailyWorkouts(date),
    getDailyDistance(date),
  ]);

  return {
    date: date.toISOString().split('T')[0],
    steps,
    sleepHours: sleep,
    calories,
    standHours,
    workouts,
    distance,
  };
}

/**
 * Check health permissions status
 */
export async function checkHealthPermissions(): Promise<HealthPermissions> {
  return {
    steps: false,
    sleep: false,
    calories: false,
    workouts: false,
    distance: false,
    standHours: false
  };
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
    standHours: 0
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
 */
export async function getCurrentWeekHealthData(): Promise<DailyHealthData[]> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const weekData: DailyHealthData[] = [];

  for (let i = 0; i <= daysFromMonday; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    try {
      const dayData = await getDailyMetrics(date);
      weekData.push(dayData);
    } catch (error) {
      weekData.push({
        date: date.toISOString().split('T')[0],
        steps: 0,
        sleepHours: 0,
        calories: 0,
        distance: 0,
        workouts: 0,
        standHours: 0,
      });
    }
  }

  return weekData;
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
        standHours: 0,
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

  // Test Stand Hours
  try {
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierAppleStandHour', {
      limit: 10000,
      filter: { date: { startDate: from, endDate: to } },
    });

    queries.push({
      metric: 'STAND_HOURS',
      queryParams,
      rawResponse: `Array(${samples?.length ?? 0})`,
      sampleCount: samples?.length ?? 0,
      firstSample: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 150) : 'none',
      calculatedValue: samples?.length ?? 0,
      error: null,
    });
  } catch (e: any) {
    queries.push({
      metric: 'STAND_HOURS',
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
