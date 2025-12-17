import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { FitnessMetrics } from './scoring';

// ============================================
// HEALTH DATA SERVICE  
// iOS-only health data integration via Apple HealthKit
// Using react-native-health (with Expo config plugin)
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
let AppleHealthKit: any = null;

/**
 * Get the Apple HealthKit module (cached, lazy-loaded)
 */
function getAppleHealthKit(): any {
  if (!AppleHealthKit) {
    try {
      console.log('📦 Loading react-native-health module...');
      const healthModule = require('react-native-health');
      
      // react-native-health exports as default
      AppleHealthKit = healthModule.default || healthModule;
      
      console.log('✅ react-native-health loaded successfully');
      console.log('📊 Module details:');
      console.log('   - Type:', typeof AppleHealthKit);
      console.log('   - Null?:', AppleHealthKit === null);
      
      if (AppleHealthKit) {
        const keys = Object.keys(AppleHealthKit);
        console.log('   - Export count:', keys.length);
        console.log('   - Sample keys:', keys.slice(0, 10).join(', '));
        console.log('   - Has initHealthKit:', !!AppleHealthKit.initHealthKit);
        console.log('   - Has isAvailable:', !!AppleHealthKit.isAvailable);
        console.log('   - Has Constants:', !!AppleHealthKit.Constants);
      }
      
      return AppleHealthKit;
    } catch (error: any) {
      console.error('❌ CRITICAL: Failed to load react-native-health module');
      console.error('   - Error:', error.message);
      console.error('   - Code:', error.code);
      console.error('');
      console.error('💡 This means native module NOT in build!');
      console.error('🔧 Fix: eas build --platform ios --profile testflight --clear-cache');
      return null;
    }
  }
  return AppleHealthKit;
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

  // Step 3: Load module
  console.log('📦 STEP 3: Load HealthKit Module');
  const AppleHealthKit = getAppleHealthKit();
  
  if (!AppleHealthKit) {
    console.log('   ❌ FAILED: Module returned null');
    console.log('   💡 Native module not included in build');
    console.log('='.repeat(60));
    return false;
  }
  console.log('   ✅ PASSED: Module loaded');
  console.log('');

  // Step 4: Check if HealthKit is available
  console.log('📱 STEP 4: Check HealthKit Availability');
  
  return new Promise((resolve) => {
    // Build permissions
    const permissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants?.Permissions?.StepCount || 'StepCount',
          AppleHealthKit.Constants?.Permissions?.DistanceWalkingRunning || 'DistanceWalkingRunning',
          AppleHealthKit.Constants?.Permissions?.ActiveEnergyBurned || 'ActiveEnergyBurned',
          AppleHealthKit.Constants?.Permissions?.SleepAnalysis || 'SleepAnalysis',
        ],
        write: [],
      },
    };

    console.log('🔐 STEP 5: Build Permission Request');
    console.log('   - Permissions:', JSON.stringify(permissions, null, 2));
    console.log('');

    // Step 6: Initialize HealthKit (THIS SHOWS THE PERMISSION DIALOG)
    console.log('🚀 STEP 6: Initialize HealthKit');
    console.log('   - Calling: AppleHealthKit.initHealthKit()');
    console.log('   - Start time:', new Date().toISOString());
    console.log('');
    console.log('   ⏳ WAITING FOR USER INTERACTION...');
    console.log('   💡 iOS permission dialog should appear NOW');
    console.log('');
    
    const startAuthTime = Date.now();
    
    AppleHealthKit.initHealthKit(permissions, (error: any, results: any) => {
      const authDuration = Date.now() - startAuthTime;
      
      console.log('   - End time:', new Date().toISOString());
      console.log('   - Duration:', authDuration, 'ms');
      console.log('   - Error:', error);
      console.log('   - Results:', results);
      console.log('');
      
      if (error) {
        console.log('   ❌ INIT FAILED with error');
        console.log('   Error message:', error);
        console.log('');
        console.log('='.repeat(60));
        resolve(false);
        return;
      }
      
      if (authDuration < 500) {
        console.log('   ⚠️ WARNING: Call completed in < 500ms');
        console.log('   💡 This suggests no dialog was shown (should take 2+ seconds)');
        console.log('   💡 POSSIBLE CAUSES:');
        console.log('      1. User previously responded to permission request');
        console.log('      2. Native module not properly bridged');
        console.log('      3. Config plugin not applied correctly');
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
      
      resolve(true);
    });
  });
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

  const AppleHealthKit = getAppleHealthKit();
  return AppleHealthKit !== null;
}

/**
 * Get daily steps for a date
 */
export async function getDailySteps(date: Date = new Date()): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit) {
    console.log('⚠️ HealthKit not available, returning 0 steps');
    return 0;
  }

  return new Promise((resolve) => {
    const options = {
      date: date.toISOString(),
      includeManuallyAdded: true,
    };

    AppleHealthKit.getStepCount(options, (err: any, results: any) => {
      if (err) {
        console.error('❌ Error getting steps:', err);
        resolve(0);
        return;
      }
      resolve(results?.value || 0);
    });
  });
}

/**
 * Get sleep hours for a date  
 */
export async function getDailySleep(date: Date = new Date()): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit) {
    console.log('⚠️ HealthKit not available, returning 0 sleep hours');
    return 0;
  }

  return new Promise((resolve) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getSleepSamples(options, (err: any, results: any[]) => {
      if (err) {
        console.error('❌ Error getting sleep:', err);
        resolve(0);
        return;
      }

      if (!results || results.length === 0) {
        resolve(0);
        return;
      }

      // Sum up all sleep periods (in hours)
      const totalMinutes = results.reduce((sum, sample) => {
        const start = new Date(sample.startDate).getTime();
        const end = new Date(sample.endDate).getTime();
        return sum + (end - start) / (1000 * 60);
      }, 0);

      resolve(totalMinutes / 60);
    });
  });
}

/**
 * Get active calories for a date
 */
export async function getDailyCalories(date: Date = new Date()): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit) {
    console.log('⚠️ HealthKit not available, returning 0 calories');
    return 0;
  }

  return new Promise((resolve) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getActiveEnergyBurned(options, (err: any, results: any) => {
      if (err) {
        console.error('❌ Error getting calories:', err);
        resolve(0);
        return;
      }
      resolve(results?.value || 0);
    });
  });
}

/**
 * Get distance walked/run for a date
 */
export async function getDailyDistance(date: Date = new Date()): Promise<number> {
  const AppleHealthKit = getAppleHealthKit();
  if (!AppleHealthKit) {
    console.log('⚠️ HealthKit not available, returning 0 distance');
    return 0;
  }

  return new Promise((resolve) => {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      unit: 'mile',
    };

    AppleHealthKit.getDistanceWalkingRunning(options, (err: any, results: any) => {
      if (err) {
        console.error('❌ Error getting distance:', err);
        resolve(0);
        return;
      }
      resolve(results?.value || 0);
    });
  });
}

/**
 * Get all daily fitness metrics
 */
export async function getDailyMetrics(date: Date = new Date()): Promise<DailyHealthData> {
  console.log('📊 Getting daily metrics for', date.toLocaleDateString());
  
  const [steps, sleep, calories, distance] = await Promise.all([
    getDailySteps(date),
    getDailySleep(date),
    getDailyCalories(date),
    getDailyDistance(date),
  ]);

  console.log('📊 Results:', { steps, sleep, calories, distance });

  return {
    date: date.toISOString().split('T')[0],
    steps,
    sleepHours: sleep,
    calories,
    distance: distance,
    workouts: 0, // TODO: Implement workout tracking
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
