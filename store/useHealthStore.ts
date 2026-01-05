import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  initializeHealth,
  checkHealthPermissions,
  getDailyHealthData,
  getCurrentWeekHealthData,
  isHealthAvailable,
  HealthPermissions,
  DailyHealthData,
} from '@/services/health';
import { FitnessMetrics, calculatePoints, aggregateWeeklyMetrics } from '@/services/scoring';
import { generateDailyMetrics, generateWeekData } from '@/utils/fakeData';
import { 
  syncTodayHealthData, 
  syncWeeklyToLeagues, 
  getWeeklySyncStatus,
  cleanupOldData,
} from '@/services/dailySync';

// ============================================
// HEALTH STORE
// Health data and fake data mode management
// ============================================

interface HealthState {
  // State
  isInitialized: boolean;
  isAvailable: boolean;
  permissions: HealthPermissions;
  todayData: DailyHealthData | null;
  weekData: DailyHealthData[];
  weeklyTotals: FitnessMetrics | null;
  weeklyPoints: number;
  lastSyncedAt: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Fake data mode
  fakeMode: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  recheckPermissions: () => Promise<void>;
  syncTodayData: () => Promise<DailyHealthData | null>;
  syncWeekData: () => Promise<DailyHealthData[]>;
  syncToLeagues: (userId: string) => Promise<void>;
  setFakeMode: (enabled: boolean) => void;
  clearData: () => void;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      isAvailable: false,
      permissions: {
        steps: false,
        sleep: false,
        calories: false,
        workouts: false,
        distance: false,
      },
      todayData: null,
      weekData: [],
      weeklyTotals: null,
      weeklyPoints: 0,
      lastSyncedAt: null,
      isLoading: false,
      error: null,
      fakeMode: false,

      // Initialize health data access
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { fakeMode } = get();
          
          // Check if health is available on this platform
          const available = isHealthAvailable();
          
          if (!available || fakeMode) {
            // Use fake data mode on web/Windows or when enabled
            set({
              isInitialized: true,
              isAvailable: false,
              fakeMode: true,
              isLoading: false,
            });
            
            // Generate initial fake data
            await get().syncWeekData();
            return;
          }
          
          // Initialize native health
          const initialized = await initializeHealth();
          
          if (initialized) {
            const permissions = await checkHealthPermissions();
            set({
              isInitialized: true,
              isAvailable: true,
              permissions,
              isLoading: false,
            });
            
            // Sync data after initialization
            await get().syncWeekData();
          } else {
            set({
              isInitialized: true,
              isAvailable: false,
              isLoading: false,
            });
          }
        } catch (error: any) {
          // Health initialization error occurred
          set({
            isInitialized: true,
            isAvailable: false,
            error: error.message,
            isLoading: false,
          });
        }
      },

      // Request health permissions
      requestPermissions: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Requesting HealthKit permissions
          const initialized = await initializeHealth();
          // HealthKit initialization completed
          
          if (initialized) {
            const permissions = await checkHealthPermissions();
            // HealthKit permissions checked
            set({ 
              isAvailable: true,
              permissions, 
              isLoading: false 
            });
            return true;
          }
          
          // HealthKit initialization failed
          set({ isLoading: false, error: 'Failed to initialize HealthKit. Make sure you\'re using a development build, not Expo Go.' });
          return false;
        } catch (error: any) {
          // Request permissions error
          set({ error: error.message || 'Failed to request HealthKit permissions', isLoading: false });
          return false;
        }
      },

      // Re-check health permissions (call on app focus)
      recheckPermissions: async () => {
        try {
          const { fakeMode } = get();
          
          if (fakeMode || !isHealthAvailable()) {
            return;
          }
          
          const permissions = await checkHealthPermissions();
          set({ permissions });
          
          // If permissions were granted, try to sync data
          const hasAnyPermission = Object.values(permissions).some(p => p);
          if (hasAnyPermission && !get().isLoading) {
            await get().syncWeekData();
          }
        } catch (error: any) {
          console.error('[Health Store] Recheck permissions error:', error);
        }
      },

      // Sync today's health data
      syncTodayData: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { fakeMode } = get();
          let data: DailyHealthData;
          
          if (fakeMode || !isHealthAvailable()) {
            // Generate fake data
            const metrics = generateDailyMetrics();
            data = {
              date: new Date().toISOString().split('T')[0],
              ...metrics,
            };
          } else {
            // Get real health data - will throw error if permissions denied or query fails
            try {
              data = await getDailyHealthData(new Date());
            } catch (healthError: any) {
              // Check if it's a permission issue
              if (healthError.message?.includes('not available') || healthError.message?.includes('permission')) {
                set({ 
                  error: 'HealthKit permissions required. Please grant access in Settings → Health → Data Access → Lock-In',
                  isLoading: false 
                });
              } else {
                set({ 
                  error: `Failed to sync health data: ${healthError.message}`,
                  isLoading: false 
                });
              }
              return null;
            }
          }
          
          set({
            todayData: data,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null,
          });
          
          return data;
        } catch (error: any) {
          // Sync today data error
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      // Sync week's health data
      syncWeekData: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const { fakeMode } = get();
          let data: DailyHealthData[];
          
          if (fakeMode || !isHealthAvailable()) {
            // Generate fake week data
            data = generateWeekData();
            
            // Store fake data in daily sync format so it can be synced to leagues
            const { storeDailyData } = await import('@/services/dailySync');
            for (const dayData of data) {
              await storeDailyData(dayData.date, {
                steps: dayData.steps,
                sleepHours: dayData.sleepHours,
                calories: dayData.calories,
                workouts: dayData.workouts,
                distance: dayData.distance,
              });
            }
            // Fake data stored for league syncing
          } else {
            // Get real health data - will throw error if permissions denied or query fails
            try {
              data = await getCurrentWeekHealthData();
            } catch (healthError: any) {
              // Check if it's a permission issue
              if (healthError.message?.includes('not available') || healthError.message?.includes('permission')) {
                set({ 
                  error: 'HealthKit permissions required. Please grant access in Settings → Health → Data Access → Lock-In',
                  isLoading: false 
                });
              } else {
                set({ 
                  error: `Failed to sync health data: ${healthError.message}`,
                  isLoading: false 
                });
              }
              return [];
            }
          }
          
          // Calculate totals
          const totals = aggregateWeeklyMetrics(data);
          const points = calculatePoints(totals);
          
          set({
            weekData: data,
            weeklyTotals: totals,
            weeklyPoints: points,
            todayData: data[data.length - 1] || null,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
            error: null,
          });
          
          return data;
        } catch (error: any) {
          // Sync week data error
          set({ error: error.message, isLoading: false });
          return [];
        }
      },

      // Sync weekly data to all user's leagues
      syncToLeagues: async (userId: string) => {
        try {
          await syncWeeklyToLeagues(userId);
        } catch (error: any) {
          // Sync to leagues error
        }
      },

      // Toggle fake data mode
      setFakeMode: (enabled: boolean) => {
        set({ fakeMode: enabled });
        
        // Re-sync data with new mode
        get().syncWeekData();
      },

      // Clear all health data
      clearData: () => {
        set({
          todayData: null,
          weekData: [],
          weeklyTotals: null,
          weeklyPoints: 0,
          lastSyncedAt: null,
        });
        
        // Cleanup old cached data
        cleanupOldData();
      },
    }),
    {
      name: 'health-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist fake mode setting
        fakeMode: state.fakeMode,
      }),
    }
  )
);

