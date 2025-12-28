// ============================================
// CRASH DIAGNOSTICS
// Check for common crash sources beyond ads
// ============================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getStoredCrashes } from './crashReporting';

export interface CrashDiagnostic {
  category: string;
  check: string;
  status: 'safe' | 'warning' | 'danger';
  message: string;
  details?: any;
}

/**
 * Run comprehensive crash diagnostics
 */
export async function runCrashDiagnostics(): Promise<CrashDiagnostic[]> {
  const diagnostics: CrashDiagnostic[] = [];

  // 1. Check AdMob
  try {
    const { validateAdMobAvailability } = require('./ads');
    const admobCheck = validateAdMobAvailability();
    diagnostics.push({
      category: 'AdMob',
      check: 'Module Availability',
      status: admobCheck.available ? 'safe' : 'warning',
      message: admobCheck.available 
        ? 'AdMob is properly configured'
        : `AdMob issue: ${admobCheck.reason}`,
      details: admobCheck.checks,
    });
  } catch (error) {
    diagnostics.push({
      category: 'AdMob',
      check: 'Module Availability',
      status: 'danger',
      message: `Error checking AdMob: ${error}`,
    });
  }

  // 2. Check HealthKit
  try {
    const { getHealthDiagnostics } = require('./health');
    const healthCheck = await getHealthDiagnostics();
    diagnostics.push({
      category: 'HealthKit',
      check: 'Module Loading',
      status: healthCheck.moduleLoaded ? 'safe' : 'warning',
      message: healthCheck.moduleLoaded
        ? 'HealthKit module is loaded'
        : 'HealthKit module not loaded (expected in Expo Go)',
      details: {
        moduleLoaded: healthCheck.moduleLoaded,
        deviceSupported: healthCheck.deviceSupported,
        isExpoGo: healthCheck.isExpoGo,
      },
    });
  } catch (error) {
    diagnostics.push({
      category: 'HealthKit',
      check: 'Module Loading',
      status: 'danger',
      message: `Error checking HealthKit: ${error}`,
    });
  }

  // 3. Check Supabase connection
  try {
    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    diagnostics.push({
      category: 'Supabase',
      check: 'Configuration',
      status: supabaseUrl ? 'safe' : 'warning',
      message: supabaseUrl
        ? 'Supabase URL is configured'
        : 'Supabase URL not configured',
      details: { hasUrl: !!supabaseUrl },
    });
  } catch (error) {
    diagnostics.push({
      category: 'Supabase',
      check: 'Configuration',
      status: 'danger',
      message: `Error checking Supabase: ${error}`,
    });
  }

  // 4. Check native modules
  try {
    let hasKingstinctHealthKit = false;
    let hasNitroModules = false;
    let hasGoogleMobileAds = false;

    try {
      require('@kingstinct/react-native-healthkit');
      hasKingstinctHealthKit = true;
    } catch {
      hasKingstinctHealthKit = false;
    }

    try {
      require('react-native-nitro-modules');
      hasNitroModules = true;
    } catch {
      hasNitroModules = false;
    }

    try {
      require('react-native-google-mobile-ads');
      hasGoogleMobileAds = true;
    } catch {
      hasGoogleMobileAds = false;
    }

    diagnostics.push({
      category: 'Native Modules',
      check: 'Module Loading',
      status: hasKingstinctHealthKit && hasNitroModules ? 'safe' : 'warning',
      message: hasKingstinctHealthKit && hasNitroModules
        ? 'Native modules check passed'
        : 'Some native modules not loaded (may be expected in Expo Go)',
      details: {
        kingstinctHealthKit: hasKingstinctHealthKit,
        nitroModules: hasNitroModules,
        googleMobileAds: hasGoogleMobileAds,
      },
    });
  } catch (error: any) {
    diagnostics.push({
      category: 'Native Modules',
      check: 'Module Loading',
      status: 'warning',
      message: `Error checking native modules: ${error.message}`,
      details: { error: error.message },
    });
  }

  // 5. Check stored crashes
  try {
    const crashes = await getStoredCrashes();
    const recentCrashes = crashes.filter(
      (crash) => new Date(crash.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    diagnostics.push({
      category: 'Crash History',
      check: 'Recent Crashes',
      status: recentCrashes.length > 0 ? 'warning' : 'safe',
      message: recentCrashes.length > 0
        ? `${recentCrashes.length} crash(es) in last 24 hours`
        : 'No crashes in last 24 hours',
      details: {
        totalCrashes: crashes.length,
        recentCrashes: recentCrashes.length,
        latestCrash: crashes.length > 0 ? crashes[crashes.length - 1] : null,
      },
    });
  } catch (error) {
    diagnostics.push({
      category: 'Crash History',
      check: 'Recent Crashes',
      status: 'warning',
      message: `Error checking crash history: ${error}`,
    });
  }

  // 6. Check environment
  diagnostics.push({
    category: 'Environment',
    check: 'Build Type',
    status: 'safe',
    message: `Running in ${Constants.executionEnvironment}`,
    details: {
      executionEnvironment: Constants.executionEnvironment,
      isDevice: Constants.isDevice,
      platform: Platform.OS,
      version: Constants.expoConfig?.version,
    },
  });

  return diagnostics;
}

