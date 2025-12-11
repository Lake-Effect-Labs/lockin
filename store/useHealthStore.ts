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
          console.error('Health initialization error:', error);
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
          
          console.log('🔵 Requesting HealthKit permissions...');
          const initialized = await initializeHealth();
          console.log('🔵 HealthKit initialization result:', initialized);
          
          if (initialized) {
            const permissions = await checkHealthPermissions();
            console.log('🔵 HealthKit permissions check:', permissions);
            set({ 
              isAvailable: true,
              permissions, 
              isLoading: false 
            });
            return true;
          }
          
          console.log('⚠️ HealthKit initialization failed');
          set({ isLoading: false, error: 'Failed to initialize HealthKit. Make sure you\'re using a development build, not Expo Go.' });
          return false;
        } catch (error: any) {
          console.error('❌ Request permissions error:', error);
          set({ error: error.message || 'Failed to request HealthKit permissions', isLoading: false });
          return false;
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
            // Get real health data
            data = await getDailyHealthData(new Date());
          }
          
          set({
            todayData: data,
            lastSyncedAt: new Date().toISOString(),
            isLoading: false,
          });
          
          return data;
        } catch (error: any) {
          console.error('Sync today data error:', error);
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
          } else {
            // Get real health data
            data = await getCurrentWeekHealthData();
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
          });
          
          return data;
        } catch (error: any) {
          console.error('Sync week data error:', error);
          set({ error: error.message, isLoading: false });
          return [];
        }
      },

      // Sync weekly data to all user's leagues
      syncToLeagues: async (userId: string) => {
        try {
          await syncWeeklyToLeagues(userId);
        } catch (error: any) {
          console.error('Sync to leagues error:', error);
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

