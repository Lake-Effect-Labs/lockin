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
      HealthKitModule = require('@kingstinct/react-native-healthkit');
      console.log('✅ @kingstinct/react-native-healthkit loaded successfully');
      return HealthKitModule;
    } catch (error: any) {
      console.error('❌ Failed to load HealthKit module:', error.message);
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
  if (Platform.OS !== 'ios') {
    console.log('⚠️ Health data only available on iOS');
    return false;
  }

  if (isExpoGo) {
    console.log('⚠️ HealthKit not available in Expo Go');
    console.log('🔧 Use: eas build --platform ios --profile development');
    return false;
  }

  try {
    const HealthKit = getHealthKit();
    
    if (!HealthKit) {
      console.log('⚠️ HealthKit module not available');
      return false;
    }

    // Check if HealthKit is available on device
    const isAvailable = await HealthKit.isHealthDataAvailable();
    
    if (!isAvailable) {
      console.log('❌ HealthKit not available on this device');
      return false;
    }

    console.log('✅ HealthKit is available');

    // Request permissions for the data types we need
    const permissions = {
      read: [
        HealthKit.HKQuantityTypeIdentifier.stepCount,
        HealthKit.HKQuantityTypeIdentifier.distanceWalkingRunning,
        HealthKit.HKQuantityTypeIdentifier.activeEnergyBurned,
        HealthKit.HKCategoryTypeIdentifier.sleepAnalysis,
        HealthKit.HKWorkoutTypeIdentifier.workoutType,
      ],
    };

    console.log('🔵 Requesting HealthKit permissions...');
    
    await HealthKit.requestAuthorization(permissions);
    
    console.log('✅ HealthKit permissions requested successfully');
    console.log('✅ Lock-In should now appear in Settings → Privacy → Health');
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to initialize HealthKit:', error);
    console.error('Error message:', error.message);
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
