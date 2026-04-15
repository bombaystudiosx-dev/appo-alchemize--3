import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = '@alchemize_push_token';
const NOTIFICATION_ENABLED_KEY = '@alchemize_notifications_enabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform - skipping push registration');
    return null;
  }

  try {
    console.log('[Notifications] Requesting permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a78bfa',
        sound: 'default',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');

    return token;
  } catch (error) {
    console.error('[Notifications] Error registering for push:', error);
    return null;
  }
}

export async function getNotificationStatus(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function isNotificationEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export async function scheduleAppointmentNotification(
  appointmentId: string,
  title: string,
  date: number,
  time: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Notifications] Cannot schedule - permission not granted');
      return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const triggerDate = new Date(date);
    triggerDate.setHours(hours, minutes, 0, 0);

    const reminderDate = new Date(triggerDate.getTime() - 15 * 60 * 1000);

    if (reminderDate.getTime() <= Date.now()) {
      console.log('[Notifications] Reminder time already passed, skipping');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming Appointment',
        body: `${title} in 15 minutes`,
        sound: 'default',
        data: { appointmentId, type: 'appointment_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });

    console.log('[Notifications] Scheduled notification:', notificationId, 'for', reminderDate.toISOString());
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
  }
}

export async function scheduleHabitReminder(
  habitId: string,
  title: string,
  hour: number,
  minute: number,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Habit Reminder',
        body: `Time for: ${title}`,
        sound: 'default',
        data: { habitId, type: 'habit_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    console.log('[Notifications] Scheduled daily habit reminder:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling habit reminder:', error);
    return null;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Notifications] Cancelled notification:', notificationId);
  } catch (error) {
    console.error('[Notifications] Error cancelling notification:', error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] All notifications cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling all notifications:', error);
  }
}

export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  if (Platform.OS === 'web') return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}
