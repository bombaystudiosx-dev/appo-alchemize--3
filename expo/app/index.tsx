import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Text, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ASSETS } from '@/constants/assets';
import { OPTIMIZED_IMAGE_URLS } from '@/constants/image-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/theme-context';
import PWAInstallPrompt from './pwa-install-prompt';

const FEATURES_VISIBILITY_KEY = '@alchemize_features_visibility';



const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = 20 as const;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_HORIZONTAL_PADDING * 2);
const CARD_HEIGHT = CARD_WIDTH + 100;
const HOME_CARD_TOP_OFFSET = Math.max(
  56,
  Math.min(Math.round(SCREEN_HEIGHT * 0.22), SCREEN_HEIGHT - CARD_HEIGHT - 120)
);
const ORBITAL_CARD_TOP_OFFSET = Math.max(
  96,
  Math.min(Math.round(SCREEN_HEIGHT * 0.22), SCREEN_HEIGHT - 390)
);

interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  route: string;
}

interface FeatureVisibility {
  [key: string]: boolean;
}

const ALL_FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'manifestation-board',
    title: 'Manifestation Board',
    subtitle: 'Visualize and feel your desires until they become real.',
    image: ASSETS.cardManifestationBoard,
    route: '/manifestation-board',
  },
  {
    id: 'affirmations',
    title: 'Affirmations',
    subtitle: 'Reprogram your subconscious mind with powerful affirmations.',
    image: OPTIMIZED_IMAGE_URLS.affirmationsCard,
    route: '/affirmations',
  },
  {
    id: 'goals',
    title: 'Set Goals',
    subtitle: 'Turn intention into measurable progress.',
    image: OPTIMIZED_IMAGE_URLS.goalsCard,
    route: '/goals',
  },
  {
    id: 'habits',
    title: 'Habit Tracker',
    subtitle: 'Build consistency and condition yourself for greatness.',
    image: OPTIMIZED_IMAGE_URLS.habitsCard,
    route: '/habits',
  },
  {
    id: 'financial',
    title: 'Financial Tracker',
    subtitle: 'Gain clarity over money, habits, and priorities.',
    image: OPTIMIZED_IMAGE_URLS.financialCard,
    route: '/financial',
  },
  {
    id: 'calorie',
    title: 'Calorie Tracker',
    subtitle: 'Understand what fuels your body.',
    image: OPTIMIZED_IMAGE_URLS.calorieCard,
    route: '/calorie',
  },
  {
    id: 'todos',
    title: 'To-Do List',
    subtitle: 'Shape your day, one focused action at a time.',
    image: OPTIMIZED_IMAGE_URLS.todosCard,
    route: '/todos',
  },
  {
    id: 'gratitude',
    title: 'Gratitude Journal',
    subtitle: 'Gratitude is the ability to experience life as a gift.',
    image: OPTIMIZED_IMAGE_URLS.gratitudeCard,
    route: '/gratitude',
  },
  {
    id: 'fitness',
    title: 'Fitness',
    subtitle: 'Track movement, energy, and physical transformation.',
    image: OPTIMIZED_IMAGE_URLS.fitnessCard,
    route: '/fitness',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    subtitle: 'Organize your time with intention and clarity.',
    image: OPTIMIZED_IMAGE_URLS.appointmentsCard,
    route: '/appointments',
  },
];



export default function HomeScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const screenWidth = Dimensions.get('window').width;

  const goToPage = useCallback((page: number) => {
    scrollViewRef.current?.scrollTo({ x: page * screenWidth, animated: true });
    setCurrentPage(page);
  }, [screenWidth]);

  const _goToPrevCard = useCallback(() => {
    if (currentPage > 0) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const _goToNextCard = useCallback((total: number) => {
    if (currentPage < total - 1) goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>(ALL_FEATURE_CARDS);
  const { theme } = useTheme();


  const loadFeatureVisibility = async () => {
    try {
      const stored = await AsyncStorage.getItem(FEATURES_VISIBILITY_KEY);
      if (stored && typeof stored === 'string' && stored.startsWith('{')) {
        try {
          const visibility = JSON.parse(stored) as FeatureVisibility;
          console.log('[Home] Feature visibility loaded:', visibility);
          const visibleCards = ALL_FEATURE_CARDS.filter(
            card => visibility[card.id] !== false
          );
          setFeatureCards(visibleCards);
        } catch (parseError) {
          console.warn('[Home] Invalid feature visibility data:', parseError);
          await AsyncStorage.removeItem(FEATURES_VISIBILITY_KEY);
          setFeatureCards(ALL_FEATURE_CARDS);
        }
      } else {
        setFeatureCards(ALL_FEATURE_CARDS);
      }
    } catch (error) {
      console.error('[Home] Error loading feature visibility:', error);
      setFeatureCards(ALL_FEATURE_CARDS);
    }
  };



  useEffect(() => {
    void loadFeatureVisibility();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadFeatureVisibility();
    }, [])
  );

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleCardPress = (route: string) => {
    router.push(route as any);
  };



  if (theme === 'cosmic') {
    return <OrbitalHomeScreen 
      featureCards={featureCards} 
      onCardPress={handleCardPress} 
      router={router} 
    />;
  }

  return (
    <View style={styles.container}>
      <Image 
        source={OPTIMIZED_IMAGE_URLS.homeBackground} 
        style={styles.background} 
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {featureCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardContainer}
              onPress={() => handleCardPress(card.route)}
              activeOpacity={0.9}
            >
              <View style={styles.card}>
                {card.id === 'affirmations' ? (
                  <>
                    <Image 
                      source={OPTIMIZED_IMAGE_URLS.homeBackground}
                      style={styles.cardImageFull} 
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={0}
                    />
                    <Image 
                      source={card.image} 
                      style={styles.cardImageFull} 
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={0}
                    />
                  </>
                ) : (
                  <Image 
                    source={card.image} 
                    style={styles.cardImageFull} 
                    contentFit="cover"
                    contentPosition={card.id === 'habits' ? 'top' : 'center'}
                    cachePolicy="memory-disk"
                    priority="high"
                    transition={0}
                  />
                )}
                <LinearGradient
                  colors={card.id === 'affirmations' ? ['transparent', 'transparent', 'rgba(0,0,0,0.75)'] : ['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                  locations={[0, 0.5, 1]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardTextContainer}>
                      <Text style={styles.cardTitle}>{card.title}</Text>
                      <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.navRow}>
            <View style={styles.dotsContainer}>
              {featureCards.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToPage(index)}
                  style={[
                    styles.dot,
                    currentPage === index && styles.dotActive,
                  ]}
                  activeOpacity={0.7}
                />
              ))}
            </View>
          </View>
          <Text style={styles.pageCounter}>
            {currentPage + 1} of {featureCards.length}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.8}
      >
        <Settings color="#fff" size={24} />
      </TouchableOpacity>

      <PWAInstallPrompt />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  time: {
    fontSize: 44,
    fontFamily: 'Pacifico',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 52,
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700' as const,
    fontFamily: 'Akronim',
    color: '#fcd34d',
    letterSpacing: 2,
    textShadowColor: 'rgba(252, 211, 77, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  username: {
    fontSize: 26,
    fontWeight: '600' as const,
    fontFamily: 'Akronim',
    color: '#c4b5fd',
    letterSpacing: 1,
    textShadowColor: 'rgba(196, 181, 253, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Pacifico',
    color: '#f5d3ff',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 20,
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: HOME_CARD_TOP_OFFSET,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardImageFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 24,
    paddingBottom: 28,
    paddingTop: 16,
  },
  cardTextContainer: {
    position: 'relative',
    paddingVertical: 8,
    paddingTop: 12,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
    marginTop: 2,
    lineHeight: 38,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  navArrowDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  pageCounter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(20,20,30,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});

interface OrbitalHomeScreenProps {
  featureCards: FeatureCard[];
  onCardPress: (route: string) => void;
  router: any;
}

function OrbitalHomeScreen({ featureCards, onCardPress, router }: OrbitalHomeScreenProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const goToOrbitalPage = useCallback((page: number) => {
    const sw = Dimensions.get('window').width;
    scrollViewRef.current?.scrollTo({ x: page * sw, animated: true });
    setSelectedIndex(page);
  }, []);

  const goToPrevOrbital = useCallback(() => {
    if (selectedIndex > 0) goToOrbitalPage(selectedIndex - 1);
  }, [selectedIndex, goToOrbitalPage]);

  const goToNextOrbital = useCallback((total: number) => {
    if (selectedIndex < total - 1) goToOrbitalPage(selectedIndex + 1);
  }, [selectedIndex, goToOrbitalPage]);
  const scrollX = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const floatAnims = useRef(
    featureCards.map(() => new Animated.Value(0))
  ).current;
  const sparkleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const SCREEN_WIDTH = Dimensions.get('window').width;

  useEffect(() => {
    const animations = floatAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + (index * 400),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + (index * 400),
            useNativeDriver: true,
          }),
        ])
      );
    });

    const sparkleAnimations = sparkleAnims.map((sparkle, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.rotate, {
              toValue: 1,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    animations.forEach(animation => animation.start());
    sparkleAnimations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
      sparkleAnimations.forEach(animation => animation.stop());
    };
  }, [floatAnims, sparkleAnims]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let subscription: { remove: () => void } | null = null;
    DeviceMotion.isAvailableAsync().then((available: boolean) => {
      if (!available) return;
      DeviceMotion.setUpdateInterval(80);
      subscription = DeviceMotion.addListener((data: DeviceMotionMeasurement) => {
        if (!data.rotation) return;
        const gamma = data.rotation.gamma ?? 0;
        const beta = data.rotation.beta ?? 0;
        const maxTilt = Math.PI / 5;
        const range = 18;
        const x = (Math.max(-maxTilt, Math.min(maxTilt, gamma)) / maxTilt) * range;
        const y = (Math.max(-maxTilt, Math.min(maxTilt, beta - 0.3)) / maxTilt) * range;
        Animated.spring(tiltX, { toValue: x, useNativeDriver: true, damping: 25, stiffness: 120, mass: 0.6 }).start();
        Animated.spring(tiltY, { toValue: y, useNativeDriver: true, damping: 25, stiffness: 120, mass: 0.6 }).start();
      });
    }).catch(() => {});
    return () => { if (subscription) subscription.remove(); };
  }, [tiltX, tiltY]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        setSelectedIndex(index);
      },
    }
  );

  return (
    <View style={orbitalStyles.container}>
      <Animated.View
        style={[
          orbitalStyles.parallaxContainer,
          { transform: [{ translateX: tiltX }, { translateY: tiltY }] },
        ]}
      >
        <Image 
          source={OPTIMIZED_IMAGE_URLS.cosmicBackground}
          style={orbitalStyles.parallaxBackground} 
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
      </Animated.View>
      <View style={orbitalStyles.overlay} />
      <View style={orbitalStyles.carouselContainer}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={orbitalStyles.scrollView}
          contentContainerStyle={orbitalStyles.scrollContent}
        >
          {featureCards.map((card, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });

            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [60, 0, 60],
              extrapolate: 'clamp',
            });

            const floatY = floatAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -15],
            });

            return (
              <View key={card.id} style={orbitalStyles.planetContainer}>
                <Animated.View
                  style={[
                    orbitalStyles.planetWrapper,
                    {
                      transform: [{ scale }, { translateY }, { translateY: floatY }],
                      opacity,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={orbitalStyles.planet}
                    onPress={() => onCardPress(card.route)}
                    activeOpacity={0.9}
                  >
                    <View style={orbitalStyles.planetInner}>
                      <Image 
                        source={card.image} 
                        style={orbitalStyles.planetImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={0}
                      />
                      <View style={orbitalStyles.planetOverlay} />
                    </View>
                    <View style={orbitalStyles.planetGlow} />
                  </TouchableOpacity>
                  <View style={orbitalStyles.planetInfo}>
                    <Text style={orbitalStyles.planetTitle}>{card.title}</Text>
                    <Text style={orbitalStyles.planetSubtitle}>
                      {card.subtitle}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>

        <View style={orbitalStyles.footer}>
          <View style={orbitalStyles.navRow}>
            <TouchableOpacity
              onPress={goToPrevOrbital}
              style={[orbitalStyles.navArrow, selectedIndex === 0 && orbitalStyles.navArrowDisabled]}
              activeOpacity={0.7}
              disabled={selectedIndex === 0}
            >
              <ChevronLeft size={22} color={selectedIndex === 0 ? 'rgba(167,139,250,0.2)' : '#a78bfa'} />
            </TouchableOpacity>
            <View style={orbitalStyles.dotsContainer}>
              {featureCards.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToOrbitalPage(index)}
                  style={[
                    orbitalStyles.dot,
                    selectedIndex === index && orbitalStyles.dotActive,
                  ]}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => goToNextOrbital(featureCards.length)}
              style={[orbitalStyles.navArrow, selectedIndex === featureCards.length - 1 && orbitalStyles.navArrowDisabled]}
              activeOpacity={0.7}
              disabled={selectedIndex === featureCards.length - 1}
            >
              <ChevronRight size={22} color={selectedIndex === featureCards.length - 1 ? 'rgba(167,139,250,0.2)' : '#a78bfa'} />
            </TouchableOpacity>
          </View>
          <Text style={orbitalStyles.pageCounter}>
            {selectedIndex + 1} of {featureCards.length}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={orbitalStyles.settingsButton}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.8}
      >
        <Settings color="#fff" size={24} />
      </TouchableOpacity>

      <PWAInstallPrompt />
    </View>
  );
}

const orbitalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  parallaxContainer: {
    position: 'absolute',
    top: -25,
    left: -25,
    right: -25,
    bottom: -25,
  },
  parallaxBackground: {
    width: '100%',
    height: '100%',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  time: {
    fontSize: 44,
    fontFamily: 'Pacifico',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 52,
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700' as const,
    fontFamily: 'Akronim',
    color: '#fbbf24',
    letterSpacing: 2,
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  username: {
    fontSize: 26,
    fontWeight: '600' as const,
    fontFamily: 'Akronim',
    color: '#a78bfa',
    letterSpacing: 1,
    textShadowColor: 'rgba(167, 139, 250, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Pacifico',
    color: '#f5d3ff',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  planetContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 100,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: ORBITAL_CARD_TOP_OFFSET,
    paddingBottom: 50,
  },
  planetWrapper: {
    alignItems: 'center',
  },
  planet: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'relative',
  },
  planetInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  planetImage: {
    width: '100%',
    height: '100%',
  },
  planetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  planetGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 100,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  planetInfo: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  planetTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  planetSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  navArrowDisabled: {
    backgroundColor: 'rgba(167,139,250,0.04)',
    borderColor: 'rgba(167,139,250,0.1)',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#a78bfa',
    width: 24,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  pageCounter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(15,15,30,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderTopColor: 'rgba(167,139,250,0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167,139,250,0.2)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  eventIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
