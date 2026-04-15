import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  X,
  ImageIcon,
  Sparkles,
  Check,
  RotateCcw,
  ChevronDown,
  Zap,
  AlertCircle,
  RefreshCw,
  Info,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Leaf,
  Scale,
  Eye,
  Brain,
  ShieldCheck,
} from 'lucide-react-native';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { foodLogsDb, appointmentsDb } from '@/lib/database';
import type { FoodLog, MealType, Appointment } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FoodAnalysisSchema = z.object({
  foods: z.array(z.object({
    name: z.string().describe('Specific name of the food item, including preparation method if visible (e.g., "Grilled Chicken Breast" not just "Chicken")'),
    servingSize: z.string().describe('Precise estimated serving size with weight in grams AND volume/count (e.g., "1 medium banana (~118g)", "1 cup cooked rice (~185g)", "6 oz grilled salmon (~170g)")'),
    calories: z.number().describe('Estimated calories based on USDA nutritional database values for the identified food and estimated portion'),
    protein: z.number().describe('Estimated protein in grams, using standard nutritional references'),
    carbs: z.number().describe('Estimated total carbohydrates in grams'),
    fat: z.number().describe('Estimated total fat in grams'),
    fiber: z.number().describe('Estimated dietary fiber in grams'),
    sugar: z.number().describe('Estimated sugar in grams'),
    saturatedFat: z.number().describe('Estimated saturated fat in grams'),
    sodium: z.number().describe('Estimated sodium in milligrams'),
    confidence: z.number().min(0).max(100).describe('Confidence level 0-100 for this specific food identification'),
    portionNotes: z.string().describe('Brief note about how the portion was estimated, e.g., "plate appears 10 inch diameter, portion covers ~40%"'),
    category: z.string().describe('Food category: protein, grain, vegetable, fruit, dairy, fat, beverage, condiment, mixed_dish, dessert, snack'),
  })),
  totalCalories: z.number().describe('Sum of all food calories'),
  totalProtein: z.number().describe('Sum of all food protein'),
  totalCarbs: z.number().describe('Sum of all food carbs'),
  totalFat: z.number().describe('Sum of all food fat'),
  totalFiber: z.number().describe('Sum of all food fiber'),
  mealTypeGuess: z.string().describe('Best guess of meal type based on foods and composition: breakfast, lunch, dinner, or snack'),
  overallConfidence: z.number().min(0).max(100).describe('Overall confidence in the complete analysis'),
  healthScore: z.number().min(0).max(10).describe('Health score 0-10 based on nutritional balance, variety, and quality'),
  healthNotes: z.string().describe('Brief 1-2 sentence health insight about this meal, e.g., "High protein meal with good fiber. Consider adding more vegetables for micronutrients."'),
  cuisineType: z.string().describe('Detected cuisine type if identifiable, e.g., "Italian", "Japanese", "American", "Mexican", or "Mixed/Unknown"'),
});

type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

const MEAL_TYPES: { value: MealType; label: string; icon: string; timeRange: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅', timeRange: '5am-11am' },
  { value: 'lunch', label: 'Lunch', icon: '☀️', timeRange: '11am-3pm' },
  { value: 'dinner', label: 'Dinner', icon: '🌙', timeRange: '5pm-10pm' },
  { value: 'snack', label: 'Snack', icon: '🍎', timeRange: 'Anytime' },
];

function getAutoMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

function getHealthScoreColor(score: number): string {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#84cc16';
  if (score >= 4) return '#eab308';
  if (score >= 2) return '#f97316';
  return '#ef4444';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 55) return 'Moderate';
  if (confidence >= 35) return 'Low';
  return 'Very Low';
}

const ANALYSIS_PROMPT = `You are an expert nutritionist and food scientist with deep knowledge of the USDA FoodData Central database, international cuisines, and portion estimation.

TASK: Analyze this food image with maximum accuracy and detail.

CRITICAL RULES FOR ACCURATE ANALYSIS:
1. PORTION ESTIMATION: Use visual reference cues (plate size ~10 inches, standard utensils, hand size, common dish sizes). Estimate weight in grams for each item.
2. CALORIE ACCURACY: Cross-reference with USDA values. A chicken breast is ~165 cal/100g cooked, white rice is ~130 cal/100g cooked, etc.
3. COOKING METHOD MATTERS: Fried foods have 50-100% more calories than grilled. Sauces and dressings add 50-200 cal per serving.
4. HIDDEN CALORIES: Account for oils used in cooking (~120 cal/tablespoon), butter, dressings, sauces, cheese, and toppings that may not be immediately obvious.
5. SPECIFIC IDENTIFICATION: Be as specific as possible. "Basmati rice" not "rice". "Pan-seared Atlantic salmon" not "fish". Include preparation method.
6. REALISTIC PORTIONS: Restaurant portions are typically 1.5-2x standard serving sizes. Home-cooked portions vary. Use the plate/container as reference.
7. BEVERAGE DETECTION: Include any visible drinks and their calories. A regular soda is ~140 cal, juice ~110 cal per 8oz.
8. CONDIMENTS & SIDES: Don't miss small items like sauces, dips, croutons, nuts, seeds, dressings, etc.

MACRO ACCURACY GUIDELINES:
- Protein: meat ~25-30g/100g cooked, eggs ~6g each, beans ~7g/100g cooked, cheese ~25g/100g
- Carbs: rice ~28g/100g cooked, bread ~49g/100g, pasta ~25g/100g cooked, potato ~17g/100g
- Fat: olive oil ~14g/tbsp, butter ~11g/tbsp, avocado ~15g/100g, nuts ~50g/100g
- Fiber: vegetables ~2-4g/100g, whole grains ~3-5g/100g, beans ~6-8g/100g, fruits ~2-3g/100g
- Sugar: fruit ~10-15g/100g, soda ~11g/100ml, desserts vary widely

For EACH food item detected, provide precise nutritional estimates based on the above guidelines.`;

const CORRECTION_PROMPT_PREFIX = `You are an expert nutritionist re-analyzing a food image based on user corrections.

PREVIOUS ANALYSIS WAS INCORRECT. The user has provided these corrections:`;

const CORRECTION_PROMPT_SUFFIX = `

Please re-analyze the image incorporating these corrections. Apply the same rigorous nutritional accuracy standards:
1. Use USDA reference values for the corrected food items
2. Maintain accurate portion estimation from visual cues
3. Account for cooking methods, hidden calories, and condiments
4. Be specific with food names and preparation methods`;

export default function FoodScannerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(getAutoMealType());
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [editedFoods, setEditedFoods] = useState<FoodAnalysis['foods']>([]);
  const [correctionHint, setCorrectionHint] = useState('');
  const [showHealthInsight, setShowHealthInsight] = useState(true);
  const [analysisStage, setAnalysisStage] = useState<string>('');
  const [expandedFoodIndex, setExpandedFoodIndex] = useState<number | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const animateResultsIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const computedTotals = useMemo(() => ({
    calories: Math.round(editedFoods.reduce((sum, f) => sum + f.calories, 0)),
    protein: Math.round(editedFoods.reduce((sum, f) => sum + f.protein, 0)),
    carbs: Math.round(editedFoods.reduce((sum, f) => sum + f.carbs, 0)),
    fat: Math.round(editedFoods.reduce((sum, f) => sum + f.fat, 0)),
    fiber: Math.round(editedFoods.reduce((sum, f) => sum + f.fiber, 0)),
  }), [editedFoods]);

  const analyzeMutation = useMutation({
    mutationFn: async ({ imageBase64, hint }: { imageBase64: string; hint?: string }) => {
      startPulse();

      const stages = [
        'Detecting food items...',
        'Estimating portions...',
        'Calculating macronutrients...',
        'Cross-referencing USDA data...',
        'Finalizing analysis...',
      ];

      let stageIndex = 0;
      setAnalysisStage(stages[0]);
      const stageInterval = setInterval(() => {
        stageIndex = Math.min(stageIndex + 1, stages.length - 1);
        setAnalysisStage(stages[stageIndex]);
      }, 2200);

      try {
        const prompt = hint
          ? `${CORRECTION_PROMPT_PREFIX}\n"${hint}"\n${CORRECTION_PROMPT_SUFFIX}`
          : ANALYSIS_PROMPT;

        const result = await generateObject({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image', image: imageBase64 },
              ],
            },
          ],
          schema: FoodAnalysisSchema,
        });
        
        clearInterval(stageInterval);
        return result;
      } catch (error) {
        clearInterval(stageInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setEditedFoods(data.foods.map(f => ({
        ...f,
        fiber: f.fiber ?? 0,
        sugar: f.sugar ?? 0,
        saturatedFat: f.saturatedFat ?? 0,
        sodium: f.sodium ?? 0,
      })));
      setCorrectionHint('');

      if (data.mealTypeGuess) {
        const guessed = data.mealTypeGuess.toLowerCase() as MealType;
        if (['breakfast', 'lunch', 'dinner', 'snack'].includes(guessed)) {
          setSelectedMealType(guessed);
        }
      }

      animateResultsIn();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[FoodScanner] Analysis complete:', {
        foodCount: data.foods.length,
        totalCal: data.totalCalories,
        confidence: data.overallConfidence,
        healthScore: data.healthScore,
        cuisine: data.cuisineType,
      });
    },
    onError: (error) => {
      console.error('[FoodScanner] Analysis error:', error);
      Alert.alert(
        'Analysis Failed',
        'Could not analyze the image. This might happen with unclear photos. Try taking a clearer picture with better lighting.',
        [
          { text: 'Retry', onPress: resetScan },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (foods: FoodAnalysis['foods']) => {
      if (Platform.OS === 'web') return;

      const logs: FoodLog[] = foods.map((food) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        foodName: food.name,
        servingDescription: food.servingSize,
        calories: Math.round(food.calories),
        proteinGrams: Math.round(food.protein),
        carbGrams: Math.round(food.carbs),
        fatGrams: Math.round(food.fat),
        sugarGrams: Math.round(food.sugar ?? 0),
        fiberGrams: Math.round(food.fiber ?? 0),
        mealType: selectedMealType,
        sourceType: 'camera' as const,
        loggedAt: Date.now(),
        isLocked: false,
        calendarEventId: null,
      }));

      for (const log of logs) {
        const calendarEventId = `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const loggedDate = new Date(log.loggedAt);
        const timeStr = loggedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const calendarEvent: Appointment = {
          id: calendarEventId,
          title: `${log.foodName} (${log.mealType})`,
          date: new Date(loggedDate.getFullYear(), loggedDate.getMonth(), loggedDate.getDate()).getTime(),
          time: timeStr,
          category: 'nutrition',
          notes: `${log.calories} cal | P: ${log.proteinGrams || 0}g C: ${log.carbGrams || 0}g F: ${log.fatGrams || 0}g | Fiber: ${log.fiberGrams || 0}g`,
          reminder: false,
          createdAt: Date.now(),
          metadata: JSON.stringify({
            foodLogId: log.id,
            calories: log.calories,
            protein: log.proteinGrams,
            carbs: log.carbGrams,
            fat: log.fatGrams,
            fiber: log.fiberGrams,
            sugar: log.sugarGrams,
            source: log.sourceType,
            isLocked: log.isLocked,
          }),
        };

        await appointmentsDb.create(calendarEvent);
        const updatedLog = { ...log, calendarEventId };
        await foodLogsDb.create(updatedLog);
      }
      return logs;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const { mutate: analyzeImage } = analyzeMutation;

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
        analyzeImage({ imageBase64: photo.base64 });
      }
    } catch (error) {
      console.error('[FoodScanner] Camera error:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  }, [analyzeImage]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      setCapturedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      analyzeImage({ imageBase64: result.assets[0].base64 });
    }
  }, [analyzeImage]);

  const resetScan = useCallback(() => {
    setCapturedImage(null);
    setAnalysis(null);
    setEditedFoods([]);
    setCorrectionHint('');
    setAnalysisStage('');
    setExpandedFoodIndex(null);
    setShowHealthInsight(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFixResults = useCallback(() => {
    if (!capturedImage || !correctionHint.trim()) return;
    const base64 = capturedImage.replace(/^data:image\/\w+;base64,/, '');
    analyzeImage({ imageBase64: base64, hint: correctionHint.trim() });
  }, [capturedImage, correctionHint, analyzeImage]);

  const updateFood = useCallback((index: number, field: string, value: string | number) => {
    setEditedFoods(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeFood = useCallback((index: number) => {
    setEditedFoods(prev => prev.filter((_, i) => i !== index));
    setExpandedFoodIndex(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const toggleFoodExpand = useCallback((index: number) => {
    setExpandedFoodIndex(prev => prev === index ? null : index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const { mutate: saveFood } = saveMutation;

  const handleSave = useCallback(() => {
    if (editedFoods.length === 0) return;
    saveFood(editedFoods);
  }, [editedFoods, saveFood]);

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#0a0a0f', '#0d0d15', '#0a0a0f']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.permissionContent}>
          <View style={styles.permissionIconContainer}>
            <Camera size={48} color="#22c55e" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan your food and automatically track calories with AI-powered nutritional analysis
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
            <ImageIcon size={20} color="#6366f1" />
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (capturedImage && (analysis || analyzeMutation.isPending)) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0a0a0f', '#0d0d15', '#0a0a0f']}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={resetScan} style={styles.headerBtn} testID="reset-scan">
            <RotateCcw size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Food Analysis</Text>
            {analysis && (
              <View style={styles.headerBadgeRow}>
                <View style={[styles.confidenceDot, { backgroundColor: getHealthScoreColor(analysis.overallConfidence / 10) }]} />
                <Text style={styles.headerSubtitle}>
                  {getConfidenceLabel(analysis.overallConfidence)} confidence
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} testID="close-scan">
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,15,0.9)']}
              style={styles.imageOverlay}
            />
            {analysis?.cuisineType && analysis.cuisineType !== 'Mixed/Unknown' && (
              <View style={styles.cuisineBadge}>
                <Text style={styles.cuisineBadgeText}>{analysis.cuisineType}</Text>
              </View>
            )}
          </View>

          {analyzeMutation.isPending ? (
            <View style={styles.analyzingCard}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.analyzingIconBg}>
                  <Brain size={32} color="#22c55e" />
                </View>
              </Animated.View>
              <Text style={styles.analyzingTitle}>AI Nutritionist Analyzing...</Text>
              <Text style={styles.analyzingSubtitle}>{analysisStage}</Text>
              <View style={styles.analysisSteps}>
                {['Detecting', 'Portions', 'Macros', 'USDA', 'Done'].map((step, i) => {
                  const stageNames = [
                    'Detecting food items...',
                    'Estimating portions...',
                    'Calculating macronutrients...',
                    'Cross-referencing USDA data...',
                    'Finalizing analysis...',
                  ];
                  const isActive = analysisStage === stageNames[i];
                  const isPast = stageNames.indexOf(analysisStage) > i;
                  return (
                    <View key={step} style={styles.analysisStepItem}>
                      <View style={[
                        styles.analysisStepDot,
                        isPast && styles.analysisStepDotDone,
                        isActive && styles.analysisStepDotActive,
                      ]}>
                        {isPast && <Check size={8} color="#fff" />}
                      </View>
                      <Text style={[
                        styles.analysisStepText,
                        (isActive || isPast) && styles.analysisStepTextActive,
                      ]}>{step}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : analysis ? (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {showHealthInsight && analysis.healthNotes && (
                <View style={styles.healthInsightCard}>
                  <View style={styles.healthInsightHeader}>
                    <View style={styles.healthScoreBadge}>
                      <Text style={[styles.healthScoreText, { color: getHealthScoreColor(analysis.healthScore) }]}>
                        {analysis.healthScore}/10
                      </Text>
                    </View>
                    <View style={styles.healthInsightContent}>
                      <Text style={styles.healthInsightTitle}>Health Insight</Text>
                      <Text style={styles.healthInsightText}>{analysis.healthNotes}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowHealthInsight(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <X size={16} color="#555" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.mealTypeSelector}>
                <Text style={styles.sectionLabel}>Log to</Text>
                <TouchableOpacity
                  style={styles.mealTypeButton}
                  onPress={() => setShowMealPicker(!showMealPicker)}
                  testID="meal-type-picker"
                >
                  <Text style={styles.mealTypeEmoji}>
                    {MEAL_TYPES.find(m => m.value === selectedMealType)?.icon}
                  </Text>
                  <View style={styles.mealTypeInfo}>
                    <Text style={styles.mealTypeText}>
                      {MEAL_TYPES.find(m => m.value === selectedMealType)?.label}
                    </Text>
                    {analysis.mealTypeGuess?.toLowerCase() === selectedMealType && (
                      <View style={styles.aiSuggestedBadge}>
                        <Sparkles size={10} color="#a78bfa" />
                        <Text style={styles.aiSuggestedText}>AI suggested</Text>
                      </View>
                    )}
                  </View>
                  <ChevronDown size={18} color="#666" />
                </TouchableOpacity>

                {showMealPicker && (
                  <View style={styles.mealPickerDropdown}>
                    {MEAL_TYPES.map((meal) => (
                      <TouchableOpacity
                        key={meal.value}
                        style={[
                          styles.mealPickerItem,
                          selectedMealType === meal.value && styles.mealPickerItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedMealType(meal.value);
                          setShowMealPicker(false);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.mealPickerEmoji}>{meal.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mealPickerText}>{meal.label}</Text>
                          <Text style={styles.mealPickerTime}>{meal.timeRange}</Text>
                        </View>
                        {selectedMealType === meal.value && <Check size={18} color="#22c55e" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.totalCard}>
                <View style={styles.totalHeader}>
                  <Flame size={18} color="#f97316" />
                  <Text style={styles.totalTitle}>Total Nutrition</Text>
                  <Text style={styles.foodCountBadge}>{editedFoods.length} items</Text>
                </View>
                <View style={styles.totalGrid}>
                  <View style={styles.totalItem}>
                    <Flame size={14} color="#f97316" />
                    <Text style={[styles.totalValue, { color: '#f97316' }]}>{computedTotals.calories}</Text>
                    <Text style={styles.totalLabel}>Cal</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Beef size={14} color="#ef4444" />
                    <Text style={[styles.totalValue, { color: '#ef4444' }]}>{computedTotals.protein}g</Text>
                    <Text style={styles.totalLabel}>Protein</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Wheat size={14} color="#22c55e" />
                    <Text style={[styles.totalValue, { color: '#22c55e' }]}>{computedTotals.carbs}g</Text>
                    <Text style={styles.totalLabel}>Carbs</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Droplets size={14} color="#eab308" />
                    <Text style={[styles.totalValue, { color: '#eab308' }]}>{computedTotals.fat}g</Text>
                    <Text style={styles.totalLabel}>Fat</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Leaf size={14} color="#8b5cf6" />
                    <Text style={[styles.totalValue, { color: '#8b5cf6' }]}>{computedTotals.fiber}g</Text>
                    <Text style={styles.totalLabel}>Fiber</Text>
                  </View>
                </View>
              </View>

              <View style={styles.fixResultsSection}>
                <View style={styles.fixResultsLabelRow}>
                  <AlertCircle size={14} color="#888" />
                  <Text style={styles.fixResultsLabel}>Wrong results? Tell AI what to fix:</Text>
                </View>
                <View style={styles.fixResultsRow}>
                  <TextInput
                    style={styles.fixResultsInput}
                    value={correctionHint}
                    onChangeText={setCorrectionHint}
                    placeholder="e.g. 'That's keto bread, turkey bacon, almond milk'"
                    placeholderTextColor="#444"
                    testID="correction-input"
                  />
                  <TouchableOpacity
                    style={[styles.fixResultsBtn, !correctionHint.trim() && styles.fixResultsBtnDisabled]}
                    onPress={handleFixResults}
                    disabled={!correctionHint.trim() || analyzeMutation.isPending}
                    testID="fix-results-btn"
                  >
                    <RefreshCw size={18} color={correctionHint.trim() ? '#fff' : '#555'} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.sectionLabel}>
                Detected Foods ({editedFoods.length}) — Tap to expand
              </Text>

              {editedFoods.map((food, index) => {
                const isExpanded = expandedFoodIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.foodCard}
                    onPress={() => toggleFoodExpand(index)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.foodCardHeader}>
                      <View style={styles.foodNameRow}>
                        <View style={[styles.categoryDot, {
                          backgroundColor:
                            food.category === 'protein' ? '#ef4444' :
                            food.category === 'grain' ? '#eab308' :
                            food.category === 'vegetable' ? '#22c55e' :
                            food.category === 'fruit' ? '#f97316' :
                            food.category === 'dairy' ? '#3b82f6' :
                            food.category === 'fat' ? '#eab308' :
                            food.category === 'beverage' ? '#06b6d4' :
                            '#888',
                        }]} />
                        <View style={styles.foodNameContainer}>
                          <Text style={styles.foodName} numberOfLines={isExpanded ? undefined : 1}>
                            {food.name}
                          </Text>
                          <Text style={styles.foodServing}>{food.servingSize}</Text>
                        </View>
                        <View style={[
                          styles.confidenceBadge,
                          food.confidence >= 80 ? styles.confidenceHigh :
                          food.confidence >= 50 ? styles.confidenceMedium : styles.confidenceLow
                        ]}>
                          <Eye size={10} color={food.confidence >= 80 ? '#22c55e' : food.confidence >= 50 ? '#f59e0b' : '#ef4444'} />
                          <Text style={[styles.confidenceText, {
                            color: food.confidence >= 80 ? '#22c55e' : food.confidence >= 50 ? '#f59e0b' : '#ef4444',
                          }]}>{food.confidence}%</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFood(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.removeFoodBtn}
                      >
                        <X size={16} color="#555" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.foodMacros}>
                      <View style={styles.foodMacroItem}>
                        <Text style={styles.foodMacroLabel}>Cal</Text>
                        {isExpanded ? (
                          <TextInput
                            style={[styles.foodMacroInput, { color: '#f97316' }]}
                            value={food.calories.toString()}
                            onChangeText={(val) => updateFood(index, 'calories', parseInt(val) || 0)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={[styles.foodMacroValue, { color: '#f97316' }]}>{Math.round(food.calories)}</Text>
                        )}
                      </View>
                      <View style={styles.foodMacroItem}>
                        <Text style={styles.foodMacroLabel}>P</Text>
                        {isExpanded ? (
                          <TextInput
                            style={[styles.foodMacroInput, { color: '#ef4444' }]}
                            value={food.protein.toString()}
                            onChangeText={(val) => updateFood(index, 'protein', parseInt(val) || 0)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={[styles.foodMacroValue, { color: '#ef4444' }]}>{Math.round(food.protein)}g</Text>
                        )}
                      </View>
                      <View style={styles.foodMacroItem}>
                        <Text style={styles.foodMacroLabel}>C</Text>
                        {isExpanded ? (
                          <TextInput
                            style={[styles.foodMacroInput, { color: '#22c55e' }]}
                            value={food.carbs.toString()}
                            onChangeText={(val) => updateFood(index, 'carbs', parseInt(val) || 0)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={[styles.foodMacroValue, { color: '#22c55e' }]}>{Math.round(food.carbs)}g</Text>
                        )}
                      </View>
                      <View style={styles.foodMacroItem}>
                        <Text style={styles.foodMacroLabel}>F</Text>
                        {isExpanded ? (
                          <TextInput
                            style={[styles.foodMacroInput, { color: '#eab308' }]}
                            value={food.fat.toString()}
                            onChangeText={(val) => updateFood(index, 'fat', parseInt(val) || 0)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={[styles.foodMacroValue, { color: '#eab308' }]}>{Math.round(food.fat)}g</Text>
                        )}
                      </View>
                      <View style={styles.foodMacroItem}>
                        <Text style={styles.foodMacroLabel}>Fib</Text>
                        {isExpanded ? (
                          <TextInput
                            style={[styles.foodMacroInput, { color: '#8b5cf6' }]}
                            value={(food.fiber ?? 0).toString()}
                            onChangeText={(val) => updateFood(index, 'fiber', parseInt(val) || 0)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={[styles.foodMacroValue, { color: '#8b5cf6' }]}>{Math.round(food.fiber ?? 0)}g</Text>
                        )}
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        <View style={styles.expandedRow}>
                          <View style={styles.expandedMacro}>
                            <Text style={styles.expandedMacroLabel}>Sugar</Text>
                            <TextInput
                              style={styles.expandedMacroInput}
                              value={(food.sugar ?? 0).toString()}
                              onChangeText={(val) => updateFood(index, 'sugar', parseInt(val) || 0)}
                              keyboardType="numeric"
                            />
                            <Text style={styles.expandedMacroUnit}>g</Text>
                          </View>
                          <View style={styles.expandedMacro}>
                            <Text style={styles.expandedMacroLabel}>Sat Fat</Text>
                            <TextInput
                              style={styles.expandedMacroInput}
                              value={(food.saturatedFat ?? 0).toString()}
                              onChangeText={(val) => updateFood(index, 'saturatedFat', parseInt(val) || 0)}
                              keyboardType="numeric"
                            />
                            <Text style={styles.expandedMacroUnit}>g</Text>
                          </View>
                          <View style={styles.expandedMacro}>
                            <Text style={styles.expandedMacroLabel}>Sodium</Text>
                            <TextInput
                              style={styles.expandedMacroInput}
                              value={(food.sodium ?? 0).toString()}
                              onChangeText={(val) => updateFood(index, 'sodium', parseInt(val) || 0)}
                              keyboardType="numeric"
                            />
                            <Text style={styles.expandedMacroUnit}>mg</Text>
                          </View>
                        </View>

                        <View style={styles.expandedNameEdit}>
                          <Text style={styles.expandedEditLabel}>Food Name</Text>
                          <TextInput
                            style={styles.expandedEditInput}
                            value={food.name}
                            onChangeText={(val) => updateFood(index, 'name', val)}
                            placeholder="Food name"
                            placeholderTextColor="#555"
                          />
                        </View>
                        <View style={styles.expandedNameEdit}>
                          <Text style={styles.expandedEditLabel}>Serving Size</Text>
                          <TextInput
                            style={styles.expandedEditInput}
                            value={food.servingSize}
                            onChangeText={(val) => updateFood(index, 'servingSize', val)}
                            placeholder="Serving size"
                            placeholderTextColor="#555"
                          />
                        </View>

                        {food.portionNotes ? (
                          <View style={styles.portionNoteRow}>
                            <Scale size={12} color="#666" />
                            <Text style={styles.portionNoteText}>{food.portionNotes}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {editedFoods.length === 0 && (
                <View style={styles.emptyState}>
                  <AlertCircle size={32} color="#666" />
                  <Text style={styles.emptyStateText}>All items removed. Retake photo or go back.</Text>
                </View>
              )}
            </Animated.View>
          ) : null}
        </ScrollView>

        {analysis && editedFoods.length > 0 && (
          <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.bottomSummary}>
              <Text style={styles.bottomSummaryText}>
                {computedTotals.calories} cal • {computedTotals.protein}g P • {computedTotals.carbs}g C • {computedTotals.fat}g F
              </Text>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saveMutation.isPending}
              activeOpacity={0.85}
              testID="save-food-log"
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ShieldCheck size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    Log {editedFoods.length} {editedFoods.length === 1 ? 'Item' : 'Items'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.cameraHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} testID="close-camera">
            <X size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.cameraTitleGroup}>
            <Text style={styles.cameraTitle}>AI Food Scanner</Text>
            <Text style={styles.cameraSubtitle}>Point at your food</Text>
          </View>
          <View style={styles.closeBtnPlaceholder} />
        </View>

        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
          <View style={styles.scanHintContainer}>
            <Brain size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.scanHint}>Include the full plate for best accuracy</Text>
          </View>
        </View>

        <View style={styles.tipsBanner}>
          <Info size={14} color="#22c55e" />
          <Text style={styles.tipText}>Tip: Good lighting + full plate = better results</Text>
        </View>

        <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity style={styles.galleryIconButton} onPress={pickImage} testID="pick-image">
            <ImageIcon size={26} color="#fff" />
            <Text style={styles.controlLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture} activeOpacity={0.85} testID="capture-btn">
            <View style={styles.captureButtonOuter}>
              <View style={styles.captureButtonInner}>
                <Camera size={28} color="#0a0a0f" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.controlPlaceholder}>
            <Sparkles size={22} color="rgba(255,255,255,0.4)" />
            <Text style={[styles.controlLabel, { color: 'rgba(255,255,255,0.4)' }]}>AI Scan</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPlaceholder: {
    width: 44,
  },
  cameraTitleGroup: {
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cameraSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#22c55e',
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scanHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
  },
  tipsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500' as const,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
  },
  galleryIconButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontWeight: '500' as const,
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPlaceholder: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  galleryButtonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500' as const,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
  },
  imagePreviewContainer: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  cuisineBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cuisineBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600' as const,
  },
  analyzingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.1)',
  },
  analyzingIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: '#22c55e',
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  analysisSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  analysisStepItem: {
    alignItems: 'center',
    gap: 6,
  },
  analysisStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisStepDotActive: {
    backgroundColor: 'rgba(34,197,94,0.3)',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  analysisStepDotDone: {
    backgroundColor: '#22c55e',
  },
  analysisStepText: {
    fontSize: 9,
    color: '#555',
    fontWeight: '500' as const,
  },
  analysisStepTextActive: {
    color: '#aaa',
  },
  healthInsightCard: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  healthInsightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  healthScoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreText: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  healthInsightContent: {
    flex: 1,
  },
  healthInsightTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#22c55e',
    marginBottom: 4,
  },
  healthInsightText: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  mealTypeSelector: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  mealTypeEmoji: {
    fontSize: 22,
  },
  mealTypeInfo: {
    flex: 1,
  },
  mealTypeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  aiSuggestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  aiSuggestedText: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: '500' as const,
  },
  mealPickerDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mealPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  mealPickerItemSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  mealPickerEmoji: {
    fontSize: 20,
  },
  mealPickerText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
  mealPickerTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  totalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  totalTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
  },
  foodCountBadge: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500' as const,
  },
  totalGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  totalDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  totalLabel: {
    fontSize: 10,
    color: '#666',
  },
  fixResultsSection: {
    marginBottom: 20,
  },
  fixResultsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  fixResultsLabel: {
    fontSize: 13,
    color: '#888',
  },
  fixResultsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fixResultsInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fixResultsBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixResultsBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  foodCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  foodNameContainer: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  foodServing: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceHigh: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  confidenceMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  confidenceLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  removeFoodBtn: {
    padding: 4,
  },
  foodMacros: {
    flexDirection: 'row',
    gap: 6,
  },
  foodMacroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  foodMacroLabel: {
    fontSize: 9,
    color: '#555',
    marginBottom: 4,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  foodMacroValue: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  foodMacroInput: {
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    minWidth: 36,
    paddingVertical: 0,
  },
  expandedSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  expandedRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  expandedMacro: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  expandedMacroLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500' as const,
  },
  expandedMacroInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 0,
  },
  expandedMacroUnit: {
    fontSize: 10,
    color: '#555',
  },
  expandedNameEdit: {
    marginBottom: 10,
  },
  expandedEditLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500' as const,
  },
  expandedEditInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  portionNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  portionNoteText: {
    fontSize: 12,
    color: '#777',
    lineHeight: 16,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(10, 10, 15, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  bottomSummary: {
    alignItems: 'center',
    marginBottom: 10,
  },
  bottomSummaryText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500' as const,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 18,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
