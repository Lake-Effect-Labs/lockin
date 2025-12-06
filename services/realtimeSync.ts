// ============================================
// REAL-TIME SYNC SERVICE
// Lock-In Fitness Competition App
// Near real-time health data synchronization
// ============================================

import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { FitnessMetrics, calculatePoints, aggregateWeeklyMetrics } from './scoring';
import { getDailyHealthData, getCurrentWeekHealthData, isHealthAvailable, DailyHealthData } from './health';
import { upsertWeeklyScore, getUserLeagues, getLeague, getWeeklyScore, getUserMatchup } from './supabase';
import { generateDailyMetrics, generateWeekData } from '@/utils/fakeData';
import { checkMatchupAndNotify, startMatchupMonitoring, stopMatchupMonitoring } from './matchupMonitor';

// ============================================
// CONFIGURATION
// ============================================

export const SYNC_CONFIG = {
  // How often to sync when app is in foreground (ms)
  FOREGROUND_INTERVAL: 5 * 60 * 1000, // 5 minutes
  
  // Minimum time between syncs (ms) - prevents excessive API calls
  MIN_SYNC_INTERVAL: 60 * 1000, // 1 minute
  
  // How often to sync when viewing a matchup (ms)
  MATCHUP_VIEW_INTERVAL: 30 * 1000, // 30 seconds
  
  // Debounce time for rapid syncs (ms)
  DEBOUNCE_TIME: 5 * 1000, // 5 seconds
};

// ============================================
// STATE
// ============================================

interface SyncState {
  lastSyncTime: number;
  isSyncing: boolean;
  syncInterval: NodeJS.Timeout | null;
  appStateSubscription: any;
  realtimeSubscription: any;
  listeners: Set<(data: SyncUpdate) => void>;
}

export interface SyncUpdate {
  type: 'local' | 'remote' | 'both';
  userId: string;
  leagueId?: string;
  weeklyTotals: FitnessMetrics;
  weeklyPoints: number;
  timestamp: string;
}

const state: SyncState = {
  lastSyncTime: 0,
  isSyncing: false,
  syncInterval: null,
  appStateSubscription: null,
  realtimeSubscription: null,
  listeners: new Set(),
};

// ============================================
// SYNC MANAGER
// ============================================

/**
 * Initialize the real-time sync system
 */
export function initializeRealtimeSync(userId: string, useFakeData: boolean = false): void {
  console.log('🔄 Initializing real-time sync system...');
  
  // Clean up any existing subscriptions
  cleanupRealtimeSync();
  
  // Start foreground sync interval
  startForegroundSync(userId, useFakeData);
  
  // Listen for app state changes
  state.appStateSubscription = AppState.addEventListener(
    'change',
    (nextState: AppStateStatus) => handleAppStateChange(nextState, userId, useFakeData)
  );
  
  // Subscribe to real-time score updates from Supabase
  subscribeToScoreUpdates(userId);
  
  // Start matchup monitoring for lead change notifications
  startMatchupMonitoring(userId, async (data) => {
    // When opponent updates their score, check for lead changes
    await checkLeadChanges(userId, data);
  });
  
  // Do an immediate sync
  syncNow(userId, useFakeData);
  
  console.log('✅ Real-time sync initialized');
}

/**
 * Clean up sync subscriptions
 */
export function cleanupRealtimeSync(): void {
  if (state.syncInterval) {
    clearInterval(state.syncInterval);
    state.syncInterval = null;
  }
  
  if (state.appStateSubscription) {
    state.appStateSubscription.remove();
    state.appStateSubscription = null;
  }
  
  if (state.realtimeSubscription) {
    supabase.removeChannel(state.realtimeSubscription);
    state.realtimeSubscription = null;
  }
  
  // Stop matchup monitoring
  stopMatchupMonitoring();
  
  state.listeners.clear();
}

/**
 * Start foreground sync interval
 */
function startForegroundSync(userId: string, useFakeData: boolean): void {
  if (state.syncInterval) {
    clearInterval(state.syncInterval);
  }
  
  state.syncInterval = setInterval(() => {
    syncNow(userId, useFakeData);
  }, SYNC_CONFIG.FOREGROUND_INTERVAL);
}

/**
 * Handle app state changes (foreground/background)
 */
function handleAppStateChange(
  nextState: AppStateStatus, 
  userId: string, 
  useFakeData: boolean
): void {
  if (nextState === 'active') {
    // App came to foreground - sync immediately
    console.log('📱 App active - syncing...');
    syncNow(userId, useFakeData);
    startForegroundSync(userId, useFakeData);
  } else if (nextState === 'background') {
    // App went to background - stop interval (iOS will kill it anyway)
    if (state.syncInterval) {
      clearInterval(state.syncInterval);
      state.syncInterval = null;
    }
  }
}

/**
 * Subscribe to real-time score updates from other players
 */
function subscribeToScoreUpdates(userId: string): void {
  // Subscribe to weekly_scores table changes
  state.realtimeSubscription = supabase
    .channel('weekly_scores_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'weekly_scores',
      },
      (payload) => {
        console.log('📡 Real-time score update:', payload);
        
        // Notify listeners of remote update
        if (payload.new && (payload.new as any).user_id !== userId) {
          const data = payload.new as any;
          notifyListeners({
            type: 'remote',
            userId: data.user_id,
            leagueId: data.league_id,
            weeklyTotals: {
              steps: data.steps,
              sleepHours: data.sleep_hours,
              calories: data.calories,
              workouts: data.workouts,
              distance: data.distance,
            },
            weeklyPoints: data.total_points,
            timestamp: new Date().toISOString(),
          });
        }
      }
    )
    .subscribe();
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Perform a sync now (with debouncing)
 */
export async function syncNow(
  userId: string, 
  useFakeData: boolean = false,
  force: boolean = false
): Promise<SyncUpdate | null> {
  // Check if we should sync (debounce)
  const now = Date.now();
  if (!force && state.isSyncing) {
    console.log('⏳ Sync already in progress, skipping...');
    return null;
  }
  
  if (!force && now - state.lastSyncTime < SYNC_CONFIG.MIN_SYNC_INTERVAL) {
    console.log('⏳ Too soon since last sync, skipping...');
    return null;
  }
  
  state.isSyncing = true;
  state.lastSyncTime = now;
  
  try {
    console.log('🔄 Syncing health data...');
    
    // Get health data
    let weekData: DailyHealthData[];
    
    if (useFakeData || !isHealthAvailable()) {
      weekData = generateWeekData();
    } else {
      weekData = await getCurrentWeekHealthData();
    }
    
    // Calculate totals
    const weeklyTotals = aggregateWeeklyMetrics(weekData);
    const weeklyPoints = calculatePoints(weeklyTotals);
    
    // Sync to all leagues
    await syncToAllLeagues(userId, weeklyTotals);
    
    // Create update object
    const update: SyncUpdate = {
      type: 'local',
      userId,
      weeklyTotals,
      weeklyPoints,
      timestamp: new Date().toISOString(),
    };
    
    // Notify listeners
    notifyListeners(update);
    
    // Store last sync time
    await AsyncStorage.setItem('last_sync_time', update.timestamp);
    
    console.log('✅ Sync complete:', weeklyPoints, 'points');
    return update;
  } catch (error) {
    console.error('❌ Sync error:', error);
    return null;
  } finally {
    state.isSyncing = false;
  }
}

/**
 * Sync to all user's leagues
 */
async function syncToAllLeagues(userId: string, metrics: FitnessMetrics): Promise<void> {
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
      
      let weekMetrics = metrics; // Default to aggregated metrics
      
      // If we can get league-specific data, use it
      if (weekRange.start <= today) {
        try {
          const weekData = await getHealthDataRange(weekRange.start, weekEnd);
          if (weekData.length > 0) {
            const { aggregateWeeklyMetrics } = await import('./scoring');
            weekMetrics = aggregateWeeklyMetrics(weekData);
          }
        } catch (error) {
          console.warn(`Could not get league-specific health data for league ${league.id}, using aggregated metrics`);
        }
      }
      
      await upsertWeeklyScore(
        league.id,
        userId,
        fullLeague.current_week,
        {
          steps: weekMetrics.steps,
          sleep_hours: weekMetrics.sleepHours,
          calories: weekMetrics.calories,
          workouts: weekMetrics.workouts,
          distance: weekMetrics.distance,
        }
      );
    }
  } catch (error) {
    console.error('Error syncing to leagues:', error);
    // Don't throw - we want to continue syncing to other leagues
  }
}

// ============================================
// LISTENER MANAGEMENT
// ============================================

/**
 * Subscribe to sync updates
 */
export function onSyncUpdate(callback: (data: SyncUpdate) => void): () => void {
  state.listeners.add(callback);
  return () => state.listeners.delete(callback);
}

/**
 * Notify all listeners of an update
 */
function notifyListeners(update: SyncUpdate): void {
  state.listeners.forEach(listener => {
    try {
      listener(update);
    } catch (error) {
      console.error('Listener error:', error);
    }
  });
}

// ============================================
// MATCHUP VIEW OPTIMIZATION
// ============================================

let matchupInterval: NodeJS.Timeout | null = null;

/**
 * Start rapid sync for matchup view (more frequent updates)
 */
export function startMatchupViewSync(userId: string, useFakeData: boolean): void {
  console.log('🎯 Starting matchup view sync (30s interval)');
  
  // Clear existing matchup interval
  if (matchupInterval) {
    clearInterval(matchupInterval);
  }
  
  // Sync immediately
  syncNow(userId, useFakeData);
  
  // Start rapid sync
  matchupInterval = setInterval(() => {
    syncNow(userId, useFakeData);
  }, SYNC_CONFIG.MATCHUP_VIEW_INTERVAL);
}

/**
 * Stop rapid sync when leaving matchup view
 */
export function stopMatchupViewSync(): void {
  console.log('🛑 Stopping matchup view sync');
  
  if (matchupInterval) {
    clearInterval(matchupInterval);
    matchupInterval = null;
  }
}

// ============================================
// MANUAL SYNC TRIGGER
// ============================================

/**
 * Force an immediate sync (for pull-to-refresh)
 */
export async function forceSync(userId: string, useFakeData: boolean): Promise<SyncUpdate | null> {
  return syncNow(userId, useFakeData, true);
}

// ============================================
// STATUS HELPERS
// ============================================

/**
 * Get sync status
 */
export function getSyncStatus(): {
  isSyncing: boolean;
  lastSyncTime: number;
  timeSinceLastSync: number;
} {
  return {
    isSyncing: state.isSyncing,
    lastSyncTime: state.lastSyncTime,
    timeSinceLastSync: Date.now() - state.lastSyncTime,
  };
}

/**
 * Check if sync is needed
 */
export function isSyncNeeded(): boolean {
  return Date.now() - state.lastSyncTime > SYNC_CONFIG.FOREGROUND_INTERVAL;
}

/**
 * Format last sync time for display
 */
export function formatLastSyncTime(): string {
  if (state.lastSyncTime === 0) return 'Never';
  
  const seconds = Math.floor((Date.now() - state.lastSyncTime) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
}

// ============================================
// LEAD CHANGE DETECTION
// ============================================

/**
 * Check for lead changes when opponent updates their score
 */
async function checkLeadChanges(userId: string, opponentData: any): Promise<void> {
  try {
    const leagueId = opponentData?.league_id;
    const week = opponentData?.week;
    const opponentId = opponentData?.user_id;
    
    // Validate required fields
    if (!leagueId || !week || !opponentId) {
      console.log('⚠️ Missing required fields in opponentData, skipping lead check');
      return;
    }
    
    // Get user's current score for this league/week
    const userScore = await getWeeklyScore(leagueId, userId, week);
    if (!userScore) return;
    
    // Get the matchup to confirm this is the user's opponent
    const matchup = await getUserMatchup(leagueId, userId, week);
    if (!matchup) return;
    
    // Check if the opponent in the data is actually the user's opponent
    const isOpponent = 
      (matchup.player1_id === userId && matchup.player2_id === opponentId) ||
      (matchup.player2_id === userId && matchup.player1_id === opponentId);
    
    if (!isOpponent) return;
    
    // Get opponent name (would need to fetch from profiles in real implementation)
    const opponentName = 'Your opponent'; // Simplified for now
    
    // Check for lead changes and notify
    await checkMatchupAndNotify(
      matchup.id,
      leagueId,
      week,
      userId,
      userScore.total_points,
      opponentId,
      opponentData.total_points,
      opponentName
    );
  } catch (error) {
    console.error('Error checking lead changes:', error);
  }
}

