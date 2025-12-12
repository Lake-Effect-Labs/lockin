import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useRealtimeSync, useMatchupSync } from '@/hooks/useRealtimeSync';
import { LiveMatchupCard } from '@/components/MatchupCard';
import { PlayerScoreCard } from '@/components/PlayerScoreCard';
import { WeekProgressBar, Countdown } from '@/components/WeekProgressBar';
import { PointsBreakdown } from '@/components/StatBubble';
import { SyncStatusIndicator, LiveIndicator } from '@/components/SyncStatusIndicator';
import { SmartAdBanner } from '@/components/AdBanner';
import { getPointsBreakdown, getScoringConfig } from '@/services/scoring';
import { colors } from '@/utils/colors';
import { WeeklyRecap } from '@/components/WeeklyRecap';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMatchups, getWeeklyScore } from '@/services/supabase';
import { getLeagueDashboard } from '@/services/league';

// ============================================
// LEAGUE DASHBOARD SCREEN
// Main league view with matchup and standings
// ============================================

const LAST_WEEK_KEY_PREFIX = 'last_week_';

export default function LeagueDashboardScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard, isLoading } = useLeagueStore();
  const { weeklyTotals, lastSyncedAt, fakeMode } = useHealthStore();
  
  // Real-time sync - faster updates (30s) when viewing matchup
  const { refresh, isSyncing } = useRealtimeSync();
  const { opponentUpdate } = useMatchupSync(leagueId);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapData, setRecapData] = useState<any>(null);
  
  useEffect(() => {
    if (leagueId && user) {
      fetchDashboard(leagueId, user.id);
      
      // Check and process week end when dashboard loads
      // This ensures weeks finalize automatically
      const checkWeekEnd = async () => {
        try {
          const { checkWeekEnd } = useLeagueStore.getState();
          
          // Get previous week number before checking
          const lastWeekKey = `${LAST_WEEK_KEY_PREFIX}${leagueId}`;
          const lastWeekStr = await AsyncStorage.getItem(lastWeekKey);
          const lastWeek = lastWeekStr ? parseInt(lastWeekStr, 10) : null;
          
          const weekAdvanced = await checkWeekEnd(leagueId);
          
          // Refresh dashboard after week check (in case week advanced)
          if (weekAdvanced) {
            await fetchDashboard(leagueId, user.id);
            
            // If week advanced and we have a previous week, show recap
            if (lastWeek !== null && lastWeek > 0) {
              // Get finalized matchup data for the previous week
              try {
                const allMatchups = await getMatchups(leagueId, lastWeek);
                const previousMatchup = allMatchups.find(
                  m => m.week_number === lastWeek &&
                  (m.player1_id === user.id || m.player2_id === user.id) &&
                  m.is_finalized
                );
                
                if (previousMatchup) {
                  const isPlayer1 = previousMatchup.player1_id === user.id;
                  const opponentId = isPlayer1 
                    ? previousMatchup.player2_id 
                    : previousMatchup.player1_id;
                  const opponentName = isPlayer1
                    ? previousMatchup.player2?.username || 'Opponent'
                    : previousMatchup.player1?.username || 'Opponent';
                  
                  const [userScoreData, opponentScoreData] = await Promise.all([
                    getWeeklyScore(leagueId, user.id, lastWeek),
                    getWeeklyScore(leagueId, opponentId, lastWeek),
                  ]);
                  
                  // Get user's rank in standings
                  const dashboard = await getLeagueDashboard(leagueId, user.id);
                  const userStanding = dashboard.standings.findIndex(
                    (s: any) => s.user_id === user.id
                  );
                  const userRank = userStanding >= 0 ? userStanding + 1 : dashboard.standings.length;
                  
                  setRecapData({
                    weekNumber: lastWeek,
                    matchup: previousMatchup,
                    userScore: userScoreData,
                    opponentScore: opponentScoreData,
                    userRank,
                    totalPlayers: dashboard.standings.length,
                    leagueName: dashboard.league.name,
                    scoringConfig: dashboard.league.scoring_config,
                    opponentName,
                    userName: user.username || 'You',
                  });
                  
                  setShowRecap(true);
                }
              } catch (error) {
                console.error('Error loading recap data:', error);
              }
            }
          }
          
          // Update stored week number
          if (currentDashboard?.league) {
            await AsyncStorage.setItem(
              lastWeekKey,
              currentDashboard.league.current_week.toString()
            );
          }
        } catch (error) {
          // Silently fail - week check is not critical for display
        }
      };
      checkWeekEnd();
    }
  }, [leagueId, user]);
  
  // Refetch when opponent updates their score
  useEffect(() => {
    if (opponentUpdate && leagueId && user) {
      fetchDashboard(leagueId, user.id);
    }
  }, [opponentUpdate]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (leagueId && user) {
      await Promise.all([
        fetchDashboard(leagueId, user.id),
        refresh(), // Use real-time sync
      ]);
    }
    setRefreshing(false);
  }, [leagueId, user, refresh]);
  
  
  const handleCopyCode = async () => {
    if (!currentDashboard) return;
    
    const joinCode = currentDashboard.league.join_code;
    await Clipboard.setStringAsync(joinCode);
    Alert.alert('Copied!', `Join code "${joinCode}" copied to clipboard`);
  };
  
  const handleShare = async () => {
    if (!currentDashboard) return;
    
    const joinCode = currentDashboard.league.join_code;
    const leagueName = currentDashboard.league.name;
    
    // Simple share message
    const shareMessage = `Join my Lock-In fitness league: "${leagueName}"

Join Code: ${joinCode}`;
    
    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  const handleStartLeague = async () => {
    if (!currentDashboard || !user) return;
    
    Alert.alert(
      'Start League',
      'Are you sure you want to start the league? This will generate matchups for Week 1.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          style: 'destructive',
          onPress: async () => {
            try {
              const { startLeague } = await import('@/services/admin');
              await startLeague(leagueId, user.id);
              // Refresh dashboard
              await fetchDashboard(leagueId, user.id);
              Alert.alert('Success', 'League started! Matchups have been generated.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to start league');
            }
          },
        },
      ]
    );
  };
  
  const handleDeleteLeague = async () => {
    if (!currentDashboard || !user) return;
    
    Alert.alert(
      'Delete League',
      'Are you sure you want to delete this league? This action cannot be undone. All data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleteLeague } = await import('@/services/admin');
              await deleteLeague(leagueId, user.id);
              Alert.alert('Success', 'League deleted.');
              router.replace('/(app)/home');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete league');
            }
          },
        },
      ]
    );
  };
  
  const handleRemoveMember = async (userIdToRemove: string, username: string) => {
    if (!user) return;
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${username} from this league?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { removeUserFromLeague } = await import('@/services/admin');
              await removeUserFromLeague(leagueId, userIdToRemove, user.id);
              // Refresh dashboard
              await fetchDashboard(leagueId, user.id);
              Alert.alert('Success', `${username} has been removed from the league.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };
  
  if (!currentDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading league...</Text>
          {isLoading && (
            <Text style={styles.loadingSubtext}>Fetching your matchup and standings...</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }
  
  const { league, currentMatchup, userScore, opponentScore, standings, daysRemaining, isPlayoffs, isAdmin, members } = currentDashboard;
  
  // Get points breakdown if we have user score (use league-specific scoring config)
  // Handle scoring_config which might be a JSON string or object
  let leagueScoringConfig: ReturnType<typeof getScoringConfig> | undefined;
  try {
    if (league.scoring_config) {
      // If it's a string, parse it first
      const config = typeof league.scoring_config === 'string' 
        ? JSON.parse(league.scoring_config) 
        : league.scoring_config;
      leagueScoringConfig = getScoringConfig(config);
    }
  } catch (error) {
    console.error('Error parsing scoring config:', error);
    // Use default config if parsing fails
    leagueScoringConfig = undefined;
  }
  
  let breakdown: ReturnType<typeof getPointsBreakdown> | null = null;
  let opponentBreakdown: ReturnType<typeof getPointsBreakdown> | null = null;
  
  try {
    if (userScore) {
      breakdown = getPointsBreakdown({
        steps: userScore.steps || 0,
        sleepHours: userScore.sleep_hours || 0,
        calories: userScore.calories || 0,
        workouts: userScore.workouts || 0,
        distance: userScore.distance || 0,
      }, leagueScoringConfig);
    }
    
    if (opponentScore) {
      opponentBreakdown = getPointsBreakdown({
        steps: opponentScore.steps || 0,
        sleepHours: opponentScore.sleep_hours || 0,
        calories: opponentScore.calories || 0,
        workouts: opponentScore.workouts || 0,
        distance: opponentScore.distance || 0,
      }, leagueScoringConfig);
    }
  } catch (error) {
    console.error('Error calculating points breakdown:', error);
    // Set to null if calculation fails - UI will handle gracefully
    breakdown = null;
    opponentBreakdown = null;
  }
  
  // Calculate current scores (use breakdown totals for accuracy)
  const calculatedMyScore = breakdown?.totalPoints ?? userScore?.total_points ?? 0;
  const calculatedOpponentScore = opponentBreakdown?.totalPoints ?? opponentScore?.total_points ?? 0;
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(app)/home');
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
            <TouchableOpacity 
              onPress={handleCopyCode}
              style={styles.codeContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.joinCode}>Code: {league.join_code}</Text>
              <Ionicons name="copy-outline" size={16} color={colors.text.secondary} style={styles.copyIcon} />
            </TouchableOpacity>
          </View>
          {standings.length < league.max_players && (
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareButton}
            >
              <Ionicons name="share-outline" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Week Progress */}
        <WeekProgressBar
          currentWeek={league.current_week}
          totalWeeks={league.season_length_weeks}
          playoffsStarted={isPlayoffs}
          hasStarted={!!league.start_date}
          style={styles.progressBar}
        />
        
        {/* Playoff Explanation Banner */}
        {isPlayoffs && !currentDashboard.playoffBracket && (
          <View style={styles.playoffInfoBanner}>
            <Ionicons name="trophy" size={24} color={colors.sport.gold} />
            <View style={styles.playoffInfoContent}>
              <Text style={styles.playoffInfoTitle}>Playoffs Started! 🏆</Text>
              <Text style={styles.playoffInfoText}>
                Top 4 players compete in semifinals, then finals. Check the Playoffs tab to see the bracket!
              </Text>
            </View>
          </View>
        )}
        
        {/* Navigation Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, styles.tabActive]}>
            <Ionicons name="home" size={18} color={colors.primary[500]} />
            <Text style={[styles.tabText, styles.tabTextActive]}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tab}
            onPress={() => router.push(`/(app)/league/${leagueId}/standings`)}
          >
            <Ionicons name="list" size={18} color={colors.text.secondary} />
            <Text style={styles.tabText}>Standings</Text>
          </TouchableOpacity>
          {isPlayoffs && (
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => router.push(`/(app)/league/${leagueId}/playoffs`)}
            >
              <Ionicons name="trophy" size={18} color={colors.text.secondary} />
              <Text style={styles.tabText}>Playoffs</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Current Matchup */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.matchupTitleRow}>
              <Text style={styles.sectionTitle}>
                {league.start_date ? 'Your Matchup' : 'Waiting to Start'}
              </Text>
              {currentMatchup && league.start_date && <LiveIndicator isLive={!isPlayoffs} />}
            </View>
            {currentMatchup && league.start_date && <Countdown daysRemaining={daysRemaining} />}
          </View>
          
          {!league.start_date ? (
            <View style={styles.waitingContainer}>
              <Ionicons name="hourglass-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.waitingText}>
                {members.length >= league.max_players 
                  ? `League is full! Starting on ${league.start_date ? new Date(league.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'next Monday'}.`
                  : `The league will start on the next Monday once ${league.max_players} players have joined.`}
              </Text>
              <Text style={styles.waitingSubtext}>
                {members.length} of {league.max_players} players
                {members.length >= league.max_players && league.start_date && (
                  <Text style={styles.startDateText}>
                    {'\n'}Starts: {new Date(league.start_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                )}
              </Text>
            </View>
          ) : currentMatchup ? (
            <>
              <LiveMatchupCard
                matchup={currentMatchup}
                currentUserId={user?.id || ''}
                userScore={userScore}
                opponentScore={opponentScore}
                calculatedMyScore={calculatedMyScore}
                calculatedTheirScore={calculatedOpponentScore}
                daysRemaining={daysRemaining}
                onPress={() => router.push(`/(app)/league/${leagueId}/matchup`)}
              />
              {lastSyncedAt && (
                <View style={styles.syncInfoContainer}>
                  <Text style={styles.lastSyncText}>
                    Scores updated {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isSyncing && ' • Syncing...'}
                  </Text>
                  {daysRemaining > 0 && daysRemaining <= 2 && (
                    <Text style={styles.weekEndWarning}>
                      ⚠️ Week ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}! Make sure your data is synced.
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyMatchupContainer}>
              <Ionicons name="people-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyMatchupTitle}>No Matchup Yet</Text>
              <Text style={styles.emptyMatchupText}>
                {standings.length === 1 
                  ? "You're the only player in this league. Invite friends to start competing!"
                  : "Waiting for matchups to be generated. The season will start once there are enough players."}
              </Text>
              {standings.length < league.max_players && (
                <View style={styles.inviteWidgetContainer}>
                  <InviteWidget
                    leagueName={league.name}
                    joinCode={league.join_code}
                    onCopy={handleCopyCode}
                    onShare={handleShare}
                    compact
                  />
                </View>
              )}
            </View>
          )}
        </View>
        
        {/* Ad Banner */}
        <SmartAdBanner placement="league" />
        
        {/* Your Stats */}
        {breakdown && league.start_date && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Week {league.current_week} Stats</Text>
            <PointsBreakdown
              steps={userScore?.steps || 0}
              stepsPoints={breakdown.stepsPoints}
              sleep={userScore?.sleep_hours || 0}
              sleepPoints={breakdown.sleepPoints}
              calories={userScore?.calories || 0}
              caloriesPoints={breakdown.caloriesPoints}
              workouts={userScore?.workouts || 0}
              workoutsPoints={breakdown.workoutsPoints}
              distance={userScore?.distance || 0}
              distancePoints={breakdown.distancePoints}
              totalPoints={breakdown.totalPoints}
            />
          </View>
        )}
        
        {/* Weekly Recap Modal */}
        {recapData && (
          <WeeklyRecap
            visible={showRecap}
            onClose={() => {
              setShowRecap(false);
              setRecapData(null);
            }}
            weekNumber={recapData.weekNumber}
            matchup={recapData.matchup}
            userScore={recapData.userScore}
            opponentScore={recapData.opponentScore}
            userRank={recapData.userRank}
            totalPlayers={recapData.totalPlayers}
            leagueName={recapData.leagueName}
            scoringConfig={recapData.scoringConfig}
            opponentName={recapData.opponentName}
            userName={recapData.userName}
          />
        )}
        
        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>League Admin</Text>
              </View>
            </View>
            
            <View style={styles.adminActions}>
              {!league.start_date && (
                <TouchableOpacity
                  style={styles.adminButton}
                  onPress={handleStartLeague}
                >
                  <Ionicons name="play-circle" size={20} color={colors.primary[500]} />
                  <Text style={styles.adminButtonText}>Start League</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.adminButton, styles.adminButtonDanger]}
                onPress={handleDeleteLeague}
              >
                <Ionicons name="trash-outline" size={20} color={colors.status.error} />
                <Text style={[styles.adminButtonText, { color: colors.status.error }]}>
                  Delete League
                </Text>
              </TouchableOpacity>
            </View>
            
            {!league.start_date && standings.length > 1 && (
              <View style={styles.adminMembers}>
                <Text style={styles.adminMembersTitle}>Remove Members</Text>
                {standings.filter(m => m.user_id !== user?.id).map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.adminMemberRow}
                    onPress={() => handleRemoveMember(member.user_id, member.user?.username || 'Unknown')}
                  >
                    <Text style={styles.adminMemberName}>
                      {member.user?.username || 'Unknown'}
                    </Text>
                    <Ionicons name="close-circle" size={20} color={colors.status.error} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  leagueName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  joinCode: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  copyIcon: {
    marginLeft: 4,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.primary[500] + '20',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  adminActions: {
    gap: 12,
    marginTop: 12,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  adminButtonDanger: {
    borderColor: colors.status.error + '40',
    backgroundColor: colors.status.error + '10',
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  adminMembers: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  adminMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
  },
  adminMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    marginBottom: 8,
  },
  adminMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  matchupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  syncInfoContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  lastSyncText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  weekEndWarning: {
    fontSize: 12,
    color: colors.status.warning,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  playoffInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.sport.gold + '20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.sport.gold + '40',
    gap: 12,
  },
  playoffInfoContent: {
    flex: 1,
  },
  playoffInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  playoffInfoText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  syncButtonContainer: {
    marginBottom: 24,
  },
  syncButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  standingsList: {
    gap: 8,
  },
  standingCard: {
    marginBottom: 0,
  },
  emptyMatchupContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  emptyMatchupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMatchupText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  waitingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  waitingSubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  startDateText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '600',
    marginTop: 4,
  },
  inviteWidgetContainer: {
    width: '100%',
    marginTop: 20,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.primary[500],
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

