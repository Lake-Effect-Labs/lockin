import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  supabase, 
  User, 
  signIn as signInDB, 
  signUp as signUpDB, 
  signOut as signOutDB,
  signInWithMagicLink,
  getProfile,
  createProfile,
  updateProfile,
  updateUsername as updateUsernameDB,
  updateAvatar as updateAvatarDB,
} from '@/services/supabase';
import { registerForPushNotifications } from '@/services/notifications';

// ============================================
// AUTH STORE
// Global authentication state management
// ============================================

interface AuthState {
  // State
  user: User | null;
  authUser: any | null; // Supabase auth user
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      authUser: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      // Initialize auth state from Supabase session
      initialize: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Get current session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Get user profile (should be auto-created by database trigger)
            let profile = await getProfile(session.user.id);
            
            if (!profile) {
              // Fallback: try to create manually
              try {
                profile = await createProfile(session.user.id, session.user.email!);
              } catch (err: any) {
                // Wait and retry (trigger might be processing)
                await new Promise(resolve => setTimeout(resolve, 500));
                profile = await getProfile(session.user.id);
              }
            }
            
            // Register for push notifications
            await registerForPushNotifications(session.user.id);
            
            set({ 
              authUser: session.user, 
              user: profile,
              isInitialized: true,
              isLoading: false,
            });
          } else {
            set({ 
              authUser: null, 
              user: null,
              isInitialized: true,
              isLoading: false,
            });
          }
          
          // Listen for auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              // Profile should be auto-created by database trigger
              let profile = await getProfile(session.user.id);
              if (!profile) {
                // Fallback: try to create manually
                try {
                  profile = await createProfile(session.user.id, session.user.email!);
                } catch (err: any) {
                  // Wait and retry (trigger might be processing)
                  await new Promise(resolve => setTimeout(resolve, 500));
                  profile = await getProfile(session.user.id);
                }
              }
              await registerForPushNotifications(session.user.id);
              set({ authUser: session.user, user: profile });
            } else if (event === 'SIGNED_OUT') {
              set({ authUser: null, user: null });
            }
          });
        } catch (error: any) {
          console.error('Auth initialization error:', error);
          set({ 
            error: error.message,
            isInitialized: true,
            isLoading: false,
          });
        }
      },

      // Sign in with email/password
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null, authUser: null, user: null });
        
        try {
          const result = await signInDB(email, password);
          
          // Check if we actually got a user - if not, it's an error
          if (!result?.user) {
            throw new Error('Invalid email or password. Please try again.');
          }
          
          const authUser = result.user;
          
          // Profile should be auto-created by database trigger, but check anyway
          let profile = await getProfile(authUser.id);
          if (!profile) {
            // Fallback: try to create manually (might fail due to RLS, but trigger should handle it)
            try {
              profile = await createProfile(authUser.id, email);
            } catch (err: any) {
              // If creation fails, wait a moment and try fetching again (trigger might be processing)
              await new Promise(resolve => setTimeout(resolve, 500));
              profile = await getProfile(authUser.id);
            }
          }
          
          await registerForPushNotifications(authUser.id);
          set({ authUser, user: profile, isLoading: false, error: null });
        } catch (error: any) {
          console.error('Sign in error:', error);
          const errorMessage = error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')
            ? 'Invalid email or password. Please try again.'
            : error.message || 'Failed to sign in. Please try again.';
          set({ error: errorMessage, isLoading: false, authUser: null, user: null });
          // Throw error to prevent navigation
          throw new Error(errorMessage);
        }
      },

      // Sign up with email/password
      signUp: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const { user: authUser, session } = await signUpDB(email, password);
          
          // Check if email confirmation is required
          if (authUser && !session) {
            // Email confirmation required - user is not fully authenticated yet
            // Profile will be created by database trigger when email is confirmed
            set({ isLoading: false });
            return; // Don't throw, just return - UI will show confirmation message
          }
          
          if (authUser && session) {
            // User is immediately authenticated (email confirmation disabled or already confirmed)
            // Profile should be auto-created by database trigger, but check anyway
            let profile = await getProfile(authUser.id);
            if (!profile) {
              // Fallback: try to create manually
              try {
                profile = await createProfile(authUser.id, email);
              } catch (err: any) {
                // If creation fails, wait a moment and try fetching again (trigger might be processing)
                await new Promise(resolve => setTimeout(resolve, 500));
                profile = await getProfile(authUser.id);
              }
            }
            await registerForPushNotifications(authUser.id);
            set({ authUser, user: profile, isLoading: false });
          }
        } catch (error: any) {
          console.error('Sign up error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Sign in with magic link
      signInMagicLink: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          await signInWithMagicLink(email);
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Magic link error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          await signOutDB();
          set({ authUser: null, user: null, isLoading: false });
        } catch (error: any) {
          console.error('Sign out error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Update username
      updateUsername: async (username: string) => {
        const { user } = get();
        if (!user) throw new Error('Not authenticated');
        
        try {
          set({ isLoading: true, error: null });
          const updated = await updateUsernameDB(user.id, username);
          set({ user: updated, isLoading: false });
        } catch (error: any) {
          console.error('Update username error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Update avatar
      updateAvatar: async (avatarUrl: string) => {
        const { user } = get();
        if (!user) throw new Error('Not authenticated');
        
        try {
          set({ isLoading: true, error: null });
          const updated = await updateAvatarDB(user.id, avatarUrl);
          set({ user: updated, isLoading: false });
        } catch (error: any) {
          console.error('Update avatar error:', error);
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Refresh profile from database
      refreshProfile: async () => {
        const { user } = get();
        if (!user) return;
        
        try {
          const profile = await getProfile(user.id);
          if (profile) {
            set({ user: profile });
          }
        } catch (error: any) {
          console.error('Refresh profile error:', error);
        }
      },

      // Clear error
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        // Only persist user data, not loading states
        user: state.user,
      }),
    }
  )
);

