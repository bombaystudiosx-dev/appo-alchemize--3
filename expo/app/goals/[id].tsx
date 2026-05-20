import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react-native';
import { goalsDb, goalChecklistDb } from '@/lib/database';
import type { GoalChecklistItem } from '@/types';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [newItemText, setNewItemText] = useState('');
  const [progress, setProgress] = useState(0);

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

  React.useEffect(() => {
    if (goal) {
      setProgress(goal.progress ?? 0);
    }
  }, [goal]);

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

  const updateProgressMutation = useMutation({
    mutationFn: (newProgress: number) =>
      goalsDb.update({ ...goal!, progress: newProgress, updatedAt: Date.now() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal', id] });
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

  const handleProgressChange = (delta: number) => {
    const newProgress = Math.min(100, Math.max(0, progress + delta));
    setProgress(newProgress);
    updateProgressMutation.mutate(newProgress);
  };

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{goal.title}</Text>
      {goal.description ? <Text style={styles.description}>{goal.description}</Text> : null}
      {goal.targetDate && (
        <Text style={styles.dueDate}>Due: {new Date(goal.targetDate).toLocaleDateString()}</Text>
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Progress</Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: progress >= 75 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#6366f1',
              },
            ]}
          />
        </View>
        <View style={styles.progressButtons}>
          <TouchableOpacity style={styles.progressBtn} onPress={() => handleProgressChange(-10)}>
            <Text style={styles.progressBtnText}>−10</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.progressBtn} onPress={() => handleProgressChange(-5)}>
            <Text style={styles.progressBtnText}>−5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.progressBtn} onPress={() => handleProgressChange(5)}>
            <Text style={styles.progressBtnText}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.progressBtn} onPress={() => handleProgressChange(10)}>
            <Text style={styles.progressBtnText}>+10</Text>
          </TouchableOpacity>
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
    </KeyboardAvoidingView>
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
  progressTrack: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  progressBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  progressBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
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
