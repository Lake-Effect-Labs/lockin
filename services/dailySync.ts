// ============================================
// DAILY SYNC SERVICE
// Lock-In Fitness Competition App
// Handles daily health data accumulation
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FitnessMetrics, aggregateWeeklyMetrics, calculatePoints } from './scoring';
import { DailyHealthData, getDailyHealthData, isHealthAvailable } from './health';
import { upsertWeeklyScore, getUserLeagues, getLeague } from './supabase';
import { generateDailyMetrics } from '@/utils/fakeData';

// ============================================
// CONSTANTS
// ============================================

const DAILY_DATA_KEY = 'lockin_daily_data';
const LAST_SYNC_KEY = 'lockin_last_sync';

// ============================================
// TYPES
// ============================================

export interface DailySyncData {
  date: string;
  metrics: FitnessMetrics;
  synced: boolean;
}

export interface WeeklySyncStatus {
  weekNumber: number;
  daysLogged: number;
  totalMetrics: FitnessMetrics;
  totalPoints: number;
  lastSyncedAt: string | null;
}

// ============================================
// DAILY DATA STORAGE
// ============================================

/**
 * Get stored daily data for the current week
 */
export async function getStoredDailyData(): Promise<DailySyncData[]> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_DATA_KEY);
    if (!raw) return [];
    
    const data: DailySyncData[] = JSON.parse(raw);
    
    // Filter to current week only
    const weekStart = getWeekStart();
    return data.filter(d => new Date(d.date) >= weekStart);
  } catch (error) {
    console.error('Error getting stored daily data:', error);
    return [];
  }
}

/**
 * Store daily data
 */
export async function storeDailyData(date: string, metrics: FitnessMetrics): Promise<void> {
  try {
    const existing = await getStoredDailyData();
    
    // Update or add entry
    const index = existing.findIndex(d => d.date === date);
    if (index >= 0) {
      existing[index] = { date, metrics, synced: false };
    } else {
      existing.push({ date, metrics, synced: false });
    }
    
    await AsyncStorage.setItem(DAILY_DATA_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error('Error storing daily data:', error);
  }
}

/**
 * Mark daily data as synced
 */
export async function markDailyDataSynced(dates: string[]): Promise<void> {
  try {
    const existing = await getStoredDailyData();
    const updated = existing.map(d => ({
      ...d,
      synced: dates.includes(d.date) ? true : d.synced,
    }));
    await AsyncStorage.setItem(DAILY_DATA_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking data synced:', error);
  }
}

// ============================================
// SYNC FUNCTIONS
// ============================================

/**
 * Sync today's health data
 */
export async function syncTodayHealthData(useFakeData: boolean = false): Promise<DailyHealthData | null> {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  
  try {
    let metrics: FitnessMetrics;
    
    if (useFakeData || !isHealthAvailable()) {
      metrics = generateDailyMetrics(today.getTime());
    } else {
      const healthData = await getDailyHealthData(today);
      metrics = {
        steps: healthData.steps,
        sleepHours: healthData.sleepHours,
        calories: healthData.calories,
        workouts: healthData.workouts,
        distance: healthData.distance,
      };
    }
    
    // Handle null/undefined values
    metrics = sanitizeMetrics(metrics);
    
    // Store locally
    await storeDailyData(dateString, metrics);
    
    // Update last sync time
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    
    return {
      date: dateString,
      ...metrics,
    };
  } catch (error) {
    console.error('Error syncing today\'s health data:', error);
    return null;
  }
}

/**
 * Sync weekly totals to all user's leagues
 */
export async function syncWeeklyToLeagues(userId: string): Promise<void> {
  try {
    const dailyData = await getStoredDailyData();
    if (dailyData.length === 0) return;
    
    // Aggregate weekly totals
    const weeklyMetrics = aggregateWeeklyMetrics(dailyData.map(d => d.metrics));
    
    // Get user's leagues
    const leagues = await getUserLeagues(userId);
    
    // Sync to each active league
    for (const league of leagues) {
      if (!league.is_active) continue;
      
      const fullLeague = await getLeague(league.id);
      if (!fullLeague) continue;
      
      await upsertWeeklyScore(
        league.id,
        userId,
        fullLeague.current_week,
        {
          steps: weeklyMetrics.steps,
          sleep_hours: weeklyMetrics.sleepHours,
          calories: weeklyMetrics.calories,
          workouts: weeklyMetrics.workouts,
          distance: weeklyMetrics.distance,
        }
      );
    }
    
    // Mark as synced
    await markDailyDataSynced(dailyData.map(d => d.date));
  } catch (error) {
    console.error('Error syncing weekly to leagues:', error);
  }
}

/**
 * Get weekly sync status
 */
export async function getWeeklySyncStatus(): Promise<WeeklySyncStatus> {
  const dailyData = await getStoredDailyData();
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
  
  const weeklyMetrics = dailyData.length > 0
    ? aggregateWeeklyMetrics(dailyData.map(d => d.metrics))
    : { steps: 0, sleepHours: 0, calories: 0, workouts: 0, distance: 0 };
  
  return {
    weekNumber: getCurrentWeekNumber(),
    daysLogged: dailyData.length,
    totalMetrics: weeklyMetrics,
    totalPoints: calculatePoints(weeklyMetrics),
    lastSyncedAt: lastSync,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

/**
 * Sanitize metrics to handle null/undefined/NaN values
 */
function sanitizeMetrics(metrics: Partial<FitnessMetrics>): FitnessMetrics {
  return {
    steps: Math.max(0, Number(metrics.steps) || 0),
    sleepHours: Math.max(0, Math.min(24, Number(metrics.sleepHours) || 0)),
    calories: Math.max(0, Number(metrics.calories) || 0),
    workouts: Math.max(0, Math.floor(Number(metrics.workouts) || 0)),
    distance: Math.max(0, Number(metrics.distance) || 0),
  };
}

/**
 * Clear old daily data (older than 2 weeks)
 */
export async function cleanupOldData(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_DATA_KEY);
    if (!raw) return;
    
    const data: DailySyncData[] = JSON.parse(raw);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const filtered = data.filter(d => new Date(d.date) >= twoWeeksAgo);
    await AsyncStorage.setItem(DAILY_DATA_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error cleaning up old data:', error);
  }
}

