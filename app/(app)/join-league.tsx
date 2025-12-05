import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';
import { colors } from '@/utils/colors';

// ============================================
// JOIN LEAGUE SCREEN
// Join existing league with code
// ============================================

export default function JoinLeagueScreen() {
  const { code: codeFromParams } = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(codeFromParams || '');
  const [joined, setJoined] = useState(false);
  
  const { user } = useAuthStore();
  const { joinLeague, isLoading } = useLeagueStore();
  
  // Auto-fill code from deep link
  useEffect(() => {
    if (codeFromParams) {
      setCode(codeFromParams.toUpperCase());
    }
  }, [codeFromParams]);
  
  const handleJoin = async () => {
    const cleanCode = code.trim().toUpperCase();
    
    if (cleanCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-character code');
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }
    
    try {
      await joinLeague(cleanCode, user.id);
      setJoined(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to join league');
    }
  };
  
  // Success state
  if (joined) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary]}
        style={styles.container}
      >
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>🏆</Text>
          </View>
          <Text style={styles.successTitle}>You're In!</Text>
          <Text style={styles.successSubtitle}>
            Welcome to the league. Time to compete!
          </Text>
          
          <TouchableOpacity
            onPress={() => router.replace('/(app)/home')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Let's Go!</Text>
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
        <View style={styles.content}>
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
            <Text style={styles.title}>Join League</Text>
            <View style={styles.placeholder} />
          </View>
          
          {/* Content */}
          <View style={styles.formContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🎯</Text>
            </View>
            
            <Text style={styles.heading}>Enter Join Code</Text>
            <Text style={styles.description}>
              Ask your friend for their league's 6-character code
            </Text>
            
            {/* Code Input */}
            <View style={styles.codeInputContainer}>
              <TextInput
                style={styles.codeInput}
                placeholder="ABC123"
                placeholderTextColor={colors.text.tertiary}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            
            {/* Join Button */}
            <TouchableOpacity
              onPress={handleJoin}
              disabled={isLoading || code.length !== 6}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={code.length === 6 ? colors.gradients.primary : [colors.background.card, colors.background.elevated]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinButton}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <>
                    <Ionicons 
                      name="enter-outline" 
                      size={20} 
                      color={code.length === 6 ? colors.text.primary : colors.text.tertiary} 
                    />
                    <Text style={[
                      styles.joinButtonText,
                      code.length !== 6 && styles.joinButtonTextDisabled,
                    ]}>
                      Join League
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
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
  formContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border.default,
    height: 72,
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 8,
  },
  joinButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 240,
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  joinButtonTextDisabled: {
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
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
});

