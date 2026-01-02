import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';

// Import the correct modules from Kingstinct
let QuantityTypes: any = null;
let CategoryTypes: any = null;
let Core: any = null;

// ============================================
// HEALTH DATA SERVICE
// iOS-only health data integration via Apple HealthKit
// Using @kingstinct/react-native-healthkit (New Architecture compatible, Nitro modules)
// ============================================

// CRITICAL: Wrap everything in try/catch to prevent crash-on-load
try {
  console.log('📦 [Health Service] Initializing...');
} catch (e) {
  console.error('🚨 [Health Service] Failed to initialize:', e);
}

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

// Cache the HealthKit module
let HealthKit: any = null;
let loadError: any = null;

/**
 * Get the Apple HealthKit modules (cached, lazy-loaded)
 * Uses the correct QuantityTypes, CategoryTypes, and Core exports
 */
function getHealthKit(): { QuantityTypes: any; CategoryTypes: any; Core: any } | null {
  if (!QuantityTypes && !loadError) {
    try {
      console.log('📦 Loading @kingstinct/react-native-healthkit module...');
      const healthModule = require('@kingstinct/react-native-healthkit');

      // Extract the correct modules
      QuantityTypes = healthModule?.QuantityTypes ?? healthModule?.default?.QuantityTypes;
      CategoryTypes = healthModule?.CategoryTypes ?? healthModule?.default?.CategoryTypes;
      Core = healthModule?.Core ?? healthModule?.default?.Core;

      console.log('✅ @kingstinct/react-native-healthkit loaded successfully');
      console.log('📊 Modules available:');
      console.log('   - QuantityTypes:', !!QuantityTypes);
      console.log('   - CategoryTypes:', !!CategoryTypes);
      console.log('   - Core:', !!Core);

      if (!QuantityTypes || !CategoryTypes || !Core) {
        throw new Error('Missing required modules (QuantityTypes, CategoryTypes, or Core)');
      }

      return { QuantityTypes, CategoryTypes, Core };
    } catch (error: any) {
      loadError = error; // Cache the error to avoid repeated attempts

      console.error('❌ CRITICAL: Failed to load HealthKit module');
      console.error('   - Error message:', error?.message);
      console.error('   - Error code:', error?.code);
      console.error('   - Full error:', JSON.stringify(error, null, 2));
      console.error('');
      console.error('💡 This means native module NOT in build!');
      console.error('🔧 Fix: eas build --platform ios --profile testflight --clear-cache');

      // Don't re-throw - let app continue without HealthKit
      return null;
    }
  }

  if (loadError) {
    return null; // Return null if we already tried and failed
  }

  return { QuantityTypes, CategoryTypes, Core };
}

/**
 * Helper to build date filter with strict flags (only includes dates if provided)
 * Predicate supports startDate / endDate with optional strict flags
 */
function buildDateFilter(startDate?: Date, endDate?: Date): any {
  const filter: any = {};
  if (startDate) {
    filter.startDate = startDate;
    filter.strictStartDate = true;
  }
  if (endDate) {
    filter.endDate = endDate;
    filter.strictEndDate = true;
  }
  return Object.keys(filter).length ? filter : undefined;
}

/**
 * Initialize health data access (iOS only)
 * Returns true if health data is available
 * SAFE: Never throws - catches all errors internally
 */
export async function initializeHealth(): Promise<boolean> {
  try {
    console.log('');
    console.log('='.repeat(60));
    console.log('🏥 HEALTHKIT INITIALIZATION - DETAILED DIAGNOSTIC LOG');
    console.log('='.repeat(60));
    console.log('Timestamp:', new Date().toISOString());
    console.log('');

    // Step 1: Platform check
    console.log('📱 STEP 1: Platform Check');
    console.log('   - Platform.OS:', Platform.OS);
    if (Platform.OS !== 'ios') {
      console.log('   ❌ FAILED: Not iOS');
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: iOS detected');
    console.log('');

    // Step 2: Expo Go check
    console.log('📱 STEP 2: Execution Environment Check');
    console.log('   - executionEnvironment:', Constants?.executionEnvironment);
    console.log('   - isExpoGo:', isExpoGo);
    if (isExpoGo) {
      console.log('   ❌ FAILED: Running in Expo Go (native modules unavailable)');
      console.log('   🔧 Solution: Use EAS Build');
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: Standalone build');
    console.log('');

    // Step 3: Load module
    console.log('📦 STEP 3: Load HealthKit Module');
    const module = getHealthKit();

    if (!module) {
      console.log('   ❌ FAILED: Module returned null');
      console.log('   💡 Native module not included in build');
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: Module loaded');
    console.log('');

    // Step 4: Check if Core.requestAuthorization exists
    console.log('📱 STEP 4: Check requestAuthorization availability');

    if (typeof module.Core.requestAuthorization !== 'function') {
      console.log('   ❌ FAILED: Core.requestAuthorization is not a function');
      console.log('   - typeof:', typeof module.Core.requestAuthorization);
      console.log('   - Available methods:', Object.keys(module.Core || {}).slice(0, 15).join(', '));
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: Core.requestAuthorization available');
    console.log('');

    // Step 5: Request authorization
    console.log('🔐 STEP 5: Request HealthKit Authorization');
    console.log('   - Requesting permissions for: StepCount, SleepAnalysis, ActiveEnergyBurned, DistanceWalkingRunning, Workout');
    console.log('');

    console.log('🚀 STEP 6: Initialize HealthKit');
    console.log('   - Calling: Core.requestAuthorization(toShare, toRead)');
    console.log('   - Start time:', new Date().toISOString());
    console.log('');
    console.log('   ⏳ WAITING FOR USER INTERACTION...');
    console.log('   💡 iOS permission dialog should appear NOW');
    console.log('');

    const startAuthTime = Date.now();

    // Correct Kingstinct API: positional args (toShare, toRead)
    await module.Core.requestAuthorization(
      [], // toShare (empty - we don't write data)
      [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKCategoryTypeIdentifierAppleStandHour',
        'HKWorkoutTypeIdentifier',
      ] // toRead
    );

    const authDuration = Date.now() - startAuthTime;

    console.log('   - End time:', new Date().toISOString());
    console.log('   - Duration:', authDuration, 'ms');
    console.log('');

    if (authDuration < 500) {
      console.log('   ⚠️ WARNING: Authorization completed in < 500ms');
      console.log('   💡 This suggests no dialog was shown (should take 2+ seconds)');
      console.log('   💡 POSSIBLE: User previously responded to permission request');
    } else {
      console.log('   ✅ Duration suggests dialog was shown');
    }
    console.log('');

    console.log('🎉 AUTHORIZATION COMPLETE');
    console.log('');
    console.log('📝 NEXT STEPS FOR USER:');
    console.log('   1. Open iOS Settings app');
    console.log('   2. Go to: Privacy & Security → Health');
    console.log('   3. Look for "Lock-In" in the list');
    console.log('   4. OR: Open Health app → Profile → Apps');
    console.log('');
    console.log('🔍 CRITICAL QUESTION:');
    console.log('   Did you see the iOS Health permission dialog?');
    console.log('   - YES = SUCCESS (Lock-In should be in Health settings)');
    console.log('   - NO = BUG (permissions not being requested)');
    console.log('');
    console.log('='.repeat(60));
    console.log('');

    return true;
  } catch (error: any) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ HEALTHKIT INITIALIZATION CRASHED');
    console.error('='.repeat(60));
    console.error('Error:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error stack:', error?.stack?.substring(0, 500));
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('='.repeat(60));
    console.error('');

    // Never throw - let app continue
    return false;
  }
}

/**
 * Check if health services are available
 */
export function isHealthAvailable(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }

  if (isExpoGo) {
    return false;
  }

  const module = getHealthKit();
  return module !== null;
}

/**
 * Get daily steps for a date
 * Steps need to be aggregated (summed) from all samples throughout the day
 */
export async function getDailySteps(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 steps');
    return 0;
  }

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    console.log('📊 [Steps] Query:', {
      from: from.toISOString(),
      to: to.toISOString(),
      fromMs: from.getTime(),
      toMs: to.getTime(),
    });

    // For steps, we need to SUM all samples (not just get the latest)
    // Each step sample represents a segment of steps (e.g., from a walk)
    if (module.QuantityTypes && typeof module.QuantityTypes.queryQuantitySamples === 'function') {
      // Correct API: QuantityTypes.queryQuantitySamples(identifier, options)
      // Filter uses Date objects with startDate/endDate at top level
      const samples = await module.QuantityTypes.queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          unit: 'count',
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );

      console.log('📊 [Steps] Raw response:', {
        isArray: Array.isArray(samples),
        length: samples?.length,
        firstSample: samples?.[0] ? JSON.stringify(samples[0]) : 'none',
        sampleKeys: samples?.[0] ? Object.keys(samples[0]) : [],
      });

      // Samples are already filtered by the API, just sum them
      if (samples && Array.isArray(samples)) {
        console.log('📊 [Steps] Processing', samples.length, 'samples');
        
        const total = samples.reduce((sum: number, sample: any) => {
          // Kingstinct uses 'quantity' property
          const value = sample?.quantity ?? 0;
          return sum + value;
        }, 0);
        
        console.log('📊 [Steps] Total calculated:', total, 'from', samples.length, 'samples');
        return Math.round(total);
      } else {
        console.log('📊 [Steps] No samples or not an array');
      }
    } else {
      console.log('⚠️ [Steps] QuantityTypes.queryQuantitySamples not available');
    }

    return 0;
  } catch (err: any) {
    console.error('❌ Error getting steps:', err?.message, err);
    return 0;
  }
}

/**
 * Get sleep hours for a date
 * Sleep data is stored as category samples with start/end times
 */
export async function getDailySleep(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 sleep hours');
    return 0;
  }

  try {
    // For sleep, we look at the night before (sleep ending on this date)
    // Sleep from the previous night typically ends in the morning of the target date
    const from = new Date(date);
    from.setDate(from.getDate() - 1);
    from.setHours(18, 0, 0, 0); // Start from 6 PM previous day

    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    let results: any[] = [];

    console.log('😴 [Sleep] Querying:', { from: from.toISOString(), to: to.toISOString() });

    // Try queryCategorySamples for sleep (category-type data)
    // Correct API: CategoryTypes.queryCategorySamples(identifier, options)
    if (module.CategoryTypes && typeof module.CategoryTypes.queryCategorySamples === 'function') {
      results = await module.CategoryTypes.queryCategorySamples(
        'HKCategoryTypeIdentifierSleepAnalysis',
        {
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );
    } else {
      console.log('😴 [Sleep] CategoryTypes.queryCategorySamples not available');
    }

    console.log('😴 [Sleep] Raw response:', {
      isArray: Array.isArray(results),
      length: results?.length,
      firstSample: results?.[0] ? JSON.stringify(results[0]).substring(0, 200) : 'none',
    });

    if (!results || results.length === 0) {
      console.log('😴 [Sleep] No samples found');
      return 0;
    }

    // Filter for today's sleep and sum up all sleep periods (in hours)
    // Sleep from the previous night typically ends in the morning of the target date
    const dayStart = new Date(date);
    dayStart.setDate(dayStart.getDate() - 1);
    dayStart.setHours(18, 0, 0, 0); // Start from 6 PM previous day
    const dayEnd = new Date(date);
    dayEnd.setHours(12, 0, 0, 0); // End at noon current day
    
    console.log('😴 [Sleep] Filtering samples:', {
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
      totalSamples: results.length,
    });
    
    // Sum up all sleep periods (in hours)
    // Filter for actual sleep (not "inBed" which is just time in bed)
    const filteredSamples = results.filter((sample: any) => {
      const endDate = new Date(sample?.endDate || sample?.date || 0);
      return endDate >= dayStart && endDate <= dayEnd;
    });
    
    console.log('😴 [Sleep] Filtered samples:', filteredSamples.length);
    
    const totalMinutes = filteredSamples.reduce((sum: number, sample: any) => {
      // Skip "inBed" samples - only count actual sleep
      // value 0 = inBed, value 1+ = various sleep stages
      const value = sample?.value ?? sample?.category ?? 1;
      if (value === 0) {
        return sum;
      }

      const start = new Date(sample.startDate).getTime();
      const end = new Date(sample.endDate).getTime();
      return sum + (end - start) / (1000 * 60);
    }, 0);

    const totalHours = totalMinutes / 60;
    console.log('😴 [Sleep] Total calculated:', totalHours.toFixed(1), 'hours from', filteredSamples.length, 'samples');
    return totalHours;
  } catch (err: any) {
    console.error('❌ Error getting sleep:', err);
    return 0;
  }
}

/**
 * Get active calories for a date
 * Calories need to be aggregated (summed) from all samples throughout the day
 */
export async function getDailyCalories(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 calories');
    return 0;
  }

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    // For calories, we need to SUM all samples (not just get the latest)
    if (module.QuantityTypes && typeof module.QuantityTypes.queryQuantitySamples === 'function') {
      console.log('🔥 [Calories] Querying:', { from: from.toISOString(), to: to.toISOString() });

      // Correct API: QuantityTypes.queryQuantitySamples(identifier, options)
      const samples = await module.QuantityTypes.queryQuantitySamples(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        {
          unit: 'kcal',
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );

      console.log('🔥 [Calories] Response:', {
        count: samples?.length ?? 0,
        first: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 100) : 'none',
      });

      // Samples are already filtered by the API, just sum them
      if (samples && Array.isArray(samples)) {
        const total = samples.reduce((sum: number, sample: any) => {
            const value = sample?.quantity ?? sample?.value ?? 0;
            return sum + value;
          }, 0);
        console.log('🔥 [Calories] Total:', Math.round(total));
        return Math.round(total);
      }
    }

    return 0;
  } catch (err: any) {
    console.error('❌ Error getting calories:', err);
    return 0;
  }
}

/**
 * Get distance walked/run for a date
 * Distance needs to be aggregated (summed) from all samples throughout the day
 */
export async function getDailyDistance(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 distance');
    return 0;
  }

  try {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    let totalMeters = 0;

    // For distance, we need to SUM all samples (not just get the latest)
    if (module.QuantityTypes && typeof module.QuantityTypes.queryQuantitySamples === 'function') {
      console.log('🏃 [Distance] Querying:', { from: from.toISOString(), to: to.toISOString() });

      // Correct API: QuantityTypes.queryQuantitySamples(identifier, options)
      const samples = await module.QuantityTypes.queryQuantitySamples(
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        {
          unit: 'm', // meters
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );

      console.log('🏃 [Distance] Response:', {
        count: samples?.length ?? 0,
        first: samples?.[0] ? JSON.stringify(samples[0]).substring(0, 100) : 'none',
      });

      // Samples are already filtered by the API, just sum them
      if (samples && Array.isArray(samples)) {
        totalMeters = samples.reduce((sum: number, sample: any) => {
          const value = sample?.quantity ?? 0;
          return sum + value;
        }, 0);
        console.log('🏃 [Distance] Total meters:', totalMeters, '= miles:', (totalMeters / 1609.34).toFixed(2));
      } else {
        console.log('🏃 [Distance] No samples or not an array');
      }
    } else {
      console.log('⚠️ [Distance] QuantityTypes.queryQuantitySamples not available');
    }

    // Convert meters to miles
    return totalMeters / 1609.34;
  } catch (err: any) {
    console.error('❌ Error getting distance:', err);
    return 0;
  }
}

/**
 * Get workout count for a date
 */
export async function getDailyWorkouts(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 workout minutes');
    return 0;
  }

  try {
    let results: any[] = [];

    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    console.log('💪 [Workouts] Querying:', { from: from.toISOString(), to: to.toISOString() });

    // Workouts might be in a different module - for now, return empty array
    // TODO: Check if there's a WorkoutTypes module or similar
    results = [];
    console.log('💪 [Workouts] Workout querying not yet implemented with new API');

    console.log('💪 [Workouts] Raw response:', {
      isArray: Array.isArray(results),
      length: results?.length,
      firstSample: results?.[0] ? JSON.stringify(results[0]).substring(0, 200) : 'none',
    });

    if (!results || results.length === 0) {
      console.log('💪 [Workouts] No workouts found');
      return 0;
    }

    // Filter for today's workouts and sum up duration in minutes
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const filteredWorkouts = results.filter((workout: any) => {
      const workoutDate = new Date(workout?.startDate || workout?.date || 0);
      return workoutDate >= dayStart && workoutDate <= dayEnd;
    });
    
    console.log('💪 [Workouts] Filtered workouts:', filteredWorkouts.length);

    const totalMinutes = filteredWorkouts.reduce((sum: number, workout: any) => {
      // Get workout duration in minutes
      const start = new Date(workout.startDate).getTime();
      const end = new Date(workout.endDate).getTime();
      const durationMs = end - start;
      const durationMinutes = durationMs / (1000 * 60);
      return sum + durationMinutes;
    }, 0);

    console.log('💪 [Workouts] Total minutes:', totalMinutes, 'from', filteredWorkouts.length, 'workouts');
    return Math.round(totalMinutes);
  } catch (err: any) {
    console.error('❌ Error getting workouts:', err);
    return 0;
  }
}

/**
 * Get stand hours for a date (how many hours user stood up)
 * Stand hour = any hour with at least 1 minute of standing activity
 */
export async function getDailyStandHours(date: Date = new Date()): Promise<number> {
  const module = getHealthKit();
  if (!module) {
    console.log('⚠️ HealthKit not available, returning 0 stand hours');
    return 0;
  }

  try {
    let results: any[] = [];

    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    console.log('⏰ [Stand Hours] Querying:', { from: from.toISOString(), to: to.toISOString() });

    // Query stand hours using Kingstinct API
    // Correct API: CategoryTypes.queryCategorySamples(identifier, options)
    if (module.CategoryTypes && typeof module.CategoryTypes.queryCategorySamples === 'function') {
      results = await module.CategoryTypes.queryCategorySamples(
        'HKCategoryTypeIdentifierAppleStandHour',
        {
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );
    } else {
      console.log('⏰ [Stand Hours] CategoryTypes.queryCategorySamples not available');
    }

    console.log('⏰ [Stand Hours] Raw response:', {
      isArray: Array.isArray(results),
      length: results?.length,
      firstSample: results?.[0] ? JSON.stringify(results[0]).substring(0, 200) : 'none',
    });

    if (!results || results.length === 0) {
      console.log('⏰ [Stand Hours] No samples found');
      return 0;
    }

    // Samples are already filtered by the API, just count them
    // Each sample represents 1 stand hour
    const standHours = results.length;

    console.log('⏰ [Stand Hours] Total hours stood:', standHours, 'from', results.length, 'samples');
    return standHours;
  } catch (err: any) {
    console.error('❌ Error getting stand hours:', err);
    return 0;
  }
}

/**
 * Get all daily fitness metrics
 */
export async function getDailyMetrics(date: Date = new Date()): Promise<DailyHealthData> {
  console.log('📊 Getting daily metrics for', date.toLocaleDateString());

  const [steps, sleep, calories, standHours, workouts, distance] = await Promise.all([
    getDailySteps(date),
    getDailySleep(date),
    getDailyCalories(date),
    getDailyStandHours(date),
    getDailyWorkouts(date),
    getDailyDistance(date),
  ]);

  console.log('📊 Results:', { steps, sleep, calories, standHours, workouts, distance });

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
  // Note: iOS doesn't allow querying permission status for privacy
  // We can only know if we can read data by trying
  return {
    steps: false,
    sleep: false,
    calories: false,
    workouts: false,
    distance: false,
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
    standHours: 8 + (seed * 41) % 4,
  };
}

// For testing/development mode
export let fakeMode = false;

export function setFakeMode(enabled: boolean) {
  fakeMode = enabled;
  console.log(`🎭 Fake health data mode: ${enabled ? 'ON' : 'OFF'}`);
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
  // Calculate Monday of this week (0 = Sunday, so Monday = 1)
  const monday = new Date(today);
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const weekData: DailyHealthData[] = [];

  // Fetch data for each day from Monday to today
  for (let i = 0; i <= daysFromMonday; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    try {
      const dayData = await getDailyMetrics(date);
      weekData.push(dayData);
    } catch (error) {
      console.error(`❌ Error getting data for ${date.toISOString().split('T')[0]}:`, error);
      // Push empty data for this day
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
 * Used by league sync to get data for the league's week (not calendar week)
 */
export async function getHealthDataRange(startDate: Date, endDate: Date): Promise<DailyHealthData[]> {
  const result: DailyHealthData[] = [];

  // Normalize dates
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Get data for each day in the range
  const current = new Date(start);
  while (current <= end) {
    try {
      const dayData = await getDailyMetrics(new Date(current));
      result.push(dayData);
    } catch (error) {
      console.error(`Error getting data for ${current.toISOString().split('T')[0]}:`, error);
      // Push empty data for this day
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
 * Get health diagnostics for crash reporting and in-app display
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
  const module = getHealthKit();
  const availableMethods = module ? [
    ...(module.QuantityTypes ? ['QuantityTypes'] : []),
    ...(module.CategoryTypes ? ['CategoryTypes'] : []),
    ...(module.Core ? ['Core'] : []),
  ] : [];

  return {
    platform: Platform.OS,
    bundleId: Constants?.expoConfig?.ios?.bundleIdentifier || 'unknown',
    moduleLoaded: module !== null,
    deviceSupported: Platform.OS === 'ios',
    isExpoGo: isExpoGo,
    isDevelopment: __DEV__,
    entitlementsConfigured: true, // If module loads, entitlements are configured
    loadError: loadError?.message || null,
    availableMethods,
  };
}

/**
 * Get a detailed diagnostic report for in-app display
 * Shows actual health values and API status
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
  let moduleStatus = '❌ Not loaded';
  let authStatus = '❌ Not requested';
  let dataStatus = '❌ No data';
  let todayData = null;
  let rawSampleInfo: string | null = null;

  // Check module
  const module = getHealthKit();
  if (!module) {
    errors.push('HealthKit module failed to load: ' + (loadError?.message || 'Unknown error'));
    return {
      status: 'not_working',
      message: 'HealthKit module not loaded. Rebuild with --clear-cache.',
      details: { moduleStatus, authStatus, dataStatus, todayData, rawSampleInfo, errors },
    };
  }
  moduleStatus = '✅ Loaded';

  // Check available methods
  const hasQueryMethod = module.QuantityTypes && typeof module.QuantityTypes.queryQuantitySamples === 'function';
  const hasAuthMethod = module.Core && typeof module.Core.requestAuthorization === 'function';

  if (!hasAuthMethod) {
    errors.push('Core.requestAuthorization method not found');
  }
  if (!hasQueryMethod) {
    errors.push('QuantityTypes.queryQuantitySamples method not found');
  }

  authStatus = hasAuthMethod ? '✅ Available' : '❌ Missing';

  // Try to get raw sample data to debug structure
  if (hasQueryMethod) {
    try {
      const now = new Date();
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      const to = new Date(now);
      to.setHours(23, 59, 59, 999);

      // Correct API: QuantityTypes.queryQuantitySamples(identifier, options)
      const rawSamples = await module.QuantityTypes.queryQuantitySamples(
        'HKQuantityTypeIdentifierStepCount',
        {
          unit: 'count',
          limit: 1000,
          ascending: false,
          filter: buildDateFilter(from, to),
        }
      );

      if (rawSamples && rawSamples.length > 0) {
        const firstSample = rawSamples[0];
        const keys = Object.keys(firstSample);
        rawSampleInfo = `Found ${rawSamples.length} samples. Keys: [${keys.join(', ')}]. First: ${JSON.stringify(firstSample).substring(0, 200)}`;
      } else {
        rawSampleInfo = `Query returned ${rawSamples?.length || 0} samples (empty array or null)`;
      }
    } catch (err: any) {
      rawSampleInfo = `Raw query error: ${err.message}`;
    }
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

  const status = errors.length === 0 ? 'working' : (module ? 'partial' : 'not_working');
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
 * This captures the actual API responses so we can see what's happening
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
  const module = getHealthKit();
  const queries: any[] = [];
  const now = new Date();

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const queryParams = `from: ${from.getTime()} (${from.toISOString()}), to: ${to.getTime()} (${to.toISOString()})`;

  if (!module) {
    return {
      timestamp: now.toISOString(),
      queries: [{
        metric: 'MODULE',
        queryParams: 'N/A',
        rawResponse: 'HealthKit module not loaded!',
        sampleCount: 0,
        firstSample: 'N/A',
        calculatedValue: 0,
        error: 'Module failed to load',
      }],
    };
  }

  // Test Steps
  try {
    const samples = await module.QuantityTypes.queryQuantitySamples(
      'HKQuantityTypeIdentifierStepCount',
      {
        unit: 'count',
        limit: 1000,
        ascending: false,
        filter: buildDateFilter(from, to),
      }
    );
    const total = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? s?.value ?? 0), 0)
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
    const samples = await module.QuantityTypes.queryQuantitySamples(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      {
        unit: 'kcal',
        limit: 1000,
        ascending: false,
        filter: buildDateFilter(from, to),
      }
    );
    const total = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? s?.value ?? 0), 0)
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
    const samples = await module.QuantityTypes.queryQuantitySamples(
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
      {
        unit: 'm',
        limit: 1000,
        ascending: false,
        filter: buildDateFilter(from, to),
      }
    );
    const totalMeters = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s?.quantity ?? s?.value ?? 0), 0)
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

    const samples = await module.CategoryTypes.queryCategorySamples(
      'HKCategoryTypeIdentifierSleepAnalysis',
      {
        limit: 1000,
        ascending: false,
        filter: buildDateFilter(sleepFrom, to),
      }
    );

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
      queryParams: `from: ${sleepFrom.getTime()}, to: ${to.getTime()}`,
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
    // Workouts query not yet implemented with new API structure
    const samples: any[] = [];

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
      rawResponse: samples ? `Array(${samples?.length ?? 0})` : 'queryWorkouts not available',
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
    const samples = await module.CategoryTypes.queryCategorySamples(
      'HKCategoryTypeIdentifierAppleStandHour',
      {
        limit: 1000,
        ascending: false,
        filter: buildDateFilter(from, to),
      }
    );

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
