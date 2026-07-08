export type ObservabilityLevel = 'info' | 'warn' | 'error';

export interface ObservabilityEvent {
  level: ObservabilityLevel;
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
}

const history: ObservabilityEvent[] = [];

export function recordEvent(event: ObservabilityEvent) {
  history.push({
    ...event,
    metadata: event.metadata ?? {},
  });

  if (history.length > 100) {
    history.shift();
  }
}

export function recordError(scope: string, error: unknown, metadata?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);

  recordEvent({
    level: 'error',
    scope,
    message,
    metadata,
  });
}

export function getRecentEvents() {
  return [...history];
}

export function clearRecentEvents() {
  history.length = 0;
}
