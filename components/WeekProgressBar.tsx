import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';

// ============================================
// WEEK PROGRESS BAR COMPONENT
// Shows progress through the week/season
// ============================================

interface WeekProgressBarProps {
  currentWeek: number;
  totalWeeks: number;
  playoffsStarted?: boolean;
  hasStarted?: boolean; // Whether league has started
  style?: ViewStyle;
}

export function WeekProgressBar({
  currentWeek,
  totalWeeks,
  playoffsStarted = false,
  hasStarted = true,
  style,
}: WeekProgressBarProps) {
  const progress = hasStarted ? Math.min(currentWeek / totalWeeks, 1) : 0;
  const playoffWeeks = 2; // Semis + Finals
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>Season Progress</Text>
        <Text style={styles.weekText}>
          {!hasStarted
            ? 'Waiting to Start'
            : playoffsStarted 
            ? 'Playoffs' 
            : `Week ${currentWeek} of ${totalWeeks}`
          }
        </Text>
      </View>
      
      <View style={styles.barContainer}>
        {/* Regular season bar */}
        <View style={styles.barBackground}>
          <LinearGradient
            colors={colors.gradients.primary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${progress * 100}%` }]}
          />
        </View>
        
        {/* Playoff indicator */}
        <View style={[
          styles.playoffSection,
          playoffsStarted && styles.playoffActive,
        ]}>
          <Text style={styles.playoffText}>🏆</Text>
        </View>
      </View>
      
    </View>
  );
}

// Countdown timer component
interface CountdownProps {
  daysRemaining: number;
  label?: string;
  style?: ViewStyle;
}

export function Countdown({
  daysRemaining,
  label = 'Week ends in',
  style,
}: CountdownProps) {
  const getUrgencyColor = () => {
    if (daysRemaining <= 1) return colors.status.error;
    if (daysRemaining <= 3) return colors.status.warning;
    return colors.text.secondary;
  };
  
  return (
    <View style={[styles.countdownContainer, style]}>
      <Text style={styles.countdownLabel}>{label}</Text>
      <View style={styles.countdownValue}>
        <Text style={[styles.countdownNumber, { color: getUrgencyColor() }]}>
          {daysRemaining}
        </Text>
        <Text style={styles.countdownUnit}>
          {daysRemaining === 1 ? 'day' : 'days'}
        </Text>
      </View>
    </View>
  );
}

// Season timeline
interface SeasonTimelineProps {
  currentWeek: number;
  totalWeeks: number;
  playoffsStarted: boolean;
  isChampion?: boolean;
  style?: ViewStyle;
}

export function SeasonTimeline({
  currentWeek,
  totalWeeks,
  playoffsStarted,
  isChampion = false,
  style,
}: SeasonTimelineProps) {
  const phases = [
    { label: 'Regular Season', weeks: totalWeeks, icon: '📅' },
    { label: 'Semifinals', weeks: 1, icon: '🔥' },
    { label: 'Finals', weeks: 1, icon: '🏆' },
  ];
  
  const getCurrentPhase = () => {
    if (isChampion) return 3;
    if (playoffsStarted) {
      return currentWeek > totalWeeks + 1 ? 2 : 1;
    }
    return 0;
  };
  
  const currentPhase = getCurrentPhase();
  
  return (
    <View style={[styles.timelineContainer, style]}>
      {phases.map((phase, index) => (
        <React.Fragment key={index}>
          <View style={styles.timelinePhase}>
            <View style={[
              styles.timelineIcon,
              index <= currentPhase && styles.timelineIconActive,
              index < currentPhase && styles.timelineIconComplete,
            ]}>
              <Text style={styles.timelineEmoji}>{phase.icon}</Text>
            </View>
            <Text style={[
              styles.timelineLabel,
              index === currentPhase && styles.timelineLabelActive,
            ]}>
              {phase.label}
            </Text>
          </View>
          
          {index < phases.length - 1 && (
            <View style={[
              styles.timelineLine,
              index < currentPhase && styles.timelineLineComplete,
            ]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// Match week indicator
interface WeekIndicatorProps {
  week: number;
  isActive?: boolean;
  isComplete?: boolean;
  isCurrent?: boolean;
}

export function WeekIndicator({
  week,
  isActive = false,
  isComplete = false,
  isCurrent = false,
}: WeekIndicatorProps) {
  return (
    <View style={[
      styles.weekIndicator,
      isActive && styles.weekIndicatorActive,
      isComplete && styles.weekIndicatorComplete,
      isCurrent && styles.weekIndicatorCurrent,
    ]}>
      <Text style={[
        styles.weekIndicatorText,
        (isActive || isComplete || isCurrent) && styles.weekIndicatorTextActive,
      ]}>
        {week}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  weekText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[500],
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background.tertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  playoffSection: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  playoffActive: {
    borderColor: colors.sport.gold,
    backgroundColor: colors.sport.gold + '20',
  },
  playoffText: {
    fontSize: 14,
  },
  markers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingRight: 40,
  },
  marker: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background.tertiary,
  },
  markerComplete: {
    backgroundColor: colors.primary[500],
  },
  markerCurrent: {
    backgroundColor: colors.primary[500],
    transform: [{ scale: 1.5 }],
  },
  countdownContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  countdownLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  countdownUnit: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  timelinePhase: {
    alignItems: 'center',
  },
  timelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  timelineIconActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '20',
  },
  timelineIconComplete: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  timelineEmoji: {
    fontSize: 20,
  },
  timelineLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 80,
  },
  timelineLabelActive: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  timelineLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border.default,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  timelineLineComplete: {
    backgroundColor: colors.primary[500],
  },
  weekIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  weekIndicatorActive: {
    borderColor: colors.primary[500],
  },
  weekIndicatorComplete: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  weekIndicatorCurrent: {
    backgroundColor: colors.primary[500] + '30',
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  weekIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  weekIndicatorTextActive: {
    color: colors.text.primary,
  },
});

