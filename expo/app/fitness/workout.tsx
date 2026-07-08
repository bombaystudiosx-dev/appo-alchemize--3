import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, ChevronLeft, Flame, Clock, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { workoutTemplatesDb, workoutSessionsDb, normalizedMetricsDb } from '@/lib/db/fitness';
import { estimateCalories } from '@/lib/fitness';
import type { WorkoutSession } from '@/types';

export default function WorkoutScreen() {
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const queryClient = useQueryClient();

  const { data: template } = useQuery({
    queryKey: ['workoutTemplate', templateId],
    queryFn: () => workoutTemplatesDb.getById(templateId),
    enabled: !!templateId,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    if (isRunning) return;
    if (elapsedSeconds === 0) {
      startTimeRef.current = Date.now();
    }
    setIsRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [isRunning, elapsedSeconds]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setCompleted(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') return;
      if (!template) throw new Error('No template');

      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const calories = estimateCalories(durationMinutes, template.intensity);
      const now = Date.now();

      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        templateId: template.id,
        startedAt: startTimeRef.current || now - elapsedSeconds * 1000,
        endedAt: now,
        durationMinutes,
        completed: true,
        caloriesEstimate: calories,
        source: 'manual',
      };

      await workoutSessionsDb.create(session);

      const dateStr = new Date().toISOString().split('T')[0];
      const existingMetric = await normalizedMetricsDb.getByDate(dateStr);
      if (existingMetric) {
        await normalizedMetricsDb.upsert({
          id: existingMetric.id,
          date: dateStr,
          activeMinutes: durationMinutes,
          caloriesActive: calories,
          steps: 0,
          source: 'workout',
          deviceType: 'none',
        });
      } else {
        await normalizedMetricsDb.create({
          id: `metric-${Date.now()}`,
          date: dateStr,
          activeMinutes: durationMinutes,
          caloriesActive: calories,
          steps: 0,
          source: 'workout',
          deviceType: 'none',
        });
      }

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workoutSessions'] });
      queryClient.invalidateQueries({ queryKey: ['todayMetric'] });
      queryClient.invalidateQueries({ queryKey: ['fitnessAwards'] });
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Workout save error:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    },
  });

  const handleComplete = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
    completeMutation.mutate();
  }, [completeMutation]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!template) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading workout...</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{template.title}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Clock size={18} color="#6366f1" />
            <Text style={styles.infoText}>{template.durationMinutes} min suggested</Text>
          </View>
          <View style={styles.infoRow}>
            <Flame size={18} color="#f59e0b" />
            <Text style={styles.infoText}>{template.intensity} intensity</Text>
          </View>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>{isRunning ? 'Workout in Progress' : completed ? 'Workout Complete!' : 'Ready to Start'}</Text>
          <Text style={styles.timerValue}>{formatTime(elapsedSeconds)}</Text>

          {completed ? (
            <View style={styles.completedActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={resetTimer}>
                <RotateCcw size={20} color="#fff" />
                <Text style={styles.secondaryButtonText}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timerActions}>
              {!isRunning ? (
                <TouchableOpacity style={styles.startButton} onPress={startTimer}>
                  <Play size={28} color="#fff" fill="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
                  <Pause size={28} color="#fff" fill="#fff" />
                </TouchableOpacity>
              )}

              {elapsedSeconds > 0 && (
                <>
                  <TouchableOpacity style={styles.stopButton} onPress={handleComplete}>
                    <Square size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resetButton} onPress={resetTimer}>
                    <RotateCcw size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Workout Details</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Category</Text>
            <Text style={styles.statValue}>{template.category}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Intensity</Text>
            <Text style={styles.statValue}>{template.intensity}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Equipment</Text>
            <Text style={styles.statValue}>{template.equipment}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Est. Calories</Text>
            <Text style={styles.statValue}>
              {estimateCalories(Math.max(1, Math.round(elapsedSeconds / 60)), template.intensity)} cal
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    gap: 20,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: '#a0a0a0',
    fontSize: 15,
    fontWeight: '500' as const,
  },
  timerCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  timerLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600' as const,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  timerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  startButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  doneButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  statsCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500' as const,
  },
  statValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600' as const,
  },
});
