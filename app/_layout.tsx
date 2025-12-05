import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors } from '@/utils/colors';
import { initNetworkMonitoring } from '@/services/errorHandler';
import { OfflineBanner } from '@/components/OfflineBanner';
import { registerBackgroundSync, isBackgroundSyncAvailable } from '@/services/backgroundSync';
import { registerForPushNotifications } from '@/services/notifications';

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
      initializeTheme();
      await initNetworkMonitoring();
      await initAuth();
      await initHealth();
    };
    init();
  }, []);
  
  // Register background sync and push notifications when user is authenticated
  const { user } = useAuthStore();
  const { fakeMode } = useHealthStore();
  
  useEffect(() => {
    if (user?.id) {
      // Register for push notifications
      registerForPushNotifications(user.id).then((token) => {
        if (token) {
          console.log('✅ Push notifications registered');
        }
      });
      
      // Register background sync (handle errors gracefully - not available in Expo Go)
      // Wrap in try-catch to prevent any errors from showing red screen
      (async () => {
        try {
          const { available } = await isBackgroundSyncAvailable();
          if (available) {
            const success = await registerBackgroundSync(user.id, fakeMode);
            if (success && __DEV__) {
              console.log('✅ Background sync registered');
            }
          }
          // Silently skip if not available (expected in Expo Go)
        } catch (error: any) {
          // Silently ignore - background fetch not available in Expo Go
          // Only log in development
          if (__DEV__) {
            console.log('⚠️ Background sync not available (expected in Expo Go)');
          }
        }
      })();
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
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
    </QueryClientProvider>
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

