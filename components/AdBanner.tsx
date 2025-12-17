// ============================================
// AD BANNER COMPONENT
// Lock-In Fitness Competition App
// Dismissible, non-intrusive ad banner with AdMob integration
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Conditionally import AdMob only when not in Expo Go
// DO NOT import synchronously - lazy load to prevent crashes
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let mobileAds: any = null;
let admobModuleLoaded = false;

/**
 * Lazy load AdMob module (prevents crashes if module not available)
 */
function loadAdMobModule(): boolean {
  if (admobModuleLoaded) {
    return !!BannerAd; // Already tried to load
  }

  admobModuleLoaded = true;

  try {
    if (Constants.executionEnvironment !== 'storeClient') {
      const admob = require('react-native-google-mobile-ads');
      BannerAd = admob.BannerAd;
      BannerAdSize = admob.BannerAdSize;
      TestIds = admob.TestIds;
      mobileAds = admob.mobileAds;
      return true;
    }
  } catch (error) {
    // AdMob not available - this is expected in some environments
    console.log('AdMob not available in this environment');
  }

  return false;
}

/**
 * Validate AdMob components are safe to use
 * Returns true if all required components are available and valid
 */
function validateAdMobComponents(): {
  valid: boolean;
  reason?: string;
  checks: {
    BannerAd: boolean;
    BannerAdSize: boolean;
    TestIds: boolean;
  };
} {
  // Try to load AdMob module if not already loaded
  loadAdMobModule();

  const checks = {
    BannerAd: !!BannerAd && typeof BannerAd === 'function',
    BannerAdSize: !!BannerAdSize && typeof BannerAdSize === 'object',
    TestIds: !!TestIds && typeof TestIds === 'object' && !!(TestIds?.BANNER),
  };

  const valid = checks.BannerAd && checks.BannerAdSize && checks.TestIds;

  let reason: string | undefined;
  if (!valid) {
    const missing = Object.entries(checks)
      .filter(([_, value]) => !value)
      .map(([key]) => key)
      .join(', ');
    reason = `Missing AdMob components: ${missing}`;
  }

  return { valid, reason, checks };
}
interface AdBannerProps {
  unitId?: string;
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
  size?: any; // BannerAdSize type, but can be null if AdMob not available
}

export function AdBanner({
  unitId,
  style,
  onAdLoaded,
  onAdFailedToLoad,
  size
}: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [adDismissedToday, setAdDismissedToday] = useState(false);

  // Validate AdMob components before using them
  const validation = validateAdMobComponents();
  if (!validation.valid) {
    // Silently return null - don't crash the app
    return null;
  }

  // Set default size only if AdMob is available and validated
  const adSize = size || (BannerAdSize?.BANNER) || 'banner';

  useEffect(() => {
    checkAdDismissedToday();
  }, []);

  const checkAdDismissedToday = async () => {
    try {
      const lastDismissed = await AsyncStorage.getItem('ad_last_dismissed_date');
      const today = new Date().toDateString();
      if (lastDismissed === today) {
        setAdDismissedToday(true);
        setIsVisible(false);
      }
    } catch (error) {
      // Ignore
    }
  };

  const handleDismiss = async () => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('ad_last_dismissed_date', today);
      setIsVisible(false);
    } catch (error) {
      setIsVisible(false);
    }
  };

  // Get the ad unit ID - use test ID if not provided or in development
  const getAdUnitId = () => {
    if (unitId) return unitId;

    // Always use test ID when AdMob is not available (Expo Go, etc.)
    if (!isAdMobAvailable || Constants.executionEnvironment === 'storeClient') {
      return 'ca-app-pub-3940256099942544/6300978111'; // AdMob test banner ID
    }

    // AdMob is available, use proper IDs
    if (__DEV__) {
      return TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
    }

    // Production: use environment variables
    const envVar = Platform.OS === 'ios'
      ? Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_IOS
      : Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;

    return envVar || TestIds?.BANNER || 'ca-app-pub-3940256099942544/6300978111';
  };

  if (!isVisible || adDismissedToday) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.adContent}>
        <View style={styles.adLabel}>
          <Text style={styles.adLabelText}>Ad</Text>
        </View>
        <View style={styles.adWrapper}>
          <BannerAd
            unitId={getAdUnitId()}
            size={adSize}
            onAdLoaded={onAdLoaded}
            onAdFailedToLoad={onAdFailedToLoad}
          />
        </View>
      </View>
      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

// Smart ad component with frequency capping
interface SmartAdBannerProps {
  placement: 'home' | 'league' | 'matchup' | 'standings';
  style?: any;
  forceShow?: boolean; // For testing - bypasses all checks
}

export function SmartAdBanner({ placement, style, forceShow = false }: SmartAdBannerProps) {
  const [shouldShow, setShouldShow] = useState(false);

  // Validate AdMob components before using them
  const validation = validateAdMobComponents();
  if (!validation.valid && !forceShow) {
    // Silently return null - don't crash the app
    return null;
  }

  useEffect(() => {
    if (forceShow) {
      setShouldShow(true);
      return;
    }
    checkShouldShowAd();
  }, [placement, forceShow]);
  
  const checkShouldShowAd = async () => {
    try {
      // In development, always show ads for testing
      if (__DEV__) {
        setShouldShow(true);
        return;
      }
      
      // Frequency capping: max 3 ads per day per user
      const adCountKey = `ad_count_${new Date().toDateString()}`;
      const adCount = await AsyncStorage.getItem(adCountKey);
      const count = adCount ? parseInt(adCount, 10) : 0;
      
      if (count < 3) {
        // Increment count
        await AsyncStorage.setItem(adCountKey, (count + 1).toString());
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
      
      // Placement-based probability (don't show on every screen)
      const placementProbabilities = {
        home: 0.3, // 30% chance on home
        league: 0.4, // 40% chance on league dashboard
        matchup: 0.5, // 50% chance on matchup screen
        standings: 0.3, // 30% chance on standings
      };
      
      const probability = placementProbabilities[placement] || 0.3;
      if (Math.random() > probability) {
        setShouldShow(false);
      }
    } catch (error) {
      // On error, show ad in dev mode
      setShouldShow(__DEV__);
    }
  };
  
  if (!shouldShow) {
    return null;
  }
  
  return (
    <AdBanner
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adLabel: {
    backgroundColor: colors.primary[500] + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  adLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[500],
    textTransform: 'uppercase',
  },
  adWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

