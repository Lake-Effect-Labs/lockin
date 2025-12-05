import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/utils/colors';

// ============================================
// INDEX / SPLASH SCREEN
// Redirects based on auth state
// ============================================

export default function Index() {
  const { user, isInitialized, isLoading } = useAuthStore();
  
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

