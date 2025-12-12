import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Share } from 'react-native';
import { colors } from '@/utils/colors';
import { Matchup, WeeklyScore, LeagueMember } from '@/services/supabase';
import { getPointsBreakdown, getScoringConfig } from '@/services/scoring';

// Sub-components for better organization
interface StatsSectionProps {
  breakdown: any;
  userScore: WeeklyScore;
}

function StatsSection({ breakdown, userScore }: StatsSectionProps) {
  if (!breakdown) return null;

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.sectionTitle}>Your Stats</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>👟</Text>
          <Text style={styles.statValue}>
            {userScore.steps.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Steps</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>😴</Text>
          <Text style={styles.statValue}>
            {userScore.sleep_hours.toFixed(1)}h
          </Text>
          <Text style={styles.statLabel}>Sleep</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>
            {userScore.calories.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>💪</Text>
          <Text style={styles.statValue}>{userScore.workouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>🏃</Text>
          <Text style={styles.statValue}>
            {userScore.distance.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Miles</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statValue}>
            {breakdown.totalPoints.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>
    </View>
  );
}

interface LeagueStandingProps {
  userRank: number;
  totalPlayers: number;
}

function LeagueStanding({ userRank, totalPlayers }: LeagueStandingProps) {
  return (
    <View style={styles.rankContainer}>
      <Text style={styles.sectionTitle}>League Standing</Text>
      <View style={styles.rankBox}>
        <Ionicons
          name="trophy-outline"
          size={24}
          color={colors.sport.gold}
        />
        <Text style={styles.rankText}>
          Rank #{userRank} of {totalPlayers}
        </Text>
      </View>
    </View>
  );
}

interface VictoryActionsProps {
  onShare: () => void;
  onClose: () => void;
}

function VictoryActions({ onShare, onClose }: VictoryActionsProps) {
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        style={[styles.button, styles.shareButton]}
        onPress={onShare}
      >
        <Ionicons name="share-outline" size={20} color="#FFF" />
        <Text style={styles.buttonText}>Share Victory</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.closeButtonStyle]}
        onPress={onClose}
      >
        <Text style={[styles.buttonText, styles.closeButtonText]}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

interface WeeklyRecapProps {
  visible: boolean;
  onClose: () => void;
  weekNumber: number;
  matchup: Matchup | null;
  userScore: WeeklyScore | null;
  opponentScore: WeeklyScore | null;
  userRank: number;
  totalPlayers: number;
  leagueName: string;
  scoringConfig?: any;
  opponentName: string;
  userName: string;
}

export function WeeklyRecap({
  visible,
  onClose,
  weekNumber,
  matchup,
  userScore,
  opponentScore,
  userRank,
  totalPlayers,
  leagueName,
  scoringConfig,
  opponentName,
  userName,
}: WeeklyRecapProps) {
  const confettiAnimations = useRef<Animated.Value[]>(
    Array.from({ length: 50 }, () => new Animated.Value(0))
  ).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const userPoints = userScore?.total_points ?? 0;
  const opponentPoints = opponentScore?.total_points ?? 0;
  const isWin = userPoints > opponentPoints;
  const isTie = userPoints === opponentPoints;
  const isLoss = userPoints < opponentPoints;
  const margin = Math.abs(userPoints - opponentPoints);

  const config = scoringConfig ? getScoringConfig(scoringConfig) : undefined;
  const breakdown = userScore ? getPointsBreakdown({
    steps: userScore.steps,
    sleepHours: userScore.sleep_hours,
    calories: userScore.calories,
    workouts: userScore.workouts,
    distance: userScore.distance,
  }, config) : null;

  useEffect(() => {
    if (visible) {
      // Animate modal entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Confetti animation for wins
      if (isWin) {
        confettiAnimations.forEach((anim, index) => {
          anim.setValue(0);
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + Math.random() * 1000,
            delay: index * 20,
            useNativeDriver: true,
          }).start();
        });
      }
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible, isWin]);

  const handleShare = async () => {
    const result = isWin ? 'WON' : isTie ? 'TIED' : 'LOST';
    const emoji = isWin ? '🏆' : isTie ? '🤝' : '💪';
    const message = `${emoji} Week ${weekNumber} Recap - ${result}!

${leagueName}
${userName}: ${userPoints.toFixed(1)} pts
${opponentName}: ${opponentPoints.toFixed(1)} pts

${isWin ? `Won by ${margin.toFixed(1)} points!` : isTie ? 'Tied!' : `Lost by ${margin.toFixed(1)} points`}
Rank: #${userRank} of ${totalPlayers}

#LockIn #FitnessChallenge`;

    try {
      await Share.share({ message });
    } catch (error) {
      // Share failed - silently continue
    }
  };

  const confettiPieces = confettiAnimations.map((anim, index) => {
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 1000],
    });
    const translateX = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [
        Math.random() * width - width / 2,
        (Math.random() - 0.5) * 200,
        Math.random() * width - width / 2,
      ],
    });
    const rotate = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '720deg'],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 0.3, 0.7, 1],
      outputRange: [1, 1, 1, 0],
    });

    const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    const color = confettiColors[index % confettiColors.length];

    return (
      <Animated.View
        key={index}
        style={[
          styles.confetti,
          {
            left: `${(index * 2) % 100}%`,
            backgroundColor: color,
            transform: [{ translateY }, { translateX }, { rotate }],
            opacity,
          },
        ]}
      />
    );
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {isWin && (
          <View style={styles.confettiContainer} pointerEvents="none">
            {confettiPieces}
          </View>
        )}

        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.weekLabel}>Week {weekNumber} Recap</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Result Badge */}
            <View style={styles.resultContainer}>
              {isWin && (
                <LinearGradient
                  colors={[colors.sport.gold, '#FFA500']}
                  style={styles.resultBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="trophy" size={48} color="#FFF" />
                  <Text style={styles.resultText}>VICTORY!</Text>
                  <Text style={styles.resultSubtext}>
                    Won by {margin.toFixed(1)} points
                  </Text>
                </LinearGradient>
              )}
              {isTie && (
                <View style={[styles.resultBadge, styles.tieBadge]}>
                  <Ionicons name="hand-left" size={48} color={colors.text.primary} />
                  <Text style={[styles.resultText, styles.tieText]}>TIE!</Text>
                  <Text style={styles.resultSubtext}>Even match</Text>
                </View>
              )}
              {isLoss && (
                <View style={[styles.resultBadge, styles.lossBadge]}>
                  <Ionicons name="fitness" size={48} color={colors.text.primary} />
                  <Text style={[styles.resultText, styles.lossText]}>Tough Loss</Text>
                  <Text style={styles.resultSubtext}>
                    Lost by {margin.toFixed(1)} points
                  </Text>
                </View>
              )}
            </View>

            {/* Score Comparison */}
            <View style={styles.scoreContainer}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>You</Text>
                  <Text style={styles.scoreValue}>{userPoints.toFixed(1)}</Text>
                  <Text style={styles.scoreUnit}>points</Text>
                </View>
                <View style={styles.vsContainer}>
                  <Text style={styles.vsText}>VS</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>{opponentName}</Text>
                  <Text style={styles.scoreValue}>{opponentPoints.toFixed(1)}</Text>
                  <Text style={styles.scoreUnit}>points</Text>
                </View>
              </View>
            </View>

            {/* Key Stats */}
            {breakdown && userScore && <StatsSection breakdown={breakdown} userScore={userScore} />}

            {/* League Rank */}
            <LeagueStanding userRank={userRank} totalPlayers={totalPlayers} />

            {/* Actions */}
            <VictoryActions onShare={handleShare} onClose={onClose} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modal: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  weekLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultBadge: {
    width: '100%',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tieBadge: {
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  lossBadge: {
    backgroundColor: colors.background.secondary,
  },
  resultText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
  },
  tieText: {
    color: colors.text.primary,
  },
  lossText: {
    color: colors.text.primary,
  },
  resultSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
  },
  scoreContainer: {
    marginBottom: 24,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  scoreUnit: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  vsContainer: {
    marginHorizontal: 16,
  },
  vsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.tertiary,
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  rankContainer: {
    marginBottom: 24,
  },
  rankBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: colors.primary[500],
  },
  closeButtonStyle: {
    backgroundColor: colors.background.secondary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  closeButtonText: {
    color: colors.text.primary,
  },
});

