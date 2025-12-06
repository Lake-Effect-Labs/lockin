import { supabase, startLeagueSeason } from './supabase';

// ============================================
// ADMIN FUNCTIONS
// League administration functions
// ============================================

/**
 * Check if user is admin of a league
 */
export async function isLeagueAdmin(leagueId: string, userId: string): Promise<boolean> {
  // First check if user is creator (always admin)
  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .single();
  
  if (league?.created_by === userId) {
    return true;
  }
  
  // Then check is_admin flag
  const { data, error } = await supabase
    .from('league_members')
    .select('is_admin')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single();
  
  if (error || !data) return false;
  return data.is_admin === true;
}

/**
 * Start a league manually (admin only)
 */
export async function startLeague(leagueId: string, adminUserId: string): Promise<void> {
  // Verify admin
  const isAdmin = await isLeagueAdmin(leagueId, adminUserId);
  if (!isAdmin) {
    throw new Error('Only league admins can start the league');
  }
  
  // Check if league already started
  const { data: league } = await supabase
    .from('leagues')
    .select('start_date, max_players')
    .eq('id', leagueId)
    .single();
  
  if (!league) throw new Error('League not found');
  
  if (league.start_date) {
    throw new Error('League has already started');
  }
  
  // Check member count
  const { count } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);
  
  if (count && count < 2) {
    throw new Error('League needs at least 2 players to start');
  }
  
  // Start the league on next Monday (leagues start on Mondays)
  const { getNextMonday } = require('../utils/dates');
  const nextMonday = getNextMonday();
  const startDate = nextMonday.toISOString().split('T')[0];
  
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ start_date: startDate })
    .eq('id', leagueId);
  
  if (updateError) throw updateError;
  
  // Generate matchups for week 1
  await startLeagueSeason(leagueId);
}

/**
 * Delete a league (admin only)
 */
export async function deleteLeague(leagueId: string, adminUserId: string): Promise<void> {
  // Verify admin
  const isAdmin = await isLeagueAdmin(leagueId, adminUserId);
  if (!isAdmin) {
    throw new Error('Only league admins can delete the league');
  }
  
  // Verify user is creator (RLS might require this)
  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', leagueId)
    .single();
  
  if (!league) {
    throw new Error('League not found');
  }
  
  if (league.created_by !== adminUserId) {
    throw new Error('Only the league creator can delete the league');
  }
  
  // Delete league (cascade will delete members, matchups, etc.)
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)
    .eq('created_by', adminUserId); // Add created_by check for RLS
  
  if (error) {
    console.error('Delete league error:', error);
    throw new Error(`Failed to delete league: ${error.message}`);
  }
}

/**
 * Remove a user from league (admin only)
 */
export async function removeUserFromLeague(
  leagueId: string, 
  userIdToRemove: string, 
  adminUserId: string
): Promise<void> {
  // Verify admin
  const isAdmin = await isLeagueAdmin(leagueId, adminUserId);
  if (!isAdmin) {
    throw new Error('Only league admins can remove users');
  }
  
  // Can't remove yourself
  if (userIdToRemove === adminUserId) {
    throw new Error('You cannot remove yourself from the league');
  }
  
  // Check if league has started
  const { data: league } = await supabase
    .from('leagues')
    .select('start_date')
    .eq('id', leagueId)
    .single();
  
  if (league?.start_date) {
    throw new Error('Cannot remove users after league has started');
  }
  
  // Remove user
  const { error } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', userIdToRemove);
  
  if (error) throw error;
}

