// ============================================
// CRASH REPORTING SERVICE
// Sends crash reports to Expo/backend without showing errors to users
// ============================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface CrashReport {
  error: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  platform: string;
  version: string;
  buildNumber?: string;
  userId?: string;
  context?: Record<string, any>;
}

// Store crashes locally first (can be sent to backend later)
const CRASH_STORAGE_KEY = 'app_crashes';

/**
 * Report a crash/error without showing it to the user
 */
export async function reportCrash(
  error: Error,
  errorInfo?: { componentStack?: string; [key: string]: any }
): Promise<void> {
  try {
    const crashReport: CrashReport = {
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      version: Constants.expoConfig?.version || 'unknown',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode?.toString() || 'unknown',
      userId: undefined, // Can be set from auth store if needed
      context: {
        executionEnvironment: Constants.executionEnvironment,
        isDevice: Constants.isDevice,
        ...errorInfo,
      },
    };

    // Log to console in development
    if (__DEV__) {
      console.error('🚨 CRASH REPORT:', crashReport);
    }

    // Store crash locally
    await storeCrashLocally(crashReport);

    // Send to Expo/backend (if configured)
    await sendCrashReport(crashReport);
  } catch (reportError) {
    // Don't crash if crash reporting fails
    console.error('Failed to report crash:', reportError);
  }
}

/**
 * Store crash locally for later retrieval
 */
async function storeCrashLocally(crash: CrashReport): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const existingCrashes = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
    const crashes: CrashReport[] = existingCrashes ? JSON.parse(existingCrashes) : [];
    
    // Keep only last 50 crashes
    crashes.push(crash);
    if (crashes.length > 50) {
      crashes.shift();
    }
    
    await AsyncStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(crashes));
  } catch (error) {
    // Ignore storage errors
  }
}

/**
 * Send crash report to backend/Expo
 */
async function sendCrashReport(crash: CrashReport): Promise<void> {
  try {
    // Option 1: Send to your Supabase backend
    const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      // You can create a crashes table in Supabase and send here
      // For now, just log
      console.log('Would send to backend:', crash);
    }

    // Option 2: Send to Expo's error reporting (if using EAS)
    // This requires additional setup with Expo's error reporting service

    // Option 3: Log to console (will show in Expo Go/Metro)
    console.error('📱 CRASH REPORT:', JSON.stringify(crash, null, 2));
  } catch (error) {
    // Don't crash if sending fails
    console.error('Failed to send crash report:', error);
  }
}

/**
 * Get all stored crashes (for debugging)
 */
export async function getStoredCrashes(): Promise<CrashReport[]> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const crashes = await AsyncStorage.getItem(CRASH_STORAGE_KEY);
    return crashes ? JSON.parse(crashes) : [];
  } catch (error) {
    return [];
  }
}

/**
 * Clear stored crashes
 */
export async function clearStoredCrashes(): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem(CRASH_STORAGE_KEY);
  } catch (error) {
    // Ignore
  }
}

/**
 * Set up global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  try {
    // Handle uncaught errors (React Native)
    // Only set up if ErrorUtils exists and is accessible
    if (typeof global !== 'undefined' && global.ErrorUtils && typeof global.ErrorUtils.getGlobalHandler === 'function') {
      try {
        const originalHandler = global.ErrorUtils.getGlobalHandler();
        global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
          try {
            // Report crash
            reportCrash(error, { type: 'uncaughtError', isFatal: isFatal || false }).catch(() => {
              // Ignore if reporting fails
            });
          } catch (reportError) {
            // Don't crash if crash reporting fails
          }
          
          // Call original handler if it exists
          if (originalHandler && typeof originalHandler === 'function') {
            try {
              originalHandler(error, isFatal);
            } catch (handlerError) {
              // Ignore if original handler fails
            }
          }
        });
      } catch (setupError) {
        // Don't crash if handler setup fails
        console.warn('Could not set up ErrorUtils handler:', setupError);
      }
    }

    // Handle unhandled promise rejections (if supported)
    if (typeof global !== 'undefined' && typeof (global as any).onunhandledrejection !== 'undefined') {
      try {
        const originalUnhandledRejection = (global as any).onunhandledrejection;
        (global as any).onunhandledrejection = (event: any) => {
          try {
            if (event && event.reason) {
              const error = event.reason instanceof Error 
                ? event.reason 
                : new Error(String(event.reason));
              reportCrash(error, { type: 'unhandledRejection' }).catch(() => {
                // Ignore if reporting fails
              });
            }
          } catch (reportError) {
            // Don't crash if crash reporting fails
          }
          
          if (originalUnhandledRejection && typeof originalUnhandledRejection === 'function') {
            try {
              originalUnhandledRejection(event);
            } catch (handlerError) {
              // Ignore if original handler fails
            }
          }
        };
      } catch (setupError) {
        // Don't crash if rejection handler setup fails
        console.warn('Could not set up unhandled rejection handler:', setupError);
      }
    }
  } catch (error) {
    // Don't crash if error handler setup fails
    console.warn('Failed to set up global error handlers:', error);
  }
}

