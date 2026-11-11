"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashIngredients = hashIngredients;
exports.getExpiringItems = getExpiringItems;
const md5_1 = __importDefault(require("md5"));
/**
 * Creates a deterministic MD5 hash from pantry items + preferences.
 * Used as a Redis cache key for recipe generation.
 * Items are sorted alphabetically before hashing to ensure consistency.
 */
function hashIngredients(items, preferences) {
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
    return (0, md5_1.default)(payload);
}
/**
 * Identify pantry items expiring within N days. Sorted by expiry (soonest first).
 */
function getExpiringItems(items, withinDays = 3) {
    const now = new Date();
    const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return items
        .filter((item) => {
        if (!item.expiresAt)
            return false;
        const expiryDate = new Date(item.expiresAt);
        return expiryDate <= threshold;
    })
        .sort((a, b) => {
        const dateA = new Date(a.expiresAt).getTime();
        const dateB = new Date(b.expiresAt).getTime();
        return dateA - dateB;
    });
}
