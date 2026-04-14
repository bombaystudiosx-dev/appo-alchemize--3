import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { workoutsDb } from '@/lib/database';
import type { Workout } from '@/types';

const CalorieEstimateSchema = z.object({
  estimatedCalories: z.number().describe('Estimated calories burned during the workout'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence level of the estimate'),
  explanation: z.string().describe('Brief explanation of the estimate'),
});

export default function AddWorkoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState<'cardio' | 'strength' | 'yoga' | 'hiit' | 'stretching' | 'sports' | 'other'>('cardio');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [aiCalories, setAiCalories] = useState<number | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<'low' | 'medium' | 'high' | null>(null);

  const createMutation = useMutation({
    mutationFn: (workout: Workout) => workoutsDb.create(workout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const estimateCaloriesMutation = useMutation({
    mutationFn: async () => {
      if (!workoutDescription.trim() || !duration) return null;
      
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: `Estimate calories burned for this workout:

Workout Type: ${type}
Duration: ${duration} minutes
Description: ${workoutDescription}

Provide an estimated calorie burn based on this information. Consider typical metabolic rates and exercise intensity. If the description mentions specific exercises, use those to refine the estimate.`,
          },
        ],
        schema: CalorieEstimateSchema,
      });
      return result;
    },
    onSuccess: (data) => {
      if (data) {
        setAiCalories(data.estimatedCalories);
        setAiExplanation(data.explanation);
        setAiConfidence(data.confidence);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      console.error('AI estimation error:', error);
      Alert.alert('Estimation Failed', 'Could not estimate calories. Please try again or enter manually.');
    },
  });

  const handleSave = () => {
    
    if (!duration.trim() || isNaN(parseInt(duration))) {
      Alert.alert('Error', 'Please enter valid duration');
      return;
    }

    const workout: Workout = {
      id: Date.now().toString(),
      type,
      durationMinutes: parseInt(duration),
      caloriesBurned: aiCalories,
      notes: workoutDescription.trim() || notes.trim(),
      date: Date.now(),
      createdAt: Date.now(),
    };

    createMutation.mutate(workout);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Workout Type</Text>
        <View style={styles.typeContainer}>
          {(['cardio', 'strength', 'yoga', 'hiit', 'stretching', 'sports', 'other'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          placeholder="30"
          placeholderTextColor="#666"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Workout Description</Text>
        <Text style={styles.sublabel}>Describe your workout for AI calorie estimation</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={workoutDescription}
          onChangeText={(text) => {
            setWorkoutDescription(text);
            setAiCalories(null);
            setAiExplanation(null);
            setAiConfidence(null);
          }}
          placeholder="e.g. 'Running on treadmill at 6mph with 2% incline' or '3 sets of 10 squats, deadlifts, and bench press'"
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {workoutDescription.trim() && duration && (
          <TouchableOpacity
            style={styles.estimateButton}
            onPress={() => estimateCaloriesMutation.mutate()}
            disabled={estimateCaloriesMutation.isPending}
          >
            {estimateCaloriesMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Sparkles size={18} color="#fff" />
                <Text style={styles.estimateButtonText}>Get AI Calorie Estimate</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {aiCalories !== null && (
          <View style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <Zap size={18} color="#f59e0b" />
              <Text style={styles.aiResultTitle}>AI Estimated Calories</Text>
              <View style={[
                styles.confidenceBadge,
                aiConfidence === 'high' ? styles.confidenceHigh :
                aiConfidence === 'medium' ? styles.confidenceMedium : styles.confidenceLow
              ]}>
                <Text style={styles.confidenceText}>{aiConfidence}</Text>
              </View>
            </View>
            <Text style={styles.aiCaloriesValue}>{aiCalories} cal</Text>
            {aiExplanation && (
              <Text style={styles.aiExplanation}>{aiExplanation}</Text>
            )}
            <TouchableOpacity
              style={styles.clearEstimateBtn}
              onPress={() => {
                setAiCalories(null);
                setAiExplanation(null);
                setAiConfidence(null);
              }}
            >
              <Text style={styles.clearEstimateText}>Clear & Enter Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Additional Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.smallTextArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any other details..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {createMutation.isPending ? 'Saving...' : 'Log Workout'}
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
    minHeight: 100,
    paddingTop: 16,
  },
  smallTextArea: {
    minHeight: 60,
    paddingTop: 12,
  },
  sublabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    marginTop: -4,
  },
  estimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  estimateButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  aiResultCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  aiResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  aiResultTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f59e0b',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceHigh: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  confidenceMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  confidenceLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
    textTransform: 'capitalize',
  },
  aiCaloriesValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiExplanation: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  clearEstimateBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  clearEstimateText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
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
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
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
    fontSize: 13,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  typeTextActive: {
    color: '#fff',
  },
});
