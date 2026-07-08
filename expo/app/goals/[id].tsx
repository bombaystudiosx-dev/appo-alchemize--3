import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Circle, Target, Calendar as CalendarIcon, Edit3, ChevronUp, ChevronDown } from 'lucide-react-native';
import { goalsDb, goalChecklistDb, goalCompletionsDb } from '@/lib/db/goals';
import type { GoalChecklistItem, GoalCompletion } from '@/types';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newItemText, setNewItemText] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

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

  const updateItemTextMutation = useMutation({
    mutationFn: (item: GoalChecklistItem) =>
      goalChecklistDb.update(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checklist', id] });
      setEditingItemId(null);
      setEditingText('');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => goalChecklistDb.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-checklist', id] });
    },
  });

  const moveItemMutation = useMutation({
    mutationFn: async ({ itemId, direction }: { itemId: string; direction: 'up' | 'down' }) => {
      const items = [...checklistItems];
      const idx = items.findIndex(i => i.id === itemId);
      if (idx === -1) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= items.length) return;
      [items[idx], items[swapIdx]] = [items[swapIdx], items[idx]];
      for (const item of items) {
        await goalChecklistDb.update(item);
      }
    },
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

      await goalsDb.update({
        ...goal!,
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

  const startEditingItem = (item: GoalChecklistItem) => {
    setEditingItemId(item.id);
    setEditingText(item.text);
  };

  const saveEditingItem = (item: GoalChecklistItem) => {
    if (!editingText.trim() || editingText.trim() === item.text) {
      setEditingItemId(null);
      setEditingText('');
      return;
    }
    updateItemTextMutation.mutate({ ...item, text: editingText.trim() });
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    moveItemMutation.mutate({ itemId, direction });
  };

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

  const completionRate = useMemo(() => {
    if (checklistItems.length === 0) return 0;
    const doneCount = checklistItems.filter(item => item.isDone).length;
    return (doneCount / checklistItems.length) * 100;
  }, [checklistItems]);

  const totalLogs = useMemo(() => completions.length, [completions]);

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
      <View style={styles.titleRow}>
        <View style={styles.titleTextContainer}>
          <Text style={styles.title}>{goal.title}</Text>
          {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
          {goal.targetDate && (
            <Text style={styles.dueDate}>Due: {new Date(goal.targetDate).toLocaleDateString()}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/goals/add?id=${goal.id}` as any)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Edit3 color="#6366f1" size={20} />
        </TouchableOpacity>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>
          {goal.status === 'not_started' ? 'Not Started' : goal.status === 'in_progress' ? 'In Progress' : 'Completed'}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Target color="#6366f1" size={32} />
          <Text style={styles.metricValue}>{Math.round(completionRate)}%</Text>
          <Text style={styles.metricLabel}>Progress</Text>
        </View>

        <View style={styles.metricCard}>
          <CalendarIcon color="#10b981" size={32} />
          <Text style={styles.metricValue}>{totalLogs}</Text>
          <Text style={styles.metricLabel}>Days Logged</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Checklist Progress</Text>
          <Text style={styles.progressPercentage}>{Math.round(completionRate)}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
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

      {checklistItems.map((item, index) => (
        <View key={item.id} style={styles.checklistItem}>
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              onPress={() => handleMoveItem(item.id, 'up')}
              disabled={index === 0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronUp color={index === 0 ? '#333' : '#666'} size={14} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleMoveItem(item.id, 'down')}
              disabled={index === checklistItems.length - 1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronDown color={index === checklistItems.length - 1 ? '#333' : '#666'} size={14} />
            </TouchableOpacity>
          </View>
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
          {editingItemId === item.id ? (
            <TextInput
              style={styles.checklistEditInput}
              value={editingText}
              onChangeText={setEditingText}
              onSubmitEditing={() => saveEditingItem(item)}
              onBlur={() => saveEditingItem(item)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.checklistTextTouchable}
              onPress={() => startEditingItem(item)}
              onLongPress={() => startEditingItem(item)}
            >
              <Text style={[styles.checklistText, item.isDone && styles.checklistTextDone]}>
                {item.text}
              </Text>
            </TouchableOpacity>
          )}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#a0a0a0',
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
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
  progressContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#6366f1',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
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
  reorderButtons: {
    flexDirection: 'column',
    gap: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  checklistEditInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  checklistTextTouchable: {
    flex: 1,
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
