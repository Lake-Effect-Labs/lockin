import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { useHealthStore } from '@/store/useHealthStore';
import Constants from 'expo-constants';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Avatar } from '@/components/Avatar';
import { colors } from '@/utils/colors';
import { initializeHealth, isHealthAvailable } from '@/services/health';

// ============================================
// SETTINGS SCREEN
// User settings and preferences
// ============================================

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { fakeMode, setFakeMode, isAvailable, requestPermissions, isLoading: healthLoading } = useHealthStore();
  const { notificationsEnabled, toggleNotifications } = useSettingsStore();
  
  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <Avatar
              uri={user?.avatar_url}
              name={user?.username}
              size="large"
              showBorder
              borderColor={colors.primary[500]}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.username || 'Champion'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => router.push('/(app)/edit-profile')}
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
            >
              <Ionicons name="pencil" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary[500] + '20' }]}>
                  <Ionicons name="notifications-outline" size={20} color={colors.primary[500]} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Notifications</Text>
                  <Text style={styles.settingDescription}>
                    {notificationsEnabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: colors.border.default, true: colors.primary[500] }}
                thumbColor={colors.text.primary}
              />
            </View>
            
            {/* HealthKit Permissions */}
            {Platform.OS === 'ios' && !fakeMode && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: (isAvailable ? colors.status.success : colors.status.warning) + '20' }]}>
                    <Ionicons 
                      name={isAvailable ? "heart" : "heart-outline"} 
                      size={20} 
                      color={isAvailable ? colors.status.success : colors.status.warning} 
                    />
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>Health Data</Text>
                    <Text style={styles.settingDescription}>
                      {isAvailable ? 'Connected to Apple Health' : (Platform.OS === 'ios' ? 'Tap to enable Health access' : 'Health data not available')}
                    </Text>
                  </View>
                </View>
                {!isAvailable && (
                  <TouchableOpacity
                    onPress={async () => {
                      if (healthLoading) return;
                      
                      // User tapped Enable - requesting HealthKit permissions
                      
                      const isExpoGo = Constants.executionEnvironment === 'storeClient';
                      const isDevelopment = __DEV__;

                      try {
                        if (isExpoGo) {
                          Alert.alert(
                            'Expo Go Detected',
                            'HealthKit requires a development build. Expo Go cannot access native health APIs.\n\nUse this command to build for testing:\n\nnpx eas build --platform ios --profile development',
                            [{ text: 'OK' }]
                          );
                          return;
                        }

                        // For production builds (TestFlight), permissions often need to be enabled manually
                        if (!isDevelopment) {
                          Alert.alert(
                            'TestFlight Health Access',
                            'In TestFlight builds, you need to manually enable Health permissions:\n\n1. Open Settings app\n2. Go to Privacy & Security\n3. Tap Health\n4. Find "Lock-In" and enable permissions\n\nThen restart the app.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Open Settings',
                                onPress: () => {
                                  Linking.openURL('App-prefs:Privacy&path=HEALTH').catch(() => {
                                    Linking.openURL('App-prefs:Privacy').catch(() => {
                                      Alert.alert('Manual Setup Required', 'Please go to Settings > Privacy & Security > Health and enable permissions for Lock-In.');
                                    });
                                  });
                                }
                              }
                            ]
                          );
                          return;
                        }

                        // Development build - try in-app permission request
                        const granted = await requestPermissions();

                        // Wait a moment for iOS to process the request
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Get current state for debugging
                        const { isAvailable: nowAvailable, error: healthError } = useHealthStore.getState();

                        if (!granted) {
                          Alert.alert(
                            'Permission Required',
                            'Health permissions were not granted. You can enable them later in Settings > Privacy & Security > Health.',
                            [
                              { text: 'OK' },
                              {
                                text: 'Open Settings',
                                onPress: () => {
                                  Linking.openURL('App-prefs:Privacy&path=HEALTH').catch(() => {
                                    Linking.openSettings();
                                  });
                                }
                              }
                            ]
                          );
                        } else {
                          Alert.alert(
                            'Success!',
                            'Health permissions granted! You can now sync your fitness data.'
                          );
                        }
                      } catch (error: any) {
                        // Error requesting permissions
                        const errorDetails = `Error: ${error.message || 'Unknown error'}\n\n` +
                          `Code: ${error.code || 'N/A'}\n` +
                          `Stack: ${error.stack ? error.stack.substring(0, 200) : 'N/A'}\n\n` +
                          `Possible causes:\n` +
                          `1. Native module not loaded\n` +
                          `2. HealthKit entitlement missing\n` +
                          `3. Build doesn't include react-native-health\n\n` +
                          `Make sure you're using a TestFlight build, not Expo Go.`;
                        
                        Alert.alert('HealthKit Error', errorDetails);
                      }
                    }}
                    style={styles.permissionButton}
                    disabled={healthLoading}
                  >
                    {healthLoading ? (
                      <ActivityIndicator size="small" color={colors.primary[500]} />
                    ) : (
                      <Text style={styles.permissionButtonText}>Enable</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
        
        {/* Developer Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.status.warning + '20' }]}>
                  <Ionicons name="flask-outline" size={20} color={colors.status.warning} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Fake Data Mode</Text>
                  <Text style={styles.settingDescription}>
                    Use simulated fitness data
                  </Text>
                </View>
              </View>
              <Switch
                value={fakeMode}
                onValueChange={setFakeMode}
                trackColor={{ false: colors.border.default, true: colors.status.warning }}
                thumbColor={colors.text.primary}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => router.push('/(app)/debug')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.secondary[500] + '20' }]}>
                  <Ionicons name="bug-outline" size={20} color={colors.secondary[500]} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Debug & Testing</Text>
                  <Text style={styles.settingDescription}>
                    Run validation tests
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            
            {/* HealthKit Diagnostics */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={async () => {
                  try {
                    const { getHealthDiagnostics } = require('@/services/health');
                    const healthKitDiagnostics = await getHealthDiagnostics();
                    const testDiagnostics = getHealthDiagnostics();

                    Alert.alert(
                      '🔍 HealthKit Diagnostics (TestFlight Build)',
                      `Platform: ${healthKitDiagnostics.platform}\n` +
                      `Bundle ID: ${healthKitDiagnostics.bundleId}\n` +
                      `Expo Go: ${healthKitDiagnostics.isExpoGo ? '❌ BAD' : '✅ GOOD'}\n` +
                      `Development: ${healthKitDiagnostics.isDevelopment ? '❌ BAD (TestFlight should be production)' : '✅ GOOD (TestFlight)'}\n` +
                      `Module Loaded: ${healthKitDiagnostics.moduleLoaded ? '✅ GOOD' : '❌ BAD - react-native-health not included'}\n` +
                      `Device Supported: ${healthKitDiagnostics.deviceSupported ? '✅ GOOD' : '❌ BAD - device incompatible'}\n` +
                      `Entitlements: ${healthKitDiagnostics.entitlementsConfigured ? '✅ GOOD' : '❌ BAD - config issue'}\n\n` +
                      `🚨 TESTFLIGHT TROUBLESHOOTING:\n\n` +
                      `If Module Loaded = ❌:\n` +
                      `• Rebuild: eas build --platform ios --profile testflight --clear-cache\n\n` +
                      `If Device Supported = ❌:\n` +
                      `• Test on iPhone 6s+ (iOS 11+)\n` +
                      `• Different Apple ID\n` +
                      `• Device restart\n\n` +
                      `If app not in Health settings:\n` +
                      `• Tap "Force HealthKit Init" first\n` +
                      `• Check Settings → Privacy → Health\n` +
                      `• Force quit and restart app\n` +
                      `• Delete and reinstall TestFlight build\n\n` +
                      `📱 CURRENT BUILD STATUS:\n` +
                      `Build in progress at Expo...\n` +
                      `Check: https://expo.dev/accounts/samfilipiak/projects/lock-in/builds/b590d246-3399-437f-9ec7-096a20d7207c`
                    );
                  } catch (error: any) {
                    Alert.alert('Error', `Failed to get diagnostics: ${error.message}`);
                  }
                }}
                accessibilityLabel="View HealthKit diagnostics"
                accessibilityRole="button"
                accessibilityHint="Shows HealthKit configuration and troubleshooting info"
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.status.warning + '20' }]}>
                    <Ionicons name="information-circle" size={20} color={colors.status.warning} />
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>HealthKit Diagnostics</Text>
                    <Text style={styles.settingDescription}>
                      Debug Health data access
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={async () => {
                const privacyUrl = 'https://lock-in.github.io/'; // Update if using different URL
                try {
                  const supported = await Linking.canOpenURL(privacyUrl);
                  if (supported) {
                    await Linking.openURL(privacyUrl);
                  } else {
                    Alert.alert('Privacy Policy', `Privacy policy available at ${privacyUrl}`);
                  }
                } catch (error) {
                  Alert.alert('Privacy Policy', `Privacy policy available at ${privacyUrl}`);
                }
              }}
              accessibilityLabel="View privacy policy"
              accessibilityRole="link"
              accessibilityHint="Opens privacy policy in browser"
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary[500] + '20' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary[500]} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Privacy Policy</Text>
                  <Text style={styles.settingDescription}>
                    View our privacy policy
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutButton}
            activeOpacity={0.8}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            accessibilityHint="Signs out of your account"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* Version */}
        <Text style={styles.version}>Lock-In v{Constants.expoConfig?.version || '1.0.0'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsList: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  rulesCard: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleMetric: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ruleDescription: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.status.error + '10',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.status.error + '30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.status.error,
  },
  version: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 16,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary[500] + '20',
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
});

