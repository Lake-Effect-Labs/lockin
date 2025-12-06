// ============================================
// BACKGROUND SYNC SERVICE
// Lock-In Fitness Competition App
// Syncs health data when app is in background/closed
// ============================================

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getCurrentWeekHealthData, isHealthAvailable, DailyHealthData } from './health';
import { aggregateWeeklyMetrics, calculatePoints, FitnessMetrics } from './scoring';
import { upsertWeeklyScore, getUserLeagues, getLeague, getWeeklyScore } from './supabase';
import { generateWeekData } from '@/utils/fakeData';
import { sendLocalNotification } from './notifications';

// Check if we're in Expo Go (background fetch doesn't work in Expo Go)
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// ============================================
// CONSTANTS
// ============================================

const BACKGROUND_SYNC_TASK = 'LOCKIN_BACKGROUND_SYNC';
const LAST_BACKGROUND_SYNC_KEY = 'lockin_last_background_sync';
const CACHED_USER_ID_KEY = 'lockin_cached_user_id';
const FAKE_MODE_KEY = 'lockin_fake_mode';

// ============================================
// TASK DEFINITION
// ============================================

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  console.log('🔄 [Background] Running sync task...');
  
  try {
    const result = await performBackgroundSync();
    
    if (result.success) {
      console.log('✅ [Background] Sync completed:', result.points, 'points');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } else {
      console.log('⚠️ [Background] Sync skipped:', result.reason);
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
  } catch (error) {
    console.error('❌ [Background] Sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ============================================
// BACKGROUND SYNC LOGIC
// ============================================

interface BackgroundSyncResult {
  success: boolean;
  reason?: string;
  points?: number;
  leaguesSynced?: number;
}

/**
 * Perform the actual background sync
 */
async function performBackgroundSync(): Promise<BackgroundSyncResult> {
  // Get cached user ID
  const userId = await AsyncStorage.getItem(CACHED_USER_ID_KEY);
  if (!userId) {
    return { success: false, reason: 'No user ID cached' };
  }
  
  // Check fake mode
  const fakeMode = (await AsyncStorage.getItem(FAKE_MODE_KEY)) === 'true';
  
  // Get health data
  let weekData: DailyHealthData[];
  
  if (fakeMode || !isHealthAvailable()) {
    weekData = generateWeekData();
  } else {
    try {
      weekData = await getCurrentWeekHealthData();
    } catch (error) {
      console.error('[Background] Health data fetch failed:', error);
      return { success: false, reason: 'Health data unavailable' };
    }
  }
  
  if (weekData.length === 0) {
    return { success: false, reason: 'No health data' };
  }
  
  // Calculate totals
  const weeklyMetrics = aggregateWeeklyMetrics(weekData);
  const weeklyPoints = calculatePoints(weeklyMetrics);
  
  // Get user's leagues and sync
  let leaguesSynced = 0;
  
  try {
    const leagues = await getUserLeagues(userId);
    
    for (const league of leagues) {
      if (!league.is_active) continue;
      
      const fullLeague = await getLeague(league.id);
      if (!fullLeague || !fullLeague.start_date) continue; // Skip leagues that haven't started
      
      // Get league-specific week date range
      const { getWeekDateRange } = await import('./league');
      const weekRange = getWeekDateRange(fullLeague.start_date, fullLeague.current_week);
      
      // Get health data for this specific league week (not calendar week!)
      const { getHealthDataRange } = await import('./health');
      const today = new Date();
      const weekEnd = weekRange.end > today ? today : weekRange.end; // Don't fetch future dates
      
      let leagueMetrics = weeklyMetrics; // Default to aggregated metrics
      
      // If we can get league-specific data, use it
      if (weekRange.start <= today) {
        try {
          const weekData = await getHealthDataRange(weekRange.start, weekEnd);
          if (weekData.length > 0) {
            const { aggregateWeeklyMetrics } = await import('./scoring');
            leagueMetrics = aggregateWeeklyMetrics(weekData);
          }
        } catch (error) {
          // Use aggregated metrics if league-specific fetch fails
        }
      }
      
      await upsertWeeklyScore(
        league.id,
        userId,
        fullLeague.current_week,
        {
          steps: leagueMetrics.steps,
          sleep_hours: leagueMetrics.sleepHours,
          calories: leagueMetrics.calories,
          workouts: leagueMetrics.workouts,
          distance: leagueMetrics.distance,
        }
      );
      
      leaguesSynced++;
    }
  } catch (error) {
    console.error('[Background] League sync failed:', error);
    return { success: false, reason: 'League sync failed' };
  }
  
  // Update last sync time
  await AsyncStorage.setItem(LAST_BACKGROUND_SYNC_KEY, new Date().toISOString());
  
  return {
    success: true,
    points: weeklyPoints,
    leaguesSynced,
  };
}

// ============================================
// REGISTRATION
// ============================================

/**
 * Register background sync task
 */
export async function registerBackgroundSync(userId: string, fakeMode: boolean = false): Promise<boolean> {
  // Skip in Expo Go - background fetch requires development build
  if (isExpoGo) {
    return false;
  }
  
  try {
    // Check if background fetch is available first
    const status = await BackgroundFetch.getStatusAsync();
    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      // Not available - silently return false
      return false;
    }
    
    // Cache user ID for background task
    await AsyncStorage.setItem(CACHED_USER_ID_KEY, userId);
    await AsyncStorage.setItem(FAKE_MODE_KEY, fakeMode ? 'true' : 'false');
    
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      console.log('✅ Background sync already registered');
      return true;
    }
    
    // Register background fetch
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,   // Continue after app is closed
      startOnBoot: true,        // Start on device boot (iOS)
    });
    
    console.log('✅ Background sync registered');
    return true;
  } catch (error: any) {
    // Silently fail - background fetch is not available in Expo Go
    // Only log in development, don't show errors to users
    if (__DEV__) {
      console.log('⚠️ Background sync not available (expected in Expo Go)');
    }
    return false;
  }
}

/**
 * Unregister background sync task
 */
export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('✅ Background sync unregistered');
    }
    
    // Clear cached data
    await AsyncStorage.removeItem(CACHED_USER_ID_KEY);
  } catch (error) {
    console.error('❌ Failed to unregister background sync:', error);
  }
}

/**
 * Check if background sync is available
 */
export async function isBackgroundSyncAvailable(): Promise<{
  available: boolean;
  status: BackgroundFetch.BackgroundFetchStatus | null;
}> {
  // Not available in Expo Go
  if (isExpoGo) {
    return {
      available: false,
      status: null,
    };
  }
  
  try {
    const status = await BackgroundFetch.getStatusAsync();
    return {
      available: status === BackgroundFetch.BackgroundFetchStatus.Available,
      status,
    };
  } catch (error) {
    // Background fetch not available
    return {
      available: false,
      status: null,
    };
  }
}

/**
 * Get background sync status description
 */
export function getBackgroundSyncStatusText(status: BackgroundFetch.BackgroundFetchStatus | null): string {
  if (status === null) return 'Unknown';
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied - Enable in Settings';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted by system';
    default:
      return 'Unknown';
  }
}

/**
 * Get last background sync time
 */
export async function getLastBackgroundSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_BACKGROUND_SYNC_KEY);
}

/**
 * Check if background sync is registered
 */
export async function isBackgroundSyncRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
}

// ============================================
// MANUAL TRIGGER (for testing)
// ============================================

/**
 * Manually trigger a background sync (for testing)
 */
export async function triggerBackgroundSync(): Promise<BackgroundSyncResult> {
  console.log('🧪 Manually triggering background sync...');
  return performBackgroundSync();
}

