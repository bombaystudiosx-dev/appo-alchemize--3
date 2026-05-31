import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Zap, X, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { workoutTemplatesDb, workoutSessionsDb, normalizedMetricsDb } from '@/lib/db/fitness';
import { estimateCalories } from '@/lib/fitness';
import type { WorkoutSession, WorkoutTemplate } from '@/types';

const CalorieEstimateSchema = z.object({
  estimatedCalories: z.number().describe('Estimated calories burned during the workout'),
  confidence: z.enum(['low', 'medium', 'high']).describe('Confidence level of the estimate'),
  explanation: z.string().describe('Brief explanation of the estimate'),
});

const WORKOUT_TYPE_MAP: Record<string, WorkoutTemplate['category']> = {
  cardio: 'hiit',
  strength: 'strength',
  yoga: 'yoga',
  hiit: 'hiit',
  stretching: 'stretch',
  sports: 'run',
  other: 'stretch',
};

const WORKOUT_TYPE_INTENSITY: Record<string, WorkoutTemplate['intensity']> = {
  cardio: 'medium',
  strength: 'high',
  yoga: 'low',
  hiit: 'high',
  stretching: 'low',
  sports: 'medium',
  other: 'low',
};

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
    mutationFn: async () => {
      if (Platform.OS === 'web') return;

      const durationNum = parseInt(duration, 10);
      if (isNaN(durationNum) || durationNum <= 0) {
        throw new Error('Invalid duration');
      }

      const category = WORKOUT_TYPE_MAP[type];
      const intensity = WORKOUT_TYPE_INTENSITY[type];
      const calories = aiCalories ?? estimateCalories(durationNum, intensity);

      const templateId = `manual-${Date.now()}`;
      const template: WorkoutTemplate = {
        id: templateId,
        title: workoutDescription.trim() || `${type.charAt(0).toUpperCase() + type.slice(1)} Workout`,
        category,
        durationMinutes: durationNum,
        intensity,
        equipment: 'none',
        description: notes.trim() || `Manual ${type} workout`,
      };

      await workoutTemplatesDb.create(template);

      const now = Date.now();
      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        templateId,
        startedAt: now - durationNum * 60 * 1000,
        endedAt: now,
        durationMinutes: durationNum,
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
          activeMinutes: durationNum,
          caloriesActive: calories,
          steps: 0,
          source: 'workout',
          deviceType: 'none',
        });
      } else {
        await normalizedMetricsDb.create({
          id: `metric-${Date.now()}`,
          date: dateStr,
          activeMinutes: durationNum,
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
      queryClient.invalidateQueries({ queryKey: ['workoutTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['todayMetric'] });
      queryClient.invalidateQueries({ queryKey: ['fitnessAwards'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: (error) => {
      console.error('Workout save error:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
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
    if (!duration.trim() || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      Alert.alert('Error', 'Please enter a valid duration in minutes');
      return;
    }

    createMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Workout</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.scrollView} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    paddingBottom: 40,
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
