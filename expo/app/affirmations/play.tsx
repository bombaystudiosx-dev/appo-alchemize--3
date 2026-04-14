import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { affirmationsDb } from '@/lib/database';

const DEFAULT_TIMER = 5;

export default function AffirmationPlayScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_TIMER);

  const { data: affirmations = [] } = useQuery({
    queryKey: ['affirmations'],
    queryFn: () => affirmationsDb.getAll(),
  });

  useEffect(() => {
    if (affirmations.length === 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setCurrentIndex((idx) => (idx + 1) % affirmations.length);
          return DEFAULT_TIMER;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [affirmations.length]);

  if (affirmations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No affirmations to play</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentAffirmation = affirmations[currentIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <X color="#fff" size={28} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.category}>{currentAffirmation.category}</Text>
        <Text style={styles.affirmationText}>{currentAffirmation.text}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timerText}>{secondsLeft}s</Text>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {affirmations.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  closeButton: {
    marginTop: 60,
    marginLeft: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  category: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600' as const,
    marginBottom: 24,
  },
  affirmationText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
  },
  counterText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
