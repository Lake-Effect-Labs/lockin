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
      // Initial state
      themeMode: 'dark',
      effectiveTheme: 'dark',
      notificationsEnabled: true,
      hapticFeedback: true,

      // Set theme mode
      setThemeMode: (mode: ThemeMode) => {
        let effectiveTheme: 'light' | 'dark' = 'dark';
        
        if (mode === 'system') {
          effectiveTheme = Appearance.getColorScheme() || 'dark';
        } else {
          effectiveTheme = mode;
        }
        
        set({ themeMode: mode, effectiveTheme });
      },

      // Toggle notifications
      toggleNotifications: () => {
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled }));
      },

      // Toggle haptic feedback
      toggleHapticFeedback: () => {
        set((state) => ({ hapticFeedback: !state.hapticFeedback }));
      },

      // Initialize theme based on system preference
      initializeTheme: () => {
        const { themeMode } = get();
        
        if (themeMode === 'system') {
          const systemTheme = Appearance.getColorScheme() || 'dark';
          set({ effectiveTheme: systemTheme });
        }
        
        // Listen for system theme changes
        Appearance.addChangeListener(({ colorScheme }) => {
          if (get().themeMode === 'system') {
            set({ effectiveTheme: colorScheme || 'dark' });
          }
        });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

