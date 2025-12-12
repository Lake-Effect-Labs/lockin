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
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;
let mobileAds: any = null;

try {
  // Only import AdMob if we're not in Expo Go
  if (Constants.executionEnvironment !== 'storeClient') {
    const admob = require('react-native-google-mobile-ads');
    BannerAd = admob.BannerAd;
    BannerAdSize = admob.BannerAdSize;
    TestIds = admob.TestIds;
    mobileAds = admob.mobileAds;
  }
} catch (error) {
  // AdMob not available (likely Expo Go)
  console.log('AdMob not available in this environment');
}
interface AdBannerProps {
  unitId?: string;
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
  size?: BannerAdSize;
}

export function AdBanner({
  unitId,
  style,
  onAdLoaded,
  onAdFailedToLoad,
  size = BannerAdSize.BANNER
}: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [adDismissedToday, setAdDismissedToday] = useState(false);

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

  // Check if AdMob is available
  const isAdMobAvailable = BannerAd && BannerAdSize && TestIds;

  // Get the ad unit ID - use test ID if not provided or in development
  const getAdUnitId = () => {
    if (unitId) return unitId;
    if (__DEV__) return TestIds?.BANNER || 'test-banner-id';

    // Production: use environment variables
    const envVar = Platform.OS === 'ios'
      ? Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_IOS
      : Constants.expoConfig?.extra?.EXPO_PUBLIC_ADMOB_BANNER_ANDROID;

    return envVar || TestIds?.BANNER || 'test-banner-id';
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
          {isAdMobAvailable ? (
            <BannerAd
              unitId={getAdUnitId()}
              size={size}
              onAdLoaded={onAdLoaded}
              onAdFailedToLoad={onAdFailedToLoad}
            />
          ) : (
            // Show placeholder when AdMob is not available (Expo Go)
            <View style={styles.adPlaceholder}>
              <Ionicons name="megaphone-outline" size={24} color={colors.text.tertiary} />
              <Text style={styles.adPlaceholderText}>
                Advertisement
              </Text>
            </View>
          )}
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

