import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';

// ============================================
// STAT BUBBLE COMPONENT
// Display fitness metrics in bubbles
// ============================================

interface StatBubbleProps {
  icon: string;
  value: string | number;
  label: string;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export function StatBubble({
  icon,
  value,
  label,
  color = colors.primary[500],
  size = 'medium',
  style,
}: StatBubbleProps) {
  const sizes = {
    small: { container: 80, icon: 20, value: 16, label: 10 },
    medium: { container: 100, icon: 24, value: 20, label: 11 },
    large: { container: 120, icon: 28, value: 24, label: 12 },
  };
  
  const s = sizes[size];
  
  // Extract values to avoid reanimated warnings
  const containerSize = s.container;
  const iconSize = s.icon;
  const valueSize = s.value;
  const labelSize = s.label;
  
  return (
    <View style={[styles.container, { width: containerSize }, style]}>
      <LinearGradient
        colors={[color + '30', color + '10']}
        style={[styles.bubble, { width: containerSize, height: containerSize }]}
      >
        <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
        <Text style={[styles.value, { fontSize: valueSize }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </LinearGradient>
      <Text style={[styles.label, { fontSize: labelSize }]}>{label}</Text>
    </View>
  );
}

// Horizontal stat row
interface StatRowProps {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  style?: ViewStyle;
}

export function StatRow({
  icon,
  label,
  value,
  subValue,
  color = colors.primary[500],
  style,
}: StatRowProps) {
  return (
    <View style={[styles.rowContainer, style]}>
      <View style={[styles.rowIcon, { backgroundColor: color + '20' }]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subValue && <Text style={styles.rowSubValue}>{subValue}</Text>}
      </View>
      <Text style={[styles.rowValue, { color }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </View>
  );
}

// Stats grid
interface StatsGridProps {
  stats: Array<{
    icon: string;
    value: string | number;
    label: string;
    color?: string;
  }>;
  columns?: 2 | 3 | 4;
  style?: ViewStyle;
}

export function StatsGrid({ stats, columns = 3, style }: StatsGridProps) {
  return (
    <View style={[styles.grid, { flexWrap: 'wrap' }, style]}>
      {stats.map((stat, index) => (
        <View 
          key={index} 
          style={[styles.gridItem, { width: `${100 / columns}%` }]}
        >
          <StatBubble
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            color={stat.color}
            size="small"
          />
        </View>
      ))}
    </View>
  );
}

// Points breakdown card
interface PointsBreakdownProps {
  steps: number;
  stepsPoints: number;
  sleep: number;
  sleepPoints: number;
  calories: number;
  caloriesPoints: number;
  workouts: number;
  workoutsPoints: number;
  standHours: number;
  standHoursPoints: number;
  distance: number;
  distancePoints: number;
  totalPoints: number;
  style?: ViewStyle;
}

export function PointsBreakdown({
  steps,
  stepsPoints,
  sleep,
  sleepPoints,
  calories,
  caloriesPoints,
  workouts,
  workoutsPoints,
  standHours,
  standHoursPoints,
  distance,
  distancePoints,
  totalPoints,
  style,
}: PointsBreakdownProps) {
  const rows = [
    { icon: '👟', label: 'Steps', value: steps.toLocaleString(), points: stepsPoints, color: colors.primary[500] },
    { icon: '😴', label: 'Sleep', value: `${sleep.toFixed(1)}h`, points: sleepPoints, color: colors.secondary[500] },
    { icon: '🔥', label: 'Calories', value: calories.toLocaleString(), points: caloriesPoints, color: '#E74C3C' },
    { icon: '💪', label: 'Workout Mins', value: `${workouts}m`, points: workoutsPoints, color: colors.accent[500] },
    // Removed: Stand Hours - requires Apple Watch
    { icon: '🏃', label: 'Distance', value: `${distance.toFixed(1)} mi`, points: distancePoints, color: '#3498DB' },
  ];
  
  return (
    <View style={[styles.breakdownContainer, style]}>
      {rows.map((row, index) => (
        <View key={index} style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <View style={[styles.breakdownIcon, { backgroundColor: row.color + '20' }]}>
              <Text style={styles.breakdownIconText}>{row.icon}</Text>
            </View>
            <View>
              <Text style={styles.breakdownLabel}>{row.label}</Text>
              <Text style={styles.breakdownValue}>{row.value}</Text>
            </View>
          </View>
          <Text style={[styles.breakdownPoints, { color: row.color }]}>
            +{row.points.toFixed(1)}
          </Text>
        </View>
      ))}
      
      <View style={styles.breakdownDivider} />
      
      <View style={styles.breakdownTotal}>
        <Text style={styles.breakdownTotalLabel}>Total Points</Text>
        <Text style={styles.breakdownTotalValue}>{totalPoints.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  icon: {
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  label: {
    color: colors.text.secondary,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
  },
  rowContent: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  rowSubValue: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  rowValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
  },
  gridItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  breakdownIconText: {
    fontSize: 16,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  breakdownValue: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  breakdownPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: 12,
  },
  breakdownTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  breakdownTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary[500],
  },
});

