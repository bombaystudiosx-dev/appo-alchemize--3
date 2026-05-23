import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { gratitudeDb } from '@/lib/database';
import { useTheme } from '@/contexts/theme-context';
import type { GratitudeEntry } from '@/types';

export default function AddGratitudeEntryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === 'cosmic-dark';
  const params = useLocalSearchParams();

  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');

  const selectedDate = params.date ? Number(params.date) : new Date().setHours(0, 0, 0, 0);

  const { data: existingEntry } = useQuery({
    queryKey: ['gratitude-entry', selectedDate],
    queryFn: () => gratitudeDb.getByDate(selectedDate),
  });

  const createMutation = useMutation({
    mutationFn: (entry: GratitudeEntry) => gratitudeDb.create(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitude-entries'] });
      router.back();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (entry: GratitudeEntry) => gratitudeDb.update(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gratitude-entries'] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!gratitude1.trim()) {
      Alert.alert('Error', 'Please enter at least one gratitude');
      return;
    }

    if (existingEntry) {
      updateMutation.mutate({
        ...existingEntry,
        gratitude1: gratitude1.trim(),
        gratitude2: gratitude2.trim() || null,
        gratitude3: gratitude3.trim() || null,
      });
    } else {
      createMutation.mutate({
        id: Date.now().toString(),
        entryDate: selectedDate,
        gratitude1: gratitude1.trim(),
        gratitude2: gratitude2.trim() || null,
        gratitude3: gratitude3.trim() || null,
        createdAt: Date.now(),
      });
    }
  };

  useEffect(() => {
    if (existingEntry) {
      setGratitude1(existingEntry.gratitude1);
      setGratitude2(existingEntry.gratitude2 || '');
      setGratitude3(existingEntry.gratitude3 || '');
    }
  }, [existingEntry]);

  const colors = isDark ? {
    bg: '#0a0a0a',
    card: '#1a1a1a',
    border: '#2a2a2a',
    text: '#fff',
    textSecondary: '#a0a0a0',
    input: '#1a1a1a',
    inputBorder: '#2a2a2a',
    placeholder: '#666',
    accent: '#FFD700',
  } : {
    bg: '#f8f9ff',
    card: '#ffffff',
    border: '#e0e7ff',
    text: '#1a1a2e',
    textSecondary: '#6b7280',
    input: '#ffffff',
    inputBorder: '#e0e7ff',
    placeholder: '#9ca3af',
    accent: '#FFD700',
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <View style={[styles.backButtonInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArrowLeft color={colors.accent} size={24} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
        <View style={[styles.dateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Gratitude Journal</Text>
          <Text style={[styles.date, { color: colors.text }]}>
            {new Date(selectedDate).toLocaleDateString('default', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
          <Text style={styles.goldHeart}>💛</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>What are you grateful for?</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>List three things you&apos;re thankful for today</Text>

        <View style={styles.entriesContainer}>
          <View style={styles.entryGroup}>
            <Text style={[styles.entryLabel, { color: colors.accent }]}>Entry 1</Text>
            <TextInput
              style={[
                styles.input, 
                styles.textArea,
                { 
                  backgroundColor: colors.input, 
                  borderColor: colors.inputBorder,
                  color: colors.text 
                }
              ]}
              value={gratitude1}
              onChangeText={setGratitude1}
              placeholder="I am grateful for..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.entryGroup}>
            <Text style={[styles.entryLabel, { color: colors.accent }]}>Entry 2</Text>
            <TextInput
              style={[
                styles.input, 
                styles.textArea,
                { 
                  backgroundColor: colors.input, 
                  borderColor: colors.inputBorder,
                  color: colors.text 
                }
              ]}
              value={gratitude2}
              onChangeText={setGratitude2}
              placeholder="I am grateful for..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.entryGroup}>
            <Text style={[styles.entryLabel, { color: colors.accent }]}>Entry 3</Text>
            <TextInput
              style={[
                styles.input, 
                styles.textArea,
                { 
                  backgroundColor: colors.input, 
                  borderColor: colors.inputBorder,
                  color: colors.text 
                }
              ]}
              value={gratitude3}
              onChangeText={setGratitude3}
              placeholder="I am grateful for..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Gratitude'}
          </Text>
        </TouchableOpacity>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 100,
  },
  dateCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  date: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  goldHeart: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  entriesContainer: {
    gap: 20,
    marginBottom: 24,
  },
  entryGroup: {
    gap: 8,
  },
  entryLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  saveButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
});
