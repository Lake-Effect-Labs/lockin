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
import { PlayerScoreCard, PlayoffSeedCard } from '@/components/PlayerScoreCard';
import { colors } from '@/utils/colors';

// ============================================
// STANDINGS SCREEN
// Full league standings
// ============================================

export default function StandingsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard } = useLeagueStore();
  
  useEffect(() => {
    if (leagueId && user && !currentDashboard) {
      fetchDashboard(leagueId, user.id);
    }
  }, [leagueId, user]);
  
  if (!currentDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading standings...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { standings, league } = currentDashboard;
  const playoffSpots = 4;
  // Calculate weeks remaining (not including current week)
  const weeksRemaining = league.season_length_weeks - league.current_week;
  const isNearPlayoffs = weeksRemaining <= 2;
  
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
          <Text style={styles.title}>Standings</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Season Info */}
        <View style={styles.seasonInfo}>
          <View style={styles.seasonStat}>
            <Text style={styles.seasonValue}>Week {league.current_week}</Text>
            <Text style={styles.seasonLabel}>Current</Text>
          </View>
          <View style={styles.seasonDivider} />
          <View style={styles.seasonStat}>
            <Text style={styles.seasonValue}>{league.season_length_weeks}</Text>
            <Text style={styles.seasonLabel}>Total Weeks</Text>
          </View>
          <View style={styles.seasonDivider} />
          <View style={styles.seasonStat}>
            <Text style={styles.seasonValue}>{weeksRemaining}</Text>
            <Text style={styles.seasonLabel}>Remaining</Text>
          </View>
        </View>
        
        {/* Playoff Picture (if near playoffs) */}
        {isNearPlayoffs && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Playoff Picture</Text>
            <Text style={styles.sectionSubtitle}>
              Top {playoffSpots} qualify for playoffs
            </Text>
            <View style={styles.playoffSeeds}>
              {standings.slice(0, playoffSpots).map((member, index) => (
                <PlayoffSeedCard
                  key={member.id}
                  member={member}
                  seed={index + 1}
                  isQualified={true}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Full Standings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Full Standings</Text>
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.status.success }]} />
              <Text style={styles.legendText}>Playoff position</Text>
            </View>
          </View>
          
          {/* Standings List */}
          <View style={styles.standingsList}>
            {standings.map((member, index) => {
              const rank = index + 1;
              const isPlayoffSpot = rank <= playoffSpots;
              
              return (
                <View key={member.id}>
                  {rank === playoffSpots + 1 && (
                    <View style={styles.playoffLine}>
                      <View style={styles.playoffLineBar} />
                      <Text style={styles.playoffLineText}>Playoff cutoff</Text>
                      <View style={styles.playoffLineBar} />
                    </View>
                  )}
                  <View style={[
                    styles.standingCard,
                    isPlayoffSpot && styles.playoffCard,
                  ]}>
                    <PlayerScoreCard
                      member={member}
                      rank={rank}
                      isCurrentUser={member.user_id === user?.id}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Scoring Info */}
        <View style={styles.scoringInfo}>
          <Ionicons name="information-circle-outline" size={16} color={colors.text.tertiary} />
          <Text style={styles.scoringInfoText}>
            Standings sorted by wins, then total points (tiebreaker)
          </Text>
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
  seasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  seasonStat: {
    flex: 1,
    alignItems: 'center',
  },
  seasonValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  seasonLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  seasonDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.default,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  playoffSeeds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legend: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  standingsList: {
    gap: 8,
  },
  standingCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  playoffCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.status.success,
  },
  playoffLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  playoffLineBar: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  playoffLineText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  scoringInfoText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});

