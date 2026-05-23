import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { affirmationsDb } from '@/lib/database';
import type { Affirmation } from '@/types';

export default function EditAffirmationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [text, setText] = useState('');
  const [category, setCategory] = useState<'self-love' | 'abundance' | 'health' | 'success' | 'relationships' | 'gratitude'>('self-love');

  const { data: affirmation, isLoading } = useQuery({
    queryKey: ['affirmations', id],
    queryFn: async () => {
      const allAffirmations = await affirmationsDb.getAll();
      return allAffirmations.find(a => a.id === id);
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (affirmation) {
      setText(affirmation.text);
      setCategory(affirmation.category);
    }
  }, [affirmation]);

  const updateMutation = useMutation({
    mutationFn: (updatedAffirmation: Affirmation) => affirmationsDb.update(updatedAffirmation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affirmations'] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter an affirmation');
      return;
    }

    if (!affirmation) return;

    const updatedAffirmation: Affirmation = {
      ...affirmation,
      text: text.trim(),
      category,
    };

    updateMutation.mutate(updatedAffirmation);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!affirmation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Affirmation not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Affirmation</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={text}
          onChangeText={setText}
          placeholder="I am confident and capable..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {(['self-love', 'abundance', 'health', 'success', 'relationships', 'gratitude'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryText: {
    fontSize: 13,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  categoryTextActive: {
    color: '#fff',
  },
});
