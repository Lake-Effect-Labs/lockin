import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { LeagueCard, EmptyLeagueCard } from '@/components/LeagueCard';
import { Avatar } from '@/components/Avatar';
import { StatsGrid } from '@/components/StatBubble';
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';
import { colors } from '@/utils/colors';

// ============================================
// HOME SCREEN
// Main dashboard with leagues and stats
// ============================================

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { leagues, fetchUserLeagues, isLoading } = useLeagueStore();
  const { weeklyTotals, weeklyPoints, syncWeekData, fakeMode, lastSyncedAt } = useHealthStore();
  
  // Real-time sync hook - handles automatic background syncing
  const { isSyncing, refresh } = useRealtimeSync();
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  useEffect(() => {
    if (user) {
      fetchUserLeagues(user.id);
    }
  }, [user]);
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user) {
      await Promise.all([
        fetchUserLeagues(user.id),
        refresh(), // Use real-time sync refresh
      ]);
    }
    setRefreshing(false);
  }, [user, refresh]);
  
  const stats = weeklyTotals ? [
    { icon: '👟', value: weeklyTotals.steps.toLocaleString(), label: 'Steps', color: colors.primary[500] },
    { icon: '😴', value: `${weeklyTotals.sleepHours.toFixed(1)}h`, label: 'Sleep', color: colors.secondary[500] },
    { icon: '🔥', value: weeklyTotals.calories.toLocaleString(), label: 'Calories', color: '#E74C3C' },
    { icon: '💪', value: weeklyTotals.workouts.toString(), label: 'Workouts', color: colors.accent[500] },
    { icon: '🏃', value: `${weeklyTotals.distance.toFixed(1)}`, label: 'Miles', color: '#3498DB' },
    { icon: '⭐', value: weeklyPoints.toFixed(0), label: 'Points', color: colors.sport.gold },
  ] : [];
  
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
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.username || 'Champion'} 🔥</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(app)/settings')}
            style={styles.avatarButton}
          >
            <Avatar
              uri={user?.avatar_url}
              name={user?.username}
              size="medium"
              showBorder
              borderColor={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
        
        {/* Fake Mode Banner */}
        {fakeMode && (
          <View style={styles.fakeBanner}>
            <Ionicons name="flask-outline" size={16} color={colors.status.warning} />
            <View style={styles.fakeBannerContent}>
              <Text style={styles.fakeBannerText}>Fake Data Mode Active</Text>
              <Text style={styles.fakeBannerSubtext}>
                HealthKit requires a development build. Run: eas build --platform ios --profile development
              </Text>
            </View>
          </View>
        )}
        
        {/* Weekly Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week's Stats</Text>
            <SyncStatusIndicator 
              compact 
              onPress={refresh}
            />
          </View>
          <View style={styles.statsCard}>
            <StatsGrid stats={stats} columns={3} />
            {lastSyncedAt && (
              <Text style={styles.syncTime}>
                Updated {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>
        
        {/* Leagues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Leagues</Text>
            <Text style={styles.sectionCount}>{leagues.length}</Text>
          </View>
          
          {leagues.length > 0 ? (
            <View style={styles.leaguesList}>
              {leagues.map((league) => (
                <LeagueCard
                  key={league.id}
                  league={league}
                  members={league.members}
                  userMember={league.userMember}
                  onPress={() => router.push(`/(app)/league/${league.id}`)}
                  style={styles.leagueCard}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Leagues Yet</Text>
              <Text style={styles.emptyText}>
                Create a league to compete with friends or join an existing one
              </Text>
            </View>
          )}
          
          {/* Action Cards */}
          <View style={styles.actionCards}>
            <View style={styles.actionCardWrapper}>
              <EmptyLeagueCard
                type="create"
                onPress={() => router.push('/(app)/create-league')}
              />
            </View>
            <View style={styles.actionCardWrapper}>
              <EmptyLeagueCard
                type="join"
                onPress={() => router.push('/(app)/join-league')}
              />
            </View>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={refresh}
            disabled={isSyncing}
          >
            <LinearGradient
              colors={isSyncing ? [colors.background.card, colors.background.elevated] : colors.gradients.primary}
              style={styles.quickActionGradient}
            >
              <Ionicons 
                name={isSyncing ? "sync" : "sync-outline"} 
                size={24} 
                color={isSyncing ? colors.text.secondary : colors.text.primary} 
              />
            </LinearGradient>
            <Text style={styles.quickActionText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  username: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginTop: 4,
  },
  avatarButton: {
    marginLeft: 16,
  },
  fakeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.status.warning + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.status.warning + '40',
  },
  fakeBannerContent: {
    flex: 1,
  },
  fakeBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.status.warning,
    marginBottom: 4,
  },
  fakeBannerSubtext: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    backgroundColor: colors.background.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statsCard: {
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  syncTime: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 12,
  },
  leaguesList: {
    gap: 16,
  },
  leagueCard: {
    marginBottom: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actionCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionCardWrapper: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

