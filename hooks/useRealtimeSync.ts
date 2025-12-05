// ============================================
// REAL-TIME SYNC HOOK
// Lock-In Fitness Competition App
// React hook for real-time health sync
// ============================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useHealthStore } from '@/store/useHealthStore';
import {
  initializeRealtimeSync,
  cleanupRealtimeSync,
  syncNow,
  forceSync,
  onSyncUpdate,
  startMatchupViewSync,
  stopMatchupViewSync,
  getSyncStatus,
  formatLastSyncTime,
  SyncUpdate,
  SYNC_CONFIG,
} from '@/services/realtimeSync';
import { FitnessMetrics } from '@/services/scoring';

// ============================================
// MAIN HOOK
// ============================================

export interface UseRealtimeSyncReturn {
  // State
  isSyncing: boolean;
  lastSyncTime: string;
  weeklyTotals: FitnessMetrics | null;
  weeklyPoints: number;
  
  // Actions
  refresh: () => Promise<void>;
  
  // Remote updates (opponent scores)
  remoteUpdates: Map<string, SyncUpdate>;
}

export function useRealtimeSync(): UseRealtimeSyncReturn {
  const { user } = useAuthStore();
  const { fakeMode, weeklyTotals, weeklyPoints, syncWeekData } = useHealthStore();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Never');
  const [remoteUpdates, setRemoteUpdates] = useState<Map<string, SyncUpdate>>(new Map());
  
  const isInitialized = useRef(false);
  
  // Initialize sync system when user is available
  useEffect(() => {
    if (!user?.id || isInitialized.current) return;
    
    console.log('🚀 Initializing real-time sync for user:', user.id);
    isInitialized.current = true;
    
    // Initialize the sync system
    initializeRealtimeSync(user.id, fakeMode);
    
    // Subscribe to updates
    const unsubscribe = onSyncUpdate((update) => {
      if (update.type === 'local') {
        // Local sync completed - update health store
        syncWeekData();
        setLastSyncTime(formatLastSyncTime());
      } else if (update.type === 'remote') {
        // Remote update from opponent
        setRemoteUpdates(prev => {
          const next = new Map(prev);
          next.set(update.userId, update);
          return next;
        });
      }
    });
    
    // Update last sync time periodically
    const timeInterval = setInterval(() => {
      setLastSyncTime(formatLastSyncTime());
    }, 10000);
    
    return () => {
      unsubscribe();
      clearInterval(timeInterval);
      cleanupRealtimeSync();
      isInitialized.current = false;
    };
  }, [user?.id, fakeMode]);
  
  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    try {
      await forceSync(user.id, fakeMode);
      await syncWeekData();
      setLastSyncTime(formatLastSyncTime());
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, fakeMode, syncWeekData]);
  
  return {
    isSyncing,
    lastSyncTime,
    weeklyTotals,
    weeklyPoints,
    refresh,
    remoteUpdates,
  };
}

// ============================================
// MATCHUP VIEW HOOK
// ============================================

/**
 * Hook for matchup view - syncs more frequently (every 30s)
 */
export function useMatchupSync(leagueId: string): {
  isSyncing: boolean;
  lastUpdate: string;
  opponentUpdate: SyncUpdate | null;
} {
  const { user } = useAuthStore();
  const { fakeMode } = useHealthStore();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [opponentUpdate, setOpponentUpdate] = useState<SyncUpdate | null>(null);
  
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🎯 Starting matchup sync for league:', leagueId);
    
    // Start rapid sync
    startMatchupViewSync(user.id, fakeMode);
    
    // Subscribe to updates
    const unsubscribe = onSyncUpdate((update) => {
      if (update.type === 'remote' && update.leagueId === leagueId) {
        setOpponentUpdate(update);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    });
    
    return () => {
      stopMatchupViewSync();
      unsubscribe();
    };
  }, [user?.id, leagueId, fakeMode]);
  
  return {
    isSyncing,
    lastUpdate,
    opponentUpdate,
  };
}

// ============================================
// SYNC STATUS HOOK
// ============================================

/**
 * Hook to display sync status
 */
export function useSyncStatus(): {
  isSyncing: boolean;
  lastSyncTime: string;
  syncNeeded: boolean;
  syncConfig: typeof SYNC_CONFIG;
} {
  const [status, setStatus] = useState({
    isSyncing: false,
    lastSyncTime: 'Never',
    syncNeeded: true,
  });
  
  useEffect(() => {
    const updateStatus = () => {
      const syncStatus = getSyncStatus();
      setStatus({
        isSyncing: syncStatus.isSyncing,
        lastSyncTime: formatLastSyncTime(),
        syncNeeded: syncStatus.timeSinceLastSync > SYNC_CONFIG.FOREGROUND_INTERVAL,
      });
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    ...status,
    syncConfig: SYNC_CONFIG,
  };
}

