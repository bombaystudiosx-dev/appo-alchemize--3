import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Circle, Target, Trophy, Calendar as CalendarIcon } from 'lucide-react-native';
import { goalsDb, goalChecklistDb, goalCompletionsDb } from '@/lib/database';
import type { GoalChecklistItem, GoalCompletion } from '@/types';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newItemText, setNewItemText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const heatAnimation = useState(new Animated.Value(0))[0];

  const { data: goal } = useQuery({
    queryKey: ['goal', id],
    queryFn: () => goalsDb.getById(id!),
    enabled: !!id,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['goal-checklist', id],
    queryFn: () => goalChecklistDb.getByGoalId(id!),
    enabled: !!id,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['goal-completions', id],
    queryFn: () => goalCompletionsDb.getByGoalId(id!),
    enabled: !!id,
  });

  const addItemMutation = useMutation({
    mutationFn: (item: GoalChecklistItem) => goalChecklistDb.create(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checklist', id] });
      setNewItemText('');
    },
  });

  const toggleItemMutation = useMutation({
    mutationFn: (item: GoalChecklistItem) =>
      goalChecklistDb.update({ ...item, isDone: !item.isDone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checklist', id] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => goalChecklistDb.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checklist', id] });
    },
  });

  const markDayMutation = useMutation({
    mutationFn: async (date: number) => {
      const completion: GoalCompletion = {
        id: Date.now().toString(),
        goalId: id!,
        completionDate: date,
        notes: '',
        completedAt: Date.now(),
      };
      await goalCompletionsDb.create(completion);
      
      const today = new Date().setHours(0, 0, 0, 0);
      const yesterday = today - 86400000;
      const isToday = date === today;
      const isYesterday = date === yesterday;
      const lastCompleted = goal?.lastCompletedDate || 0;
      
      let newStreak = goal?.streak || 0;
      if (isToday || (isYesterday && lastCompleted < yesterday)) {
        newStreak = (goal?.streak || 0) + 1;
      } else if (!isToday && !isYesterday) {
        newStreak = 1;
      }
      
      const newBestStreak = Math.max(newStreak, goal?.bestStreak || 0);
      
      await goalsDb.update({
        ...goal!,
        streak: newStreak,
        bestStreak: newBestStreak,
        lastCompletedDate: date,
        updatedAt: Date.now(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-completions', id] });
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
    },
  });

  const unmarkDayMutation = useMutation({
    mutationFn: async (date: number) => {
      const completion = completions.find(c => {
        const completionDate = new Date(c.completionDate).setHours(0, 0, 0, 0);
        const targetDate = new Date(date).setHours(0, 0, 0, 0);
        return completionDate === targetDate;
      });
      if (completion) {
        await goalCompletionsDb.delete(completion.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-completions', id] });
    },
  });

  const handleAddItem = () => {
    if (!newItemText.trim()) return;

    const item: GoalChecklistItem = {
      id: Date.now().toString(),
      goalId: id!,
      text: newItemText.trim(),
      isDone: false,
    };

    addItemMutation.mutate(item);
  };

  const calendarData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const completedDates = new Set(
      completions.map(c => new Date(c.completionDate).setHours(0, 0, 0, 0))
    );
    
    return { firstDay, daysInMonth, completedDates };
  }, [selectedMonth, completions]);

  const heatLevel = useMemo(() => {
    const streak = goal?.streak || 0;
    if (streak >= 30) return 5;
    if (streak >= 20) return 4;
    if (streak >= 14) return 3;
    if (streak >= 7) return 2;
    if (streak >= 3) return 1;
    return 0;
  }, [goal?.streak]);

  const heatColor = useMemo(() => {
    const colors = ['#4b5563', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#7f1d1d'];
    return colors[heatLevel];
  }, [heatLevel]);

  const heatEmoji = useMemo(() => {
    const emojis = ['❄️', '🔥', '🔥🔥', '🔥🔥🔥', '💥🔥💥', '⚡💥🔥💥⚡'];
    return emojis[heatLevel];
  }, [heatLevel]);

  React.useEffect(() => {
    Animated.spring(heatAnimation, {
      toValue: heatLevel / 5,
      useNativeDriver: false,
      friction: 3,
    }).start();
  }, [heatLevel, heatAnimation]);

  const heatScale = heatAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const completionRate = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const doneCount = checklistItems.filter(item => item.isDone).length;
    return (doneCount / checklistItems.length) * 100;
  }, [checklistItems]);

  const handleDayPress = (day: number) => {
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).setHours(0, 0, 0, 0);
    const isCompleted = calendarData.completedDates.has(date);
    
    if (isCompleted) {
      unmarkDayMutation.mutate(date);
    } else {
      markDayMutation.mutate(date);
    }
  };

  const changeMonth = (direction: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{goal.title}</Text>
      {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
      {goal.targetDate && (
        <Text style={styles.dueDate}>Due: {new Date(goal.targetDate).toLocaleDateString()}</Text>
      )}

      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: heatColor + '20', borderColor: heatColor }]}>
          <Animated.View style={{ transform: [{ scale: heatScale }] }}>
            <Text style={styles.metricEmoji}>{heatEmoji}</Text>
          </Animated.View>
          <Text style={[styles.metricValue, { color: heatColor }]}>{goal.streak}</Text>
          <Text style={styles.metricLabel}>Day Streak</Text>
        </View>

        <View style={styles.metricCard}>
          <Trophy color="#fbbf24" size={32} />
          <Text style={styles.metricValue}>{goal.bestStreak}</Text>
          <Text style={styles.metricLabel}>Best Streak</Text>
        </View>

        <View style={styles.metricCard}>
          <Target color="#6366f1" size={32} />
          <Text style={styles.metricValue}>{Math.round(completionRate)}%</Text>
          <Text style={styles.metricLabel}>Progress</Text>
        </View>
      </View>

      <View style={styles.fuelBarContainer}>
        <View style={styles.fuelBarHeader}>
          <Text style={styles.fuelBarTitle}>Fuel Level</Text>
          <Text style={styles.fuelBarPercentage}>{Math.round(completionRate)}%</Text>
        </View>
        <View style={styles.fuelBarTrack}>
          <Animated.View 
            style={[
              styles.fuelBarFill, 
              { 
                width: `${completionRate}%`,
                backgroundColor: completionRate >= 75 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444',
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <CalendarIcon color="#fff" size={20} />
          <Text style={styles.calendarTitle}>Activity Calendar</Text>
        </View>
        
        <View style={styles.calendarNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.calendarMonth}>
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calendarNavButton}>
            <Text style={styles.calendarNavText}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: calendarData.firstDay }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.calendarDay} />
          ))}
          {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
            const day = i + 1;
            const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).setHours(0, 0, 0, 0);
            const isCompleted = calendarData.completedDates.has(date);
            const isToday = date === new Date().setHours(0, 0, 0, 0);
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.calendarDay,
                  isCompleted && styles.calendarDayCompleted,
                  isToday && styles.calendarDayToday,
                ]}
                onPress={() => handleDayPress(day)}
              >
                <Text style={[
                  styles.calendarDayText,
                  isCompleted && styles.calendarDayTextCompleted,
                  isToday && styles.calendarDayTextToday,
                ]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.checklistHeader}>
        <Text style={styles.checklistTitle}>Checklist</Text>
      </View>

      {checklistItems.map((item) => (
        <View key={item.id} style={styles.checklistItem}>
          <TouchableOpacity
            onPress={() => toggleItemMutation.mutate(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {item.isDone ? (
              <CheckCircle2 color="#10b981" size={22} fill="#10b981" />
            ) : (
              <Circle color="#666" size={22} />
            )}
          </TouchableOpacity>
          <Text style={[styles.checklistText, item.isDone && styles.checklistTextDone]}>
            {item.text}
          </Text>
          <TouchableOpacity
            onPress={() => deleteItemMutation.mutate(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 color="#ef4444" size={18} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.addItemInput}
          value={newItemText}
          onChangeText={setNewItemText}
          placeholder="Add checklist item..."
          placeholderTextColor="#666"
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#a0a0a0',
    lineHeight: 24,
    marginBottom: 12,
  },
  dueDate: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  metricEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  fuelBarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fuelBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fuelBarTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  fuelBarPercentage: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#6366f1',
  },
  fuelBarTrack: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fuelBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  calendarContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  calendarNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavText: {
    fontSize: 20,
    color: '#fff',
  },
  calendarMonth: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarDayCompleted: {
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  calendarDayTextCompleted: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  calendarDayTextToday: {
    color: '#6366f1',
    fontWeight: '700' as const,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  checklistTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  checklistText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  addItemContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  addItemButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
