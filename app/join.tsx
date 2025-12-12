import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

// ============================================
// JOIN ROUTE HANDLER
// Handles deep links: lockin://join?code=ABC123
// ============================================

export default function JoinRoute() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    if (code) {
      if (user) {
        // User is logged in, navigate to join screen with code
        router.replace(`/(app)/join-league?code=${code}`);
      } else {
        // User not logged in, redirect to login with join code
        router.replace(`/(auth)/login?joinCode=${code}`);
      }
    } else {
      // No code provided, redirect to home
      router.replace(user ? '/(app)/home' : '/(auth)/login');
    }
  }, [code, user, isInitialized, router]);

  return null;
}

