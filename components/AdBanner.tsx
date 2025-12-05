// ============================================
// AD BANNER COMPONENT
// Lock-In Fitness Competition App
// Dismissible, non-intrusive ad banner
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock ad component for now (replace with real ad SDK when ready)
interface AdBannerProps {
  unitId?: string;
  style?: any;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: any) => void;
}

export function AdBanner({ 
  unitId, 
  style,
  onAdLoaded,
  onAdFailedToLoad 
}: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [adDismissedToday, setAdDismissedToday] = useState(false);
  
  useEffect(() => {
    checkAdDismissedToday();
    // Simulate ad loading
    setTimeout(() => {
      setIsLoading(false);
      onAdLoaded?.();
    }, 500);
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
  
  if (!isVisible || adDismissedToday) {
    return null;
  }
  
  return (
    <View style={[styles.container, style]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text.tertiary} />
        </View>
      ) : (
        <>
          <View style={styles.adContent}>
            <View style={styles.adLabel}>
              <Text style={styles.adLabelText}>Ad</Text>
            </View>
            <View style={styles.adPlaceholder}>
              <Ionicons name="megaphone-outline" size={24} color={colors.text.tertiary} />
              <Text style={styles.adPlaceholderText}>
                Advertisement
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </>
      )}
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
      unitId={`ca-app-pub-3940256099942544/6300978111`} // Test ad unit ID
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
    minHeight: 80,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
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
  adPlaceholder: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adPlaceholderText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

