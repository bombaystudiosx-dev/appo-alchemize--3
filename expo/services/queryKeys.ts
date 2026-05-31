export const queryKeys = {
  goals: ['goals'] as const,
  goal: (id: string) => ['goals', id] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  gratitude: ['gratitude'] as const,
  foodLogs: ['foodLogs'] as const,
  finance: ['finance'] as const,
  appointments: ['appointments'] as const,
  affirmations: ['affirmations'] as const,
  affirmation: (id: string) => ['affirmations', id] as const,
} as const;

export type QueryKeyFactory = typeof queryKeys;
