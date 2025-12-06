import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Custom storage adapter that uses SecureStore on native, AsyncStorage on web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface User {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface League {
  id: string;
  name: string;
  join_code: string;
  created_by: string;
  season_length_weeks: number;
  current_week: number;
  start_date: string | null;
  is_active: boolean;
  playoffs_started: boolean;
  champion_id: string | null;
  max_players: number;
  scoring_config?: {
    points_per_1000_steps?: number;
    points_per_sleep_hour?: number;
    points_per_100_active_cal?: number;
    points_per_workout?: number;
    points_per_mile?: number;
  } | null;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  wins: number;
  losses: number;
  ties: number;
  total_points: number;
  playoff_seed: number | null;
  is_eliminated: boolean;
  is_admin: boolean;
  joined_at: string;
  user?: User;
}

export interface Matchup {
  id: string;
  league_id: string;
  week_number: number;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  is_tie: boolean;
  is_finalized: boolean;
  created_at: string;
  player1?: User;
  player2?: User;
}

export interface WeeklyScore {
  id: string;
  league_id: string;
  user_id: string;
  week_number: number;
  steps: number;
  sleep_hours: number;
  calories: number;
  workouts: number;
  distance: number;
  total_points: number;
  last_synced_at: string;
  created_at: string;
}

export interface PlayoffMatch {
  id: string;
  league_id: string;
  round: 1 | 2;
  match_number: 1 | 2;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  is_finalized: boolean;
  week_number: number;
  created_at: string;
  player1?: User;
  player2?: User;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'week_start' | 'week_end' | 'matchup_win' | 'matchup_loss' | 'playoffs_start' | 'champion';
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  // Return both user and session - session will be null if email confirmation is required
  return {
    user: data.user,
    session: data.session,
  };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: 'lockin://auth/callback',
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'lockin://auth/reset-password',
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export async function getProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createProfile(userId: string, email: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, email })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<User>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUsername(userId: string, username: string): Promise<User> {
  return updateProfile(userId, { username });
}

export async function updateAvatar(userId: string, avatarUrl: string): Promise<User> {
  return updateProfile(userId, { avatar_url: avatarUrl });
}

export async function updatePushToken(userId: string, pushToken: string): Promise<User> {
  return updateProfile(userId, { push_token: pushToken });
}

// ============================================
// LEAGUE FUNCTIONS
// ============================================

export async function createLeague(
  name: string,
  seasonLengthWeeks: number,
  createdBy: string,
  maxPlayers: number,
  scoringConfig?: {
    points_per_1000_steps?: number;
    points_per_sleep_hour?: number;
    points_per_100_active_cal?: number;
    points_per_workout?: number;
    points_per_mile?: number;
  } | null
): Promise<League> {
  // Generate unique join code
  const joinCode = generateJoinCode();
  
  const { data, error } = await supabase
    .from('leagues')
    .insert({
      name,
      join_code: joinCode,
      created_by: createdBy,
      season_length_weeks: seasonLengthWeeks,
      max_players: maxPlayers,
      start_date: null, // Don't start until league is full
      scoring_config: scoringConfig || null,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Auto-join creator to league as admin
  const { error: joinError } = await supabase
    .from('league_members')
    .insert({ 
      league_id: data.id, 
      user_id: createdBy,
      is_admin: true // Set creator as admin
    });
  
  if (joinError) {
    // If join fails, try to delete the league
    await supabase.from('leagues').delete().eq('id', data.id);
    throw joinError;
  }
  
  return data;
}

export async function getLeague(leagueId: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', leagueId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getLeagueByCode(joinCode: string): Promise<League | null> {
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('join_code', joinCode.toUpperCase())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserLeagues(userId: string): Promise<League[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('league:leagues(*)')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data?.map((d: any) => d.league).filter(Boolean) || [];
}

export async function joinLeague(leagueId: string, userId: string): Promise<LeagueMember> {
  const { data, error } = await supabase
    .from('league_members')
    .insert({ league_id: leagueId, user_id: userId })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function joinLeagueByCode(joinCode: string, userId: string): Promise<LeagueMember> {
  const league = await getLeagueByCode(joinCode);
  if (!league) throw new Error('League not found');
  
  // Check if already a member
  const existingMember = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', userId)
    .single();
  
  if (existingMember.data) {
    throw new Error('You are already a member of this league');
  }
  
  // Check if league has already started
  if (league.start_date) {
    throw new Error('This league has already started. You can only join leagues before they begin.');
  }
  
  // Check league capacity
  const { count } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id);
  
  if (count && count >= league.max_players) {
    throw new Error(`This league is full (maximum ${league.max_players} players)`);
  }
  
  const member = await joinLeague(league.id, userId);
  
  // Check if league is now full and start it
  const { count: newCount } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id);
  
  if (newCount && newCount >= league.max_players && !league.start_date) {
    // League is now full, start it on the next Monday
    const { getNextMonday } = await import('../utils/dates');
    const nextMonday = getNextMonday();
    const startDate = nextMonday.toISOString().split('T')[0];
    
    await supabase
      .from('leagues')
      .update({ start_date: startDate })
      .eq('id', league.id);
    
    // Track analytics event
    try {
      const { trackLeagueFull } = await import('./analytics');
      trackLeagueFull(league.id, league.max_players);
    } catch (e) {
      // Analytics not critical, continue
    }
    
    // Generate matchups for week 1 (but don't start until Monday)
    // Note: startLeagueSeason will be called when start_date arrives
    // For now, we'll generate matchups but they won't be active until Monday
    await startLeagueSeason(league.id);
  }
  
  return member;
}

export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userId);
  
  if (error) throw error;
}

export async function getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
  const { data, error } = await supabase
    .from('league_members')
    .select('*, user:users(*)')
    .eq('league_id', leagueId)
    .order('wins', { ascending: false })
    .order('total_points', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function startLeagueSeason(leagueId: string): Promise<void> {
  const { error } = await supabase.rpc('generate_matchups', { p_league_id: leagueId });
  if (error) throw error;
}

// ============================================
// MATCHUP FUNCTIONS
// ============================================

export async function getMatchups(leagueId: string, weekNumber?: number): Promise<Matchup[]> {
  let query = supabase
    .from('matchups')
    .select('*, player1:users!matchups_player1_id_fkey(*), player2:users!matchups_player2_id_fkey(*)')
    .eq('league_id', leagueId);
  
  if (weekNumber !== undefined) {
    query = query.eq('week_number', weekNumber);
  }
  
  const { data, error } = await query.order('week_number');
  if (error) throw error;
  return data || [];
}

export async function getUserMatchup(
  leagueId: string,
  userId: string,
  weekNumber: number
): Promise<Matchup | null> {
  const { data, error } = await supabase
    .from('matchups')
    .select('*, player1:users!matchups_player1_id_fkey(*), player2:users!matchups_player2_id_fkey(*)')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateMatchupScores(
  matchupId: string,
  player1Score: number,
  player2Score: number
): Promise<Matchup> {
  const { data, error } = await supabase
    .from('matchups')
    .update({ player1_score: player1Score, player2_score: player2Score })
    .eq('id', matchupId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function finalizeWeek(leagueId: string, weekNumber: number): Promise<void> {
  const { error } = await supabase.rpc('finalize_week', {
    p_league_id: leagueId,
    p_week: weekNumber,
  });
  if (error) throw error;
}

// ============================================
// WEEKLY SCORES FUNCTIONS
// ============================================

export async function getWeeklyScore(
  leagueId: string,
  userId: string,
  weekNumber: number
): Promise<WeeklyScore | null> {
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('*')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('week_number', weekNumber)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function upsertWeeklyScore(
  leagueId: string,
  userId: string,
  weekNumber: number,
  metrics: {
    steps: number;
    sleep_hours: number;
    calories: number;
    workouts: number;
    distance: number;
  }
): Promise<WeeklyScore> {
  const { data, error } = await supabase
    .from('weekly_scores')
    .upsert({
      league_id: leagueId,
      user_id: userId,
      week_number: weekNumber,
      ...metrics,
      last_synced_at: new Date().toISOString(),
    }, {
      onConflict: 'league_id,user_id,week_number',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getLeagueWeeklyScores(
  leagueId: string,
  weekNumber: number
): Promise<WeeklyScore[]> {
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber);
  
  if (error) throw error;
  return data || [];
}

// ============================================
// PLAYOFF FUNCTIONS
// ============================================

export async function getPlayoffs(leagueId: string): Promise<PlayoffMatch[]> {
  const { data, error } = await supabase
    .from('playoffs')
    .select('*, player1:users!playoffs_player1_id_fkey(*), player2:users!playoffs_player2_id_fkey(*)')
    .eq('league_id', leagueId)
    .order('round')
    .order('match_number');
  
  if (error) throw error;
  return data || [];
}

export async function generatePlayoffs(leagueId: string): Promise<void> {
  const { error } = await supabase.rpc('generate_playoffs', { p_league_id: leagueId });
  if (error) throw error;
}

export async function updatePlayoffScores(
  playoffId: string,
  player1Score: number,
  player2Score: number
): Promise<PlayoffMatch> {
  const { data, error } = await supabase
    .from('playoffs')
    .update({ player1_score: player1Score, player2_score: player2Score })
    .eq('id', playoffId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function finalizePlayoffMatch(playoffId: string): Promise<void> {
  const { error } = await supabase.rpc('finalize_playoff_match', { p_playoff_id: playoffId });
  if (error) throw error;
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  
  if (error) throw error;
}

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: Notification['type'],
  data?: Record<string, any>
): Promise<Notification> {
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, title, body, type, data })
    .select()
    .single();
  
  if (error) throw error;
  return notification;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

