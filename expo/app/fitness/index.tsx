import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ImageBackground, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Play, TrendingUp, Award, ChevronRight, Plus, Watch, Dumbbell } from 'lucide-react-native';
import { workoutTemplatesDb, workoutSessionsDb, normalizedMetricsDb, fitnessGoalsDb, fitnessPlansDb, awardsDb } from '@/lib/database';
import {
  seedWorkoutTemplates,
  seedAwards,
  calculateStreak,
  getTodayProgress,
  getWeekSummary,
  recommendWorkouts,
  getWeekDays,
  markActiveDay,
} from '@/lib/fitness';
import type { WorkoutTemplate } from '@/types';

function WorkoutCard({ workout, onPress }: { workout: WorkoutTemplate; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.workoutCard} onPress={onPress}>
      <View style={styles.workoutCardHeader}>
        <Text style={styles.workoutCategory}>{workout.category}</Text>
        <Text style={styles.workoutIntensity}>{workout.intensity}</Text>
      </View>
      <Text style={styles.workoutTitle}>{workout.title}</Text>
      <Text style={styles.workoutDuration}>{workout.durationMinutes} min</Text>
    </TouchableOpacity>
  );
}

export default function FitnessHubScreen() {
  const router = useRouter();

  const { data: templates = [] } = useQuery({
    queryKey: ['workoutTemplates'],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      const data = await workoutTemplatesDb.getAll();
      if (data.length === 0) {
        await seedWorkoutTemplates();
        return await workoutTemplatesDb.getAll();
      }
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['workoutSessions'],
    queryFn: () => Platform.OS === 'web' ? [] : workoutSessionsDb.getAll(),
  });

  const { data: todayMetric } = useQuery({
    queryKey: ['todayMetric'],
    queryFn: async () => {
      if (Platform.OS === 'web') return null;
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      return await normalizedMetricsDb.getByDate(dateStr);
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['fitnessGoals'],
    queryFn: () => Platform.OS === 'web' ? [] : fitnessGoalsDb.getAll(),
  });

  const { data: activePlan } = useQuery({
    queryKey: ['activeFitnessPlan'],
    queryFn: () => Platform.OS === 'web' ? null : fitnessPlansDb.getActive(),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['fitnessAwards'],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      const data = await awardsDb.getAll();
      if (data.length === 0) {
        await seedAwards();
        return await awardsDb.getAll();
      }
      return data;
    },
  });

  const streak = useMemo(() => calculateStreak(sessions), [sessions]);
  const todayProgress = useMemo(() => getTodayProgress(sessions, todayMetric || null), [sessions, todayMetric]);
  const weekSummary = useMemo(() => getWeekSummary(sessions), [sessions]);
  const recommended = useMemo(() => recommendWorkouts(templates, sessions, activePlan || null), [templates, sessions, activePlan]);
  const weekDays = useMemo(() => markActiveDay(getWeekDays(), sessions), [sessions]);

  const topWorkout = recommended[0];

  const earnedAwards = awards.filter(a => a.earnedAt !== null);
  const lockedAwards = awards.filter(a => a.earnedAt === null).slice(0, 3);

  const activeMinutesGoal = goals.find(g => g.metric === 'active_minutes')?.dailyTarget || 30;
  const caloriesGoal = goals.find(g => g.metric === 'calories')?.dailyTarget || 500;
  const stepsGoal = goals.find(g => g.metric === 'steps')?.dailyTarget || 10000;

  const handleStartWorkout = () => {
    if (!topWorkout) return;
    router.push(`/fitness/workout?templateId=${topWorkout.id}` as any);
  };

  const renderProgressRing = (value: number, goal: number, color: string, label: string) => {
    return (
      <View style={styles.progressRing}>
        <View style={styles.ringOuter}>
          <View style={[styles.ringInner, { borderColor: color, borderWidth: 6 }]}>
            <Text style={styles.ringValue}>{value}</Text>
            <Text style={styles.ringGoal}>/ {goal}</Text>
          </View>
        </View>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.addWorkoutSection}>
            <TouchableOpacity
              style={styles.addManualButton}
              onPress={() => router.push('/fitness/add' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.addManualIcon}>
                <Dumbbell size={24} color="#fff" />
              </View>
              <View style={styles.addManualContent}>
                <Text style={styles.addManualTitle}>Log Manual Workout</Text>
                <Text style={styles.addManualSubtitle}>AI estimates calories burned</Text>
              </View>
              <Plus size={24} color="#10b981" />
            </TouchableOpacity>
            
            <View style={styles.wearableNote}>
              <Watch size={16} color="#6366f1" />
              <Text style={styles.wearableNoteText}>Apple Watch & fitness ring sync coming soon</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today&apos;s Progress</Text>
            <View style={styles.progressContainer}>
              {renderProgressRing(todayProgress.activeMinutes, activeMinutesGoal, '#10b981', 'Minutes')}
              {renderProgressRing(todayProgress.calories, caloriesGoal, '#f59e0b', 'Calories')}
              {renderProgressRing(todayProgress.steps, stepsGoal, '#3b82f6', 'Steps')}
            </View>
          </View>

          {topWorkout && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.startButton} onPress={handleStartWorkout}>
                <View style={styles.startButtonContent}>
                  <View style={styles.startIcon}>
                    <Play color="#fff" size={32} fill="#fff" />
                  </View>
                  <View style={styles.startTextContainer}>
                    <Text style={styles.startButtonTitle}>Start Workout</Text>
                    <Text style={styles.startButtonSubtitle}>{topWorkout.title} &bull; {topWorkout.durationMinutes} min</Text>
                  </View>
                  <ChevronRight color="#fff" size={24} />
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested For You</Text>
              <TouchableOpacity onPress={() => router.push('/fitness/browse' as any)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
              {recommended.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} onPress={() => router.push(`/fitness/workout?templateId=${workout.id}` as any)} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Week</Text>
              <Text style={styles.streakText}>🔥 {streak} day streak</Text>
            </View>
            <View style={styles.weekContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <Text style={styles.dayLabel}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][index]}</Text>
                  <View style={[styles.dayCircle, day.isActive && styles.dayCircleActive]}>
                    {day.isActive && <Text style={styles.dayCheck}>✓</Text>}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.trendCard}>
              <View style={styles.trendRow}>
                <TrendingUp color="#10b981" size={20} />
                <Text style={styles.trendLabel}>Workouts</Text>
                <Text style={styles.trendValue}>{weekSummary.workoutsThisWeek}</Text>
              </View>
              <View style={styles.trendRow}>
                <TrendingUp color="#3b82f6" size={20} />
                <Text style={styles.trendLabel}>Total Minutes</Text>
                <Text style={styles.trendValue}>{weekSummary.totalMinutes}</Text>
              </View>
              <View style={styles.trendRow}>
                <TrendingUp color="#f59e0b" size={20} />
                <Text style={styles.trendLabel}>Consistency</Text>
                <Text style={styles.trendValue}>{weekSummary.consistency}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Awards</Text>
            <View style={styles.awardsGrid}>
              {earnedAwards.slice(0, 3).map((award) => (
                <View key={award.id} style={[styles.awardCard, styles.awardEarned]}>
                  <Award color="#f59e0b" size={24} fill="#f59e0b" />
                  <Text style={styles.awardTitle}>{award.title}</Text>
                </View>
              ))}
              {lockedAwards.map((award) => (
                <View key={award.id} style={[styles.awardCard, styles.awardLocked]}>
                  <Award color="#666" size={24} />
                  <Text style={[styles.awardTitle, styles.awardTitleLocked]}>{award.title}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600' as const,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  progressRing: {
    alignItems: 'center',
  },
  ringOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ringInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ringGoal: {
    fontSize: 12,
    color: '#666',
  },
  ringLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  startButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  startTextContainer: {
    flex: 1,
  },
  startButtonTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  startButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  carouselContainer: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  workoutCard: {
    width: 160,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workoutCategory: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  workoutIntensity: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  workoutDuration: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600' as const,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayColumn: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600' as const,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dayCheck: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700' as const,
  },
  streakText: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '700' as const,
  },
  trendCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  trendLabel: {
    flex: 1,
    fontSize: 14,
    color: '#a0a0a0',
    marginLeft: 12,
  },
  trendValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  awardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  awardCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  awardEarned: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  awardLocked: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  awardTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  awardTitleLocked: {
    color: '#666',
  },
  addWorkoutSection: {
    marginBottom: 20,
  },
  addManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 14,
  },
  addManualIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addManualContent: {
    flex: 1,
  },
  addManualTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  addManualSubtitle: {
    fontSize: 13,
    color: '#10b981',
  },
  wearableNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  wearableNoteText: {
    fontSize: 12,
    color: '#6366f1',
    fontStyle: 'italic',
  },
});
