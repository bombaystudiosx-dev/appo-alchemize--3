import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksDb, goalsDb, mealsDb, transactionsDb, gratitudeDb } from '@/lib/database';
import type { Task, Goal, Meal, Transaction, GratitudeEntry } from '@/types';

const QUICK_ADD_OPTIONS = ['Task', 'Goal', 'Meal', 'Transaction', 'Gratitude'] as const;

export default function QuickAddScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<typeof QUICK_ADD_OPTIONS[number]>('Task');
  const [input, setInput] = useState('');

  const createTaskMutation = useMutation({
    mutationFn: (task: Task) => tasksDb.create(task),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: (goal: Goal) => goalsDb.create(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      router.back();
    },
  });

  const createMealMutation = useMutation({
    mutationFn: (meal: Meal) => mealsDb.create(meal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      router.back();
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: (transaction: Transaction) => transactionsDb.create(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      router.back();
    },
  });

  const createGratitudeMutation = useMutation({
    mutationFn: (entry: GratitudeEntry) => gratitudeDb.create(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitude-entries'] });
      router.back();
    },
  });

  const handleQuickAdd = () => {
    if (!input.trim()) {
      Alert.alert('Error', 'Please enter something');
      return;
    }

    switch (selectedType) {
      case 'Task':
        createTaskMutation.mutate({
          id: Date.now().toString(),
          title: input.trim(),
          notes: '',
          dueDate: null,
          dueTime: null,
          isDone: false,
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          completedDate: null,
          reminderEnabled: false,
          reminderTime: null,
          notificationId: null,
          priority: null,
        });
        break;
      case 'Goal':
        createGoalMutation.mutate({
          id: Date.now().toString(),
          title: input.trim(),
          description: '',
          targetDate: null,
          status: 'not_started',
          progress: 0,
          streak: 0,
          bestStreak: 0,
          lastCompletedDate: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        break;
      case 'Meal':
        createMealMutation.mutate({
          id: Date.now().toString(),
          date: Date.now(),
          name: input.trim(),
          calories: 0,
          protein: null,
          carbs: null,
          fat: null,
          notes: '',
        });
        break;
      case 'Transaction':
        createTransactionMutation.mutate({
          id: Date.now().toString(),
          date: Date.now(),
          amount: 0,
          category: input.trim(),
          note: '',
          dayOfWeek: null,
          time: null,
          reminderEnabled: false,
          reminderTime: null,
          isRecurring: false,
        });
        break;
      case 'Gratitude':
        createGratitudeMutation.mutate({
          id: Date.now().toString(),
          entryDate: new Date().setHours(0, 0, 0, 0),
          gratitude1: input.trim(),
          gratitude2: null,
          gratitude3: null,
          createdAt: Date.now(),
        });
        break;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Quick Add</Text>

        <View style={styles.typeContainer}>
          {QUICK_ADD_OPTIONS.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, selectedType === type && styles.typeChipActive]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.typeText, selectedType === type && styles.typeTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={input}
          onChangeText={setInput}
          placeholder={`Enter ${selectedType.toLowerCase()}...`}
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity style={styles.addButton} onPress={handleQuickAdd}>
          <Text style={styles.addButtonText}>Add {selectedType}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 24,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  typeChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeText: {
    fontSize: 14,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  typeTextActive: {
    color: '#fff',
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
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
