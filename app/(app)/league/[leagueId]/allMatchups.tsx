import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { getMatchups, getLeagueWeeklyScores } from '@/services/supabase';
import { Matchup, WeeklyScore } from '@/services/supabase';
import { Avatar } from '@/components/Avatar';
import { colors, getScoreColor } from '@/utils/colors';

// ============================================
// ALL MATCHUPS SCREEN
// View all head-to-head matchups in the league
// ============================================

interface MatchupWithScores extends Matchup {
  player1Score?: WeeklyScore | null;
  player2Score?: WeeklyScore | null;
}

export default function AllMatchupsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard } = useLeagueStore();

  const [matchups, setMatchups] = useState<MatchupWithScores[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const loadMatchups = useCallback(async () => {
    if (!leagueId || !currentDashboard) return;

    try {
      const weekNumber = selectedWeek || currentDashboard.league.current_week;
      const [weekMatchups, weekScores] = await Promise.all([
        getMatchups(leagueId, weekNumber),
        getLeagueWeeklyScores(leagueId, weekNumber),
      ]);

      // Merge scores with matchups
      const matchupsWithScores: MatchupWithScores[] = weekMatchups.map(m => ({
        ...m,
        player1Score: weekScores.find(s => s.user_id === m.player1_id) || null,
        player2Score: weekScores.find(s => s.user_id === m.player2_id) || null,
      }));

      setMatchups(matchupsWithScores);
    } catch (error) {
      console.error('Error loading matchups:', error);
    } finally {
      setLoading(false);
    }
  }, [leagueId, currentDashboard, selectedWeek]);

  useEffect(() => {
    if (leagueId && user && !currentDashboard) {
      fetchDashboard(leagueId, user.id);
    }
  }, [leagueId, user]);

  useEffect(() => {
    if (currentDashboard) {
      setSelectedWeek(currentDashboard.league.current_week);
    }
  }, [currentDashboard]);

  useEffect(() => {
    if (currentDashboard && selectedWeek) {
      loadMatchups();
    }
  }, [currentDashboard, selectedWeek, loadMatchups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (leagueId && user) {
      await fetchDashboard(leagueId, user.id);
    }
    await loadMatchups();
    setRefreshing(false);
  }, [leagueId, user, loadMatchups]);

  if (!currentDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading matchups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { league, isResultsDay } = currentDashboard;
  const totalWeeks = league.season_length_weeks;
  const weeks = Array.from({ length: Math.min(league.current_week, totalWeeks) }, (_, i) => i + 1);

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
                router.replace(`/(app)/league/${leagueId}`);
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>All Matchups</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Week Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weekSelector}
          contentContainerStyle={styles.weekSelectorContent}
        >
          {weeks.map(week => (
            <TouchableOpacity
              key={week}
              style={[
                styles.weekPill,
                selectedWeek === week && styles.weekPillActive,
              ]}
              onPress={() => setSelectedWeek(week)}
            >
              <Text style={[
                styles.weekPillText,
                selectedWeek === week && styles.weekPillTextActive,
              ]}>
                Week {week}
              </Text>
              {week === league.current_week && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Day Banner */}
        {isResultsDay && selectedWeek === league.current_week && (
          <View style={styles.resultsBanner}>
            <Ionicons name="trophy" size={20} color={colors.primary[500]} />
            <Text style={styles.resultsBannerText}>
              Results Day - Final scores for the week
            </Text>
          </View>
        )}

        {/* Matchups List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : matchups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>No matchups for this week</Text>
          </View>
        ) : (
          <View style={styles.matchupsList}>
            {matchups.map((matchup, index) => (
              <MatchupRow
                key={matchup.id}
                matchup={matchup}
                currentUserId={user?.id || ''}
                matchNumber={index + 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Individual matchup row component
interface MatchupRowProps {
  matchup: MatchupWithScores;
  currentUserId: string;
  matchNumber: number;
}

function MatchupRow({ matchup, currentUserId, matchNumber }: MatchupRowProps) {
  const player1 = matchup.player1;
  const player2 = matchup.player2;

  const score1 = matchup.player1Score?.total_points ?? matchup.player1_score;
  const score2 = matchup.player2Score?.total_points ?? matchup.player2_score;

  const isUserMatch = matchup.player1_id === currentUserId || matchup.player2_id === currentUserId;

  const getMatchStatus = () => {
    if (!matchup.is_finalized) {
      return { text: 'Live', color: colors.primary[500], icon: 'radio-button-on' as const };
    }
    if (matchup.is_tie) {
      return { text: 'Tie', color: colors.text.secondary, icon: 'remove' as const };
    }
    return { text: 'Final', color: colors.status.success, icon: 'checkmark-circle' as const };
  };

  const status = getMatchStatus();
  const score1Color = getScoreColor(score1, score2);
  const score2Color = getScoreColor(score2, score1);

  return (
    <LinearGradient
      colors={isUserMatch
        ? [colors.primary[500] + '15', colors.primary[500] + '05']
        : [colors.background.card, colors.background.elevated]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.matchupCard,
        isUserMatch && styles.matchupCardHighlight,
      ]}
    >
      {/* Match Header */}
      <View style={styles.matchHeader}>
        <Text style={styles.matchNumber}>Match {matchNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon} size={12} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      {/* Players Row */}
      <View style={styles.playersRow}>
        {/* Player 1 */}
        <View style={styles.playerSide}>
          <Avatar
            uri={player1?.avatar_url}
            name={player1?.username}
            size="medium"
            showBorder={matchup.is_finalized && matchup.winner_id === matchup.player1_id}
            borderColor={colors.status.success}
          />
          <Text style={[
            styles.playerName,
            matchup.player1_id === currentUserId && styles.playerNameHighlight,
          ]} numberOfLines={1}>
            {player1?.username || 'Player 1'}
            {matchup.player1_id === currentUserId && ' (You)'}
          </Text>
          <Text style={[styles.score, { color: score1Color }]}>
            {score1.toFixed(1)}
          </Text>
        </View>

        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
        </View>

        {/* Player 2 */}
        <View style={styles.playerSide}>
          <Avatar
            uri={player2?.avatar_url}
            name={player2?.username}
            size="medium"
            showBorder={matchup.is_finalized && matchup.winner_id === matchup.player2_id}
            borderColor={colors.status.success}
          />
          <Text style={[
            styles.playerName,
            matchup.player2_id === currentUserId && styles.playerNameHighlight,
          ]} numberOfLines={1}>
            {player2?.username || 'Player 2'}
            {matchup.player2_id === currentUserId && ' (You)'}
          </Text>
          <Text style={[styles.score, { color: score2Color }]}>
            {score2.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Winner indicator */}
      {matchup.is_finalized && matchup.winner_id && (
        <View style={styles.winnerRow}>
          <Ionicons name="trophy" size={14} color={colors.sport.gold} />
          <Text style={styles.winnerText}>
            {matchup.winner_id === matchup.player1_id
              ? player1?.username
              : player2?.username
            } wins!
          </Text>
        </View>
      )}
    </LinearGradient>
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
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
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
  weekSelector: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  weekSelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background.card,
    borderRadius: 20,
    gap: 6,
    marginRight: 8,
  },
  weekPillActive: {
    backgroundColor: colors.primary[500],
  },
  weekPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  weekPillTextActive: {
    color: '#FFFFFF',
  },
  currentBadge: {
    backgroundColor: colors.sport.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.primary,
  },
  resultsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary[500] + '15',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  resultsBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 12,
  },
  matchupsList: {
    gap: 12,
  },
  matchupCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  matchupCardHighlight: {
    borderColor: colors.primary[500] + '40',
    borderWidth: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 100,
  },
  playerNameHighlight: {
    color: colors.primary[500],
  },
  score: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  vsDivider: {
    paddingHorizontal: 12,
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  vsText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  winnerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sport.gold,
  },
});
