import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/utils/colors';

// ============================================
// APP LAYOUT
// Main authenticated app stack
// ============================================

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="create-league" options={{ presentation: 'modal' }} />
      <Stack.Screen name="join-league" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="debug" />
      <Stack.Screen name="league/[leagueId]" />
    </Stack>
  );
}

