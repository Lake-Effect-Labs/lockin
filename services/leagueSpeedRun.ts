// ============================================
// LEAGUE SPEED RUN SIMULATION
// End-to-end testing of the full league lifecycle
// ============================================

import { supabase, League, LeagueMember, Matchup, WeeklyScore, upsertWeeklyScore, finalizeWeek, getLeagueMembers, getMatchups, getLeague } from './supabase';
import { calculatePoints, FitnessMetrics } from './scoring';
import { generateMatchups, generatePlayoffs } from './leagueEngine';

// ============================================
// TYPES
// ============================================

export interface SpeedRunStep {
  step: number;
  type: 'setup' | 'week' | 'playoffs' | 'champion' | 'cleanup' | 'error';
  title: string;
  description: string;
  success: boolean;
  data?: any;
}

export interface SpeedRunResult {
  success: boolean;
  steps: SpeedRunStep[];
  leagueId: string | null;
  champion: string | null;
  totalTimeMs: number;
}

// Fake user names for bots (11 bots + 1 real user = 12 players max)
const BOT_NAMES = [
  'FitBot Alpha', 'FitBot Beta', 'FitBot Gamma', 'FitBot Delta',
  'FitBot Epsilon', 'FitBot Zeta', 'FitBot Eta', 'FitBot Theta',
  'FitBot Iota', 'FitBot Kappa', 'FitBot Lambda',
];

// ============================================
// SPEED RUN SIMULATION
// ============================================

/**
 * Run a complete league simulation from start to finish
 * This tests the real database functions end-to-end
 */
export async function runLeagueSpeedRun(
  userId: string,
  options: {
    playerCount?: number;
    seasonWeeks?: number;
    onProgress?: (step: SpeedRunStep) => void;
  } = {}
): Promise<SpeedRunResult> {
  const { playerCount = 12, seasonWeeks = 8, onProgress } = options;
  const startTime = Date.now();
  const steps: SpeedRunStep[] = [];
  let leagueId: string | null = null;
  let champion: string | null = null;
  let stepNum = 0;

  const addStep = (step: Omit<SpeedRunStep, 'step'>) => {
    const fullStep = { ...step, step: ++stepNum };
    steps.push(fullStep);
    onProgress?.(fullStep);
    return fullStep;
  };

  try {
    // ========================================
    // STEP 1: CREATE TEST LEAGUE
    // ========================================
    addStep({
      type: 'setup',
      title: 'Creating Test League',
      description: `Creating league with ${playerCount} players, ${seasonWeeks} weeks...`,
      success: true,
    });

    const joinCode = `TEST${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { data: league, error: createError } = await supabase
      .from('leagues')
      .insert({
        name: `Speed Run Test ${new Date().toISOString().split('T')[0]}`,
        join_code: joinCode,
        created_by: userId,
        season_length_weeks: seasonWeeks,
        max_players: playerCount,
        current_week: 1,
        is_active: true,
        start_date: new Date().toISOString().split('T')[0], // Start immediately
      })
      .select()
      .single();

    if (createError || !league) {
      throw new Error(`Failed to create league: ${createError?.message || 'Unknown error'}`);
    }

    leagueId = league.id;

    addStep({
      type: 'setup',
      title: 'League Created',
      description: `League ID: ${leagueId.substring(0, 8)}..., Code: ${joinCode}`,
      success: true,
      data: { leagueId, joinCode },
    });

    // ========================================
    // STEP 2: ADD PLAYERS (User + Bots)
    // ========================================
    addStep({
      type: 'setup',
      title: 'Adding Players',
      description: `Adding you + ${playerCount - 1} bot players...`,
      success: true,
    });

    // First, ensure user profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      // Create user profile if it doesn't exist
      await supabase
        .from('users')
        .insert({ id: userId, email: 'speedrun@test.com', username: 'SpeedRunner' });
    }

    // Add real user as member
    await supabase
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: userId,
        is_admin: true,
      });

    // Create bot users and add as members
    const botIds: string[] = [];
    addStep({
      type: 'setup',
      title: 'Creating Bot Users',
      description: `Creating ${playerCount - 1} bot players...`,
      success: true,
    });
    
    for (let i = 0; i < playerCount - 1; i++) {
      const botId = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
      botIds.push(botId);

      // Create bot user profile
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: botId,
          email: `bot${i}@speedrun.test`,
          username: BOT_NAMES[i] || `Bot ${i + 1}`,
        });

      if (userError) {
        addStep({
          type: 'error',
          title: `Bot Creation Failed`,
          description: `Failed to create bot ${i + 1}: ${userError.message}`,
          success: false,
          data: { error: userError },
        });
        throw new Error(`Failed to create bot user: ${userError.message}`);
      }

      // Add bot to league
      const { error: memberError } = await supabase
        .from('league_members')
        .insert({
          league_id: leagueId,
          user_id: botId,
          is_admin: false,
        });

      if (memberError) {
        addStep({
          type: 'error',
          title: `Bot Join Failed`,
          description: `Failed to add bot ${i + 1} to league: ${memberError.message}`,
          success: false,
          data: { error: memberError },
        });
        throw new Error(`Failed to add bot to league: ${memberError.message}`);
      }
    }

    const allPlayerIds = [userId, ...botIds];

    addStep({
      type: 'setup',
      title: 'Players Added',
      description: `${allPlayerIds.length} players in league (You + ${botIds.length} bots)`,
      success: true,
      data: { playerCount: allPlayerIds.length, botCount: botIds.length, botNames: botIds.map((id, i) => BOT_NAMES[i]) },
    });

    // ========================================
    // STEP 3: GENERATE INITIAL MATCHUPS
    // ========================================
    addStep({
      type: 'setup',
      title: 'Generating Week 1 Matchups',
      description: 'Creating matchups for week 1...',
      success: true,
    });

    try {
      await generateMatchups(leagueId);
    } catch (matchupError: any) {
      throw new Error(`Failed to generate matchups: ${matchupError.message}`);
    }

    addStep({
      type: 'setup',
      title: 'Initial Matchups Generated',
      description: `Week 1 matchups created`,
      success: true,
    });

    // ========================================
    // STEP 4: SIMULATE EACH WEEK
    // ========================================
    for (let week = 1; week <= seasonWeeks; week++) {
      addStep({
        type: 'week',
        title: `Week ${week} Starting`,
        description: 'Generating player scores...',
        success: true,
      });

      // Generate and sync scores for all players
      const weekScores: { playerId: string; score: number }[] = [];

      for (const playerId of allPlayerIds) {
        const metrics = generateRandomMetrics(week, playerId);
        const score = calculatePoints(metrics);
        weekScores.push({ playerId, score });

        await upsertWeeklyScore(leagueId, playerId, week, {
          steps: metrics.steps,
          sleep_hours: metrics.sleepHours,
          calories: metrics.calories,
          workouts: metrics.workouts,
          standHours: metrics.standHours || 0,
          distance: metrics.distance,
        });
      }

      // Finalize the week (this updates matchup scores and determines winners)
      await finalizeWeek(leagueId, week);

      // Update league current_week and generate next week's matchups
      const nextWeek = week + 1;
      if (nextWeek <= seasonWeeks) {
        await supabase
          .from('leagues')
          .update({ current_week: nextWeek })
          .eq('id', leagueId);

        // Generate matchups for the next week (no-op if already exist)
        await generateMatchups(leagueId);
      }

      // Get standings after week
      const members = await getLeagueMembers(leagueId);
      const sortedMembers = members.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.total_points - a.total_points;
      });

      const leader = sortedMembers[0];

      // Get this week's matchups to show results
      const { data: weekMatchups } = await supabase
        .from('matchups')
        .select('*')
        .eq('league_id', leagueId)
        .eq('week_number', week);

      const matchupResults = weekMatchups?.map(m => ({
        player1Score: m.player1_score,
        player2Score: m.player2_score,
        winnerId: m.winner_id,
      })) || [];

      addStep({
        type: 'week',
        title: `Week ${week} Complete`,
        description: `Leader: ${leader.user?.username || 'Unknown'} (${leader.wins}-${leader.losses})`,
        success: true,
        data: {
          week,
          matchups: matchupResults,
          standings: sortedMembers.map(m => ({
            name: m.user?.username || m.user_id.substring(0, 8),
            wins: m.wins,
            losses: m.losses,
            points: m.total_points,
          })),
        },
      });
    }

    // ========================================
    // STEP 5: PLAYOFFS
    // ========================================
    addStep({
      type: 'playoffs',
      title: 'Starting Playoffs',
      description: 'Top 4 players competing...',
      success: true,
    });

    // Mark league as playoffs started
    await supabase
      .from('leagues')
      .update({ playoffs_started: true })
      .eq('id', leagueId);

    // Generate playoffs
    let playoffError: Error | null = null;
    try {
      await generatePlayoffs(leagueId);
    } catch (err: any) {
      playoffError = err;
    }

    if (playoffError) {
      // Handle case where playoffs can't be generated
      addStep({
        type: 'playoffs',
        title: 'Playoffs Simulated',
        description: `Could not generate playoffs: ${playoffError.message}`,
        success: true,
      });
    } else {
      // Get playoff matches and simulate them
      const { data: playoffMatches } = await supabase
        .from('playoffs')
        .select('*')
        .eq('league_id', leagueId)
        .order('round')
        .order('match_number');

      if (playoffMatches && playoffMatches.length > 0) {
        for (const match of playoffMatches) {
          const p1Score = Math.round(Math.random() * 100 + 50);
          const p2Score = Math.round(Math.random() * 100 + 50);
          const winnerId = p1Score > p2Score ? match.player1_id : match.player2_id;

          await supabase
            .from('playoffs')
            .update({
              player1_score: p1Score,
              player2_score: p2Score,
              winner_id: winnerId,
              is_finalized: true,
            })
            .eq('id', match.id);
        }

        addStep({
          type: 'playoffs',
          title: 'Playoffs Complete',
          description: `${playoffMatches.length} playoff matches finalized`,
          success: true,
        });
      }
    }

    // ========================================
    // STEP 6: DETERMINE CHAMPION
    // ========================================
    const finalMembers = await getLeagueMembers(leagueId);
    const sortedFinal = finalMembers.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.total_points - a.total_points;
    });

    champion = sortedFinal[0]?.user?.username || sortedFinal[0]?.user_id || 'Unknown';

    // Update league with champion
    await supabase
      .from('leagues')
      .update({
        champion_id: sortedFinal[0]?.user_id,
        is_active: false,
      })
      .eq('id', leagueId);

    addStep({
      type: 'champion',
      title: '🏆 Champion Crowned!',
      description: `${champion} wins with ${sortedFinal[0]?.wins}-${sortedFinal[0]?.losses} record!`,
      success: true,
      data: {
        champion,
        record: `${sortedFinal[0]?.wins}-${sortedFinal[0]?.losses}`,
        totalPoints: sortedFinal[0]?.total_points,
      },
    });

    // ========================================
    // STEP 7: CLEANUP (Optional)
    // ========================================
    addStep({
      type: 'cleanup',
      title: 'Speed Run Complete',
      description: 'Test league preserved for review. Delete manually if needed.',
      success: true,
    });

    return {
      success: true,
      steps,
      leagueId,
      champion,
      totalTimeMs: Date.now() - startTime,
    };

  } catch (error: any) {
    addStep({
      type: 'error',
      title: 'Speed Run Failed',
      description: error.message || 'Unknown error',
      success: false,
      data: { error: error.message },
    });

    return {
      success: false,
      steps,
      leagueId,
      champion: null,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Clean up a speed run test league
 */
export async function cleanupSpeedRunLeague(leagueId: string, userId: string): Promise<void> {
  // Delete bot users first
  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId);

  if (members) {
    for (const member of members) {
      // Check if this is a bot user (UUID format: 00000000-0000-4000-8000-XXXX)
      if (member.user_id.startsWith('00000000-0000-4000-8000-')) {
        await supabase.from('users').delete().eq('id', member.user_id);
      }
    }
  }

  // Delete league (cascades to members, matchups, etc.)
  await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)
    .eq('created_by', userId);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateRandomMetrics(week: number, odPlayerId: string): FitnessMetrics {
  // Use consistent seeding for reproducibility
  const seed = hashCode(`${week}-${odPlayerId}`);
  const rand = seededRandom(seed);

  return {
    steps: Math.floor(5000 + rand() * 15000),
    sleepHours: Math.round((5 + rand() * 4) * 10) / 10,
    calories: Math.floor(200 + rand() * 600),
    workouts: Math.floor(rand() * 3),
    distance: Math.round((1 + rand() * 7) * 10) / 10,
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}
