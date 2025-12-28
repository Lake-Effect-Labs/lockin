import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';

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
 * Get the Apple HealthKit module (cached, lazy-loaded)
 */
function getHealthKit(): any {
  if (!HealthKit && !loadError) {
    try {
      console.log('📦 Loading @kingstinct/react-native-healthkit module...');
      const healthModule = require('@kingstinct/react-native-healthkit');
      
      // Handle both default export and direct export
      HealthKit = healthModule?.default ?? healthModule;
      
      console.log('✅ @kingstinct/react-native-healthkit loaded successfully');
      console.log('📊 Module available');
      console.log('   - Export keys:', Object.keys(HealthKit || {}).slice(0, 10).join(', '));
      console.log('   - Has requestAuthorization:', typeof HealthKit?.requestAuthorization);
      
      return HealthKit;
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
  
  return HealthKit;
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

    // Step 4: Check if requestAuthorization exists
    console.log('📱 STEP 4: Check requestAuthorization availability');
    
    if (typeof module.requestAuthorization !== 'function') {
      console.log('   ❌ FAILED: requestAuthorization is not a function');
      console.log('   - typeof:', typeof module.requestAuthorization);
      console.log('   - Available methods:', Object.keys(module || {}).slice(0, 15).join(', '));
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: requestAuthorization available');
    console.log('');

    // Step 5: Request authorization
    console.log('🔐 STEP 5: Request HealthKit Authorization');
    console.log('   - Requesting permissions for: StepCount, SleepAnalysis, ActiveEnergyBurned, DistanceWalkingRunning, Workout');
    console.log('');

    console.log('🚀 STEP 6: Initialize HealthKit');
    console.log('   - Calling: module.requestAuthorization()');
    console.log('   - Start time:', new Date().toISOString());
    console.log('');
    console.log('   ⏳ WAITING FOR USER INTERACTION...');
    console.log('   💡 iOS permission dialog should appear NOW');
    console.log('');

    const startAuthTime = Date.now();

    // Modern Kingstinct API - no callbacks, uses async/await
    await module.requestAuthorization({
      read: [
        'StepCount',
        'DistanceWalkingRunning',
        'ActiveEnergyBurned',
        'SleepAnalysis',
        'Workout',
      ],
      write: [],
    });
    
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
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // For steps, we need to SUM all samples (not just get the latest)
    // Each step sample represents a segment of steps (e.g., from a walk)
    if (typeof module.queryQuantitySamples === 'function') {
      const samples = await module.queryQuantitySamples({
        quantityType: 'stepCount',
        from: startDate,
        to: endDate,
      });

      // Sum all step samples for the day
      if (samples && Array.isArray(samples)) {
        const total = samples.reduce((sum: number, sample: any) => {
          return sum + (sample?.quantity || sample?.value || 0);
        }, 0);
        return Math.round(total);
      }
    }

    // Fallback: try queryStatisticsForQuantity if available (gives sum directly)
    if (typeof module.queryStatisticsForQuantity === 'function') {
      const stats = await module.queryStatisticsForQuantity({
        quantityType: 'stepCount',
        from: startDate,
        to: endDate,
        options: ['cumulativeSum'],
      });
      return Math.round(stats?.sumQuantity?.quantity || 0);
    }

    return 0;
  } catch (err: any) {
    console.error('❌ Error getting steps:', err);
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
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(18, 0, 0, 0); // Start from 6 PM previous day

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let results: any[] = [];

    // Try queryCategorySamples for sleep (category-type data)
    if (typeof module.queryCategorySamples === 'function') {
      results = await module.queryCategorySamples({
        categoryType: 'sleepAnalysis',
        from: startDate,
        to: endDate,
      });
    }

    if (!results || results.length === 0) {
      return 0;
    }

    // Sum up all sleep periods (in hours)
    // Filter for actual sleep (not "inBed" which is just time in bed)
    const totalMinutes = results.reduce((sum: number, sample: any) => {
      // Skip "inBed" samples - only count actual sleep
      const value = sample?.value || sample?.category;
      if (value === 0 || value === 'inBed') {
        return sum;
      }

      const start = new Date(sample.startDate || sample.from).getTime();
      const end = new Date(sample.endDate || sample.to).getTime();
      return sum + (end - start) / (1000 * 60);
    }, 0);

    return totalMinutes / 60;
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
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // For calories, we need to SUM all samples (not just get the latest)
    if (typeof module.queryQuantitySamples === 'function') {
      const samples = await module.queryQuantitySamples({
        quantityType: 'activeEnergyBurned',
        from: startDate,
        to: endDate,
      });

      // Sum all calorie samples for the day
      if (samples && Array.isArray(samples)) {
        const total = samples.reduce((sum: number, sample: any) => {
          return sum + (sample?.quantity || sample?.value || 0);
        }, 0);
        return Math.round(total);
      }
    }

    // Fallback: try queryStatisticsForQuantity if available
    if (typeof module.queryStatisticsForQuantity === 'function') {
      const stats = await module.queryStatisticsForQuantity({
        quantityType: 'activeEnergyBurned',
        from: startDate,
        to: endDate,
        options: ['cumulativeSum'],
      });
      return Math.round(stats?.sumQuantity?.quantity || 0);
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
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let totalMeters = 0;

    // For distance, we need to SUM all samples (not just get the latest)
    if (typeof module.queryQuantitySamples === 'function') {
      const samples = await module.queryQuantitySamples({
        quantityType: 'distanceWalkingRunning',
        from: startDate,
        to: endDate,
      });

      // Sum all distance samples for the day
      if (samples && Array.isArray(samples)) {
        totalMeters = samples.reduce((sum: number, sample: any) => {
          return sum + (sample?.quantity || sample?.value || 0);
        }, 0);
      }
    }

    // Fallback: try queryStatisticsForQuantity if available
    if (totalMeters === 0 && typeof module.queryStatisticsForQuantity === 'function') {
      const stats = await module.queryStatisticsForQuantity({
        quantityType: 'distanceWalkingRunning',
        from: startDate,
        to: endDate,
        options: ['cumulativeSum'],
      });
      totalMeters = stats?.sumQuantity?.quantity || 0;
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
    console.log('⚠️ HealthKit not available, returning 0 workouts');
    return 0;
  }

  try {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    let results: any[] = [];

    // Query workout samples using Kingstinct API
    if (typeof module.queryWorkoutSamples === 'function') {
      results = await module.queryWorkoutSamples({
        from: startDate,
        to: endDate,
      });
    }

    // Return the count of workouts
    return results?.length || 0;
  } catch (err: any) {
    console.error('❌ Error getting workouts:', err);
    return 0;
  }
}

/**
 * Get all daily fitness metrics
 */
export async function getDailyMetrics(date: Date = new Date()): Promise<DailyHealthData> {
  console.log('📊 Getting daily metrics for', date.toLocaleDateString());

  const [steps, sleep, calories, distance, workouts] = await Promise.all([
    getDailySteps(date),
    getDailySleep(date),
    getDailyCalories(date),
    getDailyDistance(date),
    getDailyWorkouts(date),
  ]);

  console.log('📊 Results:', { steps, sleep, calories, distance, workouts });

  return {
    date: date.toISOString().split('T')[0],
    steps,
    sleepHours: sleep,
    calories,
    distance: distance,
    workouts,
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
      });
    }
  }

  return weekData;
}

/**
 * Get health diagnostics for crash reporting
 */
export function getHealthDiagnostics(): {
  moduleLoaded: boolean;
  deviceSupported: boolean;
  isExpoGo: boolean;
  loadError: string | null;
} {
  const module = getHealthKit();

  return {
    moduleLoaded: module !== null,
    deviceSupported: Platform.OS === 'ios',
    isExpoGo: isExpoGo,
    loadError: loadError?.message || null,
  };
}
