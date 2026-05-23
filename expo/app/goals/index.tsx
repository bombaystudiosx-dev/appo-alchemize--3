import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ImageBackground, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Circle, Flame, Target, TrendingUp } from 'lucide-react-native';
import { goalsDb, goalCompletionsDb } from '@/lib/database';
import type { Goal, GoalCompletion } from '@/types';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export default function GoalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'in_progress' | 'completed'>('in_progress');

  const { data: allGoals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalsDb.getAll(),
  });

  const { data: allCompletions = [] } = useQuery({
    queryKey: ['all-goal-completions'],
    queryFn: async () => {
      const completions: GoalCompletion[] = [];
      for (const goal of allGoals) {
        const goalCompletions = await goalCompletionsDb.getByGoalId(goal.id);
        completions.push(...goalCompletions);
      }
      return completions;
    },
    enabled: allGoals.length > 0,
  });

  const getGoalCompletions = (goalId: string) => {
    return allCompletions.filter(c => c.goalId === goalId);
  };

  const getThisMonthProgress = (goalId: string) => {
    const completions = getGoalCompletions(goalId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const daysThisMonth = completions.filter(c => c.completionDate >= startOfMonth).length;
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round((daysThisMonth / totalDaysInMonth) * 100);
  };

  const filteredGoals = allGoals.filter((g) => g.status === filter);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsDb.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      console.error('[Goals] Delete error:', error);
      Alert.alert('Error', 'Failed to delete goal. Please try again.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (goal: Goal) =>
      goalsDb.update({ ...goal, status: goal.status === 'completed' ? 'in_progress' : 'completed', updatedAt: Date.now() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const renderItem = ({ item }: { item: Goal }) => {
    const monthProgress = getThisMonthProgress(item.id);
    const completions = getGoalCompletions(item.id);
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/goals/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={() => toggleMutation.mutate(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {item.status === 'completed' ? (
              <CheckCircle2 color="#10b981" size={24} fill="#10b981" />
            ) : (
              <Circle color="#6366f1" size={24} />
            )}
          </TouchableOpacity>
          <View style={styles.cardTextContainer}>
            <Text style={[styles.cardTitle, item.status === 'completed' && styles.cardTitleCompleted]}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Flame size={14} color="#f59e0b" />
                <Text style={styles.statText}>{item.streak || 0} streak</Text>
              </View>
              <View style={styles.statItem}>
                <Target size={14} color="#6366f1" />
                <Text style={styles.statText}>{completions.length} logged</Text>
              </View>
              {item.targetDate && (
                <View style={styles.statItem}>
                  <TrendingUp size={14} color="#10b981" />
                  <Text style={styles.statText}>
                    {new Date(item.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${Math.min(monthProgress, 100)}%`,
                      backgroundColor: monthProgress >= 75 ? '#10b981' : monthProgress >= 50 ? '#f59e0b' : '#6366f1',
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{monthProgress}%</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => deleteMutation.mutate(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
      {isLoading ? (
        <LoadingState message="Loading goals..." />
      ) : isError ? (
        <ErrorState message="Could not load your goals" onRetry={refetch} />
      ) : (
      <>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'in_progress' && styles.filterButtonActive]}
          onPress={() => setFilter('in_progress')}
        >
          <Text style={[styles.filterText, filter === 'in_progress' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {filteredGoals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No {filter} goals</Text>
          <Text style={styles.emptySubtext}>Tap + to create a goal</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGoals}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/goals/add' as any)}
      >
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#a0a0a0',
  },
  filterTextActive: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  cardDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#6366f1',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: '500' as const,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fff',
    width: 36,
    textAlign: 'right',
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
