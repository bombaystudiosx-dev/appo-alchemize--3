import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  Plus, 
  X, 
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Calendar,
  Flame,
} from 'lucide-react-native';
import { mealPrepPlansDb } from '@/lib/database';
import type { MealPrepPlan, MealType } from '@/types';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MEAL_SLOTS: { type: MealType; label: string; icon: string; color: string }[] = [
  { type: 'breakfast', label: 'Breakfast', icon: '🌅', color: '#fbbf24' },
  { type: 'lunch', label: 'Lunch', icon: '☀️', color: '#22c55e' },
  { type: 'dinner', label: 'Dinner', icon: '🌙', color: '#6366f1' },
  { type: 'snack', label: 'Snack', icon: '🍎', color: '#ec4899' },
];

function getWeekStart(date: Date): number {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
}

export default function MealPrepScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealPrepPlan | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [notes, setNotes] = useState('');

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['mealPrepPlans', selectedWeek],
    queryFn: async () => {
      if (Platform.OS === 'web') return [];
      return mealPrepPlansDb.getByWeek(selectedWeek);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (plan: MealPrepPlan) => {
      if (Platform.OS === 'web') return;
      return mealPrepPlansDb.create(plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPrepPlans'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (plan: MealPrepPlan) => {
      if (Platform.OS === 'web') return;
      return mealPrepPlansDb.update(plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPrepPlans'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (Platform.OS === 'web') return;
      return mealPrepPlansDb.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPrepPlans'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (plan: MealPrepPlan) => {
      if (Platform.OS === 'web') return;
      return mealPrepPlansDb.update({ ...plan, isCompleted: !plan.isCompleted });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealPrepPlans'] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const { mutate: createMeal } = createMutation;
  const { mutate: updateMeal } = updateMutation;
  const { mutate: deleteMeal } = deleteMutation;

  const dayMeals = useMemo(() => {
    return mealPlans.filter(p => p.dayOfWeek === selectedDay);
  }, [mealPlans, selectedDay]);

  const weekTotals = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    mealPlans.forEach(p => {
      totals.calories += p.calories;
      totals.protein += p.protein || 0;
      totals.carbs += p.carbs || 0;
      totals.fat += p.fat || 0;
      totals.meals += 1;
    });
    return totals;
  }, [mealPlans]);

  const dayTotals = useMemo(() => {
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dayMeals.forEach(p => {
      totals.calories += p.calories;
      totals.protein += p.protein || 0;
      totals.carbs += p.carbs || 0;
      totals.fat += p.fat || 0;
    });
    return totals;
  }, [dayMeals]);

  const navigateWeek = useCallback((direction: number) => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setSelectedWeek(newWeek.getTime());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedWeek]);

  const openAddModal = useCallback((mealType: MealType, existingMeal?: MealPrepPlan) => {
    setSelectedMealType(mealType);
    if (existingMeal) {
      setEditingMeal(existingMeal);
      setFoodName(existingMeal.foodName);
      setCalories(existingMeal.calories.toString());
      setProtein(existingMeal.protein?.toString() || '');
      setCarbs(existingMeal.carbs?.toString() || '');
      setFat(existingMeal.fat?.toString() || '');
      setServingSize(existingMeal.servingSize);
      setNotes(existingMeal.notes);
    } else {
      setEditingMeal(null);
      setFoodName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setServingSize('');
      setNotes('');
    }
    setShowAddModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowAddModal(false);
    setEditingMeal(null);
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setServingSize('');
    setNotes('');
  }, []);

  const handleSave = useCallback(() => {
    if (!foodName.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }
    if (!calories || isNaN(parseFloat(calories))) {
      Alert.alert('Error', 'Please enter valid calories');
      return;
    }

    const plan: MealPrepPlan = {
      id: editingMeal?.id || Date.now().toString(),
      weekStartDate: selectedWeek,
      dayOfWeek: selectedDay,
      mealType: selectedMealType,
      foodName: foodName.trim(),
      calories: parseFloat(calories),
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fat: fat ? parseFloat(fat) : null,
      servingSize: servingSize.trim(),
      notes: notes.trim(),
      isCompleted: editingMeal?.isCompleted || false,
      createdAt: editingMeal?.createdAt || Date.now(),
    };

    if (editingMeal) {
      updateMeal(plan);
    } else {
      createMeal(plan);
    }
  }, [foodName, calories, protein, carbs, fat, servingSize, notes, selectedWeek, selectedDay, selectedMealType, editingMeal, createMeal, updateMeal]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMeal(id) },
      ]
    );
  }, [deleteMeal]);

  const getMealsForSlot = useCallback((mealType: MealType) => {
    return dayMeals.filter(m => m.mealType === mealType);
  }, [dayMeals]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#0d0d15', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.weekNavBtn}>
            <ChevronLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.weekDisplay}>
            <Calendar size={16} color="#22c55e" />
            <Text style={styles.weekText}>{formatWeekRange(selectedWeek)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.weekNavBtn}>
            <ChevronRight size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.daySelector}>
          {DAYS.map((day, index) => {
            const hasMeals = mealPlans.some(p => p.dayOfWeek === index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayBtn, selectedDay === index && styles.dayBtnSelected]}
                onPress={() => {
                  setSelectedDay(index);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.dayBtnText, selectedDay === index && styles.dayBtnTextSelected]}>
                  {day}
                </Text>
                {hasMeals && <View style={[styles.dayDot, selectedDay === index && styles.dayDotSelected]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{FULL_DAYS[selectedDay]}</Text>
          <View style={styles.dayStats}>
            <Flame size={16} color="#f97316" />
            <Text style={styles.dayCalories}>{Math.round(dayTotals.calories)} cal</Text>
          </View>
        </View>

        {MEAL_SLOTS.map((slot) => {
          const meals = getMealsForSlot(slot.type);
          const slotCalories = meals.reduce((sum, m) => sum + m.calories, 0);
          
          return (
            <View key={slot.type} style={styles.mealSlot}>
              <View style={styles.mealSlotHeader}>
                <View style={styles.mealSlotTitleRow}>
                  <View style={[styles.mealSlotIconBg, { backgroundColor: `${slot.color}20` }]}>
                    <Text style={styles.mealSlotIcon}>{slot.icon}</Text>
                  </View>
                  <View>
                    <Text style={styles.mealSlotLabel}>{slot.label}</Text>
                    {slotCalories > 0 && (
                      <Text style={styles.mealSlotCalories}>{slotCalories} cal</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: `${slot.color}20` }]}
                  onPress={() => openAddModal(slot.type)}
                >
                  <Plus size={18} color={slot.color} />
                </TouchableOpacity>
              </View>
              
              {meals.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptySlot}
                  onPress={() => openAddModal(slot.type)}
                >
                  <Text style={styles.emptySlotText}>+ Add {slot.label.toLowerCase()}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.mealsContainer}>
                  {meals.map((meal) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={[styles.mealCard, meal.isCompleted && styles.mealCardCompleted]}
                      onPress={() => openAddModal(slot.type, meal)}
                      activeOpacity={0.7}
                    >
                      <TouchableOpacity
                        style={[styles.checkbox, meal.isCompleted && { backgroundColor: slot.color, borderColor: slot.color }]}
                        onPress={() => toggleCompleteMutation.mutate(meal)}
                      >
                        {meal.isCompleted && <Check size={14} color="#fff" />}
                      </TouchableOpacity>
                      
                      <View style={styles.mealCardContent}>
                        <Text style={[styles.mealName, meal.isCompleted && styles.mealNameCompleted]}>
                          {meal.foodName}
                        </Text>
                        <View style={styles.mealMeta}>
                          <Text style={styles.mealCaloriesText}>{meal.calories} cal</Text>
                          {!!meal.protein && <Text style={styles.mealMacroText}>• {meal.protein}g P</Text>}
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => handleDelete(meal.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={16} color="#666" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.weekSummary}>
          <Text style={styles.weekSummaryTitle}>Week Overview</Text>
          <View style={styles.weekSummaryGrid}>
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryValue}>{Math.round(weekTotals.calories / 7)}</Text>
              <Text style={styles.weekSummaryLabel}>Avg Cal/Day</Text>
            </View>
            <View style={styles.weekSummaryDivider} />
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryValue}>{weekTotals.meals}</Text>
              <Text style={styles.weekSummaryLabel}>Meals Planned</Text>
            </View>
            <View style={styles.weekSummaryDivider} />
            <View style={styles.weekSummaryItem}>
              <Text style={styles.weekSummaryValue}>{Math.round(weekTotals.protein / 7)}g</Text>
              <Text style={styles.weekSummaryLabel}>Avg Protein</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMeal ? 'Edit Meal' : 'Add Meal'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalMealInfo}>
                <Text style={styles.modalMealIcon}>
                  {MEAL_SLOTS.find(s => s.type === selectedMealType)?.icon}
                </Text>
                <Text style={styles.modalMealLabel}>
                  {MEAL_SLOTS.find(s => s.type === selectedMealType)?.label} • {FULL_DAYS[selectedDay]}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Name</Text>
                <TextInput
                  style={styles.input}
                  value={foodName}
                  onChangeText={setFoodName}
                  placeholder="e.g., Grilled Chicken Salad"
                  placeholderTextColor="#444"
                />
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
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
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>Serving Size</Text>
                  <TextInput
                    style={styles.input}
                    value={servingSize}
                    onChangeText={setServingSize}
                    placeholder="e.g., 1 bowl"
                    placeholderTextColor="#444"
                  />
                </View>
              </View>

              <Text style={styles.macroSectionTitle}>Macros (optional)</Text>
              <View style={styles.inputRow}>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>Protein</Text>
                  <TextInput
                    style={styles.input}
                    value={protein}
                    onChangeText={setProtein}
                    placeholder="0g"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>Carbs</Text>
                  <TextInput
                    style={styles.input}
                    value={carbs}
                    onChangeText={setCarbs}
                    placeholder="0g"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputThird}>
                  <Text style={styles.inputLabel}>Fat</Text>
                  <TextInput
                    style={styles.input}
                    value={fat}
                    onChangeText={setFat}
                    placeholder="0g"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes..."
                  placeholderTextColor="#444"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Meal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  dayBtnSelected: {
    backgroundColor: '#22c55e',
  },
  dayBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  dayBtnTextSelected: {
    color: '#fff',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
    marginTop: 4,
  },
  dayDotSelected: {
    backgroundColor: '#fff',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
  },
  dayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayCalories: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#f97316',
  },
  mealSlot: {
    marginBottom: 20,
  },
  mealSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mealSlotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealSlotIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotIcon: {
    fontSize: 20,
  },
  mealSlotLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  mealSlotCalories: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed',
  },
  emptySlotText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500' as const,
  },
  mealsContainer: {
    gap: 8,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
  },
  mealCardCompleted: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealCardContent: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#fff',
  },
  mealNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  mealMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mealCaloriesText: {
    fontSize: 13,
    color: '#888',
  },
  mealMacroText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  deleteBtn: {
    padding: 8,
  },
  weekSummary: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  weekSummaryTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#22c55e',
    marginBottom: 16,
  },
  weekSummaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  weekSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  weekSummaryValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
  },
  weekSummaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#151520',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalMealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  modalMealIcon: {
    fontSize: 24,
  },
  modalMealLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#22c55e',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
  },
  inputThird: {
    flex: 1,
  },
  macroSectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
