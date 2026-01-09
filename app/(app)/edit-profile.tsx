import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/Avatar';
import { SmartAdBanner } from '@/components/AdBanner';
import { colors } from '@/utils/colors';

// ============================================
// PROFILE EDIT MODAL
// Edit nickname and select avatar
// ============================================

// Predefined avatar options (using gradient colors that match the app style)
const AVATAR_OPTIONS = [
  { id: '1', colors: [colors.primary[500], colors.primary[600]], emoji: '🔥' },
  { id: '2', colors: [colors.secondary[500], colors.secondary[600]], emoji: '⚡' },
  { id: '3', colors: [colors.accent[500], colors.accent[600]], emoji: '💪' },
  { id: '4', colors: ['#9B59B6', '#8E44AD'], emoji: '🏆' },
  { id: '5', colors: ['#E74C3C', '#C0392B'], emoji: '🎯' },
  { id: '6', colors: ['#3498DB', '#2980B9'], emoji: '⭐' },
  { id: '7', colors: ['#1ABC9C', '#16A085'], emoji: '🚀' },
  { id: '8', colors: ['#F39C12', '#D68910'], emoji: '⚽' },
  { id: '9', colors: ['#E91E63', '#C2185B'], emoji: '💎' },
  { id: '10', colors: ['#00BCD4', '#0097A7'], emoji: '🌟' },
  { id: '11', colors: ['#795548', '#5D4037'], emoji: '🎮' },
  { id: '12', colors: ['#607D8B', '#455A64'], emoji: '🏅' },
];

export default function EditProfileScreen() {
  const { user, updateUsername, updateAvatar, isLoading } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.length > 20) {
      Alert.alert('Error', 'Username must be 20 characters or less');
      return;
    }

    try {
      setSaving(true);
      
      // Update username if changed
      if (username.trim() !== user?.username) {
        await updateUsername(username.trim());
      }

      // Update avatar if changed
      if (selectedAvatar !== user?.avatar_url) {
        await updateAvatar(selectedAvatar || '');
      }

      // Navigate back to settings
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(app)/settings');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/settings');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.primary} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Ad Banner - BUG FIX B4 */}
        <SmartAdBanner placement="home" />
        
        {/* Avatar Preview */}
        <View style={styles.avatarSection}>
          <Avatar
            uri={selectedAvatar}
            name={username || user?.username}
            size="xlarge"
            showBorder
            borderColor={colors.primary[500]}
          />
          <Text style={styles.avatarLabel}>Profile Picture</Text>
        </View>

        {/* Username Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your nickname"
            placeholderTextColor={colors.text.tertiary}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            {username.length}/20 characters
          </Text>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Choose Avatar Style</Text>
          <Text style={styles.sectionDescription}>
            Select a color style for your avatar. Your initials will be displayed.
          </Text>
          <View style={styles.avatarGrid}>
            {AVATAR_OPTIONS.map((avatar) => {
              const isSelected = selectedAvatar === avatar.id;
              return (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    isSelected && styles.avatarOptionSelected,
                  ]}
                  onPress={() => setSelectedAvatar(avatar.id)}
                >
                  <View
                    style={[
                      styles.avatarOptionInner,
                      {
                        backgroundColor: avatar.colors[0],
                      },
                    ]}
                  >
                    <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Remove Avatar Option */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => setSelectedAvatar(null)}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.status.error} />
          <Text style={styles.removeButtonText}>Use Default Avatar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 12,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  hint: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 8,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  avatarOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'relative',
  },
  avatarOptionSelected: {
    borderWidth: 3,
    borderColor: colors.primary[500],
    borderRadius: 35,
  },
  avatarOptionInner: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  checkmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.status.error,
  },
});

