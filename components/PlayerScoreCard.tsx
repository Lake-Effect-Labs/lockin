import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, getRankColor } from '@/utils/colors';
import { Avatar, RankedAvatar } from './Avatar';
import { LeagueMember, User } from '@/services/supabase';

// ============================================
// PLAYER SCORE CARD COMPONENT
// Display player in standings
// ============================================

interface PlayerScoreCardProps {
  member: LeagueMember;
  rank: number;
  isCurrentUser?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function PlayerScoreCard({
  member,
  rank,
  isCurrentUser = false,
  onPress,
  style,
}: PlayerScoreCardProps) {
  const user = member.user;
  const record = `${member.wins}-${member.losses}${member.ties > 0 ? `-${member.ties}` : ''}`;
  const rankColor = getRankColor(rank);
  
  const content = (
    <View style={[
      styles.container,
      isCurrentUser && styles.currentUserContainer,
      style,
    ]}>
      {/* Rank */}
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, { color: rankColor }]}>
          {rank}
        </Text>
      </View>
      
      {/* Avatar */}
      {rank <= 3 ? (
        <RankedAvatar
          uri={user?.avatar_url}
          name={user?.username}
          size="medium"
          rank={rank}
        />
      ) : (
        <Avatar
          uri={user?.avatar_url}
          name={user?.username}
          size="medium"
        />
      )}
      
      {/* Player Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user?.username || 'Unknown'}
          {isCurrentUser && <Text style={styles.youTag}> (You)</Text>}
        </Text>
        <Text style={styles.totalPoints}>{member.total_points.toFixed(0)} pts</Text>
      </View>
      
      {/* Record */}
      <View style={styles.recordContainer}>
        <Text style={styles.record}>{record}</Text>
      </View>
    </View>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
}

// Compact version for lists
interface CompactPlayerCardProps {
  user: User;
  score: number;
  subtitle?: string;
  highlight?: boolean;
  onPress?: () => void;
}

export function CompactPlayerCard({
  user,
  score,
  subtitle,
  highlight = false,
  onPress,
}: CompactPlayerCardProps) {
  const content = (
    <View style={[
      styles.compactContainer,
      highlight && styles.highlightContainer,
    ]}>
      <Avatar
        uri={user.avatar_url}
        name={user.username}
        size="small"
      />
      <View style={styles.compactInfo}>
        <Text style={styles.compactName} numberOfLines={1}>
          {user.username || 'Unknown'}
        </Text>
        {subtitle && (
          <Text style={styles.compactSubtitle}>{subtitle}</Text>
        )}
      </View>
      <Text style={[
        styles.compactScore,
        highlight && styles.highlightScore,
      ]}>
        {score.toFixed(1)}
      </Text>
    </View>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  
  return content;
}

// Playoff seed card
interface PlayoffSeedCardProps {
  member: LeagueMember;
  seed: number;
  isQualified: boolean;
}

export function PlayoffSeedCard({
  member,
  seed,
  isQualified,
}: PlayoffSeedCardProps) {
  const user = member.user;
  
  return (
    <LinearGradient
      colors={isQualified 
        ? [colors.primary[500] + '20', colors.primary[600] + '10']
        : [colors.background.card, colors.background.elevated]
      }
      style={[
        styles.seedContainer,
        isQualified && styles.qualifiedContainer,
      ]}
    >
      <View style={styles.seedBadge}>
        <Text style={[
          styles.seedNumber,
          isQualified && styles.qualifiedSeed,
        ]}>
          #{seed}
        </Text>
      </View>
      
      <Avatar
        uri={user?.avatar_url}
        name={user?.username}
        size="medium"
        showBorder={isQualified}
        borderColor={colors.primary[500]}
      />
      
      <Text style={styles.seedName} numberOfLines={1}>
        {user?.username || 'Unknown'}
      </Text>
      
      <Text style={styles.seedRecord}>
        {member.wins}-{member.losses}
      </Text>
      
      {isQualified && (
        <View style={styles.qualifiedBadge}>
          <Text style={styles.qualifiedText}>PLAYOFFS</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  currentUserContainer: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '10',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  rank: {
    fontSize: 18,
    fontWeight: '800',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  youTag: {
    color: colors.primary[500],
    fontWeight: '400',
  },
  record: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  recordContainer: {
    alignItems: 'flex-end',
  },
  totalPoints: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  highlightContainer: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '10',
  },
  compactInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  compactSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  compactScore: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  highlightScore: {
    color: colors.primary[500],
  },
  seedContainer: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    minWidth: 120,
  },
  qualifiedContainer: {
    borderColor: colors.primary[500],
  },
  seedBadge: {
    marginBottom: 8,
  },
  seedNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  qualifiedSeed: {
    color: colors.primary[500],
  },
  seedName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 100,
  },
  seedRecord: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  qualifiedBadge: {
    marginTop: 8,
    backgroundColor: colors.primary[500],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
});

