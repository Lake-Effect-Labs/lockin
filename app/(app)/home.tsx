import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { SmartAdBanner } from '@/components/AdBanner';
import { NetworkErrorBanner } from '@/components/NetworkErrorBanner';
import { colors } from '@/utils/colors';
import { getIsOnline } from '@/services/errorHandler';
import { calculatePoints } from '@/services/scoring';

// ============================================
// HOME SCREEN
// Main dashboard with leagues and stats
// ============================================

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { leagues, fetchUserLeagues, isLoading, error: leagueError } = useLeagueStore();
  const { weeklyTotals, weeklyPoints, syncWeekData, fakeMode, lastSyncedAt, todayData } = useHealthStore();
  
  // Real-time sync hook - handles automatic background syncing
  const { isSyncing, refresh } = useRealtimeSync();
  
  const [refreshing, setRefreshing] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(getIsOnline());
  const [showWelcome, setShowWelcome] = React.useState(false);
  
  // Show welcome message for first-time users (no leagues)
  React.useEffect(() => {
    if (!isLoading && leagues.length === 0 && user) {
      // Check if user has seen welcome before
      AsyncStorage.getItem('has_seen_welcome').then((seen) => {
        if (!seen) {
          setShowWelcome(true);
        }
      });
    }
  }, [isLoading, leagues.length, user]);
  
  useEffect(() => {
    if (user) {
      fetchUserLeagues(user.id);
    }
  }, [user]);
  
  // Monitor network status
  React.useEffect(() => {
    const checkNetwork = () => setIsOnline(getIsOnline());
    const interval = setInterval(checkNetwork, 5000);
    return () => clearInterval(interval);
  }, []);
  
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

  const dismissWelcome = useCallback(async () => {
    setShowWelcome(false);
    await AsyncStorage.setItem('has_seen_welcome', 'true');
  }, []);
  
  const stats = todayData ? [
    { icon: '👟', value: todayData.steps.toLocaleString(), label: 'Steps', color: colors.primary[500] },
    { icon: '😴', value: `${todayData.sleepHours.toFixed(1)}h`, label: 'Sleep', color: colors.secondary[500] },
    { icon: '🔥', value: todayData.calories.toLocaleString(), label: 'Calories', color: '#E74C3C' },
    { icon: '💪', value: `${todayData.workouts}m`, label: 'Workout Mins', color: colors.accent[500] },
    { icon: '🧑‍💼', value: `${todayData.standHours}h`, label: 'Stand Hours', color: '#9B59B6' },
    { icon: '🏃', value: `${todayData.distance.toFixed(1)}`, label: 'Miles', color: '#3498DB' },
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
        {/* Welcome Banner for First-Time Users */}
        {showWelcome && (
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeEmoji}>👋</Text>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeTitle}>Welcome to Lock-In!</Text>
                <Text style={styles.welcomeText}>
                  Create or join a league to compete in weekly fitness matchups. Your health data syncs automatically!
                </Text>
              </View>
              <TouchableOpacity onPress={dismissWelcome} style={styles.welcomeClose}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
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
        
        {/* Network Error Banner */}
        {!isOnline && (
          <NetworkErrorBanner 
            onRetry={() => {
              if (user) {
                fetchUserLeagues(user.id);
                refresh();
              }
            }}
          />
        )}
        
        {/* League Error Banner */}
        {leagueError && isOnline && (
          <NetworkErrorBanner 
            message={leagueError}
            onRetry={() => {
              if (user) {
                fetchUserLeagues(user.id);
              }
            }}
          />
        )}
        
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
        
        {/* Today's Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Stats</Text>
          </View>
          {lastSyncedAt ? (
            <View style={styles.statsCard}>
              <StatsGrid stats={stats} columns={3} />
              <Text style={styles.syncTime}>
                Updated {new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyStatsCard}>
              <Ionicons name="stats-chart-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStatsTitle}>No Data Yet</Text>
              <Text style={styles.emptyStatsText}>
                {fakeMode 
                  ? 'Fake data mode is active. Health data will sync automatically.'
                  : 'Your fitness data will appear here once synced. Make sure HealthKit permissions are enabled in Settings.'}
              </Text>
              {!fakeMode && Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => router.push('/(app)/settings')}
                >
                  <Ionicons name="settings-outline" size={16} color={colors.primary[500]} />
                  <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Leagues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Leagues</Text>
            <Text style={styles.sectionCount}>{leagues.length}</Text>
          </View>
          
          {isLoading && leagues.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.emptyTitle}>Loading leagues...</Text>
            </View>
          ) : leagues.length > 0 ? (
            <View style={styles.leaguesList}>
              {leagues.map((league, index) => (
                <React.Fragment key={league.id}>
                  <LeagueCard
                    league={league}
                    members={league.members}
                    userMember={league.userMember}
                    onPress={() => router.push(`/(app)/league/${league.id}`)}
                    style={styles.leagueCard}
                  />
                  {/* Ad Banner - Middle of leagues list */}
                  {index === Math.floor(leagues.length / 2) - 1 && (
                    <SmartAdBanner placement="home" />
                  )}
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Leagues Yet</Text>
              <Text style={styles.emptyText}>
                Get started by creating your own league or joining one with a code from a friend
              </Text>
              <Text style={styles.emptySubtext}>
                Compete in weekly fitness matchups and see who's the fittest! 🏆
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
  emptySubtext: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStatsCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.background.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  emptyStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStatsText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
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
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary[500] + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  welcomeBanner: {
    backgroundColor: colors.primary[500] + '20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary[500] + '40',
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  welcomeEmoji: {
    fontSize: 32,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  welcomeClose: {
    padding: 4,
  },
});

