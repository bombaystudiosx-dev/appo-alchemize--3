export const queryKeys = {
  appointments: ['appointments'] as const,
  affirmations: ['affirmations'] as const,
  affirmation: (id: string) => ['affirmations', id] as const,
  finance: {
    all: ['financial'] as const,
    income: ['financial-income'] as const,
    expenses: ['financial-expenses'] as const,
    notes: ['financial-notes'] as const,
  },
  fitness: {
    all: ['fitness'] as const,
    goals: ['fitnessGoals'] as const,
    sessions: ['workoutSessions'] as const,
    templates: ['workoutTemplates'] as const,
    template: (id: string) => ['workoutTemplate', id] as const,
    todayMetric: ['todayMetric'] as const,
    activePlan: ['activeFitnessPlan'] as const,
  },
  food: {
    logs: ['foodLogs'] as const,
    water: ['waterLogs'] as const,
    mealPrep: ['mealPrepPlans'] as const,
    nutritionProfile: ['nutritionProfile'] as const,
  },
  goals: ['goals'] as const,
  goal: (id: string) => ['goal', id] as const,
  goalChecklist: (id: string) => ['goal-checklist', id] as const,
  goalCompletions: (id: string) => ['goal-completions', id] as const,
  allGoalCompletions: ['all-goal-completions'] as const,
  gratitude: {
    entries: ['gratitude-entries'] as const,
    entry: (date: number) => ['gratitude-entry', date] as const,
  },
  habits: {
    all: ['habits'] as const,
    completions: ['habit-completions'] as const,
  },
  manifestations: ['manifestations'] as const,
  manifestation: (id: string) => ['manifestation', id] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['tasks', id] as const,
  transactions: ['transactions'] as const,
  meals: ['meals'] as const,
} as const;

export type QueryKeyFactory = typeof queryKeys;
