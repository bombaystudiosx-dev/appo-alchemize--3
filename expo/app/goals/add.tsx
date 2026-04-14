import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsDb } from '@/lib/database';
import type { Goal } from '@/types';

export default function AddGoalScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const createMutation = useMutation({
    mutationFn: (goal: Goal) => goalsDb.create(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      targetDate: dueDate ? new Date(dueDate).getTime() : null,
      status: 'not_started',
      progress: 0,
      streak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    createMutation.mutate(goal);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {createMutation.isPending ? 'Saving...' : 'Save Goal'}
          </Text>
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
