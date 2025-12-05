import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, getScoreColor } from '@/utils/colors';
import { Avatar } from './Avatar';
import { Matchup, User, WeeklyScore } from '@/services/supabase';

// ============================================
// MATCHUP CARD COMPONENT
// Head-to-head matchup display
// ============================================

interface MatchupCardProps {
  matchup: Matchup;
  currentUserId: string;
  userScore?: WeeklyScore | null;
  opponentScore?: WeeklyScore | null;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

export function MatchupCard({
  matchup,
  currentUserId,
  userScore,
  opponentScore,
  onPress,
  style,
  compact = false,
}: MatchupCardProps) {
  const isPlayer1 = matchup.player1_id === currentUserId;
  const user = isPlayer1 ? matchup.player1 : matchup.player2;
  const opponent = isPlayer1 ? matchup.player2 : matchup.player1;
  const myScore = isPlayer1 ? matchup.player1_score : matchup.player2_score;
  const theirScore = isPlayer1 ? matchup.player2_score : matchup.player1_score;
  
  const getMatchupStatus = () => {
    if (!matchup.is_finalized) {
      return { text: 'In Progress', color: colors.primary[500] };
    }
    if (matchup.is_tie) {
      return { text: 'Tie', color: colors.text.secondary };
    }
    const isWinner = matchup.winner_id === currentUserId;
    return isWinner 
      ? { text: 'Victory', color: colors.status.success }
      : { text: 'Defeat', color: colors.status.error };
  };
  
  const status = getMatchupStatus();
  const myScoreColor = getScoreColor(myScore, theirScore);
  const theirScoreColor = getScoreColor(theirScore, myScore);
  
  const content = (
    <LinearGradient
      colors={[colors.background.card, colors.background.elevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, compact && styles.compactGradient]}
    >
      {/* Week Header */}
      <View style={styles.header}>
        <Text style={styles.weekText}>Week {matchup.week_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      </View>
      
      {/* Matchup Content */}
      <View style={styles.matchupContent}>
        {/* Player 1 (You) */}
        <View style={styles.playerSide}>
          <Avatar
            uri={user?.avatar_url}
            name={user?.username}
            size={compact ? 'medium' : 'large'}
            showBorder={myScore > theirScore}
            borderColor={colors.status.success}
          />
          <Text style={styles.playerName} numberOfLines={1}>
            {user?.username || 'You'}
          </Text>
          <Text style={[styles.score, { color: myScoreColor }]}>
            {myScore.toFixed(1)}
          </Text>
          {!compact && userScore && (
            <View style={styles.miniStats}>
              <Text style={styles.miniStat}>👟 {userScore.steps.toLocaleString()}</Text>
              <Text style={styles.miniStat}>🔥 {userScore.calories}</Text>
            </View>
          )}
        </View>
        
        {/* VS Divider */}
        <View style={styles.vsDivider}>
          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          {!compact && (
            <View style={styles.scoreLine}>
              <View 
                style={[
                  styles.scoreBar, 
                  styles.leftBar,
                  { 
                    flex: myScore || 1,
                    backgroundColor: myScoreColor,
                  }
                ]} 
              />
              <View 
                style={[
                  styles.scoreBar, 
                  styles.rightBar,
                  { 
                    flex: theirScore || 1,
                    backgroundColor: theirScoreColor,
                  }
                ]} 
              />
            </View>
          )}
        </View>
        
        {/* Player 2 (Opponent) */}
        <View style={styles.playerSide}>
          <Avatar
            uri={opponent?.avatar_url}
            name={opponent?.username}
            size={compact ? 'medium' : 'large'}
            showBorder={theirScore > myScore}
            borderColor={colors.status.success}
          />
          <Text style={styles.playerName} numberOfLines={1}>
            {opponent?.username || 'Opponent'}
          </Text>
          <Text style={[styles.score, { color: theirScoreColor }]}>
            {theirScore.toFixed(1)}
          </Text>
          {!compact && opponentScore && (
            <View style={styles.miniStats}>
              <Text style={styles.miniStat}>👟 {opponentScore.steps.toLocaleString()}</Text>
              <Text style={styles.miniStat}>🔥 {opponentScore.calories}</Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.container, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }
  
  return <View style={[styles.container, style]}>{content}</View>;
}

// Live matchup with animated elements
interface LiveMatchupCardProps extends MatchupCardProps {
  daysRemaining: number;
}

export function LiveMatchupCard({
  daysRemaining,
  ...props
}: LiveMatchupCardProps) {
  return (
    <View style={styles.liveContainer}>
      <View style={styles.liveHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.countdown}>
          {daysRemaining === 0 
            ? 'Ends today!' 
            : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`
          }
        </Text>
      </View>
      <MatchupCard {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  gradient: {
    padding: 20,
  },
  compactGradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  matchupContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerSide: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    maxWidth: 100,
    textAlign: 'center',
  },
  score: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  miniStats: {
    marginTop: 8,
    alignItems: 'center',
  },
  miniStat: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginVertical: 1,
  },
  vsDivider: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  vsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.secondary,
  },
  scoreLine: {
    flexDirection: 'row',
    width: 60,
    height: 4,
    marginTop: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
  },
  leftBar: {
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  rightBar: {
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  liveContainer: {
    gap: 8,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
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
  countdown: {
    fontSize: 13,
    color: colors.text.secondary,
  },
});

