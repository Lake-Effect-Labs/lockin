// ============================================
// SYNC STATUS INDICATOR
// Lock-In Fitness Competition App
// Shows real-time sync status
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';
import { useSyncStatus } from '@/hooks/useRealtimeSync';

interface SyncStatusIndicatorProps {
  onPress?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({ 
  onPress, 
  showDetails = false,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { isSyncing, lastSyncTime, syncNeeded } = useSyncStatus();
  const [pulseAnim] = useState(new Animated.Value(1));
  
  // Pulse animation when syncing
  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing]);
  
  const getStatusColor = () => {
    if (isSyncing) return colors.primary[500];
    if (syncNeeded) return colors.status.warning;
    return colors.status.success;
  };
  
  const getStatusIcon = () => {
    if (isSyncing) return 'sync';
    if (syncNeeded) return 'cloud-offline-outline';
    return 'cloud-done-outline';
  };
  
  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    return lastSyncTime;
  };
  
  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.compactContainer}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Ionicons 
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()} 
          />
        </Animated.View>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.container}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Ionicons 
            name={getStatusIcon()} 
            size={18} 
            color={getStatusColor()} 
          />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {showDetails && (
            <Text style={styles.detailText}>
              {isSyncing ? 'Updating scores...' : 'Tap to refresh'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// LIVE INDICATOR
// ============================================

interface LiveIndicatorProps {
  isLive?: boolean;
  label?: string;
}

export function LiveIndicator({ isLive = true, label = 'LIVE' }: LiveIndicatorProps) {
  const [opacity] = useState(new Animated.Value(1));
  
  useEffect(() => {
    if (isLive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLive]);
  
  if (!isLive) return null;
  
  return (
    <View style={styles.liveContainer}>
      <Animated.View style={[styles.liveDot, { opacity }]} />
      <Text style={styles.liveText}>{label}</Text>
    </View>
  );
}

// ============================================
// LAST UPDATED TEXT
// ============================================

interface LastUpdatedProps {
  timestamp: string | null;
  prefix?: string;
}

export function LastUpdated({ timestamp, prefix = 'Updated' }: LastUpdatedProps) {
  const [displayTime, setDisplayTime] = useState('');
  
  useEffect(() => {
    const updateDisplay = () => {
      if (!timestamp) {
        setDisplayTime('Never');
        return;
      }
      
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      
      if (diffSeconds < 60) {
        setDisplayTime('Just now');
      } else if (diffSeconds < 120) {
        setDisplayTime('1 min ago');
      } else if (diffSeconds < 3600) {
        setDisplayTime(`${Math.floor(diffSeconds / 60)} mins ago`);
      } else if (diffSeconds < 7200) {
        setDisplayTime('1 hour ago');
      } else {
        setDisplayTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    
    updateDisplay();
    const interval = setInterval(updateDisplay, 30000);
    return () => clearInterval(interval);
  }, [timestamp]);
  
  return (
    <Text style={styles.lastUpdatedText}>
      {prefix} {displayTime}
    </Text>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  compactContainer: {
    padding: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  detailText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.status.error,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.status.error,
    letterSpacing: 1,
  },
  lastUpdatedText: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
});

