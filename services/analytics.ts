// ============================================
// ANALYTICS SERVICE
// Centralized event tracking for app analytics
// ============================================

// ============================================
// ANALYTICS PROVIDER SETUP
// ============================================

// Option 1: PostHog (Recommended - Open source, privacy-friendly, free tier)
// Install: npm install posthog-react-native
// Setup: https://posthog.com/docs/integrate/client/react-native

// Option 2: Firebase Analytics (Free, easy with Expo)
// Install: npx expo install expo-firebase-analytics
// Setup: https://docs.expo.dev/guides/using-firebase/

// Option 3: Mixpanel (Great for event tracking)
// Install: npm install mixpanel-react-native
// Setup: https://developer.mixpanel.com/docs/react-native

// Option 4: Amplitude (Free tier, great dashboards)
// Install: npm install @amplitude/analytics-react-native
// Setup: https://www.docs.developers.amplitude.com/data/sdks/react-native/

// ============================================
// ANALYTICS INTERFACE
// ============================================

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

interface AnalyticsUser {
  id: string;
  email?: string;
  username?: string;
}

class AnalyticsService {
  private initialized = false;
  private userId: string | null = null;

  // Initialize analytics (call this in app startup)
  async initialize(userId?: string) {
    if (this.initialized) return;

    // TODO: Initialize your analytics provider here
    // Example for PostHog:
    // import PostHog from 'posthog-react-native';
    // PostHog.setup('YOUR_API_KEY', {
    //   host: 'https://app.posthog.com',
    // });
    
    // Example for Firebase:
    // import * as Analytics from 'expo-firebase-analytics';
    // await Analytics.setAnalyticsCollectionEnabled(true);

    this.initialized = true;
    if (userId) {
      this.identify(userId);
    }
  }

  // Identify a user (call after login)
  identify(userId: string, traits?: { email?: string; username?: string }) {
    this.userId = userId;
    
    // TODO: Call your analytics provider's identify method
    // PostHog: PostHog.identify(userId, traits);
    // Firebase: Analytics.setUserId(userId);
    // Mixpanel: Mixpanel.identify(userId);
  }

  // Track an event
  track(eventName: string, properties?: Record<string, any>) {
    if (!this.initialized) {
      console.warn('Analytics not initialized. Call analytics.initialize() first.');
      return;
    }

    // TODO: Call your analytics provider's track method
    // PostHog: PostHog.capture(eventName, properties);
    // Firebase: Analytics.logEvent(eventName, properties);
    // Mixpanel: Mixpanel.track(eventName, properties);

    // Log in development
    if (__DEV__) {
      console.log('📊 Analytics Event:', eventName, properties);
    }
  }

  // Reset user (call on logout)
  reset() {
    this.userId = null;
    // TODO: Call your analytics provider's reset method
    // PostHog: PostHog.reset();
    // Firebase: Analytics.setUserId(null);
    // Mixpanel: Mixpanel.reset();
  }
}

export const analytics = new AnalyticsService();

// ============================================
// EVENT TRACKING FUNCTIONS
// ============================================

// Authentication Events
export const trackSignUp = (method: 'email' | 'magic_link') => {
  analytics.track('user_signed_up', { method });
};

export const trackSignIn = (method: 'email' | 'magic_link') => {
  analytics.track('user_signed_in', { method });
};

export const trackSignOut = () => {
  analytics.track('user_signed_out');
};

// League Events
export const trackLeagueCreated = (leagueId: string, data: {
  seasonLength: number;
  maxPlayers: number;
  hasCustomScoring: boolean;
}) => {
  analytics.track('league_created', {
    league_id: leagueId,
    season_length: data.seasonLength,
    max_players: data.maxPlayers,
    custom_scoring: data.hasCustomScoring,
  });
};

export const trackLeagueJoined = (leagueId: string, method: 'code' | 'invite') => {
  analytics.track('league_joined', {
    league_id: leagueId,
    join_method: method,
  });
};

export const trackLeagueLeft = (leagueId: string) => {
  analytics.track('league_left', {
    league_id: leagueId,
  });
};

export const trackLeagueFull = (leagueId: string, maxPlayers: number) => {
  analytics.track('league_full', {
    league_id: leagueId,
    max_players: maxPlayers,
  });
};

// Matchup Events
export const trackMatchupViewed = (leagueId: string, matchupId: string, weekNumber: number) => {
  analytics.track('matchup_viewed', {
    league_id: leagueId,
    matchup_id: matchupId,
    week_number: weekNumber,
  });
};

export const trackMatchupWon = (leagueId: string, matchupId: string, weekNumber: number, score: number) => {
  analytics.track('matchup_won', {
    league_id: leagueId,
    matchup_id: matchupId,
    week_number: weekNumber,
    score: score,
  });
};

export const trackMatchupLost = (leagueId: string, matchupId: string, weekNumber: number, score: number) => {
  analytics.track('matchup_lost', {
    league_id: leagueId,
    matchup_id: matchupId,
    week_number: weekNumber,
    score: score,
  });
};

// Playoff Events
export const trackPlayoffsStarted = (leagueId: string) => {
  analytics.track('playoffs_started', {
    league_id: leagueId,
  });
};

export const trackChampionCrowned = (leagueId: string, championId: string) => {
  analytics.track('champion_crowned', {
    league_id: leagueId,
    champion_id: championId,
  });
};

// Health Data Events
export const trackHealthDataSynced = (metrics: {
  steps: number;
  sleep: number;
  calories: number;
  workouts: number;
  distance: number;
}) => {
  analytics.track('health_data_synced', {
    has_steps: metrics.steps > 0,
    has_sleep: metrics.sleep > 0,
    has_calories: metrics.calories > 0,
    has_workouts: metrics.workouts > 0,
    has_distance: metrics.distance > 0,
  });
};

// Screen View Events
export const trackScreenView = (screenName: string, properties?: Record<string, any>) => {
  analytics.track('screen_viewed', {
    screen_name: screenName,
    ...properties,
  });
};

// Error Events
export const trackError = (errorType: string, errorMessage: string, context?: Record<string, any>) => {
  analytics.track('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
};

