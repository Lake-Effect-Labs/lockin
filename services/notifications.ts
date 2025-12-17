import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { updatePushToken, createNotification } from './supabase';

// Lazy load native modules to prevent crashes at module load time
let Notifications: any = null;
let Device: any = null;

function getNotifications() {
  if (!Notifications) {
    try {
      Notifications = require('expo-notifications');
    } catch (error) {
      console.warn('Notifications not available:', error);
      Notifications = null;
    }
  }
  return Notifications;
}

function getDevice() {
  if (!Device) {
    try {
      Device = require('expo-device');
    } catch (error) {
      console.warn('Device not available:', error);
      Device = null;
    }
  }
  return Device;
}

// ============================================
// PUSH NOTIFICATIONS SERVICE
// Lock-In Fitness Competition App
// ============================================

// Configure notification behavior (lazy initialization to prevent crashes)
let notificationHandlerInitialized = false;

function initializeNotificationHandler() {
  if (notificationHandlerInitialized) {
    return;
  }
  
  try {
    const notifications = getNotifications();
    if (!notifications) {
      return; // Notifications not available
    }
    
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerInitialized = true;
  } catch (error) {
    // Don't crash if notifications aren't available
    console.warn('Failed to set notification handler:', error);
  }
}

export type NotificationType = 
  | 'week_start'
  | 'week_end'
  | 'matchup_win'
  | 'matchup_loss'
  | 'playoffs_start'
  | 'semifinal_win'
  | 'finals_start'
  | 'champion'
  | 'opponent_takes_lead'
  | 'you_take_lead'
  | 'close_matchup'
  | 'big_lead';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Register for push notifications and get token
 */
export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  // Initialize notification handler if not already done
  initializeNotificationHandler();
  
  const device = getDevice();
  if (!device || !device.isDevice) {
    // Push notifications require a physical device
    return null;
  }

  try {
    const notifications = getNotifications();
    if (!notifications) {
      return null; // Notifications not available
    }
    
    // Check existing permissions
    const { status: existingStatus } = await notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = await notifications.getExpoPushTokenAsync({
      projectId,
    });

    // iOS notifications don't require channel configuration

    // Save token to database if user is logged in
    if (userId && token.data) {
      await updatePushToken(userId, token.data);
    }

    return token.data;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Send a local notification
 */
export async function sendLocalNotification(payload: NotificationPayload): Promise<string> {
  // Initialize notification handler if not already done
  initializeNotificationHandler();
  
  const notifications = getNotifications();
  if (!notifications) {
    throw new Error('Notifications not available');
  }
  
  const notificationId = await notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: true,
    },
    trigger: null, // Immediate
  });

  return notificationId;
}

/**
 * Schedule a notification for a specific time
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  date: Date
): Promise<string> {
  const notifications = getNotifications();
  if (!notifications) {
    throw new Error('Notifications not available');
  }
  
  const notificationId = await notifications.scheduleNotificationAsync({
    content: {
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: true,
    },
    trigger: {
      type: 'date' as any,
      date,
    },
  });

  return notificationId;
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  await notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  await notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all pending notifications
 */
export async function getPendingNotifications(): Promise<any[]> {
  const notifications = getNotifications();
  if (!notifications) return [];
  return notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: any) => void
): any {
  const notifications = getNotifications();
  if (!notifications) return { remove: () => {} };
  return notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  const notifications = getNotifications();
  if (!notifications) return { remove: () => {} };
  return notifications.addNotificationReceivedListener(callback);
}

/**
 * Get notification content for different event types
 */
export function getNotificationContent(
  type: NotificationType,
  data?: Record<string, any>
): NotificationPayload {
  switch (type) {
    case 'week_start':
      return {
        title: '🏁 New Week Started!',
        body: `Week ${data?.week || ''} has begun. Time to grind!`,
        data: { type, ...data },
      };

    case 'week_end':
      return {
        title: '⏰ Week Ending Soon!',
        body: `Week ${data?.week || ''} ends in 24 hours. Make every step count!`,
        data: { type, ...data },
      };

    case 'matchup_win':
      return {
        title: '🎉 Victory!',
        body: `You won your Week ${data?.week || ''} matchup against ${data?.opponent || 'your opponent'}!`,
        data: { type, ...data },
      };

    case 'matchup_loss':
      return {
        title: '😤 Tough Loss',
        body: `You lost your Week ${data?.week || ''} matchup. Come back stronger next week!`,
        data: { type, ...data },
      };

    case 'playoffs_start':
      return {
        title: '🏆 Playoffs Begin!',
        body: data?.qualified 
          ? `You made the playoffs as the #${data?.seed} seed! Time to compete.`
          : 'The playoffs have started. Cheer on your league!',
        data: { type, ...data },
      };

    case 'semifinal_win':
      return {
        title: '🔥 Finals Bound!',
        body: 'You won your semifinal! The championship awaits.',
        data: { type, ...data },
      };

    case 'finals_start':
      return {
        title: '🏆 Championship Week!',
        body: `You're in the finals against ${data?.opponent || 'your opponent'}. Give it everything!`,
        data: { type, ...data },
      };

    case 'champion':
      return {
        title: '👑 CHAMPION!',
        body: `You are the ${data?.leagueName || 'Lock-In'} champion! Incredible season!`,
        data: { type, ...data },
      };

    case 'opponent_takes_lead':
      return {
        title: '😱 Your opponent took the lead!',
        body: `${data?.opponent || 'Your opponent'} just passed you by ${data?.margin || 0} points. Time to step it up!`,
        data: { type, ...data },
      };

    case 'you_take_lead':
      return {
        title: '🔥 You took the lead!',
        body: `You're now ahead of ${data?.opponent || 'your opponent'} by ${data?.margin || 0} points. Keep it up!`,
        data: { type, ...data },
      };

    case 'close_matchup':
      return {
        title: '⚔️ Neck and neck!',
        body: `You and ${data?.opponent || 'your opponent'} are within ${data?.margin || 10} points. Every step counts!`,
        data: { type, ...data },
      };

    case 'big_lead':
      return {
        title: '💪 Crushing it!',
        body: `You're ${data?.margin || 0} points ahead of ${data?.opponent || 'your opponent'}. Don't let up!`,
        data: { type, ...data },
      };

    default:
      return {
        title: 'Lock-In',
        body: 'You have a new notification',
        data: { type, ...data },
      };
  }
}

/**
 * Send notification and save to database
 */
export async function sendAndSaveNotification(
  userId: string,
  type: NotificationType,
  data?: Record<string, any>
): Promise<void> {
  const content = getNotificationContent(type, data);
  
  // Save to database
  await createNotification(userId, content.title, content.body, type as any, data);
  
  // Send local notification
  await sendLocalNotification(content);
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  const notifications = getNotifications();
  if (!notifications) return;
  await notifications.setBadgeCountAsync(count);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  const notifications = getNotifications();
  if (!notifications) return 0;
  return notifications.getBadgeCountAsync();
}

