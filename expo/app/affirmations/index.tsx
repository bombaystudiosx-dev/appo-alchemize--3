import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Heart, Play, Edit } from 'lucide-react-native';
import { affirmationsDb } from '@/lib/database';
import type { Affirmation, AffirmationCategory } from '@/types';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

const categoryEmojis: Record<AffirmationCategory, string> = {
  'self-love': '💖',
  'abundance': '💰',
  'health': '❤️‍🔥',
  'success': '🏆',
  'relationships': '🤝',
  'gratitude': '🙏',
};

const categories: { key: AffirmationCategory | 'all' | 'favorites'; label: string; emoji?: string }[] = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'favorites', label: 'Favorites', emoji: '⭐' },
  { key: 'self-love', label: 'Self-Love', emoji: '💖' },
  { key: 'abundance', label: 'Abundance', emoji: '💰' },
  { key: 'health', label: 'Health', emoji: '❤️‍🔥' },
  { key: 'success', label: 'Success', emoji: '🏆' },
  { key: 'relationships', label: 'Relationships', emoji: '🤝' },
  { key: 'gratitude', label: 'Gratitude', emoji: '🙏' },
];

export default function AffirmationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<AffirmationCategory | 'all' | 'favorites'>('all');

  const { data: allAffirmations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['affirmations'],
    queryFn: () => affirmationsDb.getAll(),
  });

  const affirmations = useMemo(() => {
    if (selectedCategory === 'all') return allAffirmations;
    if (selectedCategory === 'favorites') return allAffirmations.filter(a => a.isFavorite);
    return allAffirmations.filter(a => a.category === selectedCategory);
  }, [allAffirmations, selectedCategory]);

  const todayAffirmation = useMemo(() => {
    if (allAffirmations.length === 0) return null;
    const today = new Date().toDateString();
    const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return allAffirmations[seed % allAffirmations.length];
  }, [allAffirmations]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => affirmationsDb.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['affirmations'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (affirmation: Affirmation) =>
      affirmationsDb.update({ ...affirmation, isFavorite: !affirmation.isFavorite }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['affirmations'] });
    },
  });

  const renderItem = ({ item }: { item: Affirmation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.categoryEmoji}>{categoryEmojis[item.category]}</Text>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardText}>{item.text}</Text>
          <Text style={styles.cardCategory}>{item.category}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => toggleFavoriteMutation.mutate(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
          >
            <Heart
              color="#fbbf24"
              size={20}
              fill={item.isFavorite ? '#fbbf24' : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/affirmations/${item.id}` as any)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
          >
            <Edit color="#6366f1" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteMutation.mutate(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.actionButton}
          >
            <Trash2 color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
      
      {isLoading ? (
        <LoadingState message="Loading affirmations..." />
      ) : isError ? (
        <ErrorState message="Could not load affirmations" onRetry={refetch} />
      ) : (
      <>
      {todayAffirmation && (
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>✨ Today&apos;s Affirmation</Text>
          <Text style={styles.todayText}>&ldquo;{todayAffirmation.text}&rdquo;</Text>
          <Text style={styles.todayCategory}>{categoryEmojis[todayAffirmation.category]} {todayAffirmation.category}</Text>
        </View>
      )}

      {allAffirmations.length > 0 && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push('/affirmations/play' as any)}
        >
          <Play color="#fff" size={20} fill="#fff" />
          <Text style={styles.playButtonText}>Start Affirmation Session</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
        style={styles.categoryScrollView}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              selectedCategory === cat.key && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat.key && styles.categoryChipTextActive,
              ]}
            >
              {cat.emoji} {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {affirmations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {selectedCategory === 'all' ? 'No affirmations yet' : `No ${selectedCategory} affirmations`}
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedCategory === 'all' ? 'Tap + to add an affirmation' : 'Try a different category'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={affirmations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/affirmations/add' as any)}>
        <Plus color="#fff" size={28} />
      </TouchableOpacity>
      </>
      )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  todayCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  todayLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#c084fc',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  todayText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center' as const,
    lineHeight: 26,
    marginBottom: 12,
  },
  todayCategory: {
    fontSize: 13,
    color: '#e9d5ff',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  categoryEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    color: '#6366f1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  categoryScrollView: {
    maxHeight: 50,
    marginTop: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
