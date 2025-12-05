import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Share,
  Alert,
} from 'react-native';
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
import { getPointsBreakdown, getScoringConfig } from '@/services/scoring';
import { colors } from '@/utils/colors';

// ============================================
// LEAGUE DASHBOARD SCREEN
// Main league view with matchup and standings
// ============================================

export default function LeagueDashboardScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard, syncScore, isLoading } = useLeagueStore();
  const { weeklyTotals, lastSyncedAt, fakeMode } = useHealthStore();
  
  // Real-time sync - faster updates (30s) when viewing matchup
  const { refresh, isSyncing } = useRealtimeSync();
  const { opponentUpdate } = useMatchupSync(leagueId);
  
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    if (leagueId && user) {
      fetchDashboard(leagueId, user.id);
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
  
  // Sync health data to league score
  const handleSyncScore = async () => {
    if (!leagueId || !user || !weeklyTotals || !currentDashboard) return;
    
    await syncScore(
      leagueId,
      user.id,
      currentDashboard.league.current_week,
      weeklyTotals
    );
    await refresh(); // Sync after manual score update
    Alert.alert('Synced!', 'Your fitness data has been updated');
  };
  
  const handleShare = async () => {
    if (!currentDashboard) return;
    
    try {
      await Share.share({
        message: `Join my Lock-In league "${currentDashboard.league.name}"! Use code: ${currentDashboard.league.join_code}`,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  if (!currentDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading league...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { league, currentMatchup, userScore, opponentScore, standings, daysRemaining, isPlayoffs } = currentDashboard;
  
  // Get points breakdown if we have user score (use league-specific scoring config)
  const leagueScoringConfig = league.scoring_config 
    ? getScoringConfig(league.scoring_config)
    : undefined;
  const breakdown = userScore ? getPointsBreakdown({
    steps: userScore.steps,
    sleepHours: userScore.sleep_hours,
    calories: userScore.calories,
    workouts: userScore.workouts,
    distance: userScore.distance,
  }, leagueScoringConfig) : null;
  
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
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
            <Text style={styles.joinCode}>Code: {league.join_code}</Text>
          </View>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
          >
            <Ionicons name="share-outline" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Week Progress */}
        <WeekProgressBar
          currentWeek={league.current_week}
          totalWeeks={league.season_length_weeks}
          playoffsStarted={isPlayoffs}
          style={styles.progressBar}
        />
        
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
              <Text style={styles.sectionTitle}>Your Matchup</Text>
              {currentMatchup && <LiveIndicator isLive={!isPlayoffs} />}
            </View>
            {currentMatchup && <Countdown daysRemaining={daysRemaining} />}
          </View>
          
          {currentMatchup ? (
            <>
              <LiveMatchupCard
                matchup={currentMatchup}
                currentUserId={user?.id || ''}
                userScore={userScore}
                opponentScore={opponentScore}
                daysRemaining={daysRemaining}
                onPress={() => router.push(`/(app)/league/${leagueId}/matchup`)}
              />
              {lastSyncedAt && (
                <Text style={styles.lastSyncText}>
                  Scores updated {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isSyncing && ' • Syncing...'}
                </Text>
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
              {standings.length === 1 && (
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.inviteButton}
                >
                  <Ionicons name="share-outline" size={18} color={colors.text.primary} />
                  <Text style={styles.inviteButtonText}>Share League Code</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Your Stats */}
        {breakdown && (
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
        
        {/* Sync Button */}
        <TouchableOpacity
          onPress={handleSyncScore}
          activeOpacity={0.8}
          style={styles.syncButtonContainer}
          disabled={isSyncing}
        >
          <LinearGradient
            colors={isSyncing ? [colors.background.card, colors.background.elevated] : colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.syncButton}
          >
            <Ionicons 
              name={isSyncing ? "sync" : "sync-outline"} 
              size={20} 
              color={isSyncing ? colors.text.secondary : colors.text.primary} 
            />
            <Text style={[styles.syncButtonText, isSyncing && { color: colors.text.secondary }]}>
              {isSyncing ? 'Syncing...' : 'Sync Fitness Data'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Quick Standings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Standings</Text>
            <TouchableOpacity
              onPress={() => router.push(`/(app)/league/${leagueId}/standings`)}
            >
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.standingsList}>
            {standings.slice(0, 4).map((member, index) => (
              <PlayerScoreCard
                key={member.id}
                member={member}
                rank={index + 1}
                isCurrentUser={member.user_id === user?.id}
                style={styles.standingCard}
              />
            ))}
          </View>
        </View>
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
    color: colors.text.secondary,
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
  lastSyncText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
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
    color: colors.text.primary,
  },
});

