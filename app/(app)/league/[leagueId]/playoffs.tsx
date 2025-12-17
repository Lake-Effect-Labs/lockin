import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// Lazy load ConfettiCannon to prevent crashes at module load time
let ConfettiCannon: any = null;
function getConfettiCannon() {
  if (!ConfettiCannon) {
    try {
      ConfettiCannon = require('react-native-confetti-cannon').default;
    } catch (error) {
      console.warn('ConfettiCannon not available:', error);
      ConfettiCannon = null;
    }
  }
  return ConfettiCannon;
}
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { BracketView, CompactBracket } from '@/components/BracketView';
import { Avatar } from '@/components/Avatar';
import { SeasonTimeline } from '@/components/WeekProgressBar';
import { colors } from '@/utils/colors';
import { buildPlayoffBracket, isUserChampion, getCurrentPlayoffRound, getPlayoffStatusText } from '@/services/playoffs';

// ============================================
// PLAYOFFS SCREEN
// Playoff bracket and results
// ============================================

const { width } = Dimensions.get('window');

export default function PlayoffsScreen() {
  const { leagueId } = useLocalSearchParams<{ leagueId: string }>();
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard } = useLeagueStore();
  const confettiRef = useRef<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (leagueId && user && !currentDashboard) {
      fetchDashboard(leagueId, user.id);
    }
  }, [leagueId, user]);
  
  // Show confetti if user is champion
  useEffect(() => {
    if (currentDashboard?.playoffBracket?.champion && 
        currentDashboard.playoffBracket.champion.id === user?.id) {
      setShowConfetti(true);
      setTimeout(() => {
        confettiRef.current?.start();
      }, 500);
    }
  }, [currentDashboard?.playoffBracket?.champion]);
  
  if (!currentDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading playoffs...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const { playoffBracket, league, members } = currentDashboard;
  
  if (!playoffBracket) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={styles.title}>Playoffs</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.noPlayoffs}>
          <Text style={styles.noPlayoffsEmoji}>🏆</Text>
          <Text style={styles.noPlayoffsTitle}>Playoffs Haven't Started</Text>
          <Text style={styles.noPlayoffsText}>
            Complete the regular season to unlock playoffs
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Determine playoff round based on bracket state
  const playoffRound = (() => {
    if (!playoffBracket.finals) {
      // Check if semifinals are done
      const semi1Done = playoffBracket.semifinals.match1.isFinalized;
      const semi2Done = playoffBracket.semifinals.match2.isFinalized;
      if (semi1Done && semi2Done) return 2; // Ready for finals
      return 1; // Semifinals in progress
    }
    if (playoffBracket.finals.isFinalized) return 3; // Champion crowned
    return 2; // Finals in progress
  })() as 0 | 1 | 2 | 3;
  const statusText = getPlayoffStatusText(playoffRound);
  const isChampion = playoffBracket.champion?.id === user?.id;
  
  return (
    <SafeAreaView style={styles.container}>
      {showConfetti && getConfettiCannon() && (
        React.createElement(getConfettiCannon(), {
          ref: confettiRef,
          count: 200,
          origin: { x: width / 2, y: 0 },
          autoStart: false,
          fadeOut: true,
          colors: [colors.sport.gold, colors.primary[500], colors.secondary[500], '#fff']
        })
      )}
      
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
          <Text style={styles.title}>Playoffs</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusEmoji}>
            {playoffRound === 3 ? '👑' : playoffRound === 2 ? '🔥' : '⚔️'}
          </Text>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
        
        {/* Timeline */}
        <SeasonTimeline
          currentWeek={league.current_week}
          totalWeeks={league.season_length_weeks}
          playoffsStarted={league.playoffs_started}
          isChampion={isChampion}
          style={styles.timeline}
        />
        
        {/* Champion Banner */}
        {playoffBracket.champion && (
          <View style={styles.championBanner}>
            <Text style={styles.championEmoji}>👑</Text>
            <Text style={styles.championLabel}>SEASON CHAMPION</Text>
            <Avatar
              uri={playoffBracket.champion.avatar_url}
              name={playoffBracket.champion.username}
              size="xlarge"
              showBorder
              borderColor={colors.sport.gold}
            />
            <Text style={styles.championName}>
              {playoffBracket.champion.username}
            </Text>
            {isChampion && (
              <Text style={styles.youAreChampion}>That's you! 🎉</Text>
            )}
          </View>
        )}
        
        {/* Bracket */}
        <View style={styles.bracketSection}>
          <Text style={styles.sectionTitle}>Playoff Bracket</Text>
          
          {width > 600 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BracketView
                bracket={playoffBracket}
                currentUserId={user?.id || ''}
              />
            </ScrollView>
          ) : (
            <CompactBracket bracket={playoffBracket} />
          )}
        </View>
        
        {/* Your Status */}
        {user && (
          <View style={styles.userStatus}>
            <Text style={styles.userStatusTitle}>Your Playoff Status</Text>
            <View style={styles.userStatusCard}>
              {isChampion ? (
                <>
                  <Text style={styles.userStatusEmoji}>🏆</Text>
                  <Text style={styles.userStatusText}>
                    Congratulations! You are the champion!
                  </Text>
                </>
              ) : playoffBracket.finals?.player1.user.id === user.id || 
                   playoffBracket.finals?.player2.user.id === user.id ? (
                <>
                  <Text style={styles.userStatusEmoji}>🔥</Text>
                  <Text style={styles.userStatusText}>
                    You're in the Finals! Give it your all!
                  </Text>
                </>
              ) : playoffBracket.semifinals.match1.player1.user.id === user.id ||
                   playoffBracket.semifinals.match1.player2.user.id === user.id ||
                   playoffBracket.semifinals.match2.player1.user.id === user.id ||
                   playoffBracket.semifinals.match2.player2.user.id === user.id ? (
                <>
                  <Text style={styles.userStatusEmoji}>⚔️</Text>
                  <Text style={styles.userStatusText}>
                    You're in the Semifinals! Keep pushing!
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.userStatusEmoji}>📺</Text>
                  <Text style={styles.userStatusText}>
                    Cheer on your league mates in the playoffs!
                  </Text>
                </>
              )}
            </View>
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
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statusEmoji: {
    fontSize: 24,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  timeline: {
    marginBottom: 24,
  },
  championBanner: {
    alignItems: 'center',
    backgroundColor: colors.sport.gold + '20',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.sport.gold,
  },
  championEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  championLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.sport.gold,
    letterSpacing: 2,
    marginBottom: 16,
  },
  championName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: 16,
  },
  youAreChampion: {
    fontSize: 16,
    color: colors.primary[500],
    marginTop: 8,
  },
  bracketSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 16,
  },
  userStatus: {
    marginBottom: 24,
  },
  userStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  userStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  userStatusEmoji: {
    fontSize: 32,
  },
  userStatusText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  noPlayoffs: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noPlayoffsEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  noPlayoffsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  noPlayoffsText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

