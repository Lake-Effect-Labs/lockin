import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/utils/colors';

// ============================================
// LEAGUE LAYOUT
// Stack navigator for league screens
// ============================================

export default function LeagueLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="matchup" />
      <Stack.Screen name="standings" />
      <Stack.Screen name="allMatchups" />
    </Stack>
  );
}

