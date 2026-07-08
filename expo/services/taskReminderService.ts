import type { Task } from '@/types';

export interface ReminderScheduleDetails {
  fireTime: Date;
  isUrgent: boolean;
  title: string;
  body: string;
}

export function getTaskDueDateTime(task: Task): Date | null {
  if (!task.dueDate) return null;

  const dueDate = new Date(task.dueDate);
  if (task.dueTime) {
    const [hourValue = '9', minuteValue = '0'] = task.dueTime.split(':');
    const hours = parseInt(hourValue, 10);
    const minutes = parseInt(minuteValue, 10);
    dueDate.setHours(
      Number.isFinite(hours) ? hours : 9,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0
    );
  } else {
    dueDate.setHours(9, 0, 0, 0);
  }

  return dueDate;
}

export function getReminderScheduleDetails(task: Task, now: number = Date.now()): ReminderScheduleDetails | null {
  if (!task.dueDate || !task.reminderEnabled) return null;

  const dueDate = getTaskDueDateTime(task);
  if (!dueDate) return null;

  const isUrgent = task.priority === 'high';
  const leadMs = isUrgent ? 60 * 60 * 1000 : 15 * 60 * 1000;
  const reminderTime = new Date(dueDate.getTime() - leadMs);
  const fireTime = reminderTime.getTime() <= now ? new Date(now + 5 * 1000) : reminderTime;

  return {
    fireTime,
    isUrgent,
    title: isUrgent ? '🔥 Urgent Task' : 'Task Reminder',
    body: isUrgent ? `URGENT: ${task.title}` : task.title,
  };
}

export function shouldReconcileReminder(task: Task, now: number = Date.now()) {
  if (task.isDone || !task.reminderEnabled || !task.dueDate) return false;

  const dueDate = getTaskDueDateTime(task);
  if (!dueDate) return false;

  return dueDate.getTime() >= now - 60_000;
}

export function getNextPriority(priority: Task['priority']) {
  const priorities: Array<Task['priority']> = [null, 'low', 'medium', 'high'];
  const currentIndex = priorities.indexOf(priority);
  return priorities[(currentIndex + 1) % priorities.length];
}
