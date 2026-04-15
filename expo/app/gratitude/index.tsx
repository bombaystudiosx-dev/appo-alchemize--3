import React, { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, ScrollView, StyleProp, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Compass, Flame, Heart, House, Plus, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { gratitudeDb } from '@/lib/database';
import { startOfLocalDay } from '@/lib/date-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const QUOTE = "Even on hard days, there's always something to be grateful for. Focus on the good.";
const now = new Date();
const INITIAL_MONTH = new Date(now.getFullYear(), now.getMonth(), 1);
const INITIAL_SELECTED_DATE = startOfLocalDay(now).getTime();

type BottomNavKey = 'home' | 'streaks' | 'explore' | 'profile';

interface GlassSurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

interface CalendarDayProps {
  day: number;
  isSelected: boolean;
  hasEntry: boolean;
  onPress: (day: number) => void;
}

interface BottomNavItem {
  key: BottomNavKey;
  label: string;
  icon: ReactNode;
  onPress: () => void;
  isActive?: boolean;
}

function getMonthMeta(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysCount = lastDay.getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;

  return {
    year,
    month,
    daysCount,
    startOffset: mondayFirstOffset,
  };
}

function GlassSurface({ children, style, intensity = 28 }: GlassSurfaceProps) {
  return (
    <View style={[styles.glassSurface, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(134,69,255,0.05)', 'rgba(8,5,18,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

const CalendarDay = memo(function CalendarDay({ day, isSelected, hasEntry, onPress }: CalendarDayProps) {
  const scaleAnim = useRef(new Animated.Value(isSelected ? 1.04 : 1)).current;
  const glowAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.04 : 1,
        tension: 180,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: isSelected ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowAnim, isSelected, scaleAnim]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(day)}
      style={styles.daySlot}
      testID={`gratitude-day-${day}`}
    >
      <Animated.View
        style={[
          styles.dayTile,
          hasEntry && styles.dayTileWithEntry,
          isSelected && styles.dayTileSelected,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dayTileGlow,
            {
              opacity: glowAnim,
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.92, 1.06],
                  }),
                },
              ],
            },
          ]}
        />
        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
        {hasEntry ? <View style={[styles.entryDot, isSelected && styles.entryDotSelected]} /> : null}
      </Animated.View>
    </TouchableOpacity>
  );
});

export default function GratitudeJournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState<Date>(INITIAL_MONTH);
  const [selectedDate, setSelectedDate] = useState<number>(INITIAL_SELECTED_DATE);

  const screenFade = useRef(new Animated.Value(0)).current;
  const screenLift = useRef(new Animated.Value(18)).current;
  const emptyFade = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;

  const { data: entries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['gratitude-entries'],
    queryFn: () => (Platform.OS === 'web' ? Promise.resolve([]) : gratitudeDb.getAll()),
  });

  useEffect(() => {
    console.log('[GratitudeJournal] Screen mounted');
    const entranceAnimation = Animated.parallel([
      Animated.timing(screenFade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenLift, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const emptyStateAnimation = Animated.timing(emptyFade, {
      toValue: 1,
      duration: 520,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    entranceAnimation.start();
    emptyStateAnimation.start();
    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [ctaPulse, emptyFade, screenFade, screenLift]);

  const entryDays = useMemo<Set<number>>(() => {
    const normalizedDays = entries.map((entry) => startOfLocalDay(new Date(entry.entryDate)).getTime());
    console.log('[GratitudeJournal] Loaded entry days:', normalizedDays.length);
    return new Set<number>(normalizedDays);
  }, [entries]);

  const monthMeta = useMemo(() => getMonthMeta(selectedMonth), [selectedMonth]);

  const calendarCells = useMemo<(number | null)[]>(() => {
    const leadingSlots = Array.from({ length: monthMeta.startOffset }, () => null);
    const monthDays = Array.from({ length: monthMeta.daysCount }, (_, index) => index + 1);
    return [...leadingSlots, ...monthDays];
  }, [monthMeta.daysCount, monthMeta.startOffset]);

  const handleSelectDay = useCallback(
    (day: number) => {
      const nextDate = startOfLocalDay(new Date(monthMeta.year, monthMeta.month, day)).getTime();
      console.log('[GratitudeJournal] Day selected:', day, nextDate);
      setSelectedDate(nextDate);
    },
    [monthMeta.month, monthMeta.year]
  );

  const handleChangeMonth = useCallback((delta: number) => {
    setSelectedMonth((currentMonth) => {
      const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
      const previousSelectedDay = new Date(selectedDate).getDate();
      const nextMonthDays = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      const nextSelectedDay = Math.min(previousSelectedDay, nextMonthDays);
      const nextSelectedDate = startOfLocalDay(
        new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextSelectedDay)
      ).getTime();
      console.log('[GratitudeJournal] Month changed:', nextMonth.toISOString(), 'Selected date:', nextSelectedDate);
      setSelectedDate(nextSelectedDate);
      return nextMonth;
    });
  }, [selectedDate]);

  const handleOpenAddEntry = useCallback(() => {
    console.log('[GratitudeJournal] Opening add entry for date:', selectedDate);
    router.push(`/gratitude/add?date=${selectedDate}` as any);
  }, [router, selectedDate]);

  const bottomNavItems = useMemo<BottomNavItem[]>(() => {
    return [
      {
        key: 'home',
        label: 'Home',
        icon: <House color="rgba(214, 187, 109, 0.6)" size={22} strokeWidth={2.1} />,
        onPress: () => {
          console.log('[GratitudeJournal] Bottom nav: Home');
          router.push('/' as any);
        },
      },
      {
        key: 'streaks',
        label: 'Streaks',
        icon: <Flame color="rgba(214, 187, 109, 0.6)" size={22} strokeWidth={2.1} />,
        onPress: () => {
          console.log('[GratitudeJournal] Bottom nav: Streaks');
          router.push('/habits' as any);
        },
      },
      {
        key: 'explore',
        label: 'Explore',
        icon: <Compass color="#F4C95D" size={22} strokeWidth={2.3} />,
        onPress: () => {
          console.log('[GratitudeJournal] Bottom nav: Explore (active)');
        },
        isActive: true,
      },
      {
        key: 'profile',
        label: 'Profile',
        icon: <User color="rgba(214, 187, 109, 0.6)" size={22} strokeWidth={2.1} />,
        onPress: () => {
          console.log('[GratitudeJournal] Bottom nav: Profile');
          router.push('/settings' as any);
        },
      },
    ];
  }, [router]);

  const ctaGlowScale = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.06],
  });

  const ctaGlowOpacity = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState message="Loading journal..." />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loadingContainer}>
        <ErrorState message="Could not load your gratitude journal" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#040108', '#0F0416', '#180827', '#14061F', '#060109']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.ambientOrb, styles.ambientOrbTop]} />
      <View style={[styles.ambientOrb, styles.ambientOrbMiddle]} />
      <View style={[styles.ambientOrb, styles.ambientOrbBottom]} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 8,
              paddingBottom: insets.bottom + 136,
            },
          ]}
          testID="gratitude-journal-scroll"
        >
          <Animated.View
            style={[
              styles.screenContent,
              {
                opacity: screenFade,
                transform: [{ translateY: screenLift }],
              },
            ]}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  console.log('[GratitudeJournal] Back pressed');
                  router.back();
                }}
                style={styles.iconButtonOuter}
                testID="gratitude-back-button"
              >
                <GlassSurface style={styles.iconButton} intensity={22}>
                  <ArrowLeft color="#FFFFFF" size={28} strokeWidth={2.2} />
                </GlassSurface>
              </TouchableOpacity>

              <Text style={styles.headerTitle} testID="gratitude-screen-title">
                Gratitude Journal
              </Text>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleOpenAddEntry}
                style={styles.plusButtonOuter}
                testID="gratitude-add-button"
              >
                <View style={styles.plusGlow} />
                <LinearGradient
                  colors={['#8E39FF', '#6D47FF', '#8D5CFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.plusButton}
                >
                  <Plus color="#FFFFFF" size={28} strokeWidth={2.3} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <GlassSurface style={styles.quoteCard} intensity={24}>
              <Text style={styles.quoteText} testID="gratitude-quote-text">
                {QUOTE}
              </Text>
            </GlassSurface>

            <LinearGradient
              colors={['rgba(63, 25, 102, 0.96)', 'rgba(45, 18, 84, 0.98)', 'rgba(33, 15, 67, 0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.calendarCard}
            >
              <View style={styles.calendarInnerGlow} />
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleChangeMonth(-1)}
                  style={styles.monthArrowTouch}
                  testID="gratitude-month-prev"
                >
                  <GlassSurface style={styles.monthArrowButton} intensity={18}>
                    <ChevronLeft color="rgba(255,255,255,0.88)" size={28} strokeWidth={2.2} />
                  </GlassSurface>
                </TouchableOpacity>

                <Text style={styles.monthTitle} testID="gratitude-month-title">
                  {selectedMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleChangeMonth(1)}
                  style={styles.monthArrowTouch}
                  testID="gratitude-month-next"
                >
                  <GlassSurface style={styles.monthArrowButton} intensity={18}>
                    <ChevronRight color="rgba(255,255,255,0.88)" size={28} strokeWidth={2.2} />
                  </GlassSurface>
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {WEEK_DAYS.map((day, idx) => (
                  <Text key={`week-${idx}`} style={styles.weekLabel}>
                    {day.charAt(0)}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarCells.map((cell, index) => {
                  if (cell === null) {
                    return <View key={`empty-${index}`} style={styles.emptyDaySlot} />;
                  }

                  const cellDate = startOfLocalDay(new Date(monthMeta.year, monthMeta.month, cell)).getTime();
                  const hasEntry = entryDays.has(cellDate);

                  return (
                    <CalendarDay
                      key={`day-${cell}`}
                      day={cell}
                      hasEntry={hasEntry}
                      isSelected={selectedDate === cellDate}
                      onPress={handleSelectDay}
                    />
                  );
                })}
              </View>
            </LinearGradient>

            <Animated.View
              style={[
                styles.footerSection,
                {
                  opacity: emptyFade,
                  transform: [
                    {
                      translateY: emptyFade.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.emptyState} testID="gratitude-empty-state">
                <View style={styles.emptyIconWrap}>
                  <View style={styles.emptyIconGlow} />
                  <Heart color="#8F49FF" size={72} strokeWidth={1.8} />
                </View>
                <Text style={styles.emptyTitle}>Start your gratitude journey</Text>
              </View>

              <View style={styles.ctaWrap}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.ctaGlow,
                    {
                      opacity: ctaGlowOpacity,
                      transform: [{ scale: ctaGlowScale }],
                    },
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={handleOpenAddEntry}
                  style={styles.ctaTouch}
                  testID="gratitude-cta-button"
                >
                  <LinearGradient
                    colors={['#9E38FF', '#6E49FF', '#4B73FF']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.ctaButton}
                  >
                    <Text style={styles.ctaText}>Add Your First Entry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      <View style={[styles.bottomNavShell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <BlurView intensity={34} tint="dark" style={styles.bottomNavBlur}>
          <LinearGradient
            colors={['rgba(7,3,15,0.92)', 'rgba(13,5,28,0.96)', 'rgba(7,3,15,0.98)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bottomNavGradient}
          >
            {bottomNavItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.82}
                onPress={item.onPress}
                style={styles.navItemTouch}
                testID={`bottom-nav-${item.key}`}
              >
                <View style={styles.navItemInner}>
                  {item.isActive ? <View style={styles.activeNavIndicator} /> : null}
                  <View style={[styles.navActiveGlow, item.isActive ? styles.navActiveGlowVisible : null]} />
                  {item.icon}
                  <Text style={[styles.navLabel, item.isActive ? styles.navLabelActive : null]}>{item.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040108',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#040108',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  screenContent: {
    flexGrow: 1,
  },
  ambientOrb: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(126, 44, 255, 0.12)',
  },
  ambientOrbTop: {
    top: -40,
    right: -10,
    width: 220,
    height: 220,
    shadowColor: '#7A30FF',
    shadowOpacity: 0.4,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  ambientOrbMiddle: {
    top: 260,
    left: -70,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(96, 26, 198, 0.1)',
    shadowColor: '#6021d7',
    shadowOpacity: 0.3,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  ambientOrbBottom: {
    bottom: 120,
    right: -40,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(42, 93, 255, 0.08)',
    shadowColor: '#3f5cff',
    shadowOpacity: 0.26,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: -0.8,
    marginHorizontal: 12,
  },
  iconButtonOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  iconButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 6, 20, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  plusButtonOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(139, 79, 255, 0.42)',
    shadowColor: '#8B4FFF',
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  plusButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B4FFF',
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  glassSurface: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(14, 9, 27, 0.55)',
  },
  quoteCard: {
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginBottom: 22,
    shadowColor: '#8B4FFF',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    borderColor: 'rgba(198, 180, 255, 0.13)',
  },
  quoteText: {
    color: 'rgba(247, 243, 255, 0.92)',
    fontSize: 17,
    lineHeight: 30,
    textAlign: 'center',
    fontStyle: 'italic' as const,
    fontWeight: '700' as const,
  },
  calendarCard: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(207, 189, 255, 0.12)',
    overflow: 'hidden',
    shadowColor: '#7B38FF',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
  },
  calendarInnerGlow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(126, 65, 255, 0.05)',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthArrowTouch: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  monthArrowButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.09)',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900' as const,
    letterSpacing: -0.6,
    marginHorizontal: 8,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: 'rgba(245, 238, 255, 0.58)',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDaySlot: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 6,
  },
  daySlot: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 6,
  },
  dayTile: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(62, 39, 104, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  dayTileWithEntry: {
    borderColor: 'rgba(159, 117, 255, 0.16)',
  },
  dayTileSelected: {
    borderColor: '#F4C95D',
    borderWidth: 2,
    shadowColor: '#F4C95D',
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'rgba(68, 42, 113, 0.98)',
  },
  dayTileGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 201, 93, 0.12)',
  },
  dayText: {
    color: 'rgba(241, 235, 255, 0.72)',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  dayTextSelected: {
    color: '#F7E2A5',
  },
  entryDot: {
    position: 'absolute',
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(171, 122, 255, 0.82)',
  },
  entryDotSelected: {
    backgroundColor: '#F4C95D',
  },
  footerSection: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  emptyIconWrap: {
    width: 114,
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyIconGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(120, 62, 255, 0.22)',
    shadowColor: '#7B38FF',
    shadowOpacity: 0.72,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyTitle: {
    color: 'rgba(244, 238, 255, 0.78)',
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  ctaTouch: {
    width: '100%',
    maxWidth: 446,
    borderRadius: 24,
  },
  ctaGlow: {
    position: 'absolute',
    width: '92%',
    maxWidth: 420,
    height: 68,
    borderRadius: 26,
    backgroundColor: 'rgba(118, 78, 255, 0.48)',
    shadowColor: '#7E57FF',
    shadowOpacity: 0.9,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaButton: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900' as const,
    letterSpacing: -0.3,
  },
  bottomNavShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomNavBlur: {
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  bottomNavGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  navItemTouch: {
    flex: 1,
    minHeight: 74,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  navItemInner: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 10,
    paddingBottom: 6,
  },
  activeNavIndicator: {
    position: 'absolute',
    top: 0,
    width: 56,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#F4C95D',
    shadowColor: '#F4C95D',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  navActiveGlow: {
    position: 'absolute',
    bottom: 6,
    width: 78,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(244, 201, 93, 0.08)',
    opacity: 0,
  },
  navActiveGlowVisible: {
    opacity: 1,
    shadowColor: '#F4C95D',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  navLabel: {
    marginTop: 8,
    color: 'rgba(214, 187, 109, 0.62)',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  navLabelActive: {
    color: '#F4C95D',
    fontWeight: '800' as const,
  },
});
