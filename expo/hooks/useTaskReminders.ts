import { useMemo } from 'react';

export interface ReminderItem {
  id: string;
  title: string;
  scheduledFor?: string;
}

export function useTaskReminders(tasks: ReminderItem[]) {
  return useMemo(() => {
    return tasks.filter((task) => Boolean(task.scheduledFor));
  }, [tasks]);
}
