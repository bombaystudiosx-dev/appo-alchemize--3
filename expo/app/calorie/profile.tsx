import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  Scale, 
  Ruler, 
  Activity, 
  Target,
  ChevronDown,
  Check,
  Flame,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
  Edit3,
  RotateCcw,
} from 'lucide-react-native';
import { userNutritionProfileDb } from '@/lib/database';
import type { UserNutritionProfile, ActivityLevel, WeightGoal } from '@/types';

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; description: string; multiplier: number }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', multiplier: 1.2 },
  { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
  { value: 'very_active', label: 'Extra Active', description: 'Very hard exercise & physical job', multiplier: 1.9 },
];

const cmToFeetInches = (cm: number): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

const feetInchesToCm = (feet: number, inches: number): number => {
  return (feet * 12 + inches) * 2.54;
};

const kgToLbs = (kg: number): number => Math.round(kg * 2.205);
const lbsToKg = (lbs: number): number => lbs / 2.205;

const WEIGHT_GOALS: { value: WeightGoal; label: string; description: string; icon: React.ReactNode; calorieAdjust: number }[] = [
  { value: 'lose', label: 'Lose Weight', description: '-500 cal/day', icon: <TrendingDown size={22} color="#22c55e" />, calorieAdjust: -500 },
  { value: 'maintain', label: 'Maintain', description: 'No change', icon: <Minus size={22} color="#6366f1" />, calorieAdjust: 0 },
  { value: 'gain', label: 'Gain Weight', description: '+500 cal/day', icon: <TrendingUp size={22} color="#f59e0b" />, calorieAdjust: 500 },
];

const GENDERS: { value: 'male' | 'female' | 'other'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export default function NutritionProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [heightFeet, setHeightFeet] = useState('5');
  const [heightInches, setHeightInches] = useState('7');
  const [weight, setWeight] = useState('154');
  const [targetWeight, setTargetWeight] = useState('143');
  const [age, setAge] = useState('30');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<WeightGoal>('maintain');
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [manualMacros, setManualMacros] = useState(false);
  const [customCalories, setCustomCalories] = useState(2000);
  const [customProtein, setCustomProtein] = useState(150);
  const [customCarbs, setCustomCarbs] = useState(250);
  const [customFat, setCustomFat] = useState(65);
  const [customFiber, setCustomFiber] = useState(25);

  const { data: existingProfile } = useQuery({
    queryKey: ['nutritionProfile'],
    queryFn: async () => {
      if (Platform.OS === 'web') return null;
      return userNutritionProfileDb.get();
    },
  });

  useEffect(() => {
    if (existingProfile) {
      const { feet, inches } = cmToFeetInches(existingProfile.height);
      setHeightFeet(feet.toString());
      setHeightInches(inches.toString());
      setWeight(kgToLbs(existingProfile.weight).toString());
      setTargetWeight(kgToLbs(existingProfile.targetWeight).toString());
      setAge(existingProfile.age.toString());
      setGender(existingProfile.gender);
      setActivityLevel(existingProfile.activityLevel);
      setGoal(existingProfile.goal);
      setManualMacros(existingProfile.manualMacros ?? false);
      setCustomCalories(existingProfile.dailyCalorieTarget);
      setCustomProtein(existingProfile.dailyProteinTarget);
      setCustomCarbs(existingProfile.dailyCarbsTarget);
      setCustomFat(existingProfile.dailyFatTarget);
      setCustomFiber(existingProfile.dailyFiberTarget ?? 25);
    }
  }, [existingProfile]);

  const calculatedValues = useMemo(() => {
    const h = feetInchesToCm(parseInt(heightFeet) || 5, parseInt(heightInches) || 7);
    const w = lbsToKg(parseFloat(weight) || 154);
    const a = parseInt(age) || 30;
    
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }
    
    const activityMultiplier = ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.multiplier || 1.55;
    const tdee = bmr * activityMultiplier;
    
    const goalAdjust = WEIGHT_GOALS.find(g => g.value === goal)?.calorieAdjust || 0;
    const targetCalories = Math.round(tdee + goalAdjust);
    
    const targetProtein = Math.round(w * 2);
    const proteinCalories = targetProtein * 4;
    const fatCalories = targetCalories * 0.25;
    const targetFat = Math.round(fatCalories / 9);
    const carbCalories = targetCalories - proteinCalories - fatCalories;
    const targetCarbs = Math.round(carbCalories / 4);
    
    const targetFiber = 25;
    
    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      targetFiber,
    };
  }, [heightFeet, heightInches, weight, age, gender, activityLevel, goal]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (Platform.OS === 'web') return;
      
      const profile: UserNutritionProfile = {
        id: existingProfile?.id || 'main',
        height: feetInchesToCm(parseInt(heightFeet) || 5, parseInt(heightInches) || 7),
        heightUnit: 'cm',
        weight: lbsToKg(parseFloat(weight) || 154),
        weightUnit: 'kg',
        targetWeight: lbsToKg(parseFloat(targetWeight) || 143),
        age: parseInt(age) || 30,
        gender,
        activityLevel,
        goal,
        weeklyGoal: 0.5,
        dailyCalorieTarget: manualMacros ? customCalories : calculatedValues.targetCalories,
        dailyProteinTarget: manualMacros ? customProtein : calculatedValues.targetProtein,
        dailyCarbsTarget: manualMacros ? customCarbs : calculatedValues.targetCarbs,
        dailyFatTarget: manualMacros ? customFat : calculatedValues.targetFat,
        dailyFiberTarget: manualMacros ? customFiber : calculatedValues.targetFiber,
        dailyWaterTarget: 2000,
        manualMacros,
        updatedAt: Date.now(),
      };
      
      return userNutritionProfileDb.createOrUpdate(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutritionProfile'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save profile');
    },
  });

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
        <View style={styles.heroSection}>
          <View style={styles.heroIconBg}>
            <Target size={32} color="#22c55e" />
          </View>
          <Text style={styles.heroTitle}>Your Profile</Text>
          <Text style={styles.heroSubtitle}>
            Set your body metrics and goals to get personalized nutrition targets
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Metrics</Text>
          
          <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ruler size={18} color="#a855f7" />
                <Text style={styles.metricLabel}>Height</Text>
              </View>
              <View style={styles.heightInputRow}>
                <View style={styles.heightInputGroup}>
                  <TextInput
                    style={styles.heightInput}
                    value={heightFeet}
                    onChangeText={setHeightFeet}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor="#444"
                    maxLength={1}
                  />
                  <Text style={styles.metricUnit}>ft</Text>
                </View>
                <View style={styles.heightInputGroup}>
                  <TextInput
                    style={styles.heightInput}
                    value={heightInches}
                    onChangeText={setHeightInches}
                    keyboardType="number-pad"
                    placeholder="7"
                    placeholderTextColor="#444"
                    maxLength={2}
                  />
                  <Text style={styles.metricUnit}>in</Text>
                </View>
              </View>
            </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Scale size={18} color="#22c55e" />
                <Text style={styles.metricLabel}>Weight</Text>
              </View>
              <View style={styles.metricInputRow}>
                <TextInput
                  style={styles.metricInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="154"
                  placeholderTextColor="#444"
                />
                <Text style={styles.metricUnit}>lbs</Text>
              </View>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricLabel}>Age</Text>
              </View>
              <View style={styles.metricInputRow}>
                <TextInput
                  style={styles.metricInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor="#444"
                />
                <Text style={styles.metricUnit}>years</Text>
              </View>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Target size={18} color="#f59e0b" />
                <Text style={styles.metricLabel}>Target</Text>
              </View>
              <View style={styles.metricInputRow}>
                <TextInput
                  style={styles.metricInput}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                  placeholder="143"
                  placeholderTextColor="#444"
                />
                <Text style={styles.metricUnit}>lbs</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowGenderPicker(!showGenderPicker)}
          >
            <Text style={styles.dropdownLabel}>Gender</Text>
            <View style={styles.dropdownValue}>
              <Text style={styles.dropdownValueText}>
                {GENDERS.find(g => g.value === gender)?.label}
              </Text>
              <ChevronDown size={18} color="#666" />
            </View>
          </TouchableOpacity>
          
          {showGenderPicker && (
            <View style={styles.dropdown}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.dropdownItem, gender === g.value && styles.dropdownItemSelected]}
                  onPress={() => {
                    setGender(g.value);
                    setShowGenderPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{g.label}</Text>
                  {gender === g.value && <Check size={18} color="#22c55e" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Level</Text>
          
          <TouchableOpacity
            style={styles.activityButton}
            onPress={() => setShowActivityPicker(!showActivityPicker)}
          >
            <Activity size={22} color="#6366f1" />
            <View style={styles.activityContent}>
              <Text style={styles.activityLabel}>
                {ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.label}
              </Text>
              <Text style={styles.activityDescription}>
                {ACTIVITY_LEVELS.find(l => l.value === activityLevel)?.description}
              </Text>
            </View>
            <ChevronDown size={18} color="#666" />
          </TouchableOpacity>
          
          {showActivityPicker && (
            <View style={styles.dropdown}>
              {ACTIVITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[styles.dropdownItem, activityLevel === level.value && styles.dropdownItemSelected]}
                  onPress={() => {
                    setActivityLevel(level.value);
                    setShowActivityPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.activityItemContent}>
                    <Text style={styles.dropdownItemText}>{level.label}</Text>
                    <Text style={styles.activityItemDesc}>{level.description}</Text>
                  </View>
                  {activityLevel === level.value && <Check size={18} color="#22c55e" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Goal</Text>
          
          <View style={styles.goalsRow}>
            {WEIGHT_GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalCard, goal === g.value && styles.goalCardSelected]}
                onPress={() => {
                  setGoal(g.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.goalIconBg, goal === g.value && styles.goalIconBgSelected]}>
                  {g.icon}
                </View>
                <Text style={[styles.goalLabel, goal === g.value && styles.goalLabelSelected]}>
                  {g.label}
                </Text>
                <Text style={styles.goalDesc}>{g.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Zap size={20} color="#f97316" />
            <Text style={styles.resultsTitle}>Your Daily Targets</Text>
            <TouchableOpacity
              style={styles.editMacrosBtn}
              onPress={() => {
                if (!manualMacros) {
                  setCustomCalories(calculatedValues.targetCalories);
                  setCustomProtein(calculatedValues.targetProtein);
                  setCustomCarbs(calculatedValues.targetCarbs);
                  setCustomFat(calculatedValues.targetFat);
                  setCustomFiber(calculatedValues.targetFiber);
                }
                setManualMacros(!manualMacros);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {manualMacros ? (
                <RotateCcw size={16} color="#f97316" />
              ) : (
                <Edit3 size={16} color="#f97316" />
              )}
              <Text style={styles.editMacrosBtnText}>
                {manualMacros ? 'Use Calculated' : 'Edit Macros'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {manualMacros ? (
            <View style={styles.manualMacrosSection}>
              <View style={styles.manualMacroRow}>
                <Text style={styles.manualMacroLabel}>Calories</Text>
                <View style={styles.manualMacroInputContainer}>
                  <TextInput
                    style={styles.manualMacroInput}
                    value={customCalories.toString()}
                    onChangeText={(val) => setCustomCalories(parseInt(val) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.manualMacroUnit}>cal</Text>
                </View>
              </View>
              <View style={styles.manualMacroRow}>
                <Text style={[styles.manualMacroLabel, { color: '#ef4444' }]}>Protein</Text>
                <View style={styles.manualMacroInputContainer}>
                  <TextInput
                    style={styles.manualMacroInput}
                    value={customProtein.toString()}
                    onChangeText={(val) => setCustomProtein(parseInt(val) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.manualMacroUnit}>g</Text>
                </View>
              </View>
              <View style={styles.manualMacroRow}>
                <Text style={[styles.manualMacroLabel, { color: '#22c55e' }]}>Carbs</Text>
                <View style={styles.manualMacroInputContainer}>
                  <TextInput
                    style={styles.manualMacroInput}
                    value={customCarbs.toString()}
                    onChangeText={(val) => setCustomCarbs(parseInt(val) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.manualMacroUnit}>g</Text>
                </View>
              </View>
              <View style={styles.manualMacroRow}>
                <Text style={[styles.manualMacroLabel, { color: '#eab308' }]}>Fat</Text>
                <View style={styles.manualMacroInputContainer}>
                  <TextInput
                    style={styles.manualMacroInput}
                    value={customFat.toString()}
                    onChangeText={(val) => setCustomFat(parseInt(val) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.manualMacroUnit}>g</Text>
                </View>
              </View>
              <View style={styles.manualMacroRow}>
                <Text style={[styles.manualMacroLabel, { color: '#8b5cf6' }]}>Fiber</Text>
                <View style={styles.manualMacroInputContainer}>
                  <TextInput
                    style={styles.manualMacroInput}
                    value={customFiber.toString()}
                    onChangeText={(val) => setCustomFiber(parseInt(val) || 0)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.manualMacroUnit}>g</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.mainCalorieDisplay}>
                <Flame size={28} color="#f97316" />
                <Text style={styles.calorieValue}>{calculatedValues.targetCalories}</Text>
                <Text style={styles.calorieLabel}>calories per day</Text>
              </View>
              
              <View style={styles.macroTargetsRow}>
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.macroTargetLabel}>Protein</Text>
                  <Text style={styles.macroTargetValue}>{calculatedValues.targetProtein}g</Text>
                </View>
                <View style={styles.macroTargetDivider} />
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#22c55e' }]} />
                  <Text style={styles.macroTargetLabel}>Carbs</Text>
                  <Text style={styles.macroTargetValue}>{calculatedValues.targetCarbs}g</Text>
                </View>
                <View style={styles.macroTargetDivider} />
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#eab308' }]} />
                  <Text style={styles.macroTargetLabel}>Fat</Text>
                  <Text style={styles.macroTargetValue}>{calculatedValues.targetFat}g</Text>
                </View>
                <View style={styles.macroTargetDivider} />
                <View style={styles.macroTargetItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#8b5cf6' }]} />
                  <Text style={styles.macroTargetLabel}>Fiber</Text>
                  <Text style={styles.macroTargetValue}>{calculatedValues.targetFiber}g</Text>
                </View>
              </View>
            </>
          )}
          
          <View style={styles.bmrSection}>
            <View style={styles.bmrRow}>
              <Text style={styles.bmrLabel}>Base Metabolic Rate (BMR)</Text>
              <Text style={styles.bmrValue}>{calculatedValues.bmr} cal</Text>
            </View>
            <View style={styles.bmrRow}>
              <Text style={styles.bmrLabel}>Total Daily Energy (TDEE)</Text>
              <Text style={styles.bmrValue}>{calculatedValues.tdee} cal</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
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
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  heightInputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  heightInputGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  heightInput: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    width: 50,
    textAlign: 'center',
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500' as const,
  },
  metricInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricInput: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    flex: 1,
  },
  metricUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  dropdownButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
  },
  dropdownLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  dropdownValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValueText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(25, 25, 35, 0.98)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
  },
  activityDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  goalsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  goalCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  goalIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  goalIconBgSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  goalLabelSelected: {
    color: '#22c55e',
  },
  goalDesc: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#f97316',
    flex: 1,
  },
  editMacrosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editMacrosBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#f97316',
  },
  manualMacrosSection: {
    gap: 12,
    marginBottom: 20,
  },
  manualMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 14,
  },
  manualMacroLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  manualMacroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  manualMacroInput: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'right',
    minWidth: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  manualMacroUnit: {
    fontSize: 14,
    color: '#666',
    width: 24,
  },
  mainCalorieDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 8,
    letterSpacing: -2,
  },
  calorieLabel: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  macroTargetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  macroTargetItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroTargetDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  macroTargetLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  macroTargetValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  bmrSection: {
    gap: 10,
  },
  bmrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bmrLabel: {
    fontSize: 13,
    color: '#666',
  },
  bmrValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
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
