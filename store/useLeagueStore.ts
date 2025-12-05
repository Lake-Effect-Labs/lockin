import { create } from 'zustand';
import {
  League,
  LeagueMember,
  Matchup,
  WeeklyScore,
  PlayoffMatch,
} from '@/services/supabase';
import {
  createNewLeague,
  joinLeague as joinLeagueService,
  leaveLeague as leaveLeagueService,
  getUserLeaguesWithDetails,
  getLeagueDashboard,
  syncUserScore,
  processWeekEnd,
  startSeason,
  LeagueWithDetails,
  LeagueDashboard,
} from '@/services/league';
import { FitnessMetrics } from '@/services/scoring';
import { PlayoffBracket } from '@/services/playoffs';

// ============================================
// LEAGUE STORE
// Global league state management
// ============================================

interface LeagueState {
  // State
  leagues: LeagueWithDetails[];
  currentLeague: League | null;
  currentDashboard: LeagueDashboard | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchUserLeagues: (userId: string) => Promise<void>;
  createLeague: (
    name: string, 
    seasonLength: 6 | 8 | 10 | 12, 
    userId: string,
    maxPlayers: 4 | 6 | 8 | 10 | 12 | 14,
    scoringConfig?: {
      points_per_1000_steps?: number;
      points_per_sleep_hour?: number;
      points_per_100_active_cal?: number;
      points_per_workout?: number;
      points_per_mile?: number;
    } | null
  ) => Promise<League>;
  joinLeague: (joinCode: string, userId: string) => Promise<void>;
  leaveLeague: (leagueId: string, userId: string) => Promise<void>;
  setCurrentLeague: (league: League | null) => void;
  fetchDashboard: (leagueId: string, userId: string) => Promise<void>;
  syncScore: (leagueId: string, userId: string, weekNumber: number, metrics: FitnessMetrics) => Promise<void>;
  checkWeekEnd: (leagueId: string) => Promise<boolean>;
  startLeagueSeason: (leagueId: string) => Promise<void>;
  clearError: () => void;
}

export const useLeagueStore = create<LeagueState>((set, get) => ({
  // Initial state
  leagues: [],
  currentLeague: null,
  currentDashboard: null,
  isLoading: false,
  error: null,

  // Fetch all leagues for a user
  fetchUserLeagues: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const leagues = await getUserLeaguesWithDetails(userId);
      set({ leagues, isLoading: false });
    } catch (error: any) {
      console.error('Fetch leagues error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Create a new league
  createLeague: async (name: string, seasonLength: 6 | 8 | 10 | 12, userId: string, maxPlayers: 4 | 6 | 8 | 10 | 12 | 14, scoringConfig?: {
    points_per_1000_steps?: number;
    points_per_sleep_hour?: number;
    points_per_100_active_cal?: number;
    points_per_workout?: number;
    points_per_mile?: number;
  } | null) => {
    try {
      set({ isLoading: true, error: null });
      const league = await createNewLeague(name, seasonLength, userId, maxPlayers, scoringConfig);
      
      // Track analytics event
      const { trackLeagueCreated } = await import('@/services/analytics');
      trackLeagueCreated(league.id, {
        seasonLength,
        maxPlayers,
        hasCustomScoring: scoringConfig !== null,
      });
      
      // Refresh leagues list
      await get().fetchUserLeagues(userId);
      
      set({ currentLeague: league, isLoading: false });
      return league;
    } catch (error: any) {
      console.error('Create league error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Join a league by code
  joinLeague: async (joinCode: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const member = await joinLeagueService(joinCode, userId);
      
      // Track analytics event
      try {
        const { trackLeagueJoined } = await import('@/services/analytics');
        // member.league_id is available on LeagueMember
        trackLeagueJoined(member.league_id, 'code');
      } catch (e) {
        // Analytics not critical, continue
      }
      
      // Refresh leagues list
      await get().fetchUserLeagues(userId);
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Join league error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Leave a league
  leaveLeague: async (leagueId: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      await leaveLeagueService(leagueId, userId);
      
      // Refresh leagues list
      await get().fetchUserLeagues(userId);
      
      // Clear current league if it's the one we left
      if (get().currentLeague?.id === leagueId) {
        set({ currentLeague: null, currentDashboard: null });
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Leave league error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Set current league
  setCurrentLeague: (league: League | null) => {
    set({ currentLeague: league, currentDashboard: null });
  },

  // Fetch dashboard data for a league
  fetchDashboard: async (leagueId: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const dashboard = await getLeagueDashboard(leagueId, userId);
      set({ 
        currentLeague: dashboard.league,
        currentDashboard: dashboard, 
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Fetch dashboard error:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Sync user's fitness score
  syncScore: async (leagueId: string, userId: string, weekNumber: number, metrics: FitnessMetrics) => {
    try {
      await syncUserScore(leagueId, userId, weekNumber, metrics);
      
      // Refresh dashboard
      await get().fetchDashboard(leagueId, userId);
    } catch (error: any) {
      console.error('Sync score error:', error);
      set({ error: error.message });
    }
  },

  // Check and process week end
  checkWeekEnd: async (leagueId: string) => {
    try {
      return await processWeekEnd(leagueId);
    } catch (error: any) {
      console.error('Check week end error:', error);
      return false;
    }
  },

  // Start the league season
  startLeagueSeason: async (leagueId: string) => {
    try {
      set({ isLoading: true, error: null });
      await startSeason(leagueId);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Start season error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

