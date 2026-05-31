export const featureFlags = {
  barcodeNutritionLookup: false,
  backgroundReminderReconcile: true,
  repositoryHealthWarnings: true,
  offlineRecoveryQueue: false,
  analyticsEvents: false,
} as const;

export type FeatureFlagName = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlagName) {
  return featureFlags[flag] === true;
}
