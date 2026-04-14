export interface UserProfile {
  id: string;
  userId?: string;
  fullName: string;
  email: string;
  totalXp: number;
  totalEnergy: number;
  currentStreak: number;
  createdAt: number;
}

export interface Manifestation {
  id: string;
  title: string;
  description: string;
  category: 'love' | 'wealth' | 'health' | 'career' | 'relationships' | 'other' | 'focus' | 'creativity' | 'healing';
  intention: string;
  images: string[];
  isFavorite: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: number | null;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  streak: number;
  bestStreak: number;
  lastCompletedDate: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface GoalChecklistItem {
  id: string;
  goalId: string;
  text: string;
  isDone: boolean;
}

export interface GoalCompletion {
  id: string;
  goalId: string;
  completionDate: number;
  notes: string;
  completedAt: number;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  goal: number;
  goalUnit?: 'minutes' | 'hours' | 'times';
  type: 'timer' | 'counter' | 'checkbox';
  frequencyType: 'daily' | 'weekly' | 'custom';
  customDays: number[];
  currentProgress: number;
  streak: number;
  xpReward: number;
  energyReward: number;
  color: string;
  lastCompletedDate: string;
  createdAt: number;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  completionDate: number;
  value: number;
  notes: string;
  completedAt: number;
}

export interface Transaction {
  id: string;
  date: number;
  amount: number;
  category: string;
  note: string;
  dayOfWeek: number | null;
  time: string | null;
  reminderEnabled: boolean;
  reminderTime: number | null;
  isRecurring: boolean;
}

export interface FinancialIncome {
  id: string;
  incomeGross: number;
  incomeNet: number;
  taxAmount: number;
  taxPercentage: number;
  deductions: number;
  incomeCategory: 'salary' | 'freelance' | 'business' | 'investment' | 'bonus' | 'other';
  incomeDate: number;
  notes: string;
  createdAt: number;
}

export interface FinancialExpense {
  id: string;
  expenseName: string;
  expenseAmount: number;
  expenseCategory: 'bills' | 'business' | 'personal' | 'food' | 'transport' | 'entertainment' | 'shopping' | 'health' | 'education' | 'other';
  expenseDate: number;
  notes: string;
  createdAt: number;
}

export interface FinancialNote {
  id: string;
  noteLoginInfo: string;
  noteTotalDebt: string;
  debtAmount: number;
  debtDueDate: number | null;
  savingsAmount: number;
  emergencyFund: number;
  savingsNotes: string;
  updatedAt: number;
}

export interface Meal {
  id: string;
  date: number;
  name: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string;
}

export interface FoodLog {
  id: string;
  foodName: string;
  servingDescription: string;
  calories: number;
  proteinGrams: number | null;
  carbGrams: number | null;
  fatGrams: number | null;
  sugarGrams: number | null;
  fiberGrams: number | null;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  sourceType: 'manual' | 'camera' | 'saved_food';
  loggedAt: number;
  isLocked: boolean;
  calendarEventId: string | null;
}

export interface SavedFood {
  id: string;
  foodName: string;
  servingDescription: string;
  calories: number;
  proteinGrams: number | null;
  carbGrams: number | null;
  fatGrams: number | null;
  sugarGrams: number | null;
  fiberGrams: number | null;
  tags: string[];
  createdAt: number;
}

export interface NutritionGoal {
  id: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailySugar: number;
  dailyFiber: number;
  updatedAt: number;
}

export interface PlannedMeal {
  id: string;
  date: number;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  notes: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueDate: number | null;
  dueTime: string | null;
  isDone: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  completedDate: number | null;
  reminderEnabled: boolean;
  reminderTime: number | null;
  notificationId: string | null;
  priority: 'low' | 'medium' | 'high' | null;
}

export interface GratitudeEntry {
  id: string;
  entryDate: number;
  gratitude1: string;
  gratitude2: string | null;
  gratitude3: string | null;
  createdAt: number;
}

export interface Affirmation {
  id: string;
  text: string;
  category: 'self-love' | 'abundance' | 'health' | 'success' | 'relationships' | 'gratitude';
  isFavorite: boolean;
  createdAt: number;
}

export interface Workout {
  id: string;
  type: 'cardio' | 'strength' | 'yoga' | 'hiit' | 'stretching' | 'sports' | 'other';
  durationMinutes: number;
  caloriesBurned: number | null;
  notes: string;
  date: number;
  createdAt: number;
}

export interface BodyMetric {
  id: string;
  date: number;
  weight: number | null;
  waist: number | null;
  chest: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
  bodyFatPercentage: number | null;
  muscleMass: number | null;
  notes: string;
  createdAt: number;
}

export interface Appointment {
  id: string;
  title: string;
  date: number;
  time: string;
  category: 'personal' | 'business' | 'nutrition' | 'fitness';
  notes: string;
  reminder: boolean;
  createdAt: number;
  metadata?: string;
}

export type ManifestationCategory = Manifestation['category'];
export type GoalStatus = Goal['status'];
export type HabitType = 'timer' | 'counter' | 'checkbox';
export type FrequencyType = Habit['frequencyType'];
export type IncomeCategory = FinancialIncome['incomeCategory'];
export type ExpenseCategory = FinancialExpense['expenseCategory'];
export type MealSlot = PlannedMeal['slot'];
export type MealType = FoodLog['mealType'];

export type AffirmationCategory = Affirmation['category'];
export type WorkoutType = Workout['type'];
export type AppointmentCategory = Appointment['category'];

export interface UserNutritionProfile {
  id: string;
  height: number;
  heightUnit: 'cm' | 'ft';
  weight: number;
  weightUnit: 'kg' | 'lbs';
  targetWeight: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
  weeklyGoal: number;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbsTarget: number;
  dailyFatTarget: number;
  dailyFiberTarget: number;
  dailyWaterTarget: number;
  manualMacros: boolean;
  updatedAt: number;
}

export interface WaterLog {
  id: string;
  amount: number;
  unit: 'ml' | 'oz';
  loggedAt: number;
}

export interface MealPrepPlan {
  id: string;
  weekStartDate: number;
  dayOfWeek: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servingSize: string;
  notes: string;
  isCompleted: boolean;
  createdAt: number;
}

export type ActivityLevel = UserNutritionProfile['activityLevel'];
export type WeightGoal = UserNutritionProfile['goal'];

export interface FitnessGoal {
  id: string;
  metric: 'active_minutes' | 'calories' | 'steps';
  dailyTarget: number;
  createdAt: number;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  category: 'strength' | 'hiit' | 'yoga' | 'core' | 'mobility' | 'walk' | 'run' | 'stretch';
  durationMinutes: number;
  intensity: 'low' | 'medium' | 'high';
  equipment: 'none' | 'dumbbells' | 'bands' | 'gym';
  description: string;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  startedAt: number;
  endedAt: number | null;
  durationMinutes: number;
  completed: boolean;
  caloriesEstimate: number | null;
  source: 'manual' | 'wearable';
}

export interface NormalizedMetric {
  id: string;
  date: string;
  activeMinutes: number;
  caloriesActive: number;
  steps: number;
  source: 'workout' | 'wearable';
  deviceType: 'none' | 'watch' | 'ring';
}

export interface FitnessPlan {
  id: string;
  name: string;
  daysPerWeek: number;
  preferredCategories: string[];
  durationRangeMin: number;
  durationRangeMax: number;
  intensity: 'low' | 'medium' | 'high';
  equipment: 'none' | 'dumbbells' | 'bands' | 'gym';
  active: boolean;
  createdAt: number;
}

export interface Award {
  id: string;
  code: string;
  title: string;
  description: string;
  earnedAt: number | null;
}

export type FitnessCategory = WorkoutTemplate['category'];
export type FitnessIntensity = WorkoutTemplate['intensity'];
export type FitnessEquipment = WorkoutTemplate['equipment'];
