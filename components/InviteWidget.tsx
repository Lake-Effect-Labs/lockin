import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/colors';

interface InviteWidgetProps {
  leagueName: string;
  joinCode: string;
  onCopy?: () => void;
  onShare?: () => void;
  compact?: boolean;
}

export function InviteWidget({ 
  leagueName, 
  joinCode, 
  onCopy, 
  onShare,
  compact = false 
}: InviteWidgetProps) {
  const deepLink = `lockin://join?code=${joinCode}`;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <LinearGradient
          colors={colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactContent}>
            <View style={styles.compactLeft}>
              <Text style={styles.compactEmoji}>🏆</Text>
              <View style={styles.compactTextContainer}>
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {leagueName}
                </Text>
                <Text style={styles.compactCode}>{joinCode}</Text>
              </View>
            </View>
            {onShare && (
              <TouchableOpacity
                onPress={onShare}
                style={styles.compactShareButton}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={18} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🏆</Text>
            <Text style={styles.title}>Join My League!</Text>
          </View>

          {/* League Name */}
          <View style={styles.leagueNameContainer}>
            <Text style={styles.leagueName} numberOfLines={2}>
              {leagueName}
            </Text>
          </View>

          {/* Join Code */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Join Code</Text>
            <View style={styles.codeValueContainer}>
              <Text style={styles.codeValue}>{joinCode}</Text>
              {onCopy && (
                <TouchableOpacity
                  onPress={onCopy}
                  style={styles.copyButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.text.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Deep Link */}
          <View style={styles.linkContainer}>
            <Text style={styles.linkLabel}>Tap to join:</Text>
            <Text style={styles.linkValue} numberOfLines={1}>
              {deepLink}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {onCopy && (
              <TouchableOpacity
                onPress={onCopy}
                style={styles.actionButton}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={18} color={colors.text.primary} />
                <Text style={styles.actionButtonText}>Copy</Text>
              </TouchableOpacity>
            )}
            {onShare && (
              <TouchableOpacity
                onPress={onShare}
                style={styles.actionButton}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={18} color={colors.text.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  leagueNameContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  codeContainer: {
    width: '100%',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary + '40',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  copyButton: {
    padding: 4,
  },
  linkContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  linkLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 4,
  },
  linkValue: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary + '40',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  // Compact styles
  compactContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 4,
  },
  compactGradient: {
    padding: 16,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  compactEmoji: {
    fontSize: 24,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  compactCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 2,
  },
  compactShareButton: {
    padding: 8,
    backgroundColor: colors.background.primary + '40',
    borderRadius: 8,
  },
});

