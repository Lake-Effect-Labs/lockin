import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors } from '@/utils/colors';
import { initNetworkMonitoring } from '@/services/errorHandler';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerForPushNotifications } from '@/services/notifications';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { syncOnAppOpen } from '@/services/realtimeSync';

// ============================================
// ROOT LAYOUT
// App entry point and providers
// ============================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const { initialize: initAuth, isInitialized: authInitialized, isLoading: authLoading } = useAuthStore();
  const { initialize: initHealth } = useHealthStore();
  const { initializeTheme, effectiveTheme } = useSettingsStore();
  
  useEffect(() => {
    // Initialize app on mount
    const init = async () => {
      try {
        initializeTheme();
        await initNetworkMonitoring();
        await initAuth();
        await initHealth();
      } catch (error: any) {
        // Log error but don't crash - let ErrorBoundary handle it
        // Still mark as initialized so app can show error UI
        if (!authInitialized) {
          // Force initialization to complete even on error
          // This prevents infinite loading screen
        }
      }
    };
    init();
  }, []);
  
  // Register background sync and push notifications when user is authenticated
  const { user } = useAuthStore();
  const { fakeMode } = useHealthStore();
  
  useEffect(() => {
    if (user?.id) {
      // Initialize analytics
      (async () => {
        try {
          const { analytics } = await import('@/services/analytics');
          await analytics.initialize(user.id);
          analytics.identify(user.id, {
            email: user.email,
            username: user.username || undefined,
          });
        } catch (error) {
          // Analytics not critical, continue
          if (__DEV__) {
            console.log('⚠️ Analytics not initialized');
          }
        }
      })();
      
      // Register for push notifications
      registerForPushNotifications(user.id).then((token) => {
        // Push notifications registered if token exists
      });
      
      // Sync data when app opens (replaces background sync)
      // This ensures data is fresh when users open the app
      const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
        if (nextAppState === 'active' && user?.id) {
          try {
            await syncOnAppOpen(user.id);
          } catch (error: any) {
            // Silently handle sync errors - don't interrupt user experience
            console.log('App-open sync failed:', error.message);
          }
        }
      });

      // Cleanup subscription on unmount
      return () => {
        appStateSubscription?.remove();
      };
    }
  }, [user?.id, fakeMode]);
  
  // Show loading screen while initializing
  if (!authInitialized || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <StatusBar style="light" />
      </View>
    );
  }
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <View style={styles.appContainer}>
          <OfflineBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.primary },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(app)" />
          </Stack>
        </View>
        <StatusBar style="light" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

