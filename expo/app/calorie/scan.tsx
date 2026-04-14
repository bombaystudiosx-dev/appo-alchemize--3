import React, { useState, useRef, useCallback } from 'react';
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
} from 'lucide-react-native';
import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';
import { foodLogsDb, appointmentsDb } from '@/lib/database';
import type { FoodLog, MealType, Appointment } from '@/types';

const FoodAnalysisSchema = z.object({
  foods: z.array(z.object({
    name: z.string().describe('Name of the food item'),
    servingSize: z.string().describe('Estimated serving size (e.g., "1 cup", "100g", "1 medium")'),
    calories: z.number().describe('Estimated calories'),
    protein: z.number().describe('Estimated protein in grams'),
    carbs: z.number().describe('Estimated carbohydrates in grams'),
    fat: z.number().describe('Estimated fat in grams'),
    fiber: z.number().describe('Estimated fiber in grams'),
    confidence: z.number().min(0).max(100).describe('Confidence level 0-100'),
  })),
  totalCalories: z.number().describe('Total calories for all foods'),
  totalProtein: z.number().describe('Total protein for all foods'),
  totalCarbs: z.number().describe('Total carbs for all foods'),
  totalFat: z.number().describe('Total fat for all foods'),
  totalFiber: z.number().describe('Total fiber for all foods'),
});

type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch', label: 'Lunch', icon: '☀️' },
  { value: 'dinner', label: 'Dinner', icon: '🌙' },
  { value: 'snack', label: 'Snack', icon: '🍎' },
];

export default function FoodScannerScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('lunch');
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [editedFoods, setEditedFoods] = useState<FoodAnalysis['foods']>([]);
  const [correctionHint, setCorrectionHint] = useState('');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const analyzeMutation = useMutation({
    mutationFn: async ({ imageBase64, hint }: { imageBase64: string; hint?: string }) => {
      startPulse();
      const basePrompt = `Analyze this food image and identify all food items visible. For each item, estimate:
- Name of the food
- Serving size
- Calories
- Protein (grams)
- Carbohydrates (grams)
- Fat (grams)
- Fiber (grams)
- Your confidence level (0-100)

Be as accurate as possible with portion estimation. If you see a plate, estimate based on typical serving sizes. Include all visible food items.`;
      
      const correctionPrompt = hint 
        ? `${basePrompt}\n\nIMPORTANT CORRECTION from user: ${hint}\nPlease adjust your analysis based on this correction. For example, if they say "keto bread" use low-carb values, if "turkey bacon" use turkey nutrition values, etc.`
        : basePrompt;
      
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: correctionPrompt,
              },
              {
                type: 'image',
                image: imageBase64,
              },
            ],
          },
        ],
        schema: FoodAnalysisSchema,
      });
      return result;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setEditedFoods(data.foods.map(f => ({ ...f, fiber: f.fiber ?? 0 })));
      setCorrectionHint('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      Alert.alert('Analysis Failed', 'Could not analyze the image. Please try again.');
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
        calories: food.calories,
        proteinGrams: food.protein,
        carbGrams: food.carbs,
        fatGrams: food.fat,
        sugarGrams: null,
        fiberGrams: food.fiber ?? null,
        mealType: selectedMealType,
        sourceType: 'camera',
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
          notes: `${log.calories} cal | P: ${log.proteinGrams || 0}g C: ${log.carbGrams || 0}g F: ${log.fatGrams || 0}g`,
          reminder: false,
          createdAt: Date.now(),
          metadata: JSON.stringify({
            foodLogId: log.id,
            calories: log.calories,
            protein: log.proteinGrams,
            carbs: log.carbGrams,
            fat: log.fatGrams,
            fiber: log.fiberGrams,
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
        quality: 0.7,
      });
      
      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
        analyzeImage({ imageBase64: photo.base64 });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  }, [analyzeImage]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFixResults = useCallback(() => {
    if (!capturedImage || !correctionHint.trim()) return;
    const base64 = capturedImage.replace('data:image/jpeg;base64,', '');
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
            Allow camera access to scan your food and automatically track calories with AI
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
          <TouchableOpacity onPress={resetScan} style={styles.headerBtn}>
            <RotateCcw size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food Analysis</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.resultsScroll}
          contentContainerStyle={[styles.resultsContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: capturedImage }} style={styles.previewImage} contentFit="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,15,0.8)']}
              style={styles.imageOverlay}
            />
          </View>

          {analyzeMutation.isPending ? (
            <View style={styles.analyzingCard}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <View style={styles.analyzingIconBg}>
                  <Sparkles size={28} color="#22c55e" />
                </View>
              </Animated.View>
              <Text style={styles.analyzingTitle}>Analyzing your food...</Text>
              <Text style={styles.analyzingSubtitle}>AI is identifying ingredients and calculating nutrition</Text>
              <ActivityIndicator size="small" color="#22c55e" style={{ marginTop: 16 }} />
            </View>
          ) : analysis ? (
            <>
              <View style={styles.mealTypeSelector}>
                <Text style={styles.sectionLabel}>Log to</Text>
                <TouchableOpacity 
                  style={styles.mealTypeButton}
                  onPress={() => setShowMealPicker(!showMealPicker)}
                >
                  <Text style={styles.mealTypeEmoji}>
                    {MEAL_TYPES.find(m => m.value === selectedMealType)?.icon}
                  </Text>
                  <Text style={styles.mealTypeText}>
                    {MEAL_TYPES.find(m => m.value === selectedMealType)?.label}
                  </Text>
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
                        <Text style={styles.mealPickerText}>{meal.label}</Text>
                        {selectedMealType === meal.value && <Check size={18} color="#22c55e" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.totalCard}>
                <View style={styles.totalHeader}>
                  <Zap size={18} color="#22c55e" />
                  <Text style={styles.totalTitle}>Total Nutrition</Text>
                </View>
                <View style={styles.totalGrid}>
                  <View style={styles.totalItem}>
                    <Text style={styles.totalValue}>
                      {editedFoods.reduce((sum, f) => sum + f.calories, 0)}
                    </Text>
                    <Text style={styles.totalLabel}>Calories</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: '#ef4444' }]}>
                      {editedFoods.reduce((sum, f) => sum + f.protein, 0)}g
                    </Text>
                    <Text style={styles.totalLabel}>Protein</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: '#22c55e' }]}>
                      {editedFoods.reduce((sum, f) => sum + f.carbs, 0)}g
                    </Text>
                    <Text style={styles.totalLabel}>Carbs</Text>
                  </View>
                  <View style={styles.totalDivider} />
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: '#eab308' }]}>
                      {editedFoods.reduce((sum, f) => sum + f.fat, 0)}g
                    </Text>
                    <Text style={styles.totalLabel}>Fat</Text>
                  </View>
                </View>
              </View>

              <View style={styles.fixResultsSection}>
                <Text style={styles.fixResultsLabel}>Wrong results? Describe corrections:</Text>
                <View style={styles.fixResultsRow}>
                  <TextInput
                    style={styles.fixResultsInput}
                    value={correctionHint}
                    onChangeText={setCorrectionHint}
                    placeholder="e.g. 'keto bread, turkey bacon'"
                    placeholderTextColor="#555"
                  />
                  <TouchableOpacity
                    style={[styles.fixResultsBtn, !correctionHint.trim() && styles.fixResultsBtnDisabled]}
                    onPress={handleFixResults}
                    disabled={!correctionHint.trim() || analyzeMutation.isPending}
                  >
                    <RefreshCw size={18} color={correctionHint.trim() ? '#fff' : '#666'} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Detected Foods ({editedFoods.length}) - Tap to edit</Text>
              {editedFoods.map((food, index) => (
                <View key={index} style={styles.foodCard}>
                  <View style={styles.foodCardHeader}>
                    <View style={styles.foodNameRow}>
                      <TextInput
                        style={styles.foodNameInput}
                        value={food.name}
                        onChangeText={(val) => updateFood(index, 'name', val)}
                        placeholder="Food name"
                        placeholderTextColor="#666"
                      />
                      <View style={[
                        styles.confidenceBadge,
                        food.confidence >= 80 ? styles.confidenceHigh :
                        food.confidence >= 50 ? styles.confidenceMedium : styles.confidenceLow
                      ]}>
                        <Text style={styles.confidenceText}>{food.confidence}%</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeFood(index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <X size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.foodServingInput}
                    value={food.servingSize}
                    onChangeText={(val) => updateFood(index, 'servingSize', val)}
                    placeholder="Serving size"
                    placeholderTextColor="#555"
                  />
                  
                  <View style={styles.foodMacros}>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroLabel}>Cal</Text>
                      <TextInput
                        style={styles.foodMacroInput}
                        value={food.calories.toString()}
                        onChangeText={(val) => updateFood(index, 'calories', parseInt(val) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroLabel}>P</Text>
                      <TextInput
                        style={[styles.foodMacroInput, { color: '#ef4444' }]}
                        value={food.protein.toString()}
                        onChangeText={(val) => updateFood(index, 'protein', parseInt(val) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroLabel}>C</Text>
                      <TextInput
                        style={[styles.foodMacroInput, { color: '#22c55e' }]}
                        value={food.carbs.toString()}
                        onChangeText={(val) => updateFood(index, 'carbs', parseInt(val) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroLabel}>F</Text>
                      <TextInput
                        style={[styles.foodMacroInput, { color: '#eab308' }]}
                        value={food.fat.toString()}
                        onChangeText={(val) => updateFood(index, 'fat', parseInt(val) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.foodMacroItem}>
                      <Text style={styles.foodMacroLabel}>Fib</Text>
                      <TextInput
                        style={[styles.foodMacroInput, { color: '#8b5cf6' }]}
                        value={(food.fiber ?? 0).toString()}
                        onChangeText={(val) => updateFood(index, 'fiber', parseInt(val) || 0)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              ))}

              {editedFoods.length === 0 && (
                <View style={styles.emptyState}>
                  <AlertCircle size={32} color="#666" />
                  <Text style={styles.emptyStateText}>All items removed. Retake photo or go back.</Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>

        {analysis && editedFoods.length > 0 && (
          <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saveMutation.isPending}
              activeOpacity={0.85}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check size={22} color="#fff" />
                  <Text style={styles.saveButtonText}>Log {editedFoods.length} {editedFoods.length === 1 ? 'Item' : 'Items'}</Text>
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
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Scan Food</Text>
          <View style={styles.closeBtnPlaceholder} />
        </View>

        <View style={styles.scanFrameContainer}>
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>
          <Text style={styles.scanHint}>Position your food in the frame</Text>
        </View>

        <View style={[styles.cameraControls, { paddingBottom: insets.bottom + 32 }]}>
          <TouchableOpacity style={styles.galleryIconButton} onPress={pickImage}>
            <ImageIcon size={26} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.captureButton} onPress={takePicture} activeOpacity={0.85}>
            <View style={styles.captureButtonOuter}>
              <View style={styles.captureButtonInner} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.controlPlaceholder} />
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
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
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
  scanHint: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 24,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  controlPlaceholder: {
    width: 56,
    height: 56,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
  },
  imagePreviewContainer: {
    height: 180,
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
    height: 60,
  },
  analyzingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
  },
  analyzingIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  mealTypeSelector: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    textTransform: 'uppercase',
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
  mealTypeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
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
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
  totalCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
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
    color: '#22c55e',
  },
  totalGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  totalLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  foodCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  foodName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceHigh: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  confidenceMedium: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  confidenceLow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#fff',
  },
  foodServing: {
    fontSize: 14,
    color: '#666',
    marginBottom: 14,
  },
  foodServingInput: {
    fontSize: 14,
    color: '#888',
    marginBottom: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  foodNameInput: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  fixResultsSection: {
    marginBottom: 20,
  },
  fixResultsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  fixResultsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  fixResultsInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  foodMacros: {
    flexDirection: 'row',
    gap: 8,
  },
  foodMacroItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  foodMacroLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500' as const,
  },
  
  foodMacroInput: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#22c55e',
    textAlign: 'center',
    minWidth: 40,
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
    paddingTop: 16,
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
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
