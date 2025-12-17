import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';

// ============================================
// HEALTH DATA SERVICE
// iOS-only health data integration via Apple HealthKit
// Using @kingstinct/react-native-healthkit (Expo-compatible)
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

// Cache the HealthKit module
let HealthKitModule: any = null;

/**
 * Get the HealthKit module (cached, lazy-loaded)
 */
function getHealthKit(): any {
  if (!HealthKitModule) {
    try {
      console.log('📦 Loading @kingstinct/react-native-healthkit module...');
      HealthKitModule = require('@kingstinct/react-native-healthkit');
      
      console.log('✅ @kingstinct/react-native-healthkit loaded successfully');
      console.log('📊 Module details:');
      console.log('   - Type:', typeof HealthKitModule);
      console.log('   - Null?:', HealthKitModule === null);
      
      if (HealthKitModule) {
        const keys = Object.keys(HealthKitModule);
        console.log('   - Export count:', keys.length);
        console.log('   - Sample keys:', keys.slice(0, 8).join(', '));
        console.log('   - Has requestAuthorization:', !!HealthKitModule.requestAuthorization);
        console.log('   - Has isHealthDataAvailable:', !!HealthKitModule.isHealthDataAvailable);
        console.log('   - Has HKQuantityTypeIdentifier:', !!HealthKitModule.HKQuantityTypeIdentifier);
      }
      
      return HealthKitModule;
    } catch (error: any) {
      console.error('❌ CRITICAL: Failed to load HealthKit module');
      console.error('   - Error:', error.message);
      console.error('   - Code:', error.code);
      console.error('');
      console.error('💡 This means native module NOT in build!');
      console.error('🔧 Fix: eas build --platform ios --profile testflight --clear-cache');
      return null;
    }
  }
  return HealthKitModule;
}

/**
 * Initialize health data access (iOS only)
 * Returns true if health data is available
 */
export async function initializeHealth(): Promise<boolean> {
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

  try {
    // Step 3: Load module
    console.log('📦 STEP 3: Load HealthKit Module');
    const HealthKit = getHealthKit();
    
    if (!HealthKit) {
      console.log('   ❌ FAILED: Module returned null');
      console.log('   💡 Native module not included in build');
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: Module loaded');
    console.log('');

    // Step 4: Check device availability
    console.log('📱 STEP 4: Check HealthKit Device Availability');
    console.log('   - Calling: HealthKit.isHealthDataAvailable()');
    const startAvailCheck = Date.now();
    const isAvailable = await HealthKit.isHealthDataAvailable();
    const availCheckDuration = Date.now() - startAvailCheck;
    console.log('   - Duration:', availCheckDuration, 'ms');
    console.log('   - Result:', isAvailable);
    console.log('   - Result type:', typeof isAvailable);
    
    if (!isAvailable) {
      console.log('   ❌ FAILED: HealthKit not available on device');
      console.log('   💡 This should never happen on iPhone 6s+');
      console.log('='.repeat(60));
      return false;
    }
    console.log('   ✅ PASSED: HealthKit available on device');
    console.log('');

    // Step 5: Build permissions object
    console.log('🔐 STEP 5: Build Permission Request');
    const permissions = {
      read: [
        HealthKit.HKQuantityTypeIdentifier.stepCount,
        HealthKit.HKQuantityTypeIdentifier.distanceWalkingRunning,
        HealthKit.HKQuantityTypeIdentifier.activeEnergyBurned,
        HealthKit.HKCategoryTypeIdentifier.sleepAnalysis,
        HealthKit.HKWorkoutTypeIdentifier.workoutType,
      ],
    };
    console.log('   - Permissions:', JSON.stringify(permissions, null, 2));
    console.log('   ✅ Permission object created');
    console.log('');

    // Step 6: Request authorization (THIS IS THE CRITICAL STEP)
    console.log('🚀 STEP 6: Request Authorization');
    console.log('   - Calling: HealthKit.requestAuthorization()');
    console.log('   - Start time:', new Date().toISOString());
    console.log('');
    console.log('   ⏳ WAITING FOR USER INTERACTION...');
    console.log('   💡 iOS permission dialog should appear NOW');
    console.log('');
    
    const startAuthTime = Date.now();
    const authResult = await HealthKit.requestAuthorization(permissions);
    const authDuration = Date.now() - startAuthTime;
    
    console.log('   - End time:', new Date().toISOString());
    console.log('   - Duration:', authDuration, 'ms');
    console.log('   - Result:', authResult);
    console.log('   - Result type:', typeof authResult);
    console.log('');
    
    if (authDuration < 500) {
      console.log('   ⚠️ WARNING: Call completed in < 500ms');
      console.log('   💡 This suggests no dialog was shown (should take 2+ seconds)');
    } else {
      console.log('   ✅ Duration suggests dialog was shown');
    }
    console.log('');
    
    console.log('🎉 INITIALIZATION COMPLETE');
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
    console.log('');
    console.log('❌ EXCEPTION THROWN DURING INITIALIZATION');
    console.log('   - Error name:', error.name);
    console.log('   - Error message:', error.message);
    console.log('   - Error code:', error.code);
    console.log('   - Error stack:');
    console.log(error.stack);
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    return false;
  }
}

/**
 * Check if health data is available on this platform (iOS only)
 */
export function isHealthAvailable(): boolean {
  return Platform.OS === 'ios' && !isExpoGo;
}

/**
 * Check current health permissions (iOS only)
 */
export async function checkHealthPermissions(): Promise<HealthPermissions> {
  const defaultPermissions: HealthPermissions = {
    steps: false,
    sleep: false,
    calories: false,
    workouts: false,
    distance: false,
  };

  if (Platform.OS !== 'ios' || isExpoGo) {
    return defaultPermissions;
  }

  try {
    const HealthKit = getHealthKit();
    if (!HealthKit) return defaultPermissions;

    // @kingstinct/react-native-healthkit doesn't expose individual permission status
    // iOS HealthKit API intentionally doesn't reveal if permissions were granted
    // We assume if initialization succeeded, basic permissions are available
    return {
      steps: true,
      sleep: true,
      calories: true,
      workouts: true,
      distance: true,
    };
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return defaultPermissions;
  }
}

/**
 * Get health data for a specific date (iOS only)
 */
export async function getDailyHealthData(date: Date): Promise<DailyHealthData> {
  const dateString = date.toISOString().split('T')[0];
  
  if (Platform.OS !== 'ios' || isExpoGo) {
    return {
      date: dateString,
      steps: 0,
      sleepHours: 0,
      calories: 0,
      workouts: 0,
      distance: 0,
    };
  }

  try {
    const HealthKit = getHealthKit();
    if (!HealthKit) {
      return {
        date: dateString,
        steps: 0,
        sleepHours: 0,
        calories: 0,
        workouts: 0,
        distance: 0,
      };
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all metrics in parallel
    const [steps, distance, calories, sleep, workouts] = await Promise.all([
      getSteps(HealthKit, startDate, endDate),
      getDistance(HealthKit, startDate, endDate),
      getCalories(HealthKit, startDate, endDate),
      getSleep(HealthKit, startDate, endDate),
      getWorkouts(HealthKit, startDate, endDate),
    ]);

    return {
      date: dateString,
      steps,
      sleepHours: sleep,
      calories,
      workouts,
      distance,
    };
  } catch (error) {
    console.error(`Failed to get health data for ${dateString}:`, error);
    return {
      date: dateString,
      steps: 0,
      sleepHours: 0,
      calories: 0,
      workouts: 0,
      distance: 0,
    };
  }
}

async function getSteps(HealthKit: any, startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await HealthKit.queryQuantitySamples(
      HealthKit.HKQuantityTypeIdentifier.stepCount,
      {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      }
    );
    
    const total = result.reduce((sum: number, sample: any) => sum + (sample.quantity || 0), 0);
    return Math.round(total);
  } catch (error) {
    console.error('Error fetching steps:', error);
    return 0;
  }
}

async function getDistance(HealthKit: any, startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await HealthKit.queryQuantitySamples(
      HealthKit.HKQuantityTypeIdentifier.distanceWalkingRunning,
      {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      }
    );
    
    const totalMeters = result.reduce((sum: number, sample: any) => sum + (sample.quantity || 0), 0);
    // Convert meters to miles
    const miles = totalMeters / 1609.344;
    return Math.round(miles * 100) / 100;
  } catch (error) {
    console.error('Error fetching distance:', error);
    return 0;
  }
}

async function getCalories(HealthKit: any, startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await HealthKit.queryQuantitySamples(
      HealthKit.HKQuantityTypeIdentifier.activeEnergyBurned,
      {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      }
    );
    
    const total = result.reduce((sum: number, sample: any) => sum + (sample.quantity || 0), 0);
    return Math.round(total);
  } catch (error) {
    console.error('Error fetching calories:', error);
    return 0;
  }
}

async function getSleep(HealthKit: any, startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await HealthKit.queryCategorySamples(
      HealthKit.HKCategoryTypeIdentifier.sleepAnalysis,
      {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      }
    );
    
    let totalMinutes = 0;
    
    for (const sample of result) {
      // Only count asleep time (not in bed time)
      if (sample.value === HealthKit.HKCategoryValueSleepAnalysis.asleep) {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        const minutes = (end - start) / (1000 * 60);
        totalMinutes += minutes;
      }
    }
    
    const hours = totalMinutes / 60;
    return Math.round(hours * 100) / 100;
  } catch (error) {
    console.error('Error fetching sleep:', error);
    return 0;
  }
}

async function getWorkouts(HealthKit: any, startDate: Date, endDate: Date): Promise<number> {
  try {
    const result = await HealthKit.queryWorkoutSamples({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    });
    
    return result?.length || 0;
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return 0;
  }
}

/**
 * Get health data for a date range
 */
export async function getHealthDataRange(startDate: Date, endDate: Date): Promise<DailyHealthData[]> {
  const data: DailyHealthData[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    try {
      const dayData = await getDailyHealthData(new Date(current));
      data.push(dayData);
    } catch (error) {
      console.error(`Failed to get data for ${current.toISOString()}:`, error);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return data;
}

/**
 * Get weekly health data (current week - Monday to today)
 */
export async function getCurrentWeekHealthData(): Promise<DailyHealthData[]> {
  const { getStartOfWeekMonday } = require('../utils/dates');
  const today = new Date();
  const startOfWeek = getStartOfWeekMonday(today);
  
  return getHealthDataRange(startOfWeek, today);
}

/**
 * Comprehensive health diagnostics for debugging TestFlight issues
 */
export async function getHealthDiagnostics(): Promise<{
  platform: string;
  isExpoGo: boolean;
  isDevelopment: boolean;
  moduleLoaded: boolean;
  deviceSupported: boolean;
  initializationAttempted: boolean;
  entitlementsConfigured: boolean;
  bundleId: string;
}> {
  const HealthKit = getHealthKit();
  
  let deviceSupported = false;
  if (HealthKit && Platform.OS === 'ios' && !isExpoGo) {
    try {
      deviceSupported = await HealthKit.isHealthDataAvailable();
    } catch (error) {
      console.error('Device support check failed:', error);
    }
  }

  return {
    platform: Platform.OS,
    isExpoGo: Constants.executionEnvironment === 'storeClient',
    isDevelopment: __DEV__,
    moduleLoaded: !!HealthKit,
    deviceSupported,
    initializationAttempted: false,
    entitlementsConfigured: true,
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || 'unknown'
  };
}

// Fake data mode flag (exported for compatibility)
export const fakeMode = false;
