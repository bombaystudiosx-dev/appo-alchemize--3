import { invalidateGoals } from '../../services/queryInvalidationService';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsDb } from '@/lib/db/goals';
import type { Goal, GoalStatus } from '@/types';

export default function AddGoalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<GoalStatus>('in_progress');

  const { data: existingGoal } = useQuery({
    queryKey: ['goal', editId],
    queryFn: () => goalsDb.getById(editId!),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingGoal) {
      setTitle(existingGoal.title);
      setDescription(existingGoal.description);
      setStatus(existingGoal.status);
      if (existingGoal.targetDate) {
        const d = new Date(existingGoal.targetDate);
        setDueDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      }
    }
  }, [existingGoal]);

  const createMutation = useMutation({
    mutationFn: (goal: Goal) => goalsDb.create(goal),
    onSuccess: () => {
      void invalidateGoals(queryClient);
      router.back();
    },
    onError: (error) => {
      console.error('[Goals] Create error:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (goal: Goal) => goalsDb.update(goal),
    onSuccess: () => {
      void invalidateGoals(queryClient);
      router.back();
    },
    onError: (error) => {
      console.error('[Goals] Update error:', error);
      Alert.alert('Error', 'Failed to update goal. Please try again.');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    let targetDate: number | null = null;
    if (dueDate.trim()) {
      const parsed = new Date(dueDate.trim()).getTime();
      if (!Number.isNaN(parsed)) {
        targetDate = parsed;
      }
    }

    if (isEditing && existingGoal) {
      const updated: Goal = {
        ...existingGoal,
        title: title.trim(),
        description: description.trim(),
        targetDate,
        status,
        updatedAt: Date.now(),
      };
      updateMutation.mutate(updated);
    } else {
      const goal: Goal = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        targetDate,
        status,
        progress: 0,
        lastCompletedDate: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      createMutation.mutate(goal);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="My goal..."
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your goal..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Due Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {(['not_started', 'in_progress', 'completed'] as GoalStatus[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusChip, status === s && styles.statusChipActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusChipText, status === s && styles.statusChipTextActive]}>
                {s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Completed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEditing
                ? 'Update Goal'
                : 'Save Goal'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  statusChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  statusChipTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
