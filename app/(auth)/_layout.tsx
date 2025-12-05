import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/utils/colors';

// ============================================
// AUTH LAYOUT
// Stack navigator for auth screens
// ============================================

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

