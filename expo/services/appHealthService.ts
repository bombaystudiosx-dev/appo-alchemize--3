import { getRecentEvents } from './observabilityService';

export interface AppHealthSnapshot {
  healthy: boolean;
  errorCount: number;
  warningCount: number;
  recentScopes: string[];
}

export function getAppHealthSnapshot(): AppHealthSnapshot {
  const events = getRecentEvents();
  const errorCount = events.filter((event) => event.level === 'error').length;
  const warningCount = events.filter((event) => event.level === 'warn').length;
  const recentScopes = Array.from(new Set(events.map((event) => event.scope))).slice(-10);

  return {
    healthy: errorCount === 0,
    errorCount,
    warningCount,
    recentScopes,
  };
}
