import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Task } from '@/types';
import { getReminderScheduleDetails, shouldReconcileReminder } from './taskReminderService';

export interface ScheduleTaskReminderOptions {
  onPermissionDenied?: () => void;
}

export async function scheduleTaskReminder(
  task: Task,
  options: ScheduleTaskReminderOptions = {}
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const scheduleDetails = getReminderScheduleDetails(task);
  if (!scheduleDetails) return null;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      options.onPermissionDenied?.();
      return null;
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: scheduleDetails.title,
        body: scheduleDetails.body,
        sound: 'default',
        priority: scheduleDetails.isUrgent
          ? Notifications.AndroidNotificationPriority.MAX
          : Notifications.AndroidNotificationPriority.HIGH,
        data: { taskId: task.id, urgent: scheduleDetails.isUrgent },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduleDetails.fireTime,
      },
    });
  } catch (error) {
    console.error('[NotificationLifecycle] Failed to schedule task reminder:', error);
    return null;
  }
}

export async function cancelTaskReminder(notificationId?: string | null) {
  if (Platform.OS === 'web' || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('[NotificationLifecycle] Failed to cancel task reminder:', error);
  }
}

export async function getActiveScheduledNotificationIds() {
  if (Platform.OS === 'web') return new Set<string>();

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return new Set(scheduled.map((notification) => notification.identifier));
  } catch (error) {
    console.error('[NotificationLifecycle] Failed to read scheduled notifications:', error);
    return new Set<string>();
  }
}

export function shouldRescheduleMissingReminder(task: Task, activeNotificationIds: Set<string>) {
  if (!shouldReconcileReminder(task)) return false;
  return task.notificationId ? !activeNotificationIds.has(task.notificationId) : true;
}

export function applyReminderNotificationId(task: Task, notificationId: string | null): Task {
  return {
    ...task,
    notificationId,
    updatedAt: Date.now(),
  };
}
