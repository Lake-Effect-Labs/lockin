// ============================================
// HEALTH INTEGRATION TEST
// Validates Apple HealthKit & Health Connect
// ============================================

import { Platform } from 'react-native';
import {
  initializeHealth,
  checkHealthPermissions,
  getDailyHealthData,
  getCurrentWeekHealthData,
  isHealthAvailable,
  HealthPermissions,
  DailyHealthData,
} from './health';

export interface HealthTestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

export interface HealthTestSuite {
  platform: string;
  isAvailable: boolean;
  results: HealthTestResult[];
  summary: string;
}

/**
 * Run comprehensive health integration tests
 */
export async function runHealthIntegrationTests(): Promise<HealthTestSuite> {
  const results: HealthTestResult[] = [];
  const platform = Platform.OS;
  
  console.log(`\n🧪 Running Health Integration Tests on ${platform}...\n`);
  
  // Test 1: Platform availability check
  const available = isHealthAvailable();
  results.push({
    name: 'Platform Availability',
    passed: platform === 'web' ? !available : available,
    message: available 
      ? `Health data available on ${platform}` 
      : `Health data not available on ${platform} (expected for web)`,
  });
  
  if (!available) {
    return {
      platform,
      isAvailable: false,
      results,
      summary: `Health not available on ${platform}. Tests skipped.`,
    };
  }
  
  // Test 2: Initialize health
  let initialized = false;
  try {
    initialized = await initializeHealth();
    results.push({
      name: 'Health Initialization',
      passed: initialized,
      message: initialized 
        ? 'Health SDK initialized successfully' 
        : 'Failed to initialize health SDK (permissions may not be granted)',
    });
  } catch (error: any) {
    results.push({
      name: 'Health Initialization',
      passed: false,
      message: `Error: ${error.message}`,
    });
  }
  
  if (!initialized) {
    return {
      platform,
      isAvailable: true,
      results,
      summary: 'Health initialization failed. Ensure permissions are granted.',
    };
  }
  
  // Test 3: Check permissions
  let permissions: HealthPermissions | null = null;
  try {
    permissions = await checkHealthPermissions();
    const allGranted = Object.values(permissions).every(v => v);
    results.push({
      name: 'Permission Check',
      passed: true,
      message: allGranted 
        ? 'All permissions granted' 
        : `Partial permissions: ${JSON.stringify(permissions)}`,
      data: permissions,
    });
  } catch (error: any) {
    results.push({
      name: 'Permission Check',
      passed: false,
      message: `Error: ${error.message}`,
    });
  }
  
  // Test 4: Get today's data
  try {
    const today = new Date();
    const todayData = await getDailyHealthData(today);
    
    const hasData = todayData.steps > 0 || todayData.calories > 0 || todayData.sleepHours > 0;
    results.push({
      name: 'Get Today\'s Data',
      passed: true,
      message: hasData 
        ? `Data retrieved: ${todayData.steps} steps, ${todayData.calories} cal, ${todayData.sleepHours}h sleep`
        : 'No data for today (this is normal if you haven\'t synced yet)',
      data: todayData,
    });
  } catch (error: any) {
    results.push({
      name: 'Get Today\'s Data',
      passed: false,
      message: `Error: ${error.message}`,
    });
  }
  
  // Test 5: Get weekly data
  try {
    const weekData = await getCurrentWeekHealthData();
    
    const totalSteps = weekData.reduce((sum, day) => sum + day.steps, 0);
    results.push({
      name: 'Get Weekly Data',
      passed: weekData.length > 0,
      message: `Retrieved ${weekData.length} days of data. Total steps: ${totalSteps}`,
      data: { daysCount: weekData.length, totalSteps },
    });
  } catch (error: any) {
    results.push({
      name: 'Get Weekly Data',
      passed: false,
      message: `Error: ${error.message}`,
    });
  }
  
  // Test 6: Data validity check
  try {
    const testData = await getDailyHealthData(new Date());
    const validations = [
      { field: 'steps', valid: testData.steps >= 0 && !isNaN(testData.steps) },
      { field: 'sleepHours', valid: testData.sleepHours >= 0 && testData.sleepHours <= 24 },
      { field: 'calories', valid: testData.calories >= 0 && !isNaN(testData.calories) },
      { field: 'workouts', valid: testData.workouts >= 0 && Number.isInteger(testData.workouts) },
      { field: 'distance', valid: testData.distance >= 0 && !isNaN(testData.distance) },
    ];
    
    const allValid = validations.every(v => v.valid);
    const invalidFields = validations.filter(v => !v.valid).map(v => v.field);
    
    results.push({
      name: 'Data Validity',
      passed: allValid,
      message: allValid 
        ? 'All data fields are valid' 
        : `Invalid fields: ${invalidFields.join(', ')}`,
      data: testData,
    });
  } catch (error: any) {
    results.push({
      name: 'Data Validity',
      passed: false,
      message: `Error: ${error.message}`,
    });
  }
  
  // Generate summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const summary = `${passed}/${total} tests passed on ${platform}`;
  
  console.log(`\n📊 ${summary}\n`);
  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}: ${r.message}`);
  });
  
  return {
    platform,
    isAvailable: true,
    results,
    summary,
  };
}

/**
 * Quick health check - returns true if health data can be read
 */
export async function quickHealthCheck(): Promise<{
  available: boolean;
  initialized: boolean;
  canReadData: boolean;
  error?: string;
}> {
  try {
    const available = isHealthAvailable();
    if (!available) {
      return { available: false, initialized: false, canReadData: false };
    }
    
    const initialized = await initializeHealth();
    if (!initialized) {
      return { available: true, initialized: false, canReadData: false };
    }
    
    const data = await getDailyHealthData(new Date());
    const canReadData = data !== null;
    
    return { available: true, initialized: true, canReadData };
  } catch (error: any) {
    return {
      available: isHealthAvailable(),
      initialized: false,
      canReadData: false,
      error: error.message,
    };
  }
}

/**
 * Get diagnostic info about health integration
 */
export function getHealthDiagnostics(): {
  platform: string;
  isHealthAvailable: boolean;
  requiredPackages: { name: string; required: boolean }[];
  requiredPermissions: string[];
} {
  const platform = Platform.OS;
  
  if (platform === 'ios') {
    return {
      platform,
      isHealthAvailable: isHealthAvailable(),
      requiredPackages: [
        { name: '@kingstinct/react-native-healthkit', required: true },
        { name: 'react-native-nitro-modules', required: true },
      ],
      requiredPermissions: [
        'NSHealthShareUsageDescription (Info.plist)',
        'NSHealthUpdateUsageDescription (Info.plist)',
        'com.apple.developer.healthkit (entitlement)',
        'com.apple.developer.healthkit.background-delivery (entitlement)',
      ],
    };
  }
  
  if (platform === 'android') {
    return {
      platform,
      isHealthAvailable: isHealthAvailable(),
      requiredPackages: [
        { name: 'expo-health-connect', required: true },
      ],
      requiredPermissions: [
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_SLEEP',
        'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
        'android.permission.health.READ_DISTANCE',
        'android.permission.health.READ_EXERCISE',
      ],
    };
  }
  
  return {
    platform,
    isHealthAvailable: false,
    requiredPackages: [],
    requiredPermissions: [],
  };
}

