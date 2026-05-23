import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  Animated,
  Dimensions,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Camera, 
  Plus, 
  Droplets, 
  Flame,
  ChevronRight,
  ChevronLeft,
  User,
  Zap,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { foodLogsDb, userNutritionProfileDb, waterLogsDb } from '@/lib/database';
import type { FoodLog, WaterLog } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RING_SIZE = SCREEN_WIDTH * 0.55;
const RING_STROKE = 14;

const DEFAULT_GOALS = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 25,
  water: 2000,
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CalorieTrackerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const calorieAnim = useRef(new Animated.Value(0)).current;
  const proteinAnim = useRef(new Animated.Value(0)).current;
  const carbsAnim = useRef(new Animated.Value(0)).current;
  const fatAnim = useRef(new Animated.Value(0)).current;
  const fiberAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const startOfDay = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, [selectedDate]);

  const endOfDay = useMemo(() => {
    const date = new Date(selectedDate);
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }, [selectedDate]);

  const { data: profile } = useQuery({
    queryKey: ['nutritionProfile'],
    queryFn: async () => {
      if (Platform.OS === 'web') return null;
      return userNutritionProfileDb.get();
    },
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['foodLogs', startOfDay, endOfDay],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      return foodLogsDb.getByDate(startOfDay, endOfDay);
    },
  });

  const { data: waterLogs = [] } = useQuery({
    queryKey: ['waterLogs', startOfDay, endOfDay],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      return waterLogsDb.getByDate(startOfDay, endOfDay);
    },
  });

  const addWaterMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (Platform.OS === 'web') return;
      const waterLog: WaterLog = {
        id: Date.now().toString(),
        amount,
        unit: 'ml',
        loggedAt: Date.now(),
      };
      return waterLogsDb.create(waterLog);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['waterLogs'] });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const goals = useMemo(() => ({
    calories: profile?.dailyCalorieTarget ?? DEFAULT_GOALS.calories,
    protein: profile?.dailyProteinTarget ?? DEFAULT_GOALS.protein,
    carbs: profile?.dailyCarbsTarget ?? DEFAULT_GOALS.carbs,
    fat: profile?.dailyFatTarget ?? DEFAULT_GOALS.fat,
    fiber: profile?.dailyFiberTarget ?? DEFAULT_GOALS.fiber,
    water: profile?.dailyWaterTarget ?? DEFAULT_GOALS.water,
  }), [profile]);

  const dailyTotals = useMemo(() => {
    const calories = foodLogs.reduce((sum, log) => sum + log.calories, 0);
    const protein = foodLogs.reduce((sum, log) => sum + (log.proteinGrams || 0), 0);
    const carbs = foodLogs.reduce((sum, log) => sum + (log.carbGrams || 0), 0);
    const fat = foodLogs.reduce((sum, log) => sum + (log.fatGrams || 0), 0);
    const fiber = foodLogs.reduce((sum, log) => sum + (log.fiberGrams || 0), 0);
    const water = waterLogs.reduce((sum, log) => sum + log.amount, 0);
    
    return { calories, protein, carbs, fat, fiber, water };
  }, [foodLogs, waterLogs]);

  const mealsByType = useMemo(() => {
    const grouped: Record<string, FoodLog[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    foodLogs.forEach(log => {
      if (grouped[log.mealType]) {
        grouped[log.mealType].push(log);
      }
    });
    return grouped;
  }, [foodLogs]);

  useEffect(() => {
    const calorieProgress = Math.min(dailyTotals.calories / goals.calories, 1);
    const proteinProgress = Math.min(dailyTotals.protein / goals.protein, 1);
    const carbsProgress = Math.min(dailyTotals.carbs / goals.carbs, 1);
    const fatProgress = Math.min(dailyTotals.fat / goals.fat, 1);
    const fiberProgress = Math.min(dailyTotals.fiber / goals.fiber, 1);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(calorieAnim, {
        toValue: calorieProgress,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.timing(proteinAnim, {
        toValue: proteinProgress,
        duration: 1000,
        delay: 100,
        useNativeDriver: false,
      }),
      Animated.timing(carbsAnim, {
        toValue: carbsProgress,
        duration: 1000,
        delay: 200,
        useNativeDriver: false,
      }),
      Animated.timing(fatAnim, {
        toValue: fatProgress,
        duration: 1000,
        delay: 300,
        useNativeDriver: false,
      }),
      Animated.timing(fiberAnim, {
        toValue: fiberProgress,
        duration: 1000,
        delay: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, [dailyTotals, goals, fadeAnim, scaleAnim, calorieAnim, proteinAnim, carbsAnim, fatAnim, fiberAnim]);

  const remaining = goals.calories - dailyTotals.calories;

  const isToday = useMemo(() => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  }, [selectedDate]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const navigateDate = useCallback((direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [selectedDate]);

  const { mutate: addWater } = addWaterMutation;
  
  const handleAddWater = useCallback((amount: number) => {
    addWater(amount);
  }, [addWater]);

  const getMealCalories = useCallback((mealType: string) => {
    return mealsByType[mealType]?.reduce((sum, log) => sum + log.calories, 0) || 0;
  }, [mealsByType]);

  const getMealCount = useCallback((mealType: string) => {
    return mealsByType[mealType]?.length || 0;
  }, [mealsByType]);

  const circumference = (RING_SIZE - RING_STROKE) * Math.PI;

  const calorieStrokeDashoffset = calorieAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => navigateDate(-1)} style={styles.dateArrow}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigateDate(1)} 
            style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
            disabled={isToday}
          >
            <ChevronRight size={22} color={isToday ? '#333' : '#fff'} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[
          styles.ringSection,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
        ]}>
          <View style={styles.ringContainer}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <SvgGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#f97316" />
                  <Stop offset="50%" stopColor="#fb923c" />
                  <Stop offset="100%" stopColor="#fdba74" />
                </SvgGradient>
              </Defs>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={(RING_SIZE - RING_STROKE) / 2}
                stroke="rgba(249, 115, 22, 0.15)"
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              {Platform.OS !== 'web' ? (
                <AnimatedCircle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={(RING_SIZE - RING_STROKE) / 2}
                  stroke="url(#calorieGradient)"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={calorieStrokeDashoffset}
                  rotation="-90"
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              ) : (
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={(RING_SIZE - RING_STROKE) / 2}
                  stroke="url(#calorieGradient)"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - Math.min(dailyTotals.calories / goals.calories, 1))}
                  transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
                />
              )}
            </Svg>
            
            <View style={styles.ringCenter}>
              <Flame size={28} color="#f97316" />
              <Text style={styles.caloriesValue}>{Math.round(dailyTotals.calories)}</Text>
              <Text style={styles.caloriesLabel}>calories</Text>
            </View>
          </View>

          <View style={styles.ringStats}>
            <View style={styles.ringStat}>
              <Text style={styles.ringStatLabel}>Goal</Text>
              <Text style={styles.ringStatValue}>{goals.calories}</Text>
            </View>
            <View style={styles.ringStatDivider} />
            <View style={styles.ringStat}>
              <Text style={styles.ringStatLabel}>{remaining >= 0 ? 'Remaining' : 'Over'}</Text>
              <Text style={[styles.ringStatValue, remaining < 0 && styles.overBudget]}>
                {Math.abs(Math.round(remaining))}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.macrosSection}>
          <Text style={styles.sectionTitle}>Macros</Text>
          <View style={styles.macrosRow}>
            <MacroCard
              label="Protein"
              current={dailyTotals.protein}
              goal={goals.protein}
              color="#ef4444"
              animValue={proteinAnim}
            />
            <MacroCard
              label="Carbs"
              current={dailyTotals.carbs}
              goal={goals.carbs}
              color="#22c55e"
              animValue={carbsAnim}
            />
            <MacroCard
              label="Fat"
              current={dailyTotals.fat}
              goal={goals.fat}
              color="#eab308"
              animValue={fatAnim}
            />
            <MacroCard
              label="Fiber"
              current={dailyTotals.fiber}
              goal={goals.fiber}
              color="#8b5cf6"
              animValue={fiberAnim}
            />
          </View>
        </View>

        <View style={styles.waterSection}>
          <View style={styles.waterHeader}>
            <View style={styles.waterTitleRow}>
              <Droplets size={20} color="#38bdf8" />
              <Text style={styles.waterTitle}>Water</Text>
            </View>
            <Text style={styles.waterProgress}>
              {Math.round(dailyTotals.water / 1000 * 10) / 10}L / {goals.water / 1000}L
            </Text>
          </View>
          <View style={styles.waterBarBg}>
            <Animated.View 
              style={[
                styles.waterBarFill, 
                { width: `${Math.min((dailyTotals.water / goals.water) * 100, 100)}%` }
              ]} 
            />
          </View>
          <View style={styles.waterButtons}>
            {[250, 500].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.waterBtn}
                onPress={() => handleAddWater(amount)}
                activeOpacity={0.7}
              >
                <Plus size={14} color="#38bdf8" />
                <Text style={styles.waterBtnText}>{amount}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>Meals</Text>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
            <TouchableOpacity
              key={mealType}
              style={styles.mealRow}
              onPress={() => router.push(`/calorie/add?meal=${mealType}` as any)}
              activeOpacity={0.7}
            >
              <View style={styles.mealLeft}>
                <View style={[styles.mealIcon, { backgroundColor: getMealIconBg(mealType) }]}>
                  <Text style={styles.mealEmoji}>{getMealEmoji(mealType)}</Text>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName}>{capitalizeFirst(mealType)}</Text>
                  <Text style={styles.mealMeta}>
                    {getMealCount(mealType)} {getMealCount(mealType) === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
              <View style={styles.mealRight}>
                <Text style={styles.mealCals}>{getMealCalories(mealType)}</Text>
                <Text style={styles.mealCalsUnit}>cal</Text>
                <ChevronRight size={18} color="#444" style={styles.mealChevron} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/calorie/meal-prep' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
              style={styles.quickActionGradient}
            >
              <Calendar size={22} color="#22c55e" />
              <Text style={styles.quickActionText}>Meal Prep</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/calorie/profile' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.05)']}
              style={styles.quickActionGradient}
            >
              <User size={22} color="#a855f7" />
              <Text style={styles.quickActionText}>Profile & Goals</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {!profile && (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => router.push('/calorie/profile' as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.2)', 'rgba(249, 115, 22, 0.08)']}
              style={styles.setupBannerGradient}
            >
              <Zap size={24} color="#f97316" />
              <View style={styles.setupBannerContent}>
                <Text style={styles.setupBannerTitle}>Set Up Your Profile</Text>
                <Text style={styles.setupBannerSubtitle}>Get personalized calorie targets</Text>
              </View>
              <ChevronRight size={20} color="#f97316" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.fabRow, { bottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => router.push('/calorie/add' as any)}
          activeOpacity={0.85}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fabPrimary}
          onPress={() => router.push('/calorie/scan' as any)}
          activeOpacity={0.85}
        >
          <Camera size={24} color="#fff" />
          <Text style={styles.fabText}>Scan Food</Text>
        </TouchableOpacity>
      </View>
      </ImageBackground>
    </View>
  );
}

function MacroCard({ 
  label, 
  current, 
  goal, 
  color,
  animValue,
}: { 
  label: string;
  current: number;
  goal: number;
  color: string;
  animValue: Animated.Value;
}) {
  const progress = Math.min((current / goal) * 100, 100);
  
  return (
    <View style={styles.macroCard}>
      <View style={styles.macroCardHeader}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <Text style={styles.macroValue}>
        <Text style={{ color }}>{Math.round(current)}</Text>
        <Text style={styles.macroGoal}>/{goal}g</Text>
      </Text>
      <View style={styles.macroBarBg}>
        <Animated.View 
          style={[
            styles.macroBarFill, 
            { 
              backgroundColor: color,
              width: Platform.OS !== 'web' 
                ? animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                : `${progress}%`
            }
          ]} 
        />
      </View>
    </View>
  );
}

function getMealEmoji(type: string): string {
  switch (type) {
    case 'breakfast': return '🌅';
    case 'lunch': return '☀️';
    case 'dinner': return '🌙';
    case 'snack': return '🍎';
    default: return '🍽️';
  }
}

function getMealIconBg(type: string): string {
  switch (type) {
    case 'breakfast': return 'rgba(251, 191, 36, 0.15)';
    case 'lunch': return 'rgba(34, 197, 94, 0.15)';
    case 'dinner': return 'rgba(99, 102, 241, 0.15)';
    case 'snack': return 'rgba(236, 72, 153, 0.15)';
    default: return 'rgba(255,255,255,0.1)';
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 20,
  },
  dateArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowDisabled: {
    opacity: 0.4,
  },
  dateDisplay: {
    minWidth: 140,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: -0.3,
  },
  ringSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesValue: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 8,
    letterSpacing: -1,
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500' as const,
    marginTop: 2,
  },
  ringStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 32,
  },
  ringStat: {
    alignItems: 'center',
  },
  ringStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  ringStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  ringStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  overBudget: {
    color: '#ef4444',
  },
  macrosSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  macroCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 2,
  },
  macroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500' as const,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  macroGoal: {
    color: '#555',
    fontWeight: '500' as const,
  },
  macroBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterSection: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  waterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  waterProgress: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '600' as const,
  },
  waterBarBg: {
    height: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  waterBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  waterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 12,
    borderRadius: 12,
  },
  waterBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#38bdf8',
  },
  mealsSection: {
    marginBottom: 24,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  mealLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealEmoji: {
    fontSize: 22,
  },
  mealInfo: {
    gap: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  mealMeta: {
    fontSize: 13,
    color: '#666',
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealCals: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  mealCalsUnit: {
    fontSize: 13,
    color: '#666',
    marginLeft: 3,
  },
  mealChevron: {
    marginLeft: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  setupBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  setupBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  setupBannerContent: {
    flex: 1,
  },
  setupBannerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  setupBannerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  fabRow: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  fabSecondary: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
