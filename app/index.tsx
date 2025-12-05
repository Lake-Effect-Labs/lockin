import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter, useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/utils/colors';

// ============================================
// INDEX / SPLASH SCREEN
// Redirects based on auth state and handles deep links
// ============================================

export default function Index() {
  const { user, isInitialized, isLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  
  // Handle deep links
  useEffect(() => {
    // Handle initial URL (app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });
    
    // Handle URL while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    
    return () => {
      subscription.remove();
    };
  }, [user, isInitialized]);
  
  const handleDeepLink = (url: string) => {
    if (!isInitialized) return; // Wait for auth to initialize
    
    try {
      const parsed = Linking.parse(url);
      
      // Handle join league deep link: lockin://join?code=ABC123
      if (parsed.path === 'join' && parsed.queryParams?.code) {
        const code = parsed.queryParams.code as string;
        if (user) {
          // User is logged in, navigate to join screen with code
          router.push(`/(app)/join-league?code=${code}`);
        } else {
          // User not logged in, redirect to login with join code
          router.push(`/(auth)/login?joinCode=${code}`);
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };
  
  // Wait for auth to initialize
  if (!isInitialized || isLoading) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.container}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>🔥</Text>
          <Text style={styles.title}>Lock-In</Text>
          <Text style={styles.subtitle}>Fitness Competition</Text>
          <ActivityIndicator 
            size="large" 
            color={colors.primary[500]} 
            style={styles.loader}
          />
        </View>
      </LinearGradient>
    );
  }
  
  // Redirect based on auth state
  if (user) {
    return <Redirect href="/(app)/home" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginTop: 8,
  },
  loader: {
    marginTop: 48,
  },
});

