import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';

// ============================================
// AVATAR COMPONENT
// User profile picture with fallback
// ============================================

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showBorder?: boolean;
  borderColor?: string;
  style?: ViewStyle;
}

const SIZES = {
  small: 32,
  medium: 48,
  large: 64,
  xlarge: 96,
};

const FONT_SIZES = {
  small: 12,
  medium: 18,
  large: 24,
  xlarge: 36,
};

export function Avatar({
  uri,
  name,
  size = 'medium',
  showBorder = false,
  borderColor = colors.primary[500],
  style,
}: AvatarProps) {
  const dimension = SIZES[size];
  const fontSize = FONT_SIZES[size];
  
  // Get initials from name
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  
  // Generate consistent color from name
  const getGradientColors = (name: string | null | undefined): [string, string] => {
    if (!name) return [colors.primary[500], colors.primary[600]];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients: [string, string][] = [
      [colors.primary[500], colors.primary[600]],
      [colors.secondary[500], colors.secondary[600]],
      [colors.accent[500], colors.accent[600]],
      ['#9B59B6', '#8E44AD'],
      ['#E74C3C', '#C0392B'],
      ['#3498DB', '#2980B9'],
      ['#1ABC9C', '#16A085'],
      ['#F39C12', '#D68910'],
    ];
    
    return gradients[hash % gradients.length];
  };
  
  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    overflow: 'hidden',
    ...(showBorder && {
      borderWidth: 2,
      borderColor,
    }),
  };
  
  if (uri) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }
  
  const gradientColors = getGradientColors(name);
  
  return (
    <View style={[containerStyle, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={[styles.initials, { fontSize }]}>
          {getInitials(name)}
        </Text>
      </LinearGradient>
    </View>
  );
}

// Avatar with rank badge
interface RankedAvatarProps extends AvatarProps {
  rank: number;
}

export function RankedAvatar({ rank, ...props }: RankedAvatarProps) {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '👑', color: colors.sport.gold };
    if (rank === 2) return { emoji: '🥈', color: colors.sport.silver };
    if (rank === 3) return { emoji: '🥉', color: colors.sport.bronze };
    return null;
  };
  
  const badge = getRankBadge(rank);
  const size = SIZES[props.size || 'medium'];
  
  return (
    <View style={styles.rankedContainer}>
      <Avatar {...props} />
      {badge && (
        <View style={[
          styles.rankBadge,
          { 
            backgroundColor: badge.color,
            right: -size * 0.1,
            bottom: -size * 0.05,
          }
        ]}>
          <Text style={styles.rankEmoji}>{badge.emoji}</Text>
        </View>
      )}
    </View>
  );
}

// Avatar group (overlapping avatars)
interface AvatarGroupProps {
  users: Array<{ avatar_url?: string | null; username?: string | null }>;
  max?: number;
  size?: 'small' | 'medium';
}

export function AvatarGroup({ users, max = 4, size = 'small' }: AvatarGroupProps) {
  const displayed = users.slice(0, max);
  const remaining = users.length - max;
  const dimension = SIZES[size];
  const overlap = dimension * 0.3;
  
  return (
    <View style={styles.groupContainer}>
      {displayed.map((user, index) => (
        <View
          key={index}
          style={[
            styles.groupAvatar,
            { marginLeft: index > 0 ? -overlap : 0, zIndex: displayed.length - index },
          ]}
        >
          <Avatar
            uri={user.avatar_url}
            name={user.username}
            size={size}
            showBorder
            borderColor={colors.background.primary}
          />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.remainingBadge,
            { 
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              marginLeft: -overlap,
            },
          ]}
        >
          <Text style={styles.remainingText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  rankedContainer: {
    position: 'relative',
  },
  rankBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankEmoji: {
    fontSize: 12,
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatar: {
    borderWidth: 2,
    borderColor: colors.background.primary,
    borderRadius: 100,
  },
  remainingBadge: {
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  remainingText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

