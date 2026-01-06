// ============================================
// LEAGUE ENGINE
// Business logic for Lock-In Competition
// Migrated from SQL stored procedures to TypeScript
// ============================================

import { supabase, League, LeagueMember, Matchup, WeeklyScore, PlayoffMatch } from './supabase';
import { calculatePoints, getScoringConfig, FitnessMetrics, ScoringConfig } from './scoring';

// ============================================
// MATCHUP GENERATION
// Round-robin scheduling algorithm
// ============================================

/**
 * Generate all matchups for a league season using round-robin scheduling
 * This replaces the SQL function: generate_matchups(p_league_id UUID)
 */
export async function generateMatchups(leagueId: string): Promise<void> {
  // Get all members sorted by join date
  const { data: members, error: membersError } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)
    .order('joined_at', { ascending: true });

  if (membersError) throw membersError;
  if (!members || members.length < 2) return;

  // Get league season length
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('season_length_weeks')
    .eq('id', leagueId)
    .single();

  if (leagueError) throw leagueError;
  if (!league) return;

  const seasonLength = league.season_length_weeks;
  let playerIds: (string | null)[] = members.map(m => m.user_id);

  // If odd number of players, add null for bye week
  if (playerIds.length % 2 === 1) {
    playerIds.push(null);
  }

  const memberCount = playerIds.length;
  const matchupsToInsert: Array<{
    league_id: string;
    week_number: number;
    player1_id: string;
    player2_id: string;
  }> = [];

  // Round-robin scheduling
  for (let week = 1; week <= seasonLength; week++) {
    // Rotate array for this week (keep first element fixed)
    let rotated = [...playerIds];
    if (week > 1) {
      for (let i = 1; i < week; i++) {
        // Rotate: keep first, move last to second position
        const last = rotated[memberCount - 1];
        rotated = [rotated[0], last, ...rotated.slice(1, memberCount - 1)];
      }
    }

    // Create matchups: pair first with last, second with second-to-last, etc.
    for (let i = 0; i < memberCount / 2; i++) {
      const homeIdx = i;
      const awayIdx = memberCount - i - 1;
      const player1 = rotated[homeIdx];
      const player2 = rotated[awayIdx];

      // Skip if either is null (bye week)
      if (player1 !== null && player2 !== null) {
        matchupsToInsert.push({
          league_id: leagueId,
          week_number: week,
          player1_id: player1,
          player2_id: player2,
        });
      }
    }
  }

  // Insert all matchups (ignore conflicts for idempotency)
  if (matchupsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('matchups')
      .upsert(matchupsToInsert, {
        onConflict: 'league_id,week_number,player1_id',
        ignoreDuplicates: true,
      });

    if (insertError) throw insertError;
  }
}

// ============================================
// WEEK FINALIZATION
// Determine winners and update standings
// ============================================

/**
 * Finalize a week - determine winners and update standings
 * This replaces the SQL function: finalize_week(p_league_id UUID, p_week INTEGER)
 * 
 * BUG FIX #2: Prevents double-counting points by checking points_added flag
 * before updating league_members standings.
 */
export async function finalizeWeek(leagueId: string, weekNumber: number): Promise<void> {
  // GUARD 1: Check if playoffs have started
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('playoffs_started, current_week, season_length_weeks')
    .eq('id', leagueId)
    .single();

  if (leagueError) throw leagueError;
  if (!league) throw new Error('League not found');

  // Don't finalize regular season weeks during playoffs
  if (league.playoffs_started) return;

  // GUARD 2: Check if we're already past this week
  if (league.current_week !== weekNumber) return;

  // GUARD 3: Validate week bounds
  if (weekNumber < 1 || weekNumber > league.season_length_weeks) return;

  // Get all unfinalized matchups for this week
  const { data: matchups, error: matchupsError } = await supabase
    .from('matchups')
    .select('*')
    .eq('league_id', leagueId)
    .eq('week_number', weekNumber)
    .eq('is_finalized', false);

  if (matchupsError) throw matchupsError;
  if (!matchups || matchups.length === 0) {
    // No matchups to finalize, just advance the week
    await supabase
      .from('leagues')
      .update({
        current_week: weekNumber + 1,
        last_week_finalized_at: new Date().toISOString()
      })
      .eq('id', leagueId)
      .eq('current_week', weekNumber);
    return;
  }

  // Process each matchup
  let matchupsFinalizedCount = 0;

  for (const matchup of matchups) {
    // BUG FIX #2: Skip if points already added (prevents double-counting)
    if (matchup.points_added) {
      console.log(`[finalizeWeek] Skipping matchup ${matchup.id} - points already added`);
      continue;
    }

    // Get scores for both players
    const { data: p1ScoreData } = await supabase
      .from('weekly_scores')
      .select('total_points')
      .eq('league_id', leagueId)
      .eq('user_id', matchup.player1_id)
      .eq('week_number', weekNumber)
      .single();

    const { data: p2ScoreData } = await supabase
      .from('weekly_scores')
      .select('total_points')
      .eq('league_id', leagueId)
      .eq('user_id', matchup.player2_id)
      .eq('week_number', weekNumber)
      .single();

    const p1Score = p1ScoreData?.total_points ?? 0;
    const p2Score = p2ScoreData?.total_points ?? 0;

    // Determine winner
    let winnerId: string | null = null;
    let isTie = false;
    let p1WinDelta = 0, p1LossDelta = 0, p1TieDelta = 0;
    let p2WinDelta = 0, p2LossDelta = 0, p2TieDelta = 0;

    if (p1Score > p2Score) {
      winnerId = matchup.player1_id;
      p1WinDelta = 1;
      p2LossDelta = 1;
    } else if (p2Score > p1Score) {
      winnerId = matchup.player2_id;
      p2WinDelta = 1;
      p1LossDelta = 1;
    } else {
      isTie = true;
      p1TieDelta = 1;
      p2TieDelta = 1;
    }

    // BUG FIX #2: Mark points_added FIRST (before updating standings)
    // This ensures idempotency - if the process crashes after this point,
    // re-running won't double-count because points_added will be true
    const { error: pointsAddedError } = await supabase
      .from('matchups')
      .update({
        points_added: true,
        p1_points_snapshot: p1Score,
        p2_points_snapshot: p2Score,
      })
      .eq('id', matchup.id)
      .eq('points_added', false); // Only update if not already set

    if (pointsAddedError) {
      console.error(`[finalizeWeek] Error marking points_added for matchup ${matchup.id}:`, pointsAddedError);
      continue; // Skip this matchup to prevent potential double-counting
    }

    // Update matchup with scores and winner
    const { error: matchupUpdateError } = await supabase
      .from('matchups')
      .update({
        player1_score: p1Score,
        player2_score: p2Score,
        winner_id: winnerId,
        is_tie: isTie,
        is_finalized: true,
        finalized_at: new Date().toISOString(),
      })
      .eq('id', matchup.id);

    if (matchupUpdateError) throw matchupUpdateError;

    // Update player 1 stats
    const { data: p1Member } = await supabase
      .from('league_members')
      .select('wins, losses, ties, total_points')
      .eq('league_id', leagueId)
      .eq('user_id', matchup.player1_id)
      .single();

    if (p1Member) {
      await supabase
        .from('league_members')
        .update({
          wins: p1Member.wins + p1WinDelta,
          losses: p1Member.losses + p1LossDelta,
          ties: p1Member.ties + p1TieDelta,
          total_points: p1Member.total_points + p1Score,
        })
        .eq('league_id', leagueId)
        .eq('user_id', matchup.player1_id);
    }

    // Update player 2 stats
    const { data: p2Member } = await supabase
      .from('league_members')
      .select('wins, losses, ties, total_points')
      .eq('league_id', leagueId)
      .eq('user_id', matchup.player2_id)
      .single();

    if (p2Member) {
      await supabase
        .from('league_members')
        .update({
          wins: p2Member.wins + p2WinDelta,
          losses: p2Member.losses + p2LossDelta,
          ties: p2Member.ties + p2TieDelta,
          total_points: p2Member.total_points + p2Score,
        })
        .eq('league_id', leagueId)
        .eq('user_id', matchup.player2_id);
    }

    matchupsFinalizedCount++;
  }

  // Advance week only if we finalized matchups
  if (matchupsFinalizedCount > 0) {
    await supabase
      .from('leagues')
      .update({
        current_week: weekNumber + 1,
        last_week_finalized_at: new Date().toISOString()
      })
      .eq('id', leagueId)
      .eq('current_week', weekNumber);
  }
}

// ============================================
// PLAYOFF GENERATION
// Create playoff bracket from top 4 players
// ============================================

/**
 * Generate playoffs - select top 4 players and create semifinal matchups
 * This replaces the SQL function: generate_playoffs(p_league_id UUID)
 */
export async function generatePlayoffs(leagueId: string): Promise<void> {
  // GUARD 1: Check if playoffs already started
  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('playoffs_started, season_length_weeks')
    .eq('id', leagueId)
    .single();

  if (leagueError) throw leagueError;
  if (!league) throw new Error('League not found');

  if (league.playoffs_started) return; // Already generated

  // GUARD 2: Check if playoff records already exist
  const { data: existingPlayoffs } = await supabase
    .from('playoffs')
    .select('id')
    .eq('league_id', leagueId)
    .limit(1);

  if (existingPlayoffs && existingPlayoffs.length > 0) return; // Already exist

  // Get top 4 players by wins, then total points
  const { data: members, error: membersError } = await supabase
    .from('league_members')
    .select('user_id, wins, total_points')
    .eq('league_id', leagueId)
    .order('wins', { ascending: false })
    .order('total_points', { ascending: false })
    .limit(4);

  if (membersError) throw membersError;
  if (!members || members.length < 4) {
    throw new Error('Not enough players for playoffs');
  }

  const topPlayers = members.map(m => m.user_id);
  const playoffWeek = league.season_length_weeks + 1;

  // Set playoff seeds (1-4)
  for (let i = 0; i < 4; i++) {
    const { error: seedError } = await supabase
      .from('league_members')
      .update({
        playoff_seed: i + 1,
        playoff_tiebreaker_points: members[i].total_points // Snapshot for tiebreakers
      })
      .eq('league_id', leagueId)
      .eq('user_id', topPlayers[i]);

    if (seedError) throw seedError;
  }

  // Create semifinal matchups: 1 vs 4, 2 vs 3
  const { error: playoffsError } = await supabase
    .from('playoffs')
    .insert([
      {
        league_id: leagueId,
        round: 1,
        match_number: 1,
        player1_id: topPlayers[0], // 1st seed
        player2_id: topPlayers[3], // 4th seed
        week_number: playoffWeek,
      },
      {
        league_id: leagueId,
        round: 1,
        match_number: 2,
        player1_id: topPlayers[1], // 2nd seed
        player2_id: topPlayers[2], // 3rd seed
        week_number: playoffWeek,
      },
    ]);

  if (playoffsError) throw playoffsError;

  // Mark playoffs as started
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ playoffs_started: true })
    .eq('id', leagueId);

  if (updateError) throw updateError;
}

// ============================================
// PLAYOFF MATCH FINALIZATION
// Determine winner and progress bracket
// ============================================

/**
 * Finalize a playoff match - determine winner and create finals if needed
 * This replaces the SQL function: finalize_playoff_match(p_playoff_id UUID)
 */
export async function finalizePlayoffMatch(playoffId: string): Promise<void> {
  // Get the playoff match
  const { data: playoff, error: playoffError } = await supabase
    .from('playoffs')
    .select('*')
    .eq('id', playoffId)
    .single();

  if (playoffError) throw playoffError;
  if (!playoff) throw new Error('Playoff match not found');

  // Already finalized
  if (playoff.is_finalized) return;

  // Determine winner (no ties in playoffs - higher score wins)
  let winnerId: string;
  let loserId: string;

  if (playoff.player1_score > playoff.player2_score) {
    winnerId = playoff.player1_id;
    loserId = playoff.player2_id;
  } else if (playoff.player2_score > playoff.player1_score) {
    winnerId = playoff.player2_id;
    loserId = playoff.player1_id;
  } else {
    // Tie - use total points tiebreaker (higher seed wins if still tied)
    const { data: p1Member } = await supabase
      .from('league_members')
      .select('playoff_tiebreaker_points, playoff_seed')
      .eq('league_id', playoff.league_id)
      .eq('user_id', playoff.player1_id)
      .single();

    const { data: p2Member } = await supabase
      .from('league_members')
      .select('playoff_tiebreaker_points, playoff_seed')
      .eq('league_id', playoff.league_id)
      .eq('user_id', playoff.player2_id)
      .single();

    const p1Tiebreaker = p1Member?.playoff_tiebreaker_points ?? 0;
    const p2Tiebreaker = p2Member?.playoff_tiebreaker_points ?? 0;

    if (p1Tiebreaker > p2Tiebreaker) {
      winnerId = playoff.player1_id;
      loserId = playoff.player2_id;
    } else if (p2Tiebreaker > p1Tiebreaker) {
      winnerId = playoff.player2_id;
      loserId = playoff.player1_id;
    } else {
      // Still tied - higher seed (lower number) wins
      const p1Seed = p1Member?.playoff_seed ?? 99;
      const p2Seed = p2Member?.playoff_seed ?? 99;
      if (p1Seed < p2Seed) {
        winnerId = playoff.player1_id;
        loserId = playoff.player2_id;
      } else {
        winnerId = playoff.player2_id;
        loserId = playoff.player1_id;
      }
    }
  }

  // Update playoff match with winner
  const { error: updatePlayoffError } = await supabase
    .from('playoffs')
    .update({
      winner_id: winnerId,
      is_finalized: true
    })
    .eq('id', playoffId);

  if (updatePlayoffError) throw updatePlayoffError;

  // Mark loser as eliminated
  const { error: eliminateError } = await supabase
    .from('league_members')
    .update({ is_eliminated: true })
    .eq('league_id', playoff.league_id)
    .eq('user_id', loserId);

  if (eliminateError) throw eliminateError;

  // Handle bracket progression
  if (playoff.round === 1) {
    // Semifinal - check if we need to create finals
    const { data: otherSemi } = await supabase
      .from('playoffs')
      .select('*')
      .eq('league_id', playoff.league_id)
      .eq('round', 1)
      .neq('match_number', playoff.match_number)
      .single();

    if (otherSemi?.is_finalized && otherSemi.winner_id) {
      // Both semifinals done - create finals
      const finalsWeek = playoff.week_number + 1;

      const { error: finalsError } = await supabase
        .from('playoffs')
        .insert({
          league_id: playoff.league_id,
          round: 2,
          match_number: 1,
          player1_id: winnerId,
          player2_id: otherSemi.winner_id,
          week_number: finalsWeek,
        });

      if (finalsError) throw finalsError;
    }
  } else if (playoff.round === 2) {
    // Finals complete - crown champion
    const { error: championError } = await supabase
      .from('leagues')
      .update({
        champion_id: winnerId,
        is_active: false
      })
      .eq('id', playoff.league_id);

    if (championError) throw championError;
  }
}

// ============================================
// SCORE CALCULATION
// Calculate total points from metrics
// ============================================

/**
 * Calculate total points for weekly score metrics
 * This replaces the SQL trigger: auto_calculate_points()
 *
 * @param metrics - The fitness metrics
 * @param scoringConfig - League-specific scoring config (optional)
 */
export function calculateTotalPoints(
  metrics: {
    steps: number;
    sleep_hours: number;
    calories: number;
    workouts: number;
    distance: number;
  },
  scoringConfig?: ScoringConfig | null
): number {
  const config = getScoringConfig(scoringConfig);

  return calculatePoints({
    steps: metrics.steps,
    sleepHours: metrics.sleep_hours,
    calories: metrics.calories,
    workouts: metrics.workouts,
    distance: metrics.distance,
  }, config);
}

/**
 * Upsert weekly score with app-calculated total_points
 * This bypasses the SQL trigger by calculating points in-app
 */
export async function upsertWeeklyScoreWithPoints(
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
  // Get league scoring config
  const { data: league } = await supabase
    .from('leagues')
    .select('scoring_config, season_scoring_config')
    .eq('id', leagueId)
    .single();

  // Use season_scoring_config if available (frozen at season start), otherwise use current config
  const scoringConfig = league?.season_scoring_config || league?.scoring_config || null;

  // Calculate points in-app
  const totalPoints = calculateTotalPoints(metrics, scoringConfig);

  // Upsert with calculated points
  const { data, error } = await supabase
    .from('weekly_scores')
    .upsert({
      league_id: leagueId,
      user_id: userId,
      week_number: weekNumber,
      steps: metrics.steps,
      sleep_hours: metrics.sleep_hours,
      calories: metrics.calories,
      workouts: metrics.workouts,
      stand_hours: 0, // Removed, always 0
      distance: metrics.distance,
      total_points: totalPoints,
      last_synced_at: new Date().toISOString(),
    }, {
      onConflict: 'league_id,user_id,week_number',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
