// ============================================
// MATCHUP MONITOR SERVICE
// Lock-In Fitness Competition App
// Monitors matchups and sends notifications on lead changes
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { sendLocalNotification, getNotificationContent, NotificationType } from './notifications';
import { calculatePoints, FitnessMetrics } from './scoring';

// ============================================
// CONSTANTS
// ============================================

const MATCHUP_STATE_KEY = 'lockin_matchup_states';
const NOTIFICATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes between same notification type
const CLOSE_MARGIN_THRESHOLD = 50; // Points to be considered "close"
const BIG_LEAD_THRESHOLD = 200; // Points to be considered a "big lead"

// ============================================
// TYPES
// ============================================

interface MatchupState {
  leagueId: string;
  matchupId: string;
  week: number;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  userWasLeading: boolean;
  lastNotificationType: NotificationType | null;
  lastNotificationTime: number;
}

interface StoredMatchupStates {
  [matchupId: string]: MatchupState;
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Get stored matchup states
 */
async function getMatchupStates(): Promise<StoredMatchupStates> {
  try {
    const raw = await AsyncStorage.getItem(MATCHUP_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Save matchup states
 */
async function saveMatchupStates(states: StoredMatchupStates): Promise<void> {
  await AsyncStorage.setItem(MATCHUP_STATE_KEY, JSON.stringify(states));
}

/**
 * Clear old matchup states (from previous weeks)
 */
export async function clearOldMatchupStates(currentWeek: number): Promise<void> {
  const states = await getMatchupStates();
  const filtered: StoredMatchupStates = {};
  
  for (const [id, state] of Object.entries(states)) {
    if (state.week >= currentWeek - 1) {
      filtered[id] = state;
    }
  }
  
  await saveMatchupStates(filtered);
}

// ============================================
// MONITORING LOGIC
// ============================================

/**
 * Check matchup and send notification if lead changed
 */
export async function checkMatchupAndNotify(
  matchupId: string,
  leagueId: string,
  week: number,
  userId: string,
  userScore: number,
  opponentId: string,
  opponentScore: number,
  opponentName: string
): Promise<{ notified: boolean; type?: NotificationType }> {
  const states = await getMatchupStates();
  const previousState = states[matchupId];
  
  const userIsLeading = userScore > opponentScore;
  const margin = Math.abs(userScore - opponentScore);
  const isTied = userScore === opponentScore;
  const now = Date.now();
  
  // Determine what notification to send (if any)
  let notificationType: NotificationType | null = null;
  
  if (previousState) {
    // Check for lead change
    if (previousState.userWasLeading && !userIsLeading && !isTied) {
      // User lost the lead
      notificationType = 'opponent_takes_lead';
    } else if (!previousState.userWasLeading && userIsLeading) {
      // User took the lead
      notificationType = 'you_take_lead';
    } else if (isTied || margin <= CLOSE_MARGIN_THRESHOLD) {
      // Close matchup
      notificationType = 'close_matchup';
    } else if (userIsLeading && margin >= BIG_LEAD_THRESHOLD) {
      // Big lead
      notificationType = 'big_lead';
    }
    
    // Check cooldown
    if (notificationType) {
      const timeSinceLastNotification = now - previousState.lastNotificationTime;
      const sameType = previousState.lastNotificationType === notificationType;
      
      if (sameType && timeSinceLastNotification < NOTIFICATION_COOLDOWN) {
        // Skip notification due to cooldown
        notificationType = null;
      }
    }
  }
  
  // Update state
  const newState: MatchupState = {
    leagueId,
    matchupId,
    week,
    userScore,
    opponentScore,
    opponentName,
    userWasLeading: userIsLeading,
    lastNotificationType: notificationType || previousState?.lastNotificationType || null,
    lastNotificationTime: notificationType ? now : (previousState?.lastNotificationTime || 0),
  };
  
  states[matchupId] = newState;
  await saveMatchupStates(states);
  
  // Send notification if needed
  if (notificationType) {
    const content = getNotificationContent(notificationType, {
      opponent: opponentName,
      margin: Math.round(margin),
      leagueId,
      matchupId,
    });
    
    await sendLocalNotification(content);
    
    return { notified: true, type: notificationType };
  }
  
  return { notified: false };
}

// ============================================
// REAL-TIME SUBSCRIPTION
// ============================================

let matchupSubscription: any = null;

/**
 * Start monitoring matchups for a user
 */
export function startMatchupMonitoring(
  userId: string,
  onScoreChange?: (data: any) => void
): void {
  console.log('👀 Starting matchup monitoring for user:', userId);
  
  // Clean up existing subscription
  stopMatchupMonitoring();
  
  // Subscribe to weekly_scores changes
  matchupSubscription = supabase
    .channel('matchup_monitor')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'weekly_scores',
      },
      async (payload) => {
        if (!payload.new) return;
        
        const data = payload.new as any;
        
        // Only process opponent updates
        if (data.user_id === userId) return;
        
        console.log('📡 Opponent score update detected:', data);
        
        // Notify callback if provided
        if (onScoreChange) {
          onScoreChange(data);
        }
        
        // The actual notification logic will be handled by the sync service
        // which has access to the full matchup context
      }
    )
    .subscribe();
}

/**
 * Stop monitoring matchups
 */
export function stopMatchupMonitoring(): void {
  if (matchupSubscription) {
    supabase.removeChannel(matchupSubscription);
    matchupSubscription = null;
    console.log('🛑 Stopped matchup monitoring');
  }
}

// ============================================
// INTEGRATION WITH SYNC
// ============================================

/**
 * Process matchup after sync and check for notifications
 * Call this from the sync service after updating scores
 */
export async function processMatchupAfterSync(
  userId: string,
  leagueId: string,
  week: number,
  userMetrics: FitnessMetrics,
  matchupData: {
    matchupId: string;
    opponentId: string;
    opponentName: string;
    opponentMetrics: FitnessMetrics;
  } | null
): Promise<void> {
  if (!matchupData) return;
  
  const userScore = calculatePoints(userMetrics);
  const opponentScore = calculatePoints(matchupData.opponentMetrics);
  
  await checkMatchupAndNotify(
    matchupData.matchupId,
    leagueId,
    week,
    userId,
    userScore,
    matchupData.opponentId,
    opponentScore,
    matchupData.opponentName
  );
}

// ============================================
// DEBUG / TESTING
// ============================================

/**
 * Get current matchup states (for debugging)
 */
export async function getDebugMatchupStates(): Promise<StoredMatchupStates> {
  return getMatchupStates();
}

/**
 * Clear all matchup states (for testing)
 */
export async function clearAllMatchupStates(): Promise<void> {
  await AsyncStorage.removeItem(MATCHUP_STATE_KEY);
}

/**
 * Simulate a lead change notification (for testing)
 */
export async function simulateLeadChangeNotification(
  type: 'opponent_takes_lead' | 'you_take_lead' | 'close_matchup' | 'big_lead',
  opponentName: string = 'Test Opponent',
  margin: number = 50
): Promise<void> {
  const content = getNotificationContent(type, {
    opponent: opponentName,
    margin,
  });
  
  await sendLocalNotification(content);
}

