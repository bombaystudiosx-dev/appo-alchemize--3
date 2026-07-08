import type { MealType } from '@/types';

export interface AnalyzedFoodTotalsInput {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export function getAutoMealType(now: Date = new Date()): MealType {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

export function getHealthScoreColor(score: number): string {
  if (score >= 8) return '#22c55e';
  if (score >= 6) return '#84cc16';
  if (score >= 4) return '#eab308';
  if (score >= 2) return '#f97316';
  return '#ef4444';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 55) return 'Moderate';
  if (confidence >= 35) return 'Low';
  return 'Very Low';
}

export function calculateFoodTotals(foods: AnalyzedFoodTotalsInput[]) {
  return {
    calories: Math.round(foods.reduce((sum, food) => sum + food.calories, 0)),
    protein: Math.round(foods.reduce((sum, food) => sum + food.protein, 0)),
    carbs: Math.round(foods.reduce((sum, food) => sum + food.carbs, 0)),
    fat: Math.round(foods.reduce((sum, food) => sum + food.fat, 0)),
    fiber: Math.round(foods.reduce((sum, food) => sum + food.fiber, 0)),
  };
}

export function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
