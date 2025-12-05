import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

// ============================================
// SETTINGS STORE
// App settings and preferences
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

interface SettingsState {
  // State
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  notificationsEnabled: boolean;
  hapticFeedback: boolean;
  
  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleNotifications: () => void;
  toggleHapticFeedback: () => void;
  initializeTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state - always dark mode
      themeMode: 'dark',
      effectiveTheme: 'dark',
      notificationsEnabled: true,
      hapticFeedback: true,

      // Set theme mode - always dark, no longer used but kept for compatibility
      setThemeMode: (mode: ThemeMode) => {
        // Force dark mode always
        set({ themeMode: 'dark', effectiveTheme: 'dark' });
      },

      // Toggle notifications
      toggleNotifications: () => {
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled }));
      },

      // Toggle haptic feedback
      toggleHapticFeedback: () => {
        set((state) => ({ hapticFeedback: !state.hapticFeedback }));
      },

      // Initialize theme - always dark mode
      initializeTheme: () => {
        // Force dark mode always
        set({ themeMode: 'dark', effectiveTheme: 'dark' });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

