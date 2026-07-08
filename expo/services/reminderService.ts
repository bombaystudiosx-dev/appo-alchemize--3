export interface ReminderPayload {
  id: string;
  title: string;
  scheduledFor?: string;
}

export function shouldScheduleReminder(payload: ReminderPayload) {
  return Boolean(payload.id && payload.title && payload.scheduledFor);
}

export function buildReminderKey(payload: ReminderPayload) {
  return `task:${payload.id}:${payload.scheduledFor || 'none'}`;
}
