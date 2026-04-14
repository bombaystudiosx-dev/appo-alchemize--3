import type { WorkoutTemplate, WorkoutSession, NormalizedMetric, Award, FitnessPlan } from '@/types';
import { workoutTemplatesDb, awardsDb } from '@/lib/database';

export const WORKOUT_TEMPLATES: Omit<WorkoutTemplate, 'id'>[] = [
  { title: 'Morning Stretch', category: 'stretch', durationMinutes: 10, intensity: 'low', equipment: 'none', description: 'Gentle full-body stretching to start your day' },
  { title: 'Power Yoga Flow', category: 'yoga', durationMinutes: 30, intensity: 'medium', equipment: 'none', description: 'Dynamic yoga sequence building strength and flexibility' },
  { title: 'Quick Core Blast', category: 'core', durationMinutes: 15, intensity: 'high', equipment: 'none', description: 'Intense core workout with planks, crunches, and twists' },
  { title: 'HIIT Cardio', category: 'hiit', durationMinutes: 20, intensity: 'high', equipment: 'none', description: 'High-intensity intervals to torch calories' },
  { title: 'Strength Builder', category: 'strength', durationMinutes: 45, intensity: 'high', equipment: 'dumbbells', description: 'Full-body strength training with weights' },
  { title: 'Mobility Flow', category: 'mobility', durationMinutes: 20, intensity: 'low', equipment: 'none', description: 'Improve joint mobility and movement quality' },
  { title: 'Evening Walk', category: 'walk', durationMinutes: 30, intensity: 'low', equipment: 'none', description: 'Relaxing outdoor walk for recovery' },
  { title: 'Quick Run', category: 'run', durationMinutes: 25, intensity: 'medium', equipment: 'none', description: 'Moderate-pace cardiovascular run' },
  { title: 'Deep Stretch', category: 'stretch', durationMinutes: 20, intensity: 'low', equipment: 'none', description: 'Long-hold stretches for flexibility' },
  { title: 'Yoga for Beginners', category: 'yoga', durationMinutes: 25, intensity: 'low', equipment: 'none', description: 'Gentle introduction to yoga poses' },
  { title: 'Core Stability', category: 'core', durationMinutes: 12, intensity: 'medium', equipment: 'none', description: 'Build a stable, strong core foundation' },
  { title: 'Tabata Workout', category: 'hiit', durationMinutes: 15, intensity: 'high', equipment: 'none', description: '20 seconds on, 10 seconds off intervals' },
  { title: 'Upper Body Power', category: 'strength', durationMinutes: 35, intensity: 'high', equipment: 'dumbbells', description: 'Focus on chest, back, shoulders, and arms' },
  { title: 'Hip Mobility', category: 'mobility', durationMinutes: 15, intensity: 'low', equipment: 'none', description: 'Open tight hips and improve range of motion' },
  { title: 'Brisk Walk', category: 'walk', durationMinutes: 20, intensity: 'medium', equipment: 'none', description: 'Fast-paced walk to get your heart rate up' },
  { title: 'Interval Run', category: 'run', durationMinutes: 30, intensity: 'high', equipment: 'none', description: 'Alternating sprints and jog intervals' },
  { title: 'Full Body Stretch', category: 'stretch', durationMinutes: 25, intensity: 'low', equipment: 'none', description: 'Complete stretching routine for all major muscles' },
  { title: 'Vinyasa Flow', category: 'yoga', durationMinutes: 40, intensity: 'medium', equipment: 'none', description: 'Flowing yoga practice linking breath and movement' },
  { title: 'Ab Shredder', category: 'core', durationMinutes: 10, intensity: 'high', equipment: 'none', description: 'Intense abdominal workout for definition' },
  { title: 'EMOM Challenge', category: 'hiit', durationMinutes: 25, intensity: 'high', equipment: 'none', description: 'Every minute on the minute intensity training' },
  { title: 'Lower Body Blast', category: 'strength', durationMinutes: 40, intensity: 'high', equipment: 'dumbbells', description: 'Legs, glutes, and hamstrings workout' },
  { title: 'Shoulder Mobility', category: 'mobility', durationMinutes: 12, intensity: 'low', equipment: 'bands', description: 'Improve shoulder flexibility and health' },
  { title: 'Recovery Walk', category: 'walk', durationMinutes: 45, intensity: 'low', equipment: 'none', description: 'Long, easy walk for active recovery' },
  { title: 'Tempo Run', category: 'run', durationMinutes: 35, intensity: 'medium', equipment: 'none', description: 'Sustained moderate-hard effort run' },
  { title: 'Resistance Band Workout', category: 'strength', durationMinutes: 30, intensity: 'medium', equipment: 'bands', description: 'Full-body strength using resistance bands' },
  { title: 'Gym Session', category: 'strength', durationMinutes: 60, intensity: 'high', equipment: 'gym', description: 'Complete gym workout with machines and free weights' },
  { title: 'Core + Stretch', category: 'core', durationMinutes: 20, intensity: 'medium', equipment: 'none', description: 'Core work followed by deep stretching' },
  { title: 'Yin Yoga', category: 'yoga', durationMinutes: 45, intensity: 'low', equipment: 'none', description: 'Restorative yoga with long-held poses' },
  { title: 'Sprint Intervals', category: 'hiit', durationMinutes: 12, intensity: 'high', equipment: 'none', description: 'All-out sprint intervals for maximum burn' },
  { title: 'Morning Mobility', category: 'mobility', durationMinutes: 10, intensity: 'low', equipment: 'none', description: 'Wake up your body with mobility drills' },
];

export async function seedWorkoutTemplates() {
  const existing = await workoutTemplatesDb.getAll();
  if (existing.length > 0) return;
  
  for (const template of WORKOUT_TEMPLATES) {
    await workoutTemplatesDb.create({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...template,
    });
  }
}

export async function seedAwards() {
  const awards: Omit<Award, 'id'>[] = [
    { code: 'FIRST_WORKOUT', title: 'First Steps', description: 'Complete your first workout', earnedAt: null },
    { code: 'STREAK_3', title: '3 Day Streak', description: 'Work out 3 days in a row', earnedAt: null },
    { code: 'STREAK_7', title: 'Week Warrior', description: 'Work out 7 days in a row', earnedAt: null },
    { code: 'STREAK_14', title: 'Two Week Champion', description: 'Work out 14 days in a row', earnedAt: null },
    { code: 'STREAK_30', title: 'Month Master', description: 'Work out 30 days in a row', earnedAt: null },
    { code: 'WORKOUTS_10', title: 'Getting Started', description: 'Complete 10 workouts', earnedAt: null },
    { code: 'WORKOUTS_25', title: 'Building Momentum', description: 'Complete 25 workouts', earnedAt: null },
    { code: 'WORKOUTS_50', title: 'Half Century', description: 'Complete 50 workouts', earnedAt: null },
    { code: 'WORKOUTS_100', title: 'Century Club', description: 'Complete 100 workouts', earnedAt: null },
    { code: 'VARIETY_5', title: 'Variety Seeker', description: 'Try 5 different workout categories', earnedAt: null },
  ];
  
  for (const award of awards) {
    await awardsDb.create({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...award,
    });
  }
}

export function calculateStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  
  const completedSessions = sessions.filter(s => s.completed).sort((a, b) => b.startedAt - a.startedAt);
  if (completedSessions.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  let streak = 0;
  let checkDate = todayMs;
  
  const sessionDates = new Set(
    completedSessions.map(s => {
      const date = new Date(s.startedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );
  
  while (sessionDates.has(checkDate)) {
    streak++;
    checkDate -= 24 * 60 * 60 * 1000;
  }
  
  return streak;
}

export function getTodayProgress(sessions: WorkoutSession[], metrics: NormalizedMetric | null): {
  activeMinutes: number;
  calories: number;
  steps: number;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  
  const todaySessions = sessions.filter(s => {
    const sessionDate = new Date(s.startedAt);
    sessionDate.setHours(0, 0, 0, 0);
    return sessionDate.getTime() === todayMs && s.completed;
  });
  
  const workoutMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const workoutCalories = todaySessions.reduce((sum, s) => sum + (s.caloriesEstimate || 0), 0);
  
  return {
    activeMinutes: workoutMinutes + (metrics?.activeMinutes || 0),
    calories: workoutCalories + (metrics?.caloriesActive || 0),
    steps: metrics?.steps || 0,
  };
}

export function getWeekSummary(sessions: WorkoutSession[]): {
  workoutsThisWeek: number;
  totalMinutes: number;
  consistency: number;
} {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  
  const weekSessions = sessions.filter(s => s.startedAt >= weekAgo && s.completed);
  
  const totalMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const activeDays = new Set(
    weekSessions.map(s => {
      const date = new Date(s.startedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  ).size;
  
  return {
    workoutsThisWeek: weekSessions.length,
    totalMinutes,
    consistency: Math.round((activeDays / 7) * 100),
  };
}

export async function checkAndAwardAchievements(sessions: WorkoutSession[]): Promise<string[]> {
  const completedSessions = sessions.filter(s => s.completed);
  const newAwards: string[] = [];
  
  if (completedSessions.length >= 1) {
    await awardsDb.markEarned('FIRST_WORKOUT');
    newAwards.push('FIRST_WORKOUT');
  }
  
  if (completedSessions.length >= 10) {
    await awardsDb.markEarned('WORKOUTS_10');
    newAwards.push('WORKOUTS_10');
  }
  
  if (completedSessions.length >= 25) {
    await awardsDb.markEarned('WORKOUTS_25');
    newAwards.push('WORKOUTS_25');
  }
  
  if (completedSessions.length >= 50) {
    await awardsDb.markEarned('WORKOUTS_50');
    newAwards.push('WORKOUTS_50');
  }
  
  if (completedSessions.length >= 100) {
    await awardsDb.markEarned('WORKOUTS_100');
    newAwards.push('WORKOUTS_100');
  }
  
  const templates = await workoutTemplatesDb.getAll();
  const uniqueCategories = new Set(
    completedSessions.map(s => templates.find(t => t.id === s.templateId)?.category).filter(Boolean)
  );
  
  if (uniqueCategories.size >= 5) {
    await awardsDb.markEarned('VARIETY_5');
    newAwards.push('VARIETY_5');
  }
  
  const streak = calculateStreak(completedSessions);
  
  if (streak >= 3) {
    await awardsDb.markEarned('STREAK_3');
    newAwards.push('STREAK_3');
  }
  
  if (streak >= 7) {
    await awardsDb.markEarned('STREAK_7');
    newAwards.push('STREAK_7');
  }
  
  if (streak >= 14) {
    await awardsDb.markEarned('STREAK_14');
    newAwards.push('STREAK_14');
  }
  
  if (streak >= 30) {
    await awardsDb.markEarned('STREAK_30');
    newAwards.push('STREAK_30');
  }
  
  return newAwards;
}

export function recommendWorkouts(
  templates: WorkoutTemplate[],
  sessions: WorkoutSession[],
  plan: FitnessPlan | null
): WorkoutTemplate[] {
  const now = Date.now();
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const recentSessions = sessions.filter(s => s.startedAt >= twoWeeksAgo && s.completed);
  
  const categoryFrequency: Record<string, number> = {};
  recentSessions.forEach(s => {
    const template = templates.find(t => t.id === s.templateId);
    if (template) {
      categoryFrequency[template.category] = (categoryFrequency[template.category] || 0) + 1;
    }
  });
  
  const avgDuration = recentSessions.length > 0
    ? recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / recentSessions.length
    : 25;
  
  const lastSession = recentSessions[0];
  const lastTemplate = lastSession ? templates.find(t => t.id === lastSession.templateId) : null;
  
  const scored = templates.map(template => {
    let score = 100;
    
    if (plan?.preferredCategories.includes(template.category)) {
      score += 30;
    }
    
    const timesUsed = categoryFrequency[template.category] || 0;
    score -= timesUsed * 5;
    
    const durationDiff = Math.abs(template.durationMinutes - avgDuration);
    score -= durationDiff * 0.5;
    
    if (plan) {
      if (template.intensity === plan.intensity) score += 20;
      if (template.equipment === plan.equipment || plan.equipment === 'none') score += 10;
      if (template.durationMinutes >= plan.durationRangeMin && template.durationMinutes <= plan.durationRangeMax) {
        score += 25;
      }
    }
    
    if (lastTemplate && lastTemplate.category === template.category && lastTemplate.intensity === 'high' && template.intensity === 'high') {
      score -= 40;
    }
    
    return { template, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, 6).map(s => s.template);
}

export function estimateCalories(durationMinutes: number, intensity: string): number {
  const baseCaloriesPerMinute: Record<string, number> = {
    low: 4,
    medium: 7,
    high: 10,
  };
  
  return Math.round(durationMinutes * (baseCaloriesPerMinute[intensity] || 7));
}

export function getWeekDays(): { date: Date; isActive: boolean }[] {
  const days: { date: Date; isActive: boolean }[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    days.push({ date, isActive: false });
  }
  
  return days;
}

export function markActiveDay(days: { date: Date; isActive: boolean }[], sessions: WorkoutSession[]): { date: Date; isActive: boolean }[] {
  const activeDates = new Set(
    sessions
      .filter(s => s.completed)
      .map(s => {
        const date = new Date(s.startedAt);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
  );
  
  return days.map(day => ({
    ...day,
    isActive: activeDates.has(day.date.getTime()),
  }));
}
