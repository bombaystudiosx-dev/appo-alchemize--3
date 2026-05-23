import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  ImageBackground,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, ChevronDown, ChevronUp, Timer, Hash, CheckSquare, Play, Pause, Square } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { habitsDb, habitCompletionsDb, userProfileDb } from '@/lib/database';
import type { Habit } from '@/types';
import { ASSETS } from '@/constants/assets';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

type Section = 'morning' | 'health' | 'evening' | 'custom';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'morning', label: 'Morning' },
  { key: 'health', label: 'Health' },
  { key: 'evening', label: 'Evening' },
  { key: 'custom', label: 'Custom' },
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confettiRef = useRef<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [collapsedSections, setCollapsedSections] = useState<Set<Section>>(new Set());
  const [timerStates, setTimerStates] = useState<Record<string, { running: boolean; elapsed: number; interval?: any }>>({});
  const [counterValues, setCounterValues] = useState<Record<string, number>>({});
  const [floatingRewards, setFloatingRewards] = useState<{ id: string; xp: number; energy: number; x: number; y: number }[]>([]);

  const { data: habits = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['habits'],
    queryFn: () => habitsDb.getAll(),
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => userProfileDb.get(),
  });

  const { data: allCompletions = [] } = useQuery({
    queryKey: ['habit-completions'],
    queryFn: async () => {
      const comps = [];
      for (const habit of habits) {
        const habitComps = await habitCompletionsDb.getByHabitId(habit.id);
        comps.push(...habitComps);
      }
      return comps;
    },
    enabled: habits.length > 0,
  });



  const completeHabitMutation = useMutation({
    mutationFn: async ({ habitId, value, xp, energy }: { habitId: string; value: number; xp: number; energy: number }) => {
      const dateStart = new Date(selectedDate).setHours(0, 0, 0, 0);
      await habitCompletionsDb.create({
        id: Date.now().toString(),
        habitId,
        completionDate: dateStart,
        value,
        notes: '',
        completedAt: Date.now(),
      });

      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        const updatedStreak = getHabitStreak(habitId) + 1;
        await habitsDb.update({
          ...habit,
          streak: updatedStreak,
          lastCompletedDate: new Date().toISOString(),
        });
      }

      await userProfileDb.updateXpAndEnergy(xp, energy);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['habit-completions'] });
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confettiRef.current?.start();
      
      showFloatingReward(variables.xp, variables.energy);
    },
  });

  const showFloatingReward = (xp: number, energy: number) => {
    const id = Date.now().toString();
    setFloatingRewards(prev => [...prev, { id, xp, energy, x: Math.random() * 200 + 100, y: 300 }]);
    setTimeout(() => {
      setFloatingRewards(prev => prev.filter(r => r.id !== id));
    }, 2000);
  };

  const getWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - currentDay);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();

  const isCompletedOnDate = useCallback(
    (habitId: string, date: Date): boolean => {
      const dateStart = new Date(date).setHours(0, 0, 0, 0);
      return allCompletions.some((c) => {
        const compDate = new Date(c.completedAt).setHours(0, 0, 0, 0);
        return c.habitId === habitId && compDate === dateStart;
      });
    },
    [allCompletions]
  );

  const getHabitStreak = useCallback(
    (habitId: string): number => {
      const completions = allCompletions
        .filter((c) => c.habitId === habitId)
        .sort((a, b) => b.completedAt - a.completedAt);

      if (completions.length === 0) return 0;

      let streak = 0;
      const today = new Date().setHours(0, 0, 0, 0);
      let checkDate = today;

      for (const completion of completions) {
        const compDate = new Date(completion.completedAt).setHours(0, 0, 0, 0);
        if (compDate === checkDate) {
          streak++;
          checkDate -= 86400000;
        } else if (compDate < checkDate) {
          break;
        }
      }

      return streak;
    },
    [allCompletions]
  );

  const totalStats = useMemo(() => {
    const maxStreak = Math.max(...habits.map(h => getHabitStreak(h.id)), 0);
    return {
      maxStreak,
      totalXP: userProfile?.totalXp || 0,
      totalEnergy: userProfile?.totalEnergy || 0,
    };
  }, [habits, userProfile, getHabitStreak]);

  const getDayCompletionCount = (date: Date): number => {
    const dateStart = new Date(date).setHours(0, 0, 0, 0);
    return allCompletions.filter((c) => {
      const compDate = new Date(c.completedAt).setHours(0, 0, 0, 0);
      return compDate === dateStart;
    }).length;
  };

  const toggleSection = (section: Section) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const habitsBySection = useMemo(() => {
    const grouped: Record<Section, Habit[]> = {
      morning: [],
      health: [],
      evening: [],
      custom: [],
    };

    habits.forEach((habit) => {
      const section = (habit as any).section || 'custom';
      if (grouped[section as Section]) {
        grouped[section as Section].push(habit);
      } else {
        grouped.custom.push(habit);
      }
    });

    return grouped;
  }, [habits]);

  const startTimer = (habitId: string) => {
    const interval = setInterval(() => {
      setTimerStates(prev => ({
        ...prev,
        [habitId]: {
          ...prev[habitId],
          elapsed: (prev[habitId]?.elapsed || 0) + 1,
        },
      }));
    }, 1000);

    setTimerStates(prev => ({
      ...prev,
      [habitId]: { running: true, elapsed: prev[habitId]?.elapsed || 0, interval },
    }));
  };

  const pauseTimer = (habitId: string) => {
    const state = timerStates[habitId];
    if (state?.interval) {
      clearInterval(state.interval);
    }
    setTimerStates(prev => ({
      ...prev,
      [habitId]: { ...prev[habitId], running: false, interval: undefined },
    }));
  };

  const completeTimer = (habit: Habit) => {
    const state = timerStates[habit.id];
    if (state?.interval) {
      clearInterval(state.interval);
    }

    const minutes = Math.floor((state?.elapsed || 0) / 60);
    const goalMinutes = habit.goalUnit === 'hours' ? habit.goal * 60 : habit.goal;

    if (minutes >= goalMinutes) {
      completeHabitMutation.mutate({
        habitId: habit.id,
        value: minutes,
        xp: habit.xpReward,
        energy: habit.energyReward,
      });
      setTimerStates(prev => ({ ...prev, [habit.id]: { running: false, elapsed: 0 } }));
    } else {
      Alert.alert('Not Yet!', `You need to complete ${goalMinutes} ${habit.goalUnit} to earn rewards.`);
    }
  };

  const completeCounter = (habit: Habit) => {
    const count = counterValues[habit.id] || 0;
    if (count >= habit.goal) {
      completeHabitMutation.mutate({
        habitId: habit.id,
        value: count,
        xp: habit.xpReward,
        energy: habit.energyReward,
      });
      setCounterValues(prev => ({ ...prev, [habit.id]: 0 }));
    } else {
      Alert.alert('Not Yet!', `You need ${habit.goal} to complete this habit.`);
    }
  };

  const completeCheckbox = (habit: Habit) => {
    const isCompleted = isCompletedOnDate(habit.id, selectedDate);
    if (!isCompleted) {
      completeHabitMutation.mutate({
        habitId: habit.id,
        value: 1,
        xp: habit.xpReward,
        energy: habit.energyReward,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderHabitCard = (habit: Habit) => {
    const isCompleted = isCompletedOnDate(habit.id, selectedDate);
    const streak = getHabitStreak(habit.id);
    const timerState = timerStates[habit.id];
    const counterValue = counterValues[habit.id] || 0;

    return (
      <View key={habit.id} style={styles.habitCard}>
        <View style={styles.habitTop}>
          <View style={styles.habitLeft}>
            <View style={styles.habitIcon}>
              <Text style={styles.habitIconText}>{habit.icon}</Text>
            </View>
            <View style={styles.habitInfo}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.habitSubtext}>
                {habit.type === 'timer' && `⏱ ${habit.goal} ${habit.goalUnit}`}
                {habit.type === 'counter' && `🔢 ${habit.goal} times`}
                {habit.type === 'checkbox' && 'Daily task'}
                {' • 🔥 '}{streak}
              </Text>
            </View>
          </View>
          <View style={styles.habitRewards}>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>🏆 {habit.xpReward}</Text>
            </View>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>⚡ {habit.energyReward}</Text>
            </View>
          </View>
        </View>

        {habit.type === 'checkbox' && (
          <TouchableOpacity
            style={[styles.checkboxButton, isCompleted && styles.checkboxButtonCompleted]}
            onPress={() => completeCheckbox(habit)}
            disabled={isCompleted}
          >
            {isCompleted ? (
              <>
                <CheckSquare color="#FFFFFF" size={20} />
                <Text style={styles.checkboxButtonText}>Completed ✓</Text>
              </>
            ) : (
              <>
                <Square color="rgba(201, 167, 255, 0.8)" size={20} />
                <Text style={styles.checkboxButtonText}>Mark Complete</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {habit.type === 'timer' && (
          <View style={styles.timerSection}>
            <View style={styles.timerDisplay}>
              <Timer color="#FFD700" size={24} />
              <Text style={styles.timerText}>{formatTime(timerState?.elapsed || 0)}</Text>
              <Text style={styles.timerGoal}>/ {habit.goal} {habit.goalUnit}</Text>
            </View>
            <View style={styles.timerButtons}>
              {!timerState?.running ? (
                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={() => startTimer(habit.id)}
                  disabled={isCompleted}
                >
                  <Play color={isCompleted ? '#666' : '#FFD700'} size={20} />
                  <Text style={[styles.timerButtonText, isCompleted && styles.timerButtonTextDisabled]}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.timerButton}
                  onPress={() => pauseTimer(habit.id)}
                >
                  <Pause color="#FFD700" size={20} />
                  <Text style={styles.timerButtonText}>Pause</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.timerButton, styles.completeButton]}
                onPress={() => completeTimer(habit)}
                disabled={isCompleted}
              >
                <Text style={[styles.completeButtonText, isCompleted && styles.timerButtonTextDisabled]}>
                  {isCompleted ? 'Done ✓' : 'Complete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {habit.type === 'counter' && (
          <View style={styles.counterSection}>
            <View style={styles.counterDisplay}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setCounterValues(prev => ({ ...prev, [habit.id]: Math.max(0, (prev[habit.id] || 0) - 1) }))}
                disabled={isCompleted}
              >
                <Text style={styles.counterButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.counterValue}>
                <Hash color="#FFD700" size={20} />
                <Text style={styles.counterText}>{counterValue} / {habit.goal}</Text>
              </View>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setCounterValues(prev => ({ ...prev, [habit.id]: (prev[habit.id] || 0) + 1 }))}
                disabled={isCompleted}
              >
                <Text style={styles.counterButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.counterCompleteButton, isCompleted && styles.counterCompleteButtonDisabled]}
              onPress={() => completeCounter(habit)}
              disabled={isCompleted}
            >
              <Text style={[styles.counterCompleteText, isCompleted && styles.timerButtonTextDisabled]}>
                {isCompleted ? 'Completed ✓' : 'Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✨ Completed Today!</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (section: { key: Section; label: string }) => {
    const sectionHabits = habitsBySection[section.key];
    if (sectionHabits.length === 0) return null;

    const isCollapsed = collapsedSections.has(section.key);

    return (
      <View key={section.key} style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.key)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>{section.label}</Text>
          {isCollapsed ? (
            <ChevronDown color="#C9A7FF" size={20} />
          ) : (
            <ChevronUp color="#C9A7FF" size={20} />
          )}
        </TouchableOpacity>
        {!isCollapsed && (
          <View style={styles.sectionContent}>
            {sectionHabits.map(renderHabitCard)}
          </View>
        )}
      </View>
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  return (
    <ImageBackground source={{ uri: ASSETS.bgCosmic }} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={['rgba(10, 10, 30, 0.85)', 'rgba(20, 15, 50, 0.9)']}
        style={styles.overlay}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings color="#C9A7FF" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Habit Tracker</Text>
          <TouchableOpacity
            onPress={() => router.push('/habits/add' as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus color="#FFD700" size={28} />
          </TouchableOpacity>
        </View>

        <BlurView intensity={15} tint="dark" style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🔥</Text>
            <View>
              <Text style={styles.statValue}>{totalStats.maxStreak}</Text>
              <Text style={styles.statLabel}>Max Streak</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏆</Text>
            <View>
              <Text style={styles.statValue}>{totalStats.totalXP}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>⚡</Text>
            <View>
              <Text style={styles.statValue}>{totalStats.totalEnergy}</Text>
              <Text style={styles.statLabel}>Energy</Text>
            </View>
          </View>
        </BlurView>

        <View style={styles.dateStrip}>
          {weekDates.map((date, index) => {
            const completionCount = getDayCompletionCount(date);
            const selected = isSameDay(date, selectedDate);
            const today = isToday(date);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCircle,
                  selected && styles.dateCircleActive,
                  today && styles.dateCircleToday,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateDayLabel, selected && styles.dateTextActive]}>
                  {WEEK_DAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dateNumber, selected && styles.dateTextActive]}>
                  {date.getDate()}
                </Text>
                {completionCount > 0 && !selected && (
                  <View style={styles.completionDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <LoadingState message="Loading habits..." />
          ) : isError ? (
            <ErrorState message="Could not load your habits" onRetry={refetch} />
          ) : habits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>No habits yet!</Text>
              <Text style={styles.emptySubtext}>Tap + to create your first habit</Text>
            </View>
          ) : (
            SECTIONS.map(renderSection)
          )}
        </ScrollView>

        {floatingRewards.map(reward => (
          <FloatingReward key={reward.id} xp={reward.xp} energy={reward.energy} x={reward.x} y={reward.y} />
        ))}

        <ConfettiCannon
          count={50}
          origin={{ x: 200, y: 300 }}
          autoStart={false}
          ref={confettiRef}
          fadeOut
        />
      </LinearGradient>
    </ImageBackground>
  );
}

function FloatingReward({ xp, energy, x, y }: { xp: number; energy: number; x: number; y: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  return (
    <Animated.View
      style={[
        styles.floatingReward,
        {
          left: x,
          top: y,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.floatingText}>+{xp} 🏆</Text>
      <Text style={styles.floatingText}>+{energy} ⚡</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    maxHeight: 100,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#C9A7FF',
    letterSpacing: 0.5,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.2)',
    overflow: 'hidden',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(201, 167, 255, 0.6)',
    fontWeight: '600' as const,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(201, 167, 255, 0.2)',
  },
  dateStrip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dateCircle: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 167, 255, 0.3)',
    backgroundColor: 'rgba(201, 167, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dateCircleActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  dateCircleToday: {
    borderColor: '#FFD700',
  },
  dateDayLabel: {
    fontSize: 10,
    color: 'rgba(201, 167, 255, 0.6)',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#C9A7FF',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  completionDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  sectionContent: {
    gap: 12,
  },
  habitCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.2)',
    backgroundColor: 'rgba(30, 20, 60, 0.6)',
    padding: 16,
  },
  habitTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIconText: {
    fontSize: 24,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#C9A7FF',
    marginBottom: 4,
  },
  habitSubtext: {
    fontSize: 12,
    color: 'rgba(201, 167, 255, 0.6)',
  },
  habitRewards: {
    gap: 4,
  },
  rewardBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  rewardText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600' as const,
  },
  checkboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 167, 255, 0.4)',
  },
  checkboxButtonCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkboxButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  timerSection: {
    gap: 12,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  timerGoal: {
    fontSize: 14,
    color: 'rgba(201, 167, 255, 0.6)',
    fontWeight: '600' as const,
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  timerButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFD700',
  },
  timerButtonTextDisabled: {
    color: 'rgba(201, 167, 255, 0.4)',
  },
  completeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  counterSection: {
    gap: 12,
  },
  counterDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  counterValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  counterCompleteButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    alignItems: 'center',
  },
  counterCompleteButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  counterCompleteText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  completedBanner: {
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#C9A7FF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(201, 167, 255, 0.6)',
  },
  floatingReward: {
    position: 'absolute',
    zIndex: 1000,
  },
  floatingText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
