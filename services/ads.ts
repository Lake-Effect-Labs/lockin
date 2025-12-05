// ============================================
// AD MANAGEMENT SERVICE
// Lock-In Fitness Competition App
// Handles ad loading, frequency capping, and revenue tracking
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

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

