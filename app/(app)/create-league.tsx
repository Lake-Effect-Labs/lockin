import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { colors } from '@/utils/colors';
import { DEFAULT_SCORING_CONFIG, getScoringRules } from '@/services/scoring';

// ============================================
// CREATE LEAGUE SCREEN
// Create a new league
// ============================================

const SEASON_OPTIONS = [
  { value: 6, label: '6 Weeks', description: 'Quick season' },
  { value: 8, label: '8 Weeks', description: 'Standard season' },
  { value: 10, label: '10 Weeks', description: 'Extended season' },
  { value: 12, label: '12 Weeks', description: 'Full season' },
];

const LEAGUE_SIZE_OPTIONS = [
  { value: 4, label: '4 Players' },
  { value: 6, label: '6 Players' },
  { value: 8, label: '8 Players' },
  { value: 10, label: '10 Players' },
  { value: 12, label: '12 Players' },
  { value: 14, label: '14 Players' },
];

export default function CreateLeagueScreen() {
  const [name, setName] = useState('');
  const [seasonLength, setSeasonLength] = useState<6 | 8 | 10 | 12>(8);
  const [maxPlayers, setMaxPlayers] = useState<4 | 6 | 8 | 10 | 12 | 14>(8);
  const [useDefaultScoring, setUseDefaultScoring] = useState(true);
  const [scoringConfig, setScoringConfig] = useState({
    points_per_1000_steps: DEFAULT_SCORING_CONFIG.POINTS_PER_1000_STEPS,
    points_per_sleep_hour: DEFAULT_SCORING_CONFIG.POINTS_PER_SLEEP_HOUR,
    points_per_100_active_cal: DEFAULT_SCORING_CONFIG.POINTS_PER_100_ACTIVE_CAL,
    points_per_workout: DEFAULT_SCORING_CONFIG.POINTS_PER_WORKOUT,
    points_per_mile: DEFAULT_SCORING_CONFIG.POINTS_PER_MILE,
  });
  const [createdLeague, setCreatedLeague] = useState<{ id: string; name: string; join_code: string } | null>(null);
  
  const { user } = useAuthStore();
  const { createLeague, isLoading } = useLeagueStore();
  
  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('League Name Required', 'Please enter a name for your league');
      return;
    }
    
    if (name.trim().length > 30) {
      Alert.alert('Name Too Long', 'League name must be 30 characters or less');
      return;
    }
    
    if (!user) {
      Alert.alert('Sign In Required', 'You must be signed in to create a league');
      return;
    }
    
    try {
      const config = useDefaultScoring ? null : scoringConfig;
      const league = await createLeague(name.trim(), seasonLength, user.id, maxPlayers, config);
      setCreatedLeague({ id: league.id, name: league.name, join_code: league.join_code });
    } catch (err: any) {
      // Better error messages
      let errorMessage = 'Failed to create league. Please try again.';
      if (err.message?.includes('already exists')) {
        errorMessage = 'A league with this name already exists. Please choose a different name.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      Alert.alert('Unable to Create League', errorMessage);
    }
  };
  
  const handleCopyCode = async () => {
    if (!createdLeague) return;
    
    try {
      await Clipboard.setStringAsync(createdLeague.join_code);
      Alert.alert('Copied!', `Join code "${createdLeague.join_code}" has been copied to your clipboard. Share it with friends!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code. Please try again.');
    }
  };
  
  const handleShare = async () => {
    if (!createdLeague) return;
    
    const joinCode = createdLeague.join_code;
    const leagueName = createdLeague.name;
    
    // Simple share message
    const shareMessage = `Join my Lock-In fitness league: "${leagueName}"

Join Code: ${joinCode}`;
    
    try {
      await Share.share({
        message: shareMessage,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  const handleDone = () => {
    if (createdLeague) {
      router.replace(`/(app)/league/${createdLeague.id}`);
    }
  };
  
  // Success state
  if (createdLeague) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.container}
      >
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>League Created!</Text>
          <Text style={styles.successSubtitle}>{createdLeague.name}</Text>
          
          <View style={styles.inviteCard}>
            <Text style={styles.inviteText}>
              Share this code with friends to join your league
            </Text>
            <TouchableOpacity 
              onPress={handleCopyCode}
              style={styles.codeCard}
              activeOpacity={0.7}
            >
              <Text style={styles.codeValue}>{createdLeague.join_code}</Text>
              <Ionicons name="copy-outline" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              style={styles.shareButton}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={18} color={colors.text.primary} />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Go to League</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }
  
  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(app)/home');
                }
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Create League</Text>
            <View style={styles.placeholder} />
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            {/* League Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>League Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="trophy-outline" 
                  size={20} 
                  color={colors.text.tertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Fitness Warriors"
                  placeholderTextColor={colors.text.tertiary}
                  value={name}
                  onChangeText={setName}
                  maxLength={30}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {name.length > 0 && (
                  <Text style={styles.charCount}>
                    {name.length}/30
                  </Text>
                )}
              </View>
            </View>
            
            {/* Season Length */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Season Length</Text>
              <View style={styles.seasonOptions}>
                {SEASON_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSeasonLength(option.value as 6 | 8 | 10 | 12)}
                    style={[
                      styles.seasonOption,
                      seasonLength === option.value && styles.seasonOptionActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.seasonLabel,
                      seasonLength === option.value && styles.seasonLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.seasonDescription,
                      seasonLength === option.value && styles.seasonDescriptionActive,
                    ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* League Size */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>League Size</Text>
              <View style={styles.sizeOptions}>
                {LEAGUE_SIZE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setMaxPlayers(option.value as 4 | 6 | 8 | 10 | 12 | 14)}
                    style={[
                      styles.sizeOption,
                      maxPlayers === option.value && styles.sizeOptionActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.sizeLabel,
                      maxPlayers === option.value && styles.sizeLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sizeHint}>
                League will start automatically when full
              </Text>
            </View>
            
            {/* Scoring Configuration */}
            <View style={styles.inputGroup}>
              <View style={styles.scoringHeader}>
                <Text style={styles.label}>Scoring Rules</Text>
                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleLabel}>Use Default</Text>
                  <Switch
                    value={useDefaultScoring}
                    onValueChange={setUseDefaultScoring}
                    trackColor={{ false: colors.border.default, true: colors.primary[500] }}
                    thumbColor={colors.text.primary}
                  />
                </View>
              </View>
              
              {useDefaultScoring ? (
                <View style={styles.defaultScoringCard}>
                  <Text style={styles.defaultScoringText}>
                    Using default scoring rules. All leagues will use the same point values.
                  </Text>
                  <View style={styles.rulesList}>
                    {getScoringRules().map((rule, index) => (
                      <View key={index} style={styles.ruleItem}>
                        <Text style={styles.ruleIcon}>{rule.icon}</Text>
                        <Text style={styles.ruleText}>{rule.rule}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.customScoringCard}>
                  <Text style={styles.customScoringText}>
                    Set custom point values for this league
                  </Text>
                  
                  {/* Steps */}
                  <View style={styles.scoringInputRow}>
                    <View style={styles.scoringInputLeft}>
                      <Text style={styles.scoringInputLabel}>👟 Steps</Text>
                      <Text style={styles.scoringInputHint}>Points per 1,000 steps</Text>
                    </View>
                    <TextInput
                      style={styles.scoringInput}
                      value={scoringConfig.points_per_1000_steps.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setScoringConfig({ ...scoringConfig, points_per_1000_steps: val });
                      }}
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>
                  
                  {/* Sleep */}
                  <View style={styles.scoringInputRow}>
                    <View style={styles.scoringInputLeft}>
                      <Text style={styles.scoringInputLabel}>😴 Sleep</Text>
                      <Text style={styles.scoringInputHint}>Points per hour</Text>
                    </View>
                    <TextInput
                      style={styles.scoringInput}
                      value={scoringConfig.points_per_sleep_hour.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setScoringConfig({ ...scoringConfig, points_per_sleep_hour: val });
                      }}
                      keyboardType="numeric"
                      placeholder="2"
                    />
                  </View>
                  
                  {/* Calories */}
                  <View style={styles.scoringInputRow}>
                    <View style={styles.scoringInputLeft}>
                      <Text style={styles.scoringInputLabel}>🔥 Calories</Text>
                      <Text style={styles.scoringInputHint}>Points per 100 active cal</Text>
                    </View>
                    <TextInput
                      style={styles.scoringInput}
                      value={scoringConfig.points_per_100_active_cal.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setScoringConfig({ ...scoringConfig, points_per_100_active_cal: val });
                      }}
                      keyboardType="numeric"
                      placeholder="5"
                    />
                  </View>
                  
                  {/* Workouts */}
                  <View style={styles.scoringInputRow}>
                    <View style={styles.scoringInputLeft}>
                      <Text style={styles.scoringInputLabel}>💪 Workouts</Text>
                      <Text style={styles.scoringInputHint}>Points per workout</Text>
                    </View>
                    <TextInput
                      style={styles.scoringInput}
                      value={scoringConfig.points_per_workout.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setScoringConfig({ ...scoringConfig, points_per_workout: val });
                      }}
                      keyboardType="numeric"
                      placeholder="20"
                    />
                  </View>
                  
                  {/* Distance */}
                  <View style={styles.scoringInputRow}>
                    <View style={styles.scoringInputLeft}>
                      <Text style={styles.scoringInputLabel}>🏃 Distance</Text>
                      <Text style={styles.scoringInputHint}>Points per mile</Text>
                    </View>
                    <TextInput
                      style={styles.scoringInput}
                      value={scoringConfig.points_per_mile.toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setScoringConfig({ ...scoringConfig, points_per_mile: val });
                      }}
                      keyboardType="numeric"
                      placeholder="3"
                    />
                  </View>
                </View>
              )}
            </View>
            
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.infoText}>
                After the regular season, the top 4 players will compete in playoffs (semifinals + finals) to crown the champion!
              </Text>
            </View>
            
            {/* Create Button */}
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading || !name.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isLoading || !name.trim() ? [colors.background.card, colors.background.elevated] : colors.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.createButton, (isLoading || !name.trim()) && styles.createButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <>
                    <Ionicons 
                      name="add-circle-outline" 
                      size={20} 
                      color={name.trim() ? colors.text.primary : colors.text.tertiary} 
                    />
                    <Text style={[
                      styles.createButtonText,
                      !name.trim() && styles.createButtonTextDisabled
                    ]}>
                      Create League
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: colors.text.primary,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginLeft: 8,
  },
  seasonOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  seasonOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  seasonOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '10',
  },
  seasonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  seasonLabelActive: {
    color: colors.primary[500],
  },
  seasonDescription: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  seasonDescriptionActive: {
    color: colors.text.secondary,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sizeOption: {
    width: '30%',
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  sizeOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '10',
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  sizeLabelActive: {
    color: colors.primary[500],
    fontWeight: '700',
  },
  sizeHint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
    marginLeft: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 18,
    color: colors.text.secondary,
    marginBottom: 32,
  },
  inviteCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  inviteText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  codeCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  codeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary[500],
    letterSpacing: 4,
    flex: 1,
    textAlign: 'center',
  },
  copyIcon: {
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500] + '10',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
  },
  doneButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scoringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  defaultScoringCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  defaultScoringText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  rulesList: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleIcon: {
    fontSize: 16,
  },
  ruleText: {
    fontSize: 13,
    color: colors.text.primary,
    flex: 1,
  },
  customScoringCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
  },
  customScoringText: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  scoringInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  scoringInputLeft: {
    flex: 1,
  },
  scoringInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  scoringInputHint: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  scoringInput: {
    width: 80,
    height: 40,
    backgroundColor: colors.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
});

