export type FoodSourceType = 'manual' | 'barcode' | 'ai';

export interface FoodLogPayload {
  name: string;
  sourceType: FoodSourceType;
  barcode?: string;
}

export function normalizeFoodLogPayload(payload: FoodLogPayload): FoodLogPayload {
  return {
    ...payload,
    name: payload.name.trim(),
    barcode: payload.barcode?.trim(),
    sourceType: payload.sourceType || 'manual',
  };
}
