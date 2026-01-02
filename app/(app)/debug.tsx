import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import {
  runFullTestSuite,
  runScoringTests,
  runMatchupTests,
  runSeasonSimulation,
  runFullIntegrationTest,
  FullIntegrationTest,
  E2ETestResults,
  TestResult,
} from '@/services/simulation';
import {
  runHealthIntegrationTests,
  quickHealthCheck,
  getHealthDiagnostics,
  HealthTestSuite,
} from '@/services/healthTest';
import { getHealthDiagnostics as getHealthKitDiagnostics, initializeHealth, getHealthDiagnosticReport, getRawHealthDebug } from '@/services/health';
import {
  runFullRegressionSuite,
  RegressionTestResults,
} from '@/services/regressionTests';
import { runAdMobSafetyCheck as checkAdMobSafety } from '@/services/ads';
import { runCrashDiagnostics } from '@/services/crashDiagnostics';
import { getStoredCrashes } from '@/services/crashReporting';
import {
  runWeeklySimulation,
  SimulationStep,
} from '@/services/weeklySimulation';
// Background sync removed - now using on-app-open sync
import { simulateLeadChangeNotification } from '@/services/matchupMonitor';
import { runLeagueSpeedRun, SpeedRunStep } from '@/services/leagueSpeedRun';
import { useHealthStore } from '@/store/useHealthStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useLeagueStore } from '@/store/useLeagueStore';

// ============================================
// DEBUG / TEST SCREEN
// Run validation tests and view results
// ============================================

export default function DebugScreen() {
  const { user } = useAuthStore();
  const { currentDashboard, fetchDashboard } = useLeagueStore();
  const [testResults, setTestResults] = useState<E2ETestResults | null>(null);
  const [healthResults, setHealthResults] = useState<HealthTestSuite | null>(null);
  const [regressionResults, setRegressionResults] = useState<RegressionTestResults | null>(null);
  const [integrationResults, setIntegrationResults] = useState<FullIntegrationTest | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningHealth, setIsRunningHealth] = useState(false);
  const [isRunningRegression, setIsRunningRegression] = useState(false);
  const [isRunningIntegration, setIsRunningIntegration] = useState(false);
  const [isRunningSpeedRun, setIsRunningSpeedRun] = useState(false);
  const [speedRunProgress, setSpeedRunProgress] = useState<SpeedRunStep[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { fakeMode, setFakeMode } = useHealthStore();
  const [rawHealthDebug, setRawHealthDebug] = useState<any>(null);
  const [isLoadingRawDebug, setIsLoadingRawDebug] = useState(false);
  
  const runTests = () => {
    setIsRunning(true);
    
    // Run tests async to not block UI
    setTimeout(() => {
      const results = runFullTestSuite();
      setTestResults(results);
      setIsRunning(false);
      
      Alert.alert(
        results.allPassed ? '✅ All Tests Passed!' : '❌ Some Tests Failed',
        results.summary
      );
    }, 100);
  };
  
  const runHealthTests = async () => {
    setIsRunningHealth(true);

    try {
      const results = await runHealthIntegrationTests();
      setHealthResults(results);

      const passed = results.results.filter(r => r.passed).length;
      const total = results.results.length;

      Alert.alert(
        passed === total ? '✅ Health Tests Passed!' : '⚠️ Health Tests Complete',
        results.summary
      );
    } catch (error: any) {
      Alert.alert('❌ Health Test Error', error.message);
    } finally {
      setIsRunningHealth(false);
    }
  };

  const runIntegrationTests = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '⚠️ Full Integration Test',
        'This will create real database records and simulate a complete league. Continue?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Run Test', style: 'destructive', onPress: () => resolve(true) }
        ]
      );
    });

    if (!confirmed) return;

    setIsRunningIntegration(true);

    try {
      const results = await runFullIntegrationTest(8, 8, 'DEBUG_TEST');
      setIntegrationResults(results);

      const passed = results.summary.passedPhases;
      const total = results.summary.totalPhases;

      Alert.alert(
        passed === total ? '✅ Integration Test Passed!' : '❌ Integration Test Failed',
        `${passed}/${total} phases passed in ${results.summary.totalDuration}ms`
      );
    } catch (error: any) {
      Alert.alert('❌ Integration Test Error', error.message);
    } finally {
      setIsRunningIntegration(false);
    }
  };
  
  const runQuickHealthCheck = async () => {
    try {
      const result = await quickHealthCheck();
      
      Alert.alert(
        '🏥 Health Check',
        `Platform: ${Platform.OS}\n` +
        `Available: ${result.available ? '✅' : '❌'}\n` +
        `Initialized: ${result.initialized ? '✅' : '❌'}\n` +
        `Can Read Data: ${result.canReadData ? '✅' : '❌'}` +
        (result.error ? `\nError: ${result.error}` : '')
      );
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    }
  };
  
  const showHealthDiagnostics = async () => {
    try {
      const healthKitDiagnostics = await getHealthKitDiagnostics();
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
  };

  const runHealthKitSanityCheck = async () => {
    try {
      const diagnostics = await getHealthKitDiagnostics();

      let status = '❌ FAILED';
      let message = 'HealthKit is not working properly';

      if (diagnostics.moduleLoaded && diagnostics.deviceSupported) {
        status = '✅ PASSED';
        message = 'HealthKit is properly configured and ready to request permissions';
      } else if (!diagnostics.moduleLoaded) {
        message = 'CRITICAL: react-native-health module not included in build. Do clean rebuild with --clear-cache';
      } else if (!diagnostics.deviceSupported) {
        message = 'Device compatibility issue. Test on iPhone 6s+ with iOS 11+';
      }

      Alert.alert(
        `🏥 HealthKit Sanity Check: ${status}`,
        `Platform: ${diagnostics.platform}\n` +
        `Bundle ID: ${diagnostics.bundleId}\n` +
        `Module Loaded: ${diagnostics.moduleLoaded ? '✅ YES' : '❌ NO'}\n` +
        `Device Supported: ${diagnostics.deviceSupported ? '✅ YES' : '❌ NO'}\n` +
        `Expo Go: ${diagnostics.isExpoGo ? '❌ BAD' : '✅ GOOD'}\n\n` +
        `${message}\n\n` +
        `Next Steps:\n` +
        `1. If FAILED: Rebuild with --clear-cache\n` +
        `2. Open app and trigger HealthKit permission request\n` +
        `3. Check Settings → Privacy → Health for Lock-In app`
      );
    } catch (error: any) {
      Alert.alert('❌ Sanity Check Error', `Failed to run HealthKit check: ${error.message}`);
    }
  };

  const runAdMobSafetyCheck = () => {
    try {
      const check = checkAdMobSafety();

      Alert.alert(
        `📱 AdMob Safety Check: ${check.safe ? '✅ SAFE' : '⚠️ NOT SAFE'}`,
        `${check.message}\n\n` +
        `Details:\n` +
        `Module Available: ${check.details.moduleAvailable ? '✅ YES' : '❌ NO'}\n` +
        `Configured: ${check.details.configured ? '✅ YES' : '❌ NO'}\n` +
        `Not Expo Go: ${check.details.notExpoGo ? '✅ YES' : '❌ NO'}\n` +
        `Can Initialize: ${check.details.canInitialize ? '✅ YES' : '❌ NO'}\n\n` +
        `${check.safe ? '✅ Ads will work correctly' : '⚠️ Ads will be disabled to prevent crashes'}`
      );
    } catch (error: any) {
      Alert.alert('❌ Safety Check Error', `Failed to run AdMob check: ${error.message}`);
    }
  };

  const runCrashDiagnosticsCheck = async () => {
    try {
      const diagnostics = await runCrashDiagnostics();
      const crashes = await getStoredCrashes();

      const safeCount = diagnostics.filter(d => d.status === 'safe').length;
      const warningCount = diagnostics.filter(d => d.status === 'warning').length;
      const dangerCount = diagnostics.filter(d => d.status === 'danger').length;

      const detailsText = diagnostics.map(d => {
        const icon = d.status === 'safe' ? '✅' : d.status === 'warning' ? '⚠️' : '❌';
        return `${icon} ${d.category}: ${d.message}`;
      }).join('\n');

      const crashText = crashes.length > 0
        ? `\n\n📊 Crash History:\n${crashes.length} total crash(es) stored\nLatest: ${crashes[crashes.length - 1]?.error?.substring(0, 100)}...`
        : '\n\n📊 Crash History: No crashes stored';

      Alert.alert(
        `🔍 Crash Diagnostics`,
        `Status: ${dangerCount > 0 ? '❌ DANGER' : warningCount > 0 ? '⚠️ WARNINGS' : '✅ SAFE'}\n\n` +
        `Safe: ${safeCount} | Warnings: ${warningCount} | Dangers: ${dangerCount}\n\n` +
        `Details:\n${detailsText}` +
        crashText
      );
    } catch (error: any) {
      Alert.alert('❌ Diagnostics Error', `Failed to run diagnostics: ${error.message}`);
    }
  };
  
  const runWeeklySimulationInteractive = async () => {
    setIsSimulating(true);
    setCurrentStepIndex(0);
    
    // Generate all simulation steps
    const steps = runWeeklySimulation(8, 8, Date.now());
    setSimulationSteps(steps);
    
    // Show first step
    setCurrentStepIndex(0);
    showStep(steps[0], 0, steps.length);
    
    setIsSimulating(false);
  };
  
  const showStep = (step: SimulationStep, index: number, total: number) => {
    if (step.type === 'week') {
      const weekData = step.data as any;
      const matchupsText = weekData.matchups.map((m: any, i: number) => 
        `\n${i + 1}. ${m.player1.name} (${m.player1Score.toFixed(1)}) vs ${m.player2.name} (${m.player2Score.toFixed(1)})${m.isTie ? ' - TIE' : ` - ${m.winner?.name} wins!`}`
      ).join('');
      
      const standingsText = weekData.standings.slice(0, 4).map((p: any, i: number) => 
        `${i + 1}. ${p.name} (${p.wins}W-${p.losses}L-${p.ties}T) ${p.totalPoints.toFixed(1)}pts`
      ).join('\n');
      
      Alert.alert(
        `Week ${weekData.week} Results`,
        `Matchups:${matchupsText}\n\nTop 4 Standings:\n${standingsText}\n\n(${index + 1}/${total})`,
        [
          { text: 'Previous', onPress: () => {
            if (index > 0) {
              setCurrentStepIndex(index - 1);
              showStep(simulationSteps[index - 1], index - 1, total);
            }
          }, style: index === 0 ? 'cancel' : 'default' },
          { text: 'Next', onPress: () => {
            if (index < total - 1) {
              setCurrentStepIndex(index + 1);
              showStep(simulationSteps[index + 1], index + 1, total);
            }
          } },
        ]
      );
    } else if (step.type === 'playoff_semifinals' || step.type === 'playoff_finals') {
      const playoffData = step.data as any;
      const matchupsText = playoffData.matchups.map((m: any, i: number) => 
        `\n${i + 1}. ${m.player1.name} (${m.player1Score.toFixed(1)}) vs ${m.player2.name} (${m.player2Score.toFixed(1)}) - ${m.winner?.name} advances!`
      ).join('');
      
      Alert.alert(
        `${playoffData.round === 'semifinals' ? '🏆 Semifinals' : '🏆 Finals'}`,
        `${playoffData.message}\n\nMatchups:${matchupsText}\n\n(${index + 1}/${total})`,
        [
          { text: 'Previous', onPress: () => {
            if (index > 0) {
              setCurrentStepIndex(index - 1);
              showStep(simulationSteps[index - 1], index - 1, total);
            }
          } },
          { text: 'Next', onPress: () => {
            if (index < total - 1) {
              setCurrentStepIndex(index + 1);
              showStep(simulationSteps[index + 1], index + 1, total);
            }
          } },
        ]
      );
    } else if (step.type === 'champion') {
      const champData = step.data as any;
      Alert.alert(
        '🏆 CHAMPION CROWNED!',
        champData.message,
        [
          { text: 'Previous', onPress: () => {
            if (index > 0) {
              setCurrentStepIndex(index - 1);
              showStep(simulationSteps[index - 1], index - 1, total);
            }
          } },
          { text: 'Done', style: 'default' },
        ]
      );
    }
  };
  
  const runQuickSimulation = () => {
    const sim = runSeasonSimulation(8, 8, Date.now());
    Alert.alert(
      '🏆 Season Simulation Complete',
      `Champion: ${sim.champion?.name}\n` +
      `Final Standings:\n` +
      sim.standings.slice(0, 4).map((p, i) => 
        `${i + 1}. ${p.name} (${p.wins}W-${p.losses}L) ${p.totalPoints.toFixed(0)}pts`
      ).join('\n')
    );
  };
  
  const runRegressionTests = async () => {
    setIsRunningRegression(true);
    
    try {
      const leagueId = currentDashboard?.league?.id;
      
      const results = await runFullRegressionSuite(user?.id, leagueId);
      setRegressionResults(results);
      
      Alert.alert(
        results.allPassed ? '✅ All Regression Tests Passed!' : '⚠️ Some Regression Tests Failed',
        results.summary
      );
    } catch (error: any) {
      Alert.alert('❌ Regression Test Error', error.message);
    } finally {
      setIsRunningRegression(false);
    }
  };
  
  // Background Sync Tests
  // Background sync removed - now using on-app-open sync
  
  // Notification Tests
  const testOpponentTakesLeadNotification = async () => {
    await simulateLeadChangeNotification('opponent_takes_lead', 'John Doe', 75);
    Alert.alert('Sent!', 'Check your notifications');
  };
  
  const testYouTakeLeadNotification = async () => {
    await simulateLeadChangeNotification('you_take_lead', 'John Doe', 50);
    Alert.alert('Sent!', 'Check your notifications');
  };
  
  const testCloseMatchupNotification = async () => {
    await simulateLeadChangeNotification('close_matchup', 'John Doe', 25);
    Alert.alert('Sent!', 'Check your notifications');
  };

  const runSpeedRunTest = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to run speed run test');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '🏎️ League Speed Run',
        'This will create a real test league in the database with 12 players and simulate 8 weeks + playoffs.\n\nThe league will be preserved so you can inspect it afterwards.\n\nContinue?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Start Speed Run', style: 'default', onPress: () => resolve(true) }
        ]
      );
    });

    if (!confirmed) return;

    setIsRunningSpeedRun(true);
    setSpeedRunProgress([]);

    try {
      const result = await runLeagueSpeedRun(user.id, {
        playerCount: 12,
        seasonWeeks: 8,
        onProgress: (step) => {
          setSpeedRunProgress(prev => [...prev, step]);
        },
      });

      if (result.success) {
        Alert.alert(
          '🏆 Speed Run Complete!',
          `Champion: ${result.champion}\n` +
          `Total Time: ${(result.totalTimeMs / 1000).toFixed(1)}s\n` +
          `Steps: ${result.steps.length}\n\n` +
          `League ID: ${result.leagueId?.substring(0, 8)}...\n\n` +
          `Check your leagues to see the completed test league!`,
          [{ text: 'Awesome!', style: 'default' }]
        );
      } else {
        const errorStep = result.steps.find(s => !s.success);
        Alert.alert(
          '❌ Speed Run Failed',
          `Failed at: ${errorStep?.title || 'Unknown step'}\n` +
          `Error: ${errorStep?.description || 'Unknown error'}\n` +
          `Completed: ${result.steps.filter(s => s.success).length}/${result.steps.length} steps`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('❌ Speed Run Error', error.message);
    } finally {
      setIsRunningSpeedRun(false);
    }
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
          <Text style={styles.title}>Debug & Testing</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={20} color={colors.status.warning} />
          <Text style={styles.warningText}>
            Developer tools - for testing only
          </Text>
        </View>
        
        <View style={[styles.warningBanner, { backgroundColor: colors.primary[900], borderColor: colors.primary[700] }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary[500]} />
          <Text style={[styles.warningText, { color: colors.text.secondary }]}>
            📋 For best diagnostics: After testing, shake device → "Show Dev Menu" → "Debug JS Remotely" to see console logs. Or use Safari → Develop → Your iPhone → JSContext
          </Text>
        </View>
        
        {/* Health Integration Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏥 Health Integration</Text>
          
          <TouchableOpacity
            onPress={runHealthTests}
            disabled={isRunningHealth}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.actionButton}
            >
              <Ionicons name="fitness" size={20} color={colors.text.primary} />
              <Text style={styles.actionText}>
                {isRunningHealth ? 'Testing Health...' : 'Run Health Tests'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={runQuickHealthCheck}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="pulse" size={20} color={colors.primary[500]} />
            <Text style={styles.secondaryText}>Quick Health Check</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={showHealthDiagnostics}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="information-circle" size={20} color={colors.primary[500]} />
            <Text style={styles.secondaryText}>HealthKit Diagnostics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={runHealthKitSanityCheck}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="medkit" size={20} color={colors.status.success} />
            <Text style={styles.secondaryText}>HealthKit Sanity Check</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              const logs: string[] = [];
              let dialogShown = false;
              
              try {
                logs.push('🔄 Starting HealthKit initialization...');
                logs.push('');
                
                // Check if module exists
                try {
                  const healthModule = require('@kingstinct/react-native-healthkit');
                  const HealthKit = healthModule.default || healthModule;
                  logs.push('✅ Module loaded successfully (@kingstinct/react-native-healthkit)');
                  logs.push(`Module keys: ${Object.keys(HealthKit).slice(0, 5).join(', ')}...`);
                  logs.push('');
                } catch (e: any) {
                  logs.push(`❌ FATAL: Module not found - ${e.message}`);
                  Alert.alert('❌ Module Missing', logs.join('\n'));
                  return;
                }
                
                logs.push('📱 Calling initializeHealth()...');
                const initStartTime = Date.now();
                
                const success = await initializeHealth();
                
                const initDuration = Date.now() - initStartTime;
                logs.push(`⏱️ Init took ${initDuration}ms`);
                logs.push('');
                
                if (success) {
                  logs.push('✅ SUCCESS!');
                  logs.push('');
                  logs.push('🎉 HealthKit initialized!');
                  logs.push('');
                  logs.push('📝 Next Steps:');
                  logs.push('1. Check Settings → Privacy → Health');
                  logs.push('2. Look for "Lock-In" app');
                  logs.push('3. If not there, check Health app → Profile → Apps');
                  logs.push('');
                  logs.push('💡 If dialog appeared, permissions were requested');
                  dialogShown = true;
                } else {
                  logs.push('⚠️ Init returned FALSE');
                  logs.push('');
                  logs.push('This could mean:');
                  logs.push('• Permission dialog was shown (GOOD)');
                  logs.push('• User denied permissions');
                  logs.push('• Native module returned false');
                  logs.push('');
                  logs.push('🔍 Check if you saw a permission dialog');
                  logs.push('');
                  logs.push('If NO dialog appeared:');
                  logs.push('→ This is the BUG we need to fix');
                }
                
                Alert.alert(
                  success ? '✅ Initialization Complete' : '⚠️ Check Results',
                  logs.join('\n'),
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                logs.push(`❌ EXCEPTION: ${error.message}`);
                logs.push('');
                logs.push(`Error name: ${error.name}`);
                logs.push(`Error stack: ${error.stack?.substring(0, 200)}...`);
                
                Alert.alert('❌ Error', logs.join('\n'));
              }
            }}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={colors.primary[500]} />
            <Text style={styles.secondaryText}>Force HealthKit Init</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              try {
                // Detailed module loading test with diagnostic info
                let logs: string[] = [];
                
                logs.push('=== HealthKit Module Test ===');
                logs.push('Testing: @kingstinct/react-native-healthkit');
                logs.push('');
                
                try {
                  const healthModule = require('@kingstinct/react-native-healthkit');
                  
                  // Handle both default and direct exports
                  const HealthKit = healthModule?.default ?? healthModule;
                  
                  logs.push(`✅ JS MODULE: require() succeeded`);
                  logs.push(`typeof: ${typeof HealthKit}`);
                  logs.push('');
                  
                  const keys = HealthKit ? Object.keys(HealthKit) : [];
                  logs.push(`NATIVE BRIDGE CHECK:`);
                  logs.push(`Exports found: ${keys.length}`);
                  logs.push(`First 10: ${keys.slice(0, 10).join(', ')}`);
                  logs.push('');
                  
                  // Check critical native methods (Kingstinct API names)
                  const nativeChecks = [
                    { name: 'requestAuthorization', fn: HealthKit?.requestAuthorization },
                    { name: 'getMostRecentQuantitySample', fn: HealthKit?.getMostRecentQuantitySample },
                    { name: 'queryQuantitySamples', fn: HealthKit?.queryQuantitySamples },
                    { name: 'queryCategorySamples', fn: HealthKit?.queryCategorySamples },
                    { name: 'getSample', fn: HealthKit?.getSample },
                  ];
                  
                  let nativeWorking = 0;
                  nativeChecks.forEach(check => {
                    const works = typeof check.fn === 'function';
                    logs.push(`${works ? '✅' : '❌'} ${check.name}: ${works ? 'YES' : 'NO'}`);
                    if (works) nativeWorking++;
                  });
                  
                  logs.push('');
                  if (nativeWorking >= 3) {
                    logs.push('🎉 NATIVE FULLY LINKED!');
                    logs.push(`✅ ${nativeWorking} core methods available`);
                    logs.push('HealthKit ready to use');
                  } else if (nativeWorking > 0) {
                    logs.push('⚠️  PARTIAL NATIVE BRIDGE');
                    logs.push(`Only ${nativeWorking} methods available`);
                  } else {
                    logs.push('❌ NO NATIVE METHODS');
                    logs.push('Bridge completely broken');
                  }
                } catch (requireError: any) {
                  logs.push(`❌ JS MODULE: require() FAILED`);
                  logs.push(`Error: ${requireError.message}`);
                  logs.push('');
                  logs.push('💡 Module NOT in bundle');
                  logs.push('');
                  logs.push('FIX: npm run build:testflight');
                }
                
                Alert.alert('🔬 Native Module Test (Kingstinct)', logs.join('\n'));
              } catch (error: any) {
                Alert.alert('❌ Test Error', `Failed: ${error.message}`);
              }
            }}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="bug" size={20} color={colors.status.warning} />
            <Text style={styles.secondaryText}>Test Native Linking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try {
                const report = await getHealthDiagnosticReport();
                const d = report.details;

                let dataText = 'No data retrieved';
                if (d.todayData) {
                  dataText = `Steps: ${d.todayData.steps.toLocaleString()}\n` +
                    `Sleep: ${d.todayData.sleep.toFixed(1)} hrs\n` +
                    `Calories: ${d.todayData.calories.toLocaleString()} cal\n` +
                    `Distance: ${d.todayData.distance.toFixed(2)} mi\n` +
                    `Workouts: ${d.todayData.workouts}`;
                }

                const rawInfo = d.rawSampleInfo
                  ? `\n\n🔬 RAW SAMPLE DATA:\n${d.rawSampleInfo}`
                  : '';

                const errorsText = d.errors.length > 0
                  ? `\n\n❌ ERRORS:\n${d.errors.join('\n')}`
                  : '';

                Alert.alert(
                  `📊 Health Data Report: ${report.status.toUpperCase()}`,
                  `${report.message}\n\n` +
                  `MODULE: ${d.moduleStatus}\n` +
                  `AUTH: ${d.authStatus}\n` +
                  `DATA: ${d.dataStatus}\n\n` +
                  `TODAY'S VALUES:\n${dataText}` +
                  rawInfo +
                  errorsText
                );
              } catch (error: any) {
                Alert.alert('❌ Error', `Report failed: ${error.message}`);
              }
            }}
            style={[styles.secondaryButton, { borderColor: colors.status.success }]}
            activeOpacity={0.8}
          >
            <Ionicons name="analytics" size={20} color={colors.status.success} />
            <Text style={[styles.secondaryText, { color: colors.status.success }]}>📊 Show Today's Health Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              setIsLoadingRawDebug(true);
              try {
                const debug = await getRawHealthDebug();
                setRawHealthDebug(debug);
              } catch (error: any) {
                Alert.alert('❌ Error', `Debug failed: ${error.message}`);
              } finally {
                setIsLoadingRawDebug(false);
              }
            }}
            disabled={isLoadingRawDebug}
            style={[styles.secondaryButton, { borderColor: colors.status.error, borderWidth: 2 }]}
            activeOpacity={0.8}
          >
            <Ionicons name="code-slash" size={20} color={colors.status.error} />
            <Text style={[styles.secondaryText, { color: colors.status.error }]}>
              {isLoadingRawDebug ? '⏳ Loading...' : '🔍 RAW API DEBUG (Screenshot This!)'}
            </Text>
          </TouchableOpacity>

          {/* Raw Health Debug Display - Scrollable for screenshots */}
          {rawHealthDebug && (
            <View style={styles.rawDebugContainer}>
              <Text style={styles.rawDebugTitle}>🔍 RAW HEALTH API DEBUG</Text>
              <Text style={styles.rawDebugTimestamp}>Timestamp: {rawHealthDebug.timestamp}</Text>

              {rawHealthDebug.queries.map((q: any, i: number) => (
                <View key={i} style={styles.rawDebugMetric}>
                  <Text style={[
                    styles.rawDebugMetricName,
                    { color: q.error ? colors.status.error : (q.sampleCount > 0 ? colors.status.success : colors.status.warning) }
                  ]}>
                    {q.error ? '❌' : (q.sampleCount > 0 ? '✅' : '⚠️')} {q.metric}
                  </Text>
                  <Text style={styles.rawDebugText}>Samples: {q.sampleCount}</Text>
                  <Text style={styles.rawDebugText}>Value: {q.calculatedValue}</Text>
                  {q.error && <Text style={[styles.rawDebugText, { color: colors.status.error }]}>ERROR: {q.error}</Text>}
                  <Text style={styles.rawDebugSample} numberOfLines={3}>
                    First Sample: {q.firstSample}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setRawHealthDebug(null)}
                style={[styles.secondaryButton, { marginTop: 12 }]}
              >
                <Text style={styles.secondaryText}>Clear Debug Output</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Health Test Results */}
          {healthResults && (
            <View style={styles.healthResultsCard}>
              <Text style={styles.healthResultsTitle}>
                {healthResults.platform.toUpperCase()} Health Results
              </Text>
              {healthResults.results.map((result, i) => (
                <View key={i} style={styles.testRow}>
                  <Ionicons 
                    name={result.passed ? 'checkmark-circle' : 'close-circle'} 
                    size={16} 
                    color={result.passed ? colors.status.success : colors.status.error} 
                  />
                  <View style={styles.testRowContent}>
                    <Text style={styles.testName}>{result.name}</Text>
                    <Text style={styles.testMessage}>{result.message}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* League Admin Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ League Admin Tools</Text>
          
          <TouchableOpacity
            onPress={async () => {
              try {
                if (!currentDashboard?.league) {
                  Alert.alert('Error', 'No league loaded. Go to a league first.');
                  return;
                }
                
                const league = currentDashboard.league;
                
                if (!currentDashboard.isAdmin) {
                  Alert.alert('Error', 'You must be a league admin to fix the start date.');
                  return;
                }
                
                if (!league.start_date) {
                  Alert.alert('Error', 'League has no start date set yet.');
                  return;
                }
                
                const { getNextMonday } = require('@/utils/dates');
                const correctNextMonday = getNextMonday();
                const correctDateStr = correctNextMonday.toISOString().split('T')[0];
                
                Alert.alert(
                  '🔧 Fix League Start Date',
                  `Current start date: ${league.start_date}\n` +
                  `Correct start date should be: ${correctDateStr}\n\n` +
                  `This will reset the league to start on the next Monday and regenerate matchups.\n\n` +
                  `Continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Fix It',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { supabase } = require('@/services/supabase');
                          
                          // Update start date and reset to week 1
                          const { error: updateError } = await supabase
                            .from('leagues')
                            .update({ 
                              start_date: correctDateStr,
                              current_week: 1 
                            })
                            .eq('id', league.id);
                          
                          if (updateError) throw updateError;
                          
                          // Regenerate matchups
                          const { startLeagueSeason } = require('@/services/supabase');
                          await startLeagueSeason(league.id);
                          
                          // Refresh dashboard
                          await fetchDashboard(league.id, user!.id);
                          
                          Alert.alert(
                            '✅ Success!',
                            `League start date fixed!\n\n` +
                            `New start date: ${correctDateStr}\n` +
                            `Matchups regenerated for Week 1.`
                          );
                        } catch (error: any) {
                          Alert.alert('❌ Error', `Failed to fix start date: ${error.message}`);
                        }
                      }
                    }
                  ]
                );
              } catch (error: any) {
                Alert.alert('❌ Error', error.message);
              }
            }}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar" size={20} color={colors.primary[500]} />
            <Text style={styles.secondaryText}>Fix League Start Date</Text>
          </TouchableOpacity>
        </View>

        {/* AdMob Safety Check */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 AdMob Safety</Text>
          
          <TouchableOpacity
            onPress={runAdMobSafetyCheck}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={20} color={colors.status.success} />
            <Text style={styles.secondaryText}>AdMob Safety Check</Text>
          </TouchableOpacity>
        </View>

        {/* Crash Diagnostics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Crash Diagnostics</Text>
          
          <TouchableOpacity
            onPress={runCrashDiagnosticsCheck}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="bug" size={20} color={colors.status.error} />
            <Text style={styles.secondaryText}>Run Crash Diagnostics</Text>
          </TouchableOpacity>
        </View>
        
        {/* On-App-Open Sync Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Sync Strategy</Text>
          <Text style={styles.infoText}>
            Data syncs automatically when users open the app.{'\n'}
            No background sync - simpler and more cost-effective!{'\n\n'}
            Live updates still work when viewing matchups (30s intervals).
          </Text>
        </View>
        
        {/* Notification Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notification Tests</Text>
          
          <TouchableOpacity
            onPress={testOpponentTakesLeadNotification}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={20} color={colors.status.error} />
            <Text style={styles.secondaryText}>Test: Opponent Takes Lead</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={testYouTakeLeadNotification}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy" size={20} color={colors.status.success} />
            <Text style={styles.secondaryText}>Test: You Take Lead</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={testCloseMatchupNotification}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="flame" size={20} color={colors.status.warning} />
            <Text style={styles.secondaryText}>Test: Close Matchup</Text>
          </TouchableOpacity>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Logic Tests</Text>
          
          <TouchableOpacity
            onPress={runTests}
            disabled={isRunning}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.actionButton}
            >
              <Ionicons name="flask" size={20} color={colors.text.primary} />
              <Text style={styles.actionText}>
                {isRunning ? 'Running Tests...' : 'Run Full Test Suite'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={runIntegrationTests}
            disabled={isRunningIntegration}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.actionButton}
            >
              <Ionicons name="construct" size={20} color={colors.text.primary} />
              <Text style={styles.actionText}>
                {isRunningIntegration ? 'Running Integration...' : 'Full Integration Test'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={runQuickSimulation}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={20} color={colors.primary[500]} />
            <Text style={styles.secondaryText}>Run Season Simulation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={runSpeedRunTest}
            disabled={isRunningSpeedRun}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isRunningSpeedRun ? ['#666', '#555'] : ['#F59E0B', '#D97706']}
              style={styles.actionButton}
            >
              <Ionicons name="rocket" size={20} color={colors.text.primary} />
              <Text style={styles.actionText}>
                {isRunningSpeedRun ? `Speed Running... (${speedRunProgress.length} steps)` : '🏎️ League Speed Run (E2E)'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {speedRunProgress.length > 0 && (
            <View style={styles.speedRunProgress}>
              <Text style={styles.speedRunTitle}>Speed Run Progress:</Text>
              {speedRunProgress.slice(-5).map((step, i) => (
                <Text key={i} style={[
                  styles.speedRunStep,
                  { color: step.success ? colors.status.success : colors.status.error }
                ]}>
                  {step.success ? '✓' : '✗'} {step.title}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => setFakeMode(!fakeMode)}
            style={styles.secondaryButton}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={fakeMode ? 'toggle' : 'toggle-outline'} 
              size={20} 
              color={fakeMode ? colors.status.success : colors.text.secondary} 
            />
            <Text style={styles.secondaryText}>
              Fake Data Mode: {fakeMode ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Test Results */}
        {testResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            
            <View style={styles.summaryCard}>
              <Text style={[
                styles.summaryText,
                testResults.allPassed ? styles.passedText : styles.failedText
              ]}>
                {testResults.summary}
              </Text>
            </View>
            
            {/* Scoring Tests */}
            <TestSection title="Scoring Tests" results={testResults.scoringTests} />
            
            {/* Weekly Tests */}
            <TestSection title="Weekly Accumulation" results={testResults.weeklyTests} />
            
            {/* Matchup Tests */}
            <TestSection title="Matchup Tests" results={testResults.matchupTests} />
            
            {/* Edge Case Tests */}
            <TestSection title="Edge Cases" results={testResults.edgeCaseTests} />
            
            {/* Season Simulation */}
            <View style={styles.simCard}>
              <Text style={styles.simTitle}>Season Simulation</Text>
              <Text style={styles.simText}>
                Players: {testResults.seasonSimulation.players.length}
              </Text>
              <Text style={styles.simText}>
                Weeks: {testResults.seasonSimulation.matchups.length / 
                  (testResults.seasonSimulation.players.length / 2)}
              </Text>
              <Text style={styles.simText}>
                Champion: {testResults.seasonSimulation.champion?.name || 'N/A'}
              </Text>
              
              <Text style={styles.standingsTitle}>Final Standings:</Text>
              {testResults.seasonSimulation.standings.slice(0, 4).map((player, i) => (
                <Text key={player.id} style={styles.standingRow}>
                  {i + 1}. {player.name} ({player.wins}W-{player.losses}L) - {player.totalPoints.toFixed(0)} pts
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Integration Test Results */}
        {integrationResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚀 Integration Test Results</Text>

            <View style={styles.summaryCard}>
              <Text style={[
                styles.summaryText,
                integrationResults.summary.success ? styles.passedText : styles.failedText
              ]}>
                {integrationResults.summary.passedPhases}/{integrationResults.summary.totalPhases} phases passed
              </Text>
              <Text style={styles.durationText}>
                Duration: {integrationResults.summary.totalDuration}ms
              </Text>
            </View>

            {integrationResults.results.map((result, i) => (
              <View key={i} style={styles.integrationRow}>
                <View style={styles.phaseHeader}>
                  <Ionicons
                    name={result.success ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={result.success ? colors.status.success : colors.status.error}
                  />
                  <Text style={styles.phaseTitle}>{result.phase}</Text>
                  <Text style={styles.phaseDuration}>{result.duration}ms</Text>
                </View>
                <Text style={styles.phaseDetails}>{result.details}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Use Case Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Use Case Checklist</Text>
          
          <UseCaseItem 
            title="User Onboarding" 
            items={['Sign up', 'Create profile', 'Health permissions', 'Home screen']}
          />
          <UseCaseItem 
            title="League Management" 
            items={['Create league', 'Join by code', 'Leave league', 'View members']}
          />
          <UseCaseItem 
            title="Matchups" 
            items={['Weekly schedule', 'Live scores', 'Winner determination', 'Tie handling']}
          />
          <UseCaseItem 
            title="Playoffs" 
            items={['Top 4 seeding', 'Semifinals', 'Finals', 'Champion crown']}
          />
          <UseCaseItem 
            title="Health Data" 
            items={['Daily sync', 'Weekly totals', 'Fake data mode', 'Null handling']}
          />
          <UseCaseItem 
            title="Notifications" 
            items={['Week start', 'Matchup result', 'Playoffs', 'Champion']}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Test Section Component
function TestSection({ title, results }: { title: string; results: TestResult[] }) {
  const passedCount = results.filter(r => r.passed).length;
  
  return (
    <View style={styles.testSection}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>{title}</Text>
        <Text style={[
          styles.testCount,
          passedCount === results.length ? styles.passedText : styles.failedText
        ]}>
          {passedCount}/{results.length}
        </Text>
      </View>
      {results.map((result, i) => (
        <View key={i} style={styles.testRow}>
          <Ionicons 
            name={result.passed ? 'checkmark-circle' : 'close-circle'} 
            size={16} 
            color={result.passed ? colors.status.success : colors.status.error} 
          />
          <Text style={styles.testName}>{result.name}</Text>
        </View>
      ))}
    </View>
  );
}

// Use Case Checklist Item
function UseCaseItem({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.useCaseCard}>
      <Text style={styles.useCaseTitle}>{title}</Text>
      {items.map((item, i) => (
        <View key={i} style={styles.useCaseRow}>
          <Ionicons name="checkbox-outline" size={14} color={colors.text.tertiary} />
          <Text style={styles.useCaseText}>{item}</Text>
        </View>
      ))}
    </View>
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
    marginBottom: 20,
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.warning + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: colors.status.warning,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 8,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 8,
    marginBottom: 8,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  passedText: {
    color: colors.status.success,
  },
  failedText: {
    color: colors.status.error,
  },
  testSection: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  testCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 6,
  },
  testRowContent: {
    flex: 1,
  },
  testName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  testMessage: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  healthResultsCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  healthResultsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  simCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 16,
  },
  simTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  simText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  standingsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  standingRow: {
    fontSize: 11,
    color: colors.text.secondary,
    marginLeft: 8,
  },
  speedRunProgress: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  speedRunTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  speedRunStep: {
    fontSize: 11,
    marginBottom: 4,
  },
  useCaseCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  useCaseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  useCaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  useCaseText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  integrationRow: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  phaseDuration: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  phaseDetails: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  regressionResultsCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  regressionResultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  regressionSummary: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  simulationProgress: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  simulationProgressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  simulationProgressSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  viewStepButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  viewStepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  rawDebugContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: colors.status.error,
  },
  rawDebugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.status.error,
    marginBottom: 8,
  },
  rawDebugTimestamp: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawDebugMetric: {
    backgroundColor: colors.background.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rawDebugMetricName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  rawDebugText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rawDebugSample: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

