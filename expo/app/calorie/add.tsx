import React, { useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  ChevronDown,
  Check,
  Zap,
  Search,
} from 'lucide-react-native';
import { foodLogsDb, appointmentsDb } from '@/lib/database';
import type { FoodLog, MealType, Appointment } from '@/types';

const MEAL_TYPES: { value: MealType; label: string; icon: string; color: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅', color: '#fbbf24' },
  { value: 'lunch', label: 'Lunch', icon: '☀️', color: '#22c55e' },
  { value: 'dinner', label: 'Dinner', icon: '🌙', color: '#6366f1' },
  { value: 'snack', label: 'Snack', icon: '🍎', color: '#ec4899' },
];

const QUICK_FOODS = [
  { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0, emoji: '🍌' },
  { name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0, emoji: '🍎' },
  { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 4, emoji: '🍗' },
  { name: 'Brown Rice', calories: 216, protein: 5, carbs: 45, fat: 2, emoji: '🍚' },
  { name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 1, emoji: '🥛' },
  { name: 'Egg', calories: 78, protein: 6, carbs: 1, fat: 5, emoji: '🥚' },
  { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, emoji: '🐟' },
  { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, emoji: '🥑' },
  { name: 'Oatmeal', calories: 150, protein: 5, carbs: 27, fat: 3, emoji: '🥣' },
  { name: 'Sweet Potato', calories: 103, protein: 2, carbs: 24, fat: 0, emoji: '🍠' },
];

export default function AddMealScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: string }>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const initialMealType = (params.meal as MealType) || 'lunch';
  
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const createMutation = useMutation({
    mutationFn: async (foodLog: FoodLog) => {
      if (Platform.OS === 'web') return;
      
      const calendarEventId = `cal-${Date.now()}`;
      const loggedDate = new Date(foodLog.loggedAt);
      const timeStr = loggedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      const calendarEvent: Appointment = {
        id: calendarEventId,
        title: `${foodLog.foodName} (${foodLog.mealType})`,
        date: new Date(loggedDate.getFullYear(), loggedDate.getMonth(), loggedDate.getDate()).getTime(),
        time: timeStr,
        category: 'nutrition',
        notes: `${foodLog.calories} cal | P: ${foodLog.proteinGrams || 0}g C: ${foodLog.carbGrams || 0}g F: ${foodLog.fatGrams || 0}g`,
        reminder: false,
        createdAt: Date.now(),
        metadata: JSON.stringify({
          foodLogId: foodLog.id,
          calories: foodLog.calories,
          protein: foodLog.proteinGrams,
          carbs: foodLog.carbGrams,
          fat: foodLog.fatGrams,
          fiber: foodLog.fiberGrams,
          source: foodLog.sourceType,
          isLocked: foodLog.isLocked,
        }),
      };
      
      await appointmentsDb.create(calendarEvent);
      
      const updatedFoodLog = { ...foodLog, calendarEventId };
      return foodLogsDb.create(updatedFoodLog);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foodLogs'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const { mutate: createFood } = createMutation;

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }
    if (!calories.trim() || isNaN(parseFloat(calories))) {
      Alert.alert('Error', 'Please enter valid calories');
      return;
    }

    const foodLog: FoodLog = {
      id: Date.now().toString(),
      foodName: name.trim(),
      servingDescription: servingSize.trim() || '1 serving',
      calories: parseFloat(calories),
      proteinGrams: protein ? parseFloat(protein) : null,
      carbGrams: carbs ? parseFloat(carbs) : null,
      fatGrams: fat ? parseFloat(fat) : null,
      sugarGrams: null,
      fiberGrams: null,
      mealType,
      sourceType: 'manual',
      loggedAt: Date.now(),
      isLocked: true,
      calendarEventId: null,
    };

    createFood(foodLog);
  }, [name, calories, protein, carbs, fat, servingSize, mealType, createFood]);

  const handleQuickFood = useCallback((food: typeof QUICK_FOODS[0]) => {
    setName(food.name);
    setCalories(food.calories.toString());
    setProtein(food.protein.toString());
    setCarbs(food.carbs.toString());
    setFat(food.fat.toString());
    setServingSize('1 serving');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const filteredFoods = QUICK_FOODS.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMeal = MEAL_TYPES.find(m => m.value === mealType);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#0d0d15', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mealTypeSection}>
          <Text style={styles.sectionLabel}>Log to</Text>
          <TouchableOpacity
            style={[styles.mealTypeButton, { borderColor: `${selectedMeal?.color}40` }]}
            onPress={() => setShowMealPicker(!showMealPicker)}
          >
            <View style={[styles.mealIconBg, { backgroundColor: `${selectedMeal?.color}20` }]}>
              <Text style={styles.mealTypeEmoji}>{selectedMeal?.icon}</Text>
            </View>
            <Text style={styles.mealTypeText}>{selectedMeal?.label}</Text>
            <ChevronDown size={18} color="#666" />
          </TouchableOpacity>
          
          {showMealPicker && (
            <View style={styles.mealPickerDropdown}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.value}
                  style={[
                    styles.mealPickerItem,
                    mealType === meal.value && styles.mealPickerItemSelected,
                  ]}
                  onPress={() => {
                    setMealType(meal.value);
                    setShowMealPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.mealPickerEmoji}>{meal.icon}</Text>
                  <Text style={styles.mealPickerText}>{meal.label}</Text>
                  {mealType === meal.value && <Check size={18} color="#22c55e" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.quickSection}>
          <Text style={styles.sectionLabel}>Quick Add</Text>
          <View style={styles.searchContainer}>
            <Search size={18} color="#666" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search foods..."
              placeholderTextColor="#555"
            />
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFoodsContainer}
          >
            {filteredFoods.map((food, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickFoodCard}
                onPress={() => handleQuickFood(food)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickFoodEmoji}>{food.emoji}</Text>
                <Text style={styles.quickFoodName}>{food.name}</Text>
                <Text style={styles.quickFoodCal}>{food.calories} cal</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>Food Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Food Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Grilled Chicken Salad"
              placeholderTextColor="#444"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Serving Size</Text>
              <TextInput
                style={styles.input}
                value={servingSize}
                onChangeText={setServingSize}
                placeholder="e.g., 1 cup"
                placeholderTextColor="#444"
              />
            </View>
          </View>
        </View>

        <View style={styles.macrosSection}>
          <Text style={styles.sectionLabel}>Macros (optional)</Text>
          
          <View style={styles.macrosGrid}>
            <View style={styles.macroCard}>
              <View style={[styles.macroDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.macroLabel}>Protein</Text>
              <TextInput
                style={styles.macroInput}
                value={protein}
                onChangeText={setProtein}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroDot, { backgroundColor: '#22c55e' }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              <TextInput
                style={styles.macroInput}
                value={carbs}
                onChangeText={setCarbs}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>

            <View style={styles.macroCard}>
              <View style={[styles.macroDot, { backgroundColor: '#eab308' }]} />
              <Text style={styles.macroLabel}>Fat</Text>
              <TextInput
                style={styles.macroInput}
                value={fat}
                onChangeText={setFat}
                placeholder="0"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        </View>

        {(name || calories || protein || carbs || fat) && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Zap size={18} color="#22c55e" />
              <Text style={styles.previewTitle}>Nutrition Preview</Text>
            </View>
            <View style={styles.previewGrid}>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>{calories || 0}</Text>
                <Text style={styles.previewLabel}>Calories</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewItem}>
                <Text style={[styles.previewValue, { color: '#ef4444' }]}>{protein || 0}g</Text>
                <Text style={styles.previewLabel}>Protein</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewItem}>
                <Text style={[styles.previewValue, { color: '#22c55e' }]}>{carbs || 0}g</Text>
                <Text style={styles.previewLabel}>Carbs</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewItem}>
                <Text style={[styles.previewValue, { color: '#eab308' }]}>{fat || 0}g</Text>
                <Text style={styles.previewLabel}>Fat</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={createMutation.isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {createMutation.isPending ? 'Saving...' : 'Log Food'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  mealTypeSection: {
    marginBottom: 24,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  mealIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeEmoji: {
    fontSize: 20,
  },
  mealTypeText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  mealPickerDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    borderRadius: 16,
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
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  mealPickerEmoji: {
    fontSize: 22,
  },
  mealPickerText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
  quickSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#fff',
  },
  quickFoodsContainer: {
    gap: 10,
    paddingRight: 20,
  },
  quickFoodCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    minWidth: 90,
  },
  quickFoodEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickFoodName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickFoodCal: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '500' as const,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macrosSection: {
    marginBottom: 24,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500' as const,
    marginBottom: 10,
  },
  macroInput: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    minWidth: 50,
  },
  macroUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  previewCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderRadius: 20,
    padding: 18,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#22c55e',
  },
  previewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewItem: {
    flex: 1,
    alignItems: 'center',
  },
  previewDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  previewLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
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
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
