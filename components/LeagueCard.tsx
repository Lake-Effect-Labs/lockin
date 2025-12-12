import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';
import { AvatarGroup } from './Avatar';
import { League, LeagueMember } from '@/services/supabase';

// ============================================
// LEAGUE CARD COMPONENT
// Display league info on home screen
// ============================================

interface LeagueCardProps {
  league: League;
  members: LeagueMember[];
  userMember?: LeagueMember | null;
  onPress: () => void;
  style?: ViewStyle;
}

export function LeagueCard({
  league,
  members,
  userMember,
  onPress,
  style,
}: LeagueCardProps) {
  const getStatusBadge = () => {
    if (league.champion_id) {
      return { text: 'Complete', color: colors.sport.gold, icon: '🏆' };
    }
    if (league.playoffs_started) {
      return { text: 'Playoffs', color: colors.primary[500], icon: '🔥' };
    }
    return { text: `Week ${league.current_week}`, color: colors.accent[500], icon: '📅' };
  };
  
  const status = getStatusBadge();
  const record = userMember 
    ? `${userMember.wins}-${userMember.losses}${userMember.ties > 0 ? `-${userMember.ties}` : ''}`
    : '0-0';
  
  const memberUsers = members.map(m => ({
    avatar_url: m.user?.avatar_url,
    username: m.user?.username,
  }));
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <LinearGradient
        colors={[colors.background.card, colors.background.elevated]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {league.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusIcon}>{status.icon}</Text>
              <Text style={styles.statusText}>{status.text}</Text>
            </View>
          </View>
          
          <Text style={styles.seasonInfo}>
            {league.season_length_weeks} week season
          </Text>
        </View>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{record}</Text>
            <Text style={styles.statLabel}>Your Record</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.stat}>
            <Text style={styles.statValue}>{userMember?.total_points?.toFixed(0) || 0}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.stat}>
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <AvatarGroup users={memberUsers} max={5} size="small" />
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={colors.text.secondary} 
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Empty state card for creating/joining leagues
interface EmptyLeagueCardProps {
  type: 'create' | 'join';
  onPress: () => void;
}

export function EmptyLeagueCard({ type, onPress }: EmptyLeagueCardProps) {
  const isCreate = type === 'create';
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.emptyContainer}
      accessibilityLabel={isCreate ? 'Create a new league' : 'Join an existing league'}
      accessibilityRole="button"
      accessibilityHint={isCreate ? 'Opens the create league screen' : 'Opens the join league screen'}
    >
      <LinearGradient
        colors={isCreate 
          ? [colors.primary[500] + '15', colors.primary[500] + '05']
          : [colors.secondary[500] + '15', colors.secondary[500] + '05']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyGradient}
      >
        <View style={styles.emptyContent}>
          <LinearGradient
            colors={isCreate 
              ? colors.gradients.primary
              : [colors.secondary[500], colors.secondary[600]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyIcon}
          >
            <Ionicons 
              name={isCreate ? 'add-circle' : 'enter-outline'} 
              size={28} 
              color={colors.text.primary} 
            />
          </LinearGradient>
          <Text style={styles.emptyTitle}>
            {isCreate ? 'Create League' : 'Join League'}
          </Text>
          <Text style={styles.emptyDescription}>
            {isCreate 
              ? 'Start a new league and invite friends'
              : 'Enter a code to join an existing league'
            }
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
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
  header: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  seasonInfo: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.default,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border.default,
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyGradient: {
    flex: 1,
    padding: 24,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

