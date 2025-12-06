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
                      {isAvailable ? 'Connected to Apple Health' : 'Not connected'}
                    </Text>
                  </View>
                </View>
                {!isAvailable && (
                  <TouchableOpacity
                    onPress={async () => {
                      if (healthLoading) return;
                      
                      Alert.alert(
                        'Enable Health Data',
                        'Lock-In needs access to your Apple Health data to track your fitness metrics and compete in leagues.\n\nThis includes:\n• Steps\n• Sleep hours\n• Active calories\n• Workouts\n• Distance',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Open Settings',
                            onPress: async () => {
                              if (Platform.OS === 'ios') {
                                Linking.openURL('app-settings:');
                              }
                            },
                          },
                          {
                            text: 'Request Again',
                            onPress: async () => {
                              const granted = await requestPermissions();
                              if (!granted) {
                                Alert.alert(
                                  'Permission Denied',
                                  'To use Lock-In, please enable Health data access in Settings → Privacy → Health → Lock-In',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Open Settings',
                                      onPress: () => {
                                        if (Platform.OS === 'ios') {
                                          Linking.openURL('app-settings:');
                                        }
                                      },
                                    },
                                  ]
                                );
                              }
                            },
                          },
                        ]
                      );
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
            
            {__DEV__ && (
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
            )}
            
            {/* Privacy Policy */}
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={async () => {
                const privacyUrl = 'https://lockin.app/privacy'; // Update with your actual URL
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
        <Text style={styles.version}>Lock-In v1.0.0</Text>
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

