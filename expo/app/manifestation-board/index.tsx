import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  Alert,
  Animated,
  Switch,
  ImageBackground,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.3;
const MAX_MANIFESTATIONS = 25;

const MOOD_TAGS: { key: string; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'wealth', label: 'Wealth', emoji: '💰' },
  { key: 'love', label: 'Love', emoji: '💞' },
  { key: 'health', label: 'Health', emoji: '🌿' },
  { key: 'focus', label: 'Focus', emoji: '🎯' },
  { key: 'creativity', label: 'Creativity', emoji: '🎨' },
  { key: 'healing', label: 'Healing', emoji: '💫' },
];

const MOOD_EMOJI_MAP: Record<string, string> = {
  wealth: '💰',
  love: '💞',
  health: '🌿',
  focus: '🎯',
  creativity: '🎨',
  healing: '💫',
  career: '🎯',
  relationships: '💞',
  other: '✨',
};

export default function ManifestationBoardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [ritualEnabled, setRitualEnabled] = useState(false);
  const starAnims = useRef(
    Array.from({ length: 30 }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    starAnims.forEach((anim, _i) => {
      const duration = 2000 + Math.random() * 3000;
      const delay = Math.random() * 2000;
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [starAnims]);

  const { data: manifestations = [] } = useQuery({
    queryKey: ['manifestations'],
    queryFn: () => manifestationsDb.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => manifestationsDb.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifestations'] });
    },
  });

  const filteredManifestations = activeFilter === 'all'
    ? manifestations
    : manifestations.filter((m) => m.category === activeFilter);

  const handleAddManifestation = useCallback(() => {
    if (manifestations.length >= MAX_MANIFESTATIONS) {
      Alert.alert('Limit Reached', `You can add up to ${MAX_MANIFESTATIONS} manifestations.`);
      return;
    }
    router.push('/manifestation-board/add' as any);
    return;
  }, [manifestations.length, router]);

  const handleStartSlideshow = useCallback(() => {
    if (manifestations.length === 0) {
      Alert.alert('No Manifestations', 'Add some manifestations first to start the ritual.');
      return;
    }
    router.push('/manifestation-board/slideshow' as any);
  }, [manifestations.length, router]);

  const handleDeleteCard = useCallback((id: string, title: string) => {
    Alert.alert(
      'Delete Manifestation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id),
        },
      ]
    );
  }, [deleteMutation]);

  const handleRitualToggle = useCallback((value: boolean) => {
    setRitualEnabled(value);
    if (value && manifestations.length > 0) {
      handleStartSlideshow();
    }
  }, [manifestations.length, handleStartSlideshow]);

  const renderCard = useCallback((item: Manifestation) => {
    const moodEmoji = MOOD_EMOJI_MAP[item.category];

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.card}
        onPress={() => router.push(`/manifestation-board/${item.id}` as any)}
        onLongPress={() => handleDeleteCard(item.id, item.title)}
        activeOpacity={0.85}
        testID={`manifestation-card-${item.id}`}
      >
        {item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={['#4c1d95', '#6d28d9', '#7c3aed']}
            style={styles.cardImage}
          >
            <Text style={styles.noImageInitial}>
              {item.title.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}

        {moodEmoji && (
          <View style={styles.moodBadge}>
            <Text style={styles.moodEmoji}>{moodEmoji}</Text>
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.cardGradient}
        >
          <Text style={styles.cardTitle} numberOfLines={3}>
            {item.intention || item.title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [router, handleDeleteCard]);

  const renderStars = () => {
    const stars: React.ReactNode[] = [];
    for (let i = 0; i < 30; i++) {
      const size = 1 + Math.random() * 2;
      stars.push(
        <Animated.View
          key={`star-${i}`}
          style={[
            styles.star,
            {
              width: size,
              height: size,
              top: `${Math.random() * 100}%` as any,
              left: `${Math.random() * 100}%` as any,
              opacity: starAnims[i],
            },
          ]}
        />
      );
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Portal Board',
          headerStyle: { backgroundColor: '#0c0520' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
          headerTitleStyle: { color: '#ffffff' },
        }}
      />

      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/hmtn1lxo3phq29a4dqeyk' }}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.backgroundOverlay} />
        {renderStars()}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Portal Board</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddManifestation}
                testID="add-manifestation-button"
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7c3aed', '#6d28d9']}
                  style={styles.addButtonGradient}
                >
                  <Plus color="#ffffff" size={24} strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ritualCard}>
            <View style={styles.ritualCardInner}>
              <View style={styles.ritualTextContainer}>
                <View style={styles.ritualTitleRow}>
                  <Text style={styles.ritualIcon}>☀️</Text>
                  <Text style={styles.ritualTitle}>Morning Portal Ritual</Text>
                </View>
                <Text style={styles.ritualSubtitle}>
                  Pause during each photo and envision and truly feel what it would be like to already have this
                </Text>
              </View>
              <Switch
                value={ritualEnabled}
                onValueChange={handleRitualToggle}
                trackColor={{ false: '#3b3154', true: '#7c3aed' }}
                thumbColor="#ffffff"
                style={styles.ritualSwitch}
              />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterRowContent}
          >
            {MOOD_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.key}
                style={[
                  styles.filterPill,
                  activeFilter === tag.key && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter(tag.key)}
                activeOpacity={0.7}
                testID={`filter-${tag.key}`}
              >
                <Text style={styles.filterEmoji}>{tag.emoji}</Text>
                <Text
                  style={[
                    styles.filterLabel,
                    activeFilter === tag.key && styles.filterLabelActive,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredManifestations.length === 0 ? (
            <View style={styles.emptyState}>
              <Sparkles color="#7c3aed" size={48} />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'all'
                  ? 'Your Portal Awaits'
                  : `No ${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} manifestations yet`}
              </Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to add your first vision
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleAddManifestation}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#7c3aed', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyAddButtonGradient}
                >
                  <Plus color="#ffffff" size={18} />
                  <Text style={styles.emptyAddText}>Create Portal</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.grid}>
              {filteredManifestations.map((item) => renderCard(item))}
            </View>
          )}
        </ScrollView>

        {manifestations.length > 0 && (
          <TouchableOpacity
            style={styles.playFab}
            onPress={handleStartSlideshow}
            activeOpacity={0.8}
            testID="slideshow-button"
          >
            <LinearGradient
              colors={['#7c3aed', '#6d28d9']}
              style={styles.playFabGradient}
            >
              <Play color="#ffffff" size={18} fill="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0520',
  },
  background: {
    flex: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 3, 22, 0.55)',
  },
  star: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Math.round(SCREEN_HEIGHT * 0.12),
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  addButton: {
    position: 'absolute',
    right: 0,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ritualCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ritualCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ritualTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  ritualTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ritualIcon: {
    fontSize: 16,
  },
  ritualTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  ritualSubtitle: {
    fontSize: 12,
    color: 'rgba(200, 190, 220, 0.8)',
    lineHeight: 17,
  },
  ritualSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  filterRow: {
    marginBottom: 20,
    maxHeight: 46,
  },
  filterRowContent: {
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.5)',
    borderColor: 'rgba(124, 58, 237, 0.7)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(200, 190, 220, 0.7)',
  },
  filterLabelActive: {
    color: '#ffffff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageInitial: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  moodBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 14,
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 40,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(200, 190, 220, 0.7)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAddButton: {
    marginTop: 28,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyAddButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyAddText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  playFab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  playFabGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
