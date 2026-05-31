import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Play, ChevronLeft, Clock, Flame, Dumbbell } from 'lucide-react-native';
import { workoutTemplatesDb } from '@/lib/db/fitness';
import { seedWorkoutTemplates } from '@/lib/fitness';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  strength: <Dumbbell size={16} color="#6366f1" />,
  hiit: <Flame size={16} color="#f59e0b" />,
  yoga: <Clock size={16} color="#22c55e" />,
  core: <Dumbbell size={16} color="#ef4444" />,
  mobility: <Clock size={16} color="#3b82f6" />,
  walk: <Clock size={16} color="#10b981" />,
  run: <Flame size={16} color="#f97316" />,
  stretch: <Clock size={16} color="#8b5cf6" />,
};

export default function BrowseWorkoutsScreen() {
  const router = useRouter();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['workoutTemplates'],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      const data = await workoutTemplatesDb.getAll();
      if (data.length === 0) {
        await seedWorkoutTemplates();
        return await workoutTemplatesDb.getAll();
      }
      return data;
    },
  });

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Workouts</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {isLoading ? (
          <Text style={styles.loadingText}>Loading workouts...</Text>
        ) : templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No workouts available</Text>
            <Text style={styles.emptySubtitle}>Try logging a manual workout instead</Text>
          </View>
        ) : (
          categories.map((category) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                {CATEGORY_ICONS[category] || <Clock size={16} color="#888" />}
                <Text style={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              {templates
                .filter((t) => t.category === category)
                .map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.workoutCard}
                    onPress={() => router.push(`/fitness/workout?templateId=${template.id}` as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutTitle}>{template.title}</Text>
                      <View style={styles.workoutMeta}>
                        <Clock size={14} color="#888" />
                        <Text style={styles.workoutMetaText}>{template.durationMinutes} min</Text>
                        <View style={[styles.intensityBadge, { backgroundColor: getIntensityColor(template.intensity) }]}>
                          <Text style={styles.intensityText}>{template.intensity}</Text>
                        </View>
                      </View>
                      <Text style={styles.workoutDescription} numberOfLines={2}>
                        {template.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => router.push(`/fitness/workout?templateId=${template.id}` as any)}
                    >
                      <Play size={18} color="#fff" fill="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function getIntensityColor(intensity: string): string {
  switch (intensity) {
    case 'low': return 'rgba(34, 197, 94, 0.2)';
    case 'medium': return 'rgba(245, 158, 11, 0.2)';
    case 'high': return 'rgba(239, 68, 68, 0.2)';
    default: return 'rgba(99, 102, 241, 0.2)';
  }
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
    gap: 24,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
  },
  categorySection: {
    gap: 10,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    textTransform: 'capitalize' as const,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  workoutInfo: {
    flex: 1,
    gap: 6,
  },
  workoutTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutMetaText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500' as const,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  intensityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  workoutDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  startBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
