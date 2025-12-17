// ============================================
// AD MANAGEMENT SERVICE
// Lock-In Fitness Competition App
// Handles ad loading, frequency capping, and revenue tracking
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Conditionally import AdMob only when not in Expo Go
let mobileAds: any = null;
let MaxAdContentRating: any = null;

try {
  if (Constants.executionEnvironment !== 'storeClient') {
    const admob = require('react-native-google-mobile-ads');
    mobileAds = admob.mobileAds;
    MaxAdContentRating = admob.MaxAdContentRating;
  }
} catch (error) {
  console.log('AdMob not available in this environment');
}

/**
 * Validate that AdMob is safe to use
 * Returns true if AdMob can be safely initialized/used
 */
export function validateAdMobAvailability(): {
  available: boolean;
  reason?: string;
  checks: {
    moduleLoaded: boolean;
    hasAppId: boolean;
    notExpoGo: boolean;
  };
} {
  const checks = {
    moduleLoaded: !!mobileAds && typeof mobileAds === 'function',
    hasAppId: isAdMobConfigured(),
    notExpoGo: Constants.executionEnvironment !== 'storeClient',
  };

  const available = checks.moduleLoaded && checks.hasAppId && checks.notExpoGo;

  let reason: string | undefined;
  if (!available) {
    if (!checks.moduleLoaded) {
      reason = 'AdMob module not loaded (likely Expo Go or missing dependency)';
    } else if (!checks.hasAppId) {
      reason = 'AdMob app IDs not configured in environment variables';
    } else if (!checks.notExpoGo) {
      reason = 'Running in Expo Go (AdMob requires development build)';
    }
  }

  return { available, reason, checks };
}

/**
 * Safe wrapper for mobileAds() calls
 * Returns null if AdMob is not available
 */
function safeMobileAds(): any {
  if (!mobileAds || typeof mobileAds !== 'function') {
    return null;
  }
  try {
    return mobileAds();
  } catch (error) {
    console.error('Error calling mobileAds():', error);
    return null;
  }
}

export interface AdConfig {
  enabled: boolean;
  frequencyCap: number; // Max ads per day
  placementProbabilities: {
    home: number;
    league: number;
    matchup: number;
    standings: number;
  };
}

const DEFAULT_CONFIG: AdConfig = {
  enabled: true,
  frequencyCap: 3, // Max 3 ads per day
  placementProbabilities: {
    home: 0.3, // 30% chance
    league: 0.4, // 40% chance
    matchup: 0.5, // 50% chance
    standings: 0.3, // 30% chance
  },
};

/**
 * Initialize AdMob SDK
 */
export async function initializeAdMob(): Promise<void> {
  try {
    // Validate AdMob availability first
    const validation = validateAdMobAvailability();
    if (!validation.available) {
      console.log(`⚠️ AdMob initialization skipped: ${validation.reason}`);
      return;
    }

    // Get safe mobileAds instance
    const adsInstance = safeMobileAds();
    if (!adsInstance) {
      console.log('⚠️ AdMob instance not available, skipping initialization');
      return;
    }

    // Validate MaxAdContentRating exists
    if (!MaxAdContentRating || !MaxAdContentRating.PG) {
      console.log('⚠️ MaxAdContentRating not available, skipping initialization');
      return;
    }

    // Set up AdMob with appropriate content rating
    await adsInstance.setRequestConfiguration({
      // Maximum ad content rating for family-friendly content
      maxAdContentRating: MaxAdContentRating.PG,
      // Enable test devices in development
      testDeviceIdentifiers: __DEV__ ? ['EMULATOR'] : [],
    });

    // Initialize AdMob
    await adsInstance.initialize();

    console.log('✅ AdMob initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AdMob:', error);
    // Don't crash the app - just log the error
  }
}

/**
 * Get the appropriate AdMob app ID for the current platform
 */
export function getAdMobAppId(): string | null {
  const config = Constants.expoConfig?.extra;

  if (Platform.OS === 'ios') {
    return config?.EXPO_PUBLIC_ADMOB_IOS_APP_ID || null;
  } else {
    return config?.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || null;
  }
}

/**
 * Check if AdMob is properly configured
 */
export function isAdMobConfigured(): boolean {
  const appId = getAdMobAppId();
  return appId !== null && appId !== 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX';
}

/**
 * Get ad unit ID for banner ads
 */
export function getBannerAdUnitId(): string {
  if (__DEV__) {
    return mobileAds?.TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  }

  const config = Constants.expoConfig?.extra;

  if (Platform.OS === 'ios') {
    return config?.EXPO_PUBLIC_ADMOB_BANNER_IOS || mobileAds?.TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  } else {
    return config?.EXPO_PUBLIC_ADMOB_BANNER_ANDROID || mobileAds?.TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  }
}

/**
 * Check if ad should be shown based on frequency capping
 */
export async function shouldShowAd(placement: keyof AdConfig['placementProbabilities']): Promise<boolean> {
  try {
    const config = await getAdConfig();
    if (!config.enabled) return false;
    
    // Check daily frequency cap
    const adCountKey = `ad_count_${new Date().toDateString()}`;
    const adCount = await AsyncStorage.getItem(adCountKey);
    const count = adCount ? parseInt(adCount, 10) : 0;
    
    if (count >= config.frequencyCap) {
      return false;
    }
    
    // Check placement probability
    const probability = config.placementProbabilities[placement];
    if (Math.random() > probability) {
      return false;
    }
    
    // Increment ad count
    await AsyncStorage.setItem(adCountKey, (count + 1).toString());
    
    return true;
  } catch (error) {
    console.error('Error checking ad visibility:', error);
    return false;
  }
}

/**
 * Record ad impression
 */
export async function recordAdImpression(placement: string): Promise<void> {
  try {
    const impressionsKey = `ad_impressions_${new Date().toDateString()}`;
    const impressions = await AsyncStorage.getItem(impressionsKey);
    const count = impressions ? parseInt(impressions, 10) : 0;
    await AsyncStorage.setItem(impressionsKey, (count + 1).toString());
  } catch (error) {
    console.error('Error recording ad impression:', error);
  }
}

/**
 * Get ad configuration
 */
export async function getAdConfig(): Promise<AdConfig> {
  try {
    const config = await AsyncStorage.getItem('ad_config');
    if (config) {
      return JSON.parse(config);
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

/**
 * Update ad configuration
 */
export async function updateAdConfig(config: Partial<AdConfig>): Promise<void> {
  try {
    const current = await getAdConfig();
    const updated = { ...current, ...config };
    await AsyncStorage.setItem('ad_config', JSON.stringify(updated));
  } catch (error) {
    console.error('Error updating ad config:', error);
  }
}

/**
 * Reset daily ad count (for testing)
 */
export async function resetDailyAdCount(): Promise<void> {
  try {
    const adCountKey = `ad_count_${new Date().toDateString()}`;
    await AsyncStorage.removeItem(adCountKey);
  } catch (error) {
    console.error('Error resetting ad count:', error);
  }
}

/**
 * Get today's ad stats
 */
export async function getTodayAdStats(): Promise<{
  impressions: number;
  count: number;
}> {
  try {
    const today = new Date().toDateString();
    const impressionsKey = `ad_impressions_${today}`;
    const adCountKey = `ad_count_${today}`;
    
    const impressions = await AsyncStorage.getItem(impressionsKey);
    const count = await AsyncStorage.getItem(adCountKey);
    
    return {
      impressions: impressions ? parseInt(impressions, 10) : 0,
      count: count ? parseInt(count, 10) : 0,
    };
  } catch (error) {
    return { impressions: 0, count: 0 };
  }
}

/**
 * Comprehensive AdMob safety check
 * Call this to verify AdMob is safe to use before rendering ads
 */
export function runAdMobSafetyCheck(): {
  safe: boolean;
  message: string;
  details: {
    moduleAvailable: boolean;
    configured: boolean;
    notExpoGo: boolean;
    canInitialize: boolean;
  };
} {
  const validation = validateAdMobAvailability();
  const moduleAvailable = !!mobileAds && typeof mobileAds === 'function';
  const configured = isAdMobConfigured();
  const notExpoGo = Constants.executionEnvironment !== 'storeClient';
  const canInitialize = moduleAvailable && configured && notExpoGo;

  const safe = canInitialize;
  const message = safe
    ? '✅ AdMob is safe to use'
    : `⚠️ AdMob not safe: ${validation.reason || 'Unknown issue'}`;

  return {
    safe,
    message,
    details: {
      moduleAvailable,
      configured,
      notExpoGo,
      canInitialize,
    },
  };
}

