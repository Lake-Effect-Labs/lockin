import { Platform } from 'react-native';
import { FitnessMetrics } from './scoring';

// ============================================
// HEALTH DATA SERVICE
// iOS-only health data integration via Apple HealthKit
// Supports: Apple HealthKit (iOS)
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

// Check if we're in a development environment
const isDevelopment = __DEV__;

// Cache the HealthKit module to avoid repeated requires
let AppleHealthKitModule: any = null;

/**
 * Initialize health data access (iOS only)
 * Returns true if health data is available
 */
export async function initializeHealth(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('Health data only available on iOS');
    return false;
  }

  try {
    return await initializeAppleHealth();
  } catch (error) {
    console.error('Failed to initialize health:', error);
    return false;
  }
}

/**
 * Get the Apple HealthKit module (cached)
 */
function getAppleHealthKit(): any {
  if (!AppleHealthKitModule) {
    try {
      AppleHealthKitModule = require('react-native-health').default;
    } catch (error) {
      console.error('Failed to load react-native-health:', error);
      return null;
    }
  }
  return AppleHealthKitModule;
}

/**
 * Initialize Apple HealthKit (iOS)
 */
async function initializeAppleHealth(): Promise<boolean> {
  try {
    const AppleHealthKit = getAppleHealthKit();
    
    if (!AppleHealthKit) {
      console.log('⚠️ Apple HealthKit module not available');
      console.log('📱 HealthKit requires a development build - Expo Go cannot access native APIs');
      console.log('🔧 Run: eas build --platform ios --profile development');
      return false;
    }
    
    // Check if HealthKit is available on this device
    const isAvailable = await new Promise<boolean>((resolve) => {
      AppleHealthKit.isAvailable((error: any, available: boolean) => {
        if (error) {
          console.error('HealthKit availability check error:', error);
          resolve(false);
        } else {
          resolve(available);
        }
      });
    });
    
    if (!isAvailable) {
      console.log('HealthKit is not available on this device');
      return false;
    }
    
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.Steps,
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
          AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
          AppleHealthKit.Constants.Permissions.Workout,
        ],
        write: [],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: any) => {
        if (error) {
          console.error('HealthKit init error:', error);
          resolve(false);
        } else {
          console.log('HealthKit initialized successfully');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.log('Apple HealthKit not available (expected in Expo Go):', error);
    return false;
  }
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

  if (Platform.OS !== 'ios') {
    return defaultPermissions;
  }

  try {
    return await checkAppleHealthPermissions();
  } catch (error) {
    console.error('Failed to check permissions:', error);
    return defaultPermissions;
  }
}

async function checkAppleHealthPermissions(): Promise<HealthPermissions> {
  // HealthKit doesn't provide a way to check individual permissions
  // We assume all permissions are granted after init
  return {
    steps: true,
    sleep: true,
    calories: true,
    workouts: true,
    distance: true,
  };
}

/**
 * Get health data for a specific date (iOS only)
 */
export async function getDailyHealthData(date: Date): Promise<DailyHealthData> {
  const dateString = date.toISOString().split('T')[0];
  
  if (Platform.OS !== 'ios') {
    console.log('Health data only available on iOS');
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
    return await getAppleHealthData(date, dateString);
  } catch (error) {
    console.error('Failed to get health data:', error);
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

async function getAppleHealthData(date: Date, dateString: string): Promise<DailyHealthData> {
  const AppleHealthKit = getAppleHealthKit();
  
  if (!AppleHealthKit) {
    // Return empty data instead of throwing - will fall back to fake data mode
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

  const options = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  try {
    const [steps, sleep, calories, distance, workouts] = await Promise.all([
      getAppleSteps(AppleHealthKit, options),
      getAppleSleep(AppleHealthKit, options),
      getAppleCalories(AppleHealthKit, options),
      getAppleDistance(AppleHealthKit, options),
      getAppleWorkouts(AppleHealthKit, options),
    ]);

    console.log(`HealthKit data for ${dateString}:`, { steps, sleep, calories, distance, workouts });

    return {
      date: dateString,
      steps,
      sleepHours: sleep,
      calories,
      workouts,
      distance,
    };
  } catch (error) {
    console.error(`Failed to get Apple Health data for ${dateString}:`, error);
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

function getAppleSteps(AppleHealthKit: any, options: any): Promise<number> {
  return new Promise((resolve) => {
    AppleHealthKit.getStepCount(options, (error: any, results: any) => {
      if (error) {
        resolve(0);
      } else {
        resolve(results?.value || 0);
      }
    });
  });
}

function getAppleSleep(AppleHealthKit: any, options: any): Promise<number> {
  return new Promise((resolve) => {
    AppleHealthKit.getSleepSamples(options, (error: any, results: any) => {
      if (error || !results) {
        resolve(0);
      } else {
        const totalMinutes = results.reduce((acc: number, sample: any) => {
          if (sample.value === 'ASLEEP' || sample.value === 'INBED') {
            const start = new Date(sample.startDate).getTime();
            const end = new Date(sample.endDate).getTime();
            return acc + (end - start) / (1000 * 60);
          }
          return acc;
        }, 0);
        resolve(Math.round(totalMinutes / 60 * 100) / 100);
      }
    });
  });
}

function getAppleCalories(AppleHealthKit: any, options: any): Promise<number> {
  return new Promise((resolve) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error: any, results: any) => {
      if (error) {
        resolve(0);
      } else {
        const total = results?.reduce((acc: number, r: any) => acc + (r.value || 0), 0) || 0;
        resolve(Math.round(total));
      }
    });
  });
}

function getAppleDistance(AppleHealthKit: any, options: any): Promise<number> {
  return new Promise((resolve) => {
    AppleHealthKit.getDistanceWalkingRunning(options, (error: any, results: any) => {
      if (error) {
        resolve(0);
      } else {
        // Convert meters to miles
        const meters = results?.value || 0;
        resolve(Math.round(meters / 1609.344 * 100) / 100);
      }
    });
  });
}

function getAppleWorkouts(AppleHealthKit: any, options: any): Promise<number> {
  return new Promise((resolve) => {
    AppleHealthKit.getSamples(
      {
        ...options,
        type: 'Workout',
      },
      (error: any, results: any) => {
        if (error) {
          resolve(0);
        } else {
          resolve(results?.length || 0);
        }
      }
    );
  });
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
 * Get weekly health data (current week)
 */
export async function getCurrentWeekHealthData(): Promise<DailyHealthData[]> {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);
  
  return getHealthDataRange(startOfWeek, today);
}

/**
 * Check if health data is available on this platform (iOS only)
 */
export function isHealthAvailable(): boolean {
  return Platform.OS === 'ios';
}

