import { Platform } from 'react-native';
import Constants from 'expo-constants';
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

// Check if we're in Expo Go (which doesn't support HealthKit)
const isExpoGo = Constants?.executionEnvironment === 'storeClient';

// Cache the HealthKit module to avoid repeated requires
let AppleHealthKitModule: any = null;

/**
 * Initialize health data access (iOS only)
 * Returns true if health data is available
 */
export async function initializeHealth(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    // Health data only available on iOS
    return false;
  }

  if (isExpoGo) {
    console.log('⚠️ HealthKit not available in Expo Go');
    console.log('🔧 Use a development build: eas build --platform ios --profile development');
    return false;
  }

  try {
    const success = await initializeAppleHealth();

    if (!success && !isDevelopment) {
      console.log('⚠️ HealthKit initialization failed in production build');
      console.log('📱 This is normal - enable permissions manually in Settings > Privacy > Health');
    }

    return success;
  } catch (error) {
    console.error('❌ Failed to initialize health:', error);
    return false;
  }
}

/**
 * Get the Apple HealthKit module (cached)
 */
function getAppleHealthKit(): any {
  if (!AppleHealthKitModule) {
    try {
      // Attempting to load react-native-health module
      const healthModule = require('react-native-health');
      
      // Try different export patterns - the module might export differently
      AppleHealthKitModule = healthModule.default || healthModule.AppleHealthKit || healthModule;
      
      // Log what we got for debugging
      console.log('✅ react-native-health module loaded');
      console.log('Module type:', typeof AppleHealthKitModule);
      console.log('Module keys:', AppleHealthKitModule ? Object.keys(AppleHealthKitModule).slice(0, 10) : 'null');
      
      // Check if Constants are available
      if (AppleHealthKitModule?.Constants) {
        console.log('✅ HealthKit Constants available');
      } else {
        console.log('⚠️ HealthKit Constants not available, checking alternate paths');
        // Try to find Constants in the module
        if (healthModule.Constants) {
          console.log('Found Constants on healthModule directly');
        }
      }
      
      return AppleHealthKitModule;
    } catch (error: any) {
      console.error('❌ Failed to load react-native-health:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ This usually means:');
      console.error('   1. You are using Expo Go (HealthKit requires a development build)');
      console.error('   2. The native module is not properly linked');
      console.error('   3. The build does not include the HealthKit entitlement');
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
      console.log('🔵 Calling AppleHealthKit.initHealthKit with permissions:', JSON.stringify(permissions, null, 2));
      
      AppleHealthKit.initHealthKit(permissions, (error: any) => {
        if (error) {
          console.error('❌ HealthKit init error:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Full error:', JSON.stringify(error, null, 2));
          
          // Common error codes:
          // - 2: HealthKit not available on device
          // - 3: HealthKit not available in region
          // - 4: Authorization denied
          // - 5: Invalid argument
          
          if (error.code === 2) {
            console.log('❌ HealthKit not available on this device');
            resolve(false);
          } else if (error.code === 3) {
            console.log('❌ HealthKit not available in this region');
            resolve(false);
          } else if (error.code === 4 || error.message?.includes('denied') || error.message?.includes('not authorized') || error.message?.includes('permission')) {
            console.log('⚠️ HealthKit permissions denied - this is OK, user can enable in Settings');
            // Even if denied, HealthKit was initialized - app should appear in Settings
            // Return true so app knows HealthKit is available, just needs permissions
            resolve(true);
          } else {
            console.log('❌ HealthKit initialization failed with unknown error');
            console.log('❌ This might mean HealthKit entitlement is not properly configured in the build');
            resolve(false);
          }
        } else {
          console.log('✅ HealthKit initialized successfully!');
          console.log('✅ Permission dialog should have appeared');
          console.log('✅ App should now appear in Settings → Privacy → Health');
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
 * Get weekly health data (current week - Monday to today)
 */
export async function getCurrentWeekHealthData(): Promise<DailyHealthData[]> {
  const { getStartOfWeekMonday } = require('../utils/dates');
  const today = new Date();
  const startOfWeek = getStartOfWeekMonday(today);
  
  return getHealthDataRange(startOfWeek, today);
}

/**
 * Check if health data is available on this platform (iOS only)
 */
export function isHealthAvailable(): boolean {
  return Platform.OS === 'ios';
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
  const AppleHealthKit = getAppleHealthKit();

  let deviceSupported = false;
  if (AppleHealthKit) {
    try {
      deviceSupported = await new Promise<boolean>((resolve) => {
        AppleHealthKit.isAvailable((error: any, available: boolean) => {
          resolve(!error && available);
        });
      });
    } catch (error) {
      console.error('Device support check failed:', error);
    }
  }

  return {
    platform: Platform.OS,
    isExpoGo: Constants.executionEnvironment === 'storeClient',
    isDevelopment: __DEV__,
    moduleLoaded: !!AppleHealthKit,
    deviceSupported,
    initializationAttempted: false, // This would be tracked separately
    entitlementsConfigured: true, // Based on app.json config
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || 'unknown'
  };
}

