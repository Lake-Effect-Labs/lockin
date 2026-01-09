import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { MatchupCard } from '@/components/MatchupCard';
import { PointsBreakdown } from '@/components/StatBubble';
import { Avatar } from '@/components/Avatar';
import { SmartAdBanner } from '@/components/AdBanner';
import { getPointsBreakdown, getScoringConfig } from '@/services/scoring';
import { colors, getScoreColor } from '@/utils/colors';

// ============================================
// MATCHUP DETAIL SCREEN
// Detailed view of current matchup
// ============================================

export default function MatchupScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard } = useLeagueStore();
  const { refresh } = useRealtimeSync();
  
  useEffect(() => {
    if (leagueId && user) {
      // BUG FIX: Sync data when matchup screen loads to ensure scores are up-to-date
      refresh().catch(err => console.log('Sync on matchup load failed:', err));
      
      if (!currentDashboard) {
        fetchDashboard(leagueId, user.id);
      }
    }
  }, [leagueId, user, refresh]);
  
  if (!currentDashboard || !currentDashboard.currentMatchup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No active matchup</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { currentMatchup, userScore, opponentScore, league, daysRemaining, isResultsDay } = currentDashboard;
  
  // BUG FIX B3: Add null checks to prevent crashes when data is missing
  if (!currentMatchup || !league || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading matchup data...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const isPlayer1 = currentMatchup.player1_id === user?.id;
  const opponent = isPlayer1 ? currentMatchup.player2 : currentMatchup.player1;
  
  // BUG FIX B3: Handle missing opponent data gracefully
  if (!opponent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Opponent data not available</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Use league-specific scoring config with error handling
  let leagueScoringConfig: ReturnType<typeof getScoringConfig> | undefined;
  try {
    if (league.scoring_config) {
      const config = typeof league.scoring_config === 'string' 
        ? JSON.parse(league.scoring_config as string) 
        : league.scoring_config;
      leagueScoringConfig = getScoringConfig(config);
    }
  } catch (error) {
    console.error('Error parsing scoring config:', error);
    leagueScoringConfig = undefined;
  }
  
  const myBreakdown = userScore ? getPointsBreakdown({
    steps: userScore.steps || 0,
    sleepHours: userScore.sleep_hours || 0,
    calories: userScore.calories || 0,
    workouts: userScore.workouts || 0,
    distance: userScore.distance || 0,
  }, leagueScoringConfig) : null;
  
  const opponentBreakdown = opponentScore ? getPointsBreakdown({
    steps: opponentScore.steps || 0,
    sleepHours: opponentScore.sleep_hours || 0,
    calories: opponentScore.calories || 0,
    workouts: opponentScore.workouts || 0,
    distance: opponentScore.distance || 0,
  }, leagueScoringConfig) : null;
  
  // Use breakdown totals (current data) instead of matchup scores (may be outdated)
  // Add ?? 0 fallback to prevent .toFixed() crash
  const myScore = myBreakdown?.totalPoints ?? (isPlayer1 ? currentMatchup.player1_score : currentMatchup.player2_score) ?? 0;
  const theirScore = opponentBreakdown?.totalPoints ?? (isPlayer1 ? currentMatchup.player2_score : currentMatchup.player1_score) ?? 0;
  
  const myScoreColor = getScoreColor(myScore, theirScore);
  const theirScoreColor = getScoreColor(theirScore, myScore);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(`/(app)/league/${leagueId}`);
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Week {currentMatchup.week_number} Matchup</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Status Banner */}
        <View style={styles.statusBanner}>
          {isResultsDay ? (
            <>
              <View style={styles.resultsBadge}>
                <Ionicons name="trophy" size={16} color={colors.primary[500]} />
                <Text style={styles.resultsText}>RESULTS DAY</Text>
              </View>
              <Text style={styles.countdown}>
                Final scores • New week starts Monday
              </Text>
            </>
          ) : (
            <>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.countdown}>
                {daysRemaining === 0 
                  ? 'Week ends today!' 
                  : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                }
              </Text>
            </>
          )}
        </View>
        
        {/* Main Matchup Card */}
        <MatchupCard
          matchup={currentMatchup}
          currentUserId={user?.id || ''}
          userScore={userScore}
          opponentScore={opponentScore}
          calculatedMyScore={myScore}
          calculatedTheirScore={theirScore}
          style={styles.matchupCard}
        />
        
        {/* Ad Banner */}
        <SmartAdBanner placement="matchup" />
        
        {/* Score Comparison */}
        <View style={styles.comparison}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonTitle}>Score Breakdown</Text>
          </View>
          
          {/* Players Row */}
          <View style={styles.playersRow}>
            <View style={styles.playerColumn}>
              <Avatar
                uri={user?.avatar_url}
                name={user?.username}
                size="medium"
              />
              <Text style={styles.playerName}>You</Text>
            </View>
            <View style={styles.vsColumn}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.playerColumn}>
              <Avatar
                uri={opponent?.avatar_url}
                name={opponent?.username}
                size="medium"
              />
              <Text style={styles.playerName}>{opponent?.username || 'Opponent'}</Text>
            </View>
          </View>
          
          {/* Stats Comparison */}
          <View style={styles.statsComparison}>
            <StatComparisonRow
              icon="👟"
              label="Steps"
              value1={userScore?.steps || 0}
              value2={opponentScore?.steps || 0}
              format={(v) => v.toLocaleString()}
            />
            <StatComparisonRow
              icon="😴"
              label="Sleep"
              value1={userScore?.sleep_hours || 0}
              value2={opponentScore?.sleep_hours || 0}
              format={(v) => `${v.toFixed(1)}h`}
            />
            <StatComparisonRow
              icon="🔥"
              label="Calories"
              value1={userScore?.calories || 0}
              value2={opponentScore?.calories || 0}
              format={(v) => v.toLocaleString()}
            />
            <StatComparisonRow
              icon="💪"
              label="Workout Mins"
              value1={userScore?.workouts || 0}
              value2={opponentScore?.workouts || 0}
              format={(v) => `${v}m`}
            />
            <StatComparisonRow
              icon="🏃"
              label="Distance"
              value1={userScore?.distance || 0}
              value2={opponentScore?.distance || 0}
              format={(v) => `${v.toFixed(1)} mi`}
            />
          </View>
          
          {/* Total Points */}
          <View style={styles.totalRow}>
            <Text style={[styles.totalValue, { color: myScoreColor }]}>
              {myScore.toFixed(1)}
            </Text>
            <Text style={styles.totalLabel}>TOTAL POINTS</Text>
            <Text style={[styles.totalValue, { color: theirScoreColor }]}>
              {theirScore.toFixed(1)}
            </Text>
          </View>
        </View>
        
        {/* Your Detailed Breakdown */}
        {myBreakdown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Points Breakdown</Text>
            <PointsBreakdown
              steps={userScore?.steps || 0}
              stepsPoints={myBreakdown.stepsPoints}
              sleep={userScore?.sleep_hours || 0}
              sleepPoints={myBreakdown.sleepPoints}
              calories={userScore?.calories || 0}
              caloriesPoints={myBreakdown.caloriesPoints}
              workouts={userScore?.workouts || 0}
              workoutsPoints={myBreakdown.workoutsPoints}
              distance={userScore?.distance || 0}
              distancePoints={myBreakdown.distancePoints}
              totalPoints={myBreakdown.totalPoints}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Stat comparison row component
interface StatComparisonRowProps {
  icon: string;
  label: string;
  value1: number;
  value2: number;
  format: (v: number) => string;
}

function StatComparisonRow({ icon, label, value1, value2, format }: StatComparisonRowProps) {
  const isWinning = value1 > value2;
  const isLosing = value1 < value2;
  
  return (
    <View style={styles.statRow}>
      <Text style={[
        styles.statValue,
        isWinning && styles.statWinning,
        isLosing && styles.statLosing,
      ]}>
        {format(value1)}
      </Text>
      <View style={styles.statCenter}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[
        styles.statValue,
        !isWinning && !isLosing ? {} : isWinning ? styles.statLosing : styles.statWinning,
      ]}>
        {format(value2)}
      </Text>
    </View>
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
    justifyContent: 'space-between',
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.status.error,
    letterSpacing: 1,
  },
  resultsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[500],
    letterSpacing: 1,
  },
  countdown: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  matchupCard: {
    marginBottom: 20,
  },
  comparison: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 24,
  },
  comparisonHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
  },
  vsColumn: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  statsComparison: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statWinning: {
    color: colors.status.success,
  },
  statLosing: {
    color: colors.status.error,
  },
  statCenter: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  totalValue: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
  },
  totalLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
});

