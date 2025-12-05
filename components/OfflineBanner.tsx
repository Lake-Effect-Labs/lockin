import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';
import { getIsOnline, subscribeToNetworkStatus } from '@/services/errorHandler';

// ============================================
// OFFLINE BANNER COMPONENT
// Shows when device is offline
// ============================================

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(getIsOnline());
  const [slideAnim] = useState(new Animated.Value(-50));
  
  useEffect(() => {
    const unsubscribe = subscribeToNetworkStatus((online) => {
      setIsOnline(online);
    });
    
    return unsubscribe;
  }, []);
  
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOnline ? -50 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);
  
  if (isOnline) return null;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={18} color={colors.text.primary} />
      <Text style={styles.text}>You're offline. Some features may be limited.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

