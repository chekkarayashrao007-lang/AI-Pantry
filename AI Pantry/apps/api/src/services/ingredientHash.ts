import md5 from 'md5';

export interface HashableItem {
  name: string;
  quantity?: number;
  unit?: string;
  expiresAt?: string;
}

export interface HashablePreferences {
  dietaryRestrictions?: string[];
  allergies?: string[];
  maxCookTimeMinutes?: number;
  preferredCuisines?: string[];
}

/**
 * Creates a deterministic MD5 hash from pantry items + preferences.
 * Used as a Redis cache key for recipe generation.
 * Items are sorted alphabetically before hashing to ensure consistency.
 */
export function hashIngredients(
  items: HashableItem[],
  preferences?: HashablePreferences
): string {
  const sortedItems = [...items]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      name: item.name.toLowerCase().trim(),
      quantity: Math.floor(item.quantity ?? 1), // ignore small quantity changes
      unit: item.unit?.toLowerCase() ?? 'pcs',
    }));

  const normalizedPreferences = preferences
    ? {
        dietaryRestrictions: [...(preferences.dietaryRestrictions ?? [])].sort(),
        allergies: [...(preferences.allergies ?? [])].sort(),
        maxCookTimeMinutes: preferences.maxCookTimeMinutes ?? 45,
        preferredCuisines: [...(preferences.preferredCuisines ?? [])].sort(),
      }
    : {};

  const payload = JSON.stringify({ items: sortedItems, preferences: normalizedPreferences });
  return md5(payload);
}

/**
 * Identify pantry items expiring within N days. Sorted by expiry (soonest first).
 */
export function getExpiringItems<T extends { name: string; expiresAt?: string | Date }>(
  items: T[],
  withinDays: number = 3
): T[] {
  const now = new Date();
  const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  return items
    .filter((item) => {
      if (!item.expiresAt) return false;
      const expiryDate = new Date(item.expiresAt);
      return expiryDate <= threshold;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expiresAt!).getTime();
      const dateB = new Date(b.expiresAt!).getTime();
      return dateA - dateB;
    });
}
