import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/utils/colors';
import { sendLocalNotification } from '@/services/notifications';
import { resetPassword } from '@/services/supabase';

// ============================================
// LOGIN SCREEN
// Email/password and magic link authentication
// ============================================

export default function LoginScreen() {
  const { joinCode } = useLocalSearchParams<{ joinCode?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const { signIn, isLoading } = useAuthStore();
  
  const handleSignIn = async () => {
    if (!email || !password) {
      await sendLocalNotification({
        title: 'Sign In Failed',
        body: 'Please enter your email and password',
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await sendLocalNotification({
        title: 'Invalid Email',
        body: 'Please enter a valid email address',
      });
      return;
    }
    
    try {
      await signIn(email, password);
      // Redirect to join league if code was provided, otherwise go to home
      if (joinCode) {
        router.replace(`/(app)/join-league?code=${joinCode}`);
      } else {
        router.replace('/(app)/home');
      }
    } catch (err: any) {
      // Better error messages
      let errorMessage = 'Invalid email or password. Please try again.';
      if (err.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox.';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      await sendLocalNotification({
        title: 'Sign In Failed',
        body: errorMessage,
      });
    }
  };
  
  const handleForgotPassword = async () => {
    if (!email) {
      await sendLocalNotification({
        title: 'Email Required',
        body: 'Please enter your email address',
      });
      return;
    }
    
    try {
      setIsResettingPassword(true);
      await resetPassword(email);
      await sendLocalNotification({
        title: 'Password Reset Sent',
        body: 'Check your email for password reset instructions',
      });
      setShowForgotPassword(false);
    } catch (err: any) {
      await sendLocalNotification({
        title: 'Error',
        body: err.message || 'Failed to send password reset email',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };
  
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
            <Text style={styles.logo}>🔥</Text>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue competing</Text>
          </View>
          
          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={colors.text.tertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            
            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={colors.text.tertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            
            {/* Forgot Password */}
            {!showForgotPassword ? (
              <TouchableOpacity
                onPress={() => setShowForgotPassword(true)}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.forgotPasswordContainer}>
                <Text style={styles.forgotPasswordLabel}>
                  Enter your email and we'll send you reset instructions
                </Text>
              <TouchableOpacity
                onPress={handleForgotPassword}
                disabled={isResettingPassword}
                style={styles.resetButton}
                activeOpacity={0.8}
                accessibilityLabel="Send password reset link"
                accessibilityRole="button"
                accessibilityState={{ disabled: isResettingPassword }}
              >
                  {isResettingPassword ? (
                    <ActivityIndicator color={colors.primary[500]} />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowForgotPassword(false)}
                  style={styles.cancelResetButton}
                  accessibilityLabel="Cancel password reset"
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelResetText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isLoading || !email || !password}
              activeOpacity={0.8}
              accessibilityLabel="Sign in"
              accessibilityRole="button"
              accessibilityState={{ disabled: isLoading || !email || !password }}
            >
              <LinearGradient
                colors={(isLoading || !email || !password) ? [colors.background.card, colors.background.elevated] : colors.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryButton, (isLoading || !email || !password) && styles.primaryButtonDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.primary} />
                ) : (
                  <Text style={[
                    styles.primaryButtonText,
                    (isLoading || !email || !password) && styles.primaryButtonTextDisabled
                  ]}>
                    Sign In
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
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
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  form: {
    gap: 16,
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
  eyeButton: {
    padding: 8,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
  },
  forgotPasswordLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  resetButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  cancelResetButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelResetText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
});

