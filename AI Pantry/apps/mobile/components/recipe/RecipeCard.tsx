import { View, Text, TouchableOpacity } from 'react-native';
import type { Recipe } from '../../hooks/useRecipes';

interface RecipeCardProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
  onSave: () => void;
  onAddToShopping: () => void;
  onStartCooking: () => void;
}

export function RecipeCard({ recipe, isSelected, onSelect, onSave, onAddToShopping, onStartCooking }: RecipeCardProps) {
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;
  const difficultyColor =
    recipe.difficulty === 'Easy' ? 'text-green-600 bg-green-50 dark:bg-green-950' :
    recipe.difficulty === 'Medium' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950' :
    'text-red-600 bg-red-50 dark:bg-red-950';

  return (
    <TouchableOpacity
      className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 ${
        isSelected ? 'border-primary-500' : 'border-gray-100 dark:border-gray-700'
      }`}
      onPress={onSelect}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-3">
          <Text className="font-bold text-base text-gray-900 dark:text-white leading-5">{recipe.title}</Text>
          {recipe.wasteReductionScore !== undefined && recipe.wasteReductionScore > 50 && (
            <View className="flex-row items-center gap-1 mt-1">
              <Text className="text-xs text-green-600 dark:text-green-400 font-medium">
                ♻️ {recipe.wasteReductionScore}% waste reduction
              </Text>
            </View>
          )}
        </View>
        <View className={`px-2 py-1 rounded-lg ${difficultyColor}`}>
          <Text className={`text-xs font-semibold ${difficultyColor.split(' ')[0]}`}>
            {recipe.difficulty}
          </Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-3" numberOfLines={2}>
        {recipe.description}
      </Text>

      {/* Stats row */}
      <View className="flex-row gap-4 mb-3">
        <Text className="text-xs text-gray-500 dark:text-gray-400">⏱ {totalTime} min</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">🍴 {recipe.servings} servings</Text>
        {recipe.nutritionalData && (
          <Text className="text-xs text-gray-500 dark:text-gray-400">🔥 {recipe.nutritionalData.calories} cal</Text>
        )}
        {recipe.missingIngredients.length > 0 && (
          <Text className="text-xs text-amber-600 dark:text-amber-400">
            🛒 {recipe.missingIngredients.length} missing
          </Text>
        )}
      </View>

      {/* Expanded details */}
      {isSelected && (
        <View className="border-t border-gray-100 dark:border-gray-700 pt-3 mb-3">
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Ingredients</Text>
          {recipe.ingredients.slice(0, 6).map((ing, i) => (
            <Text key={i} className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
              {ing.isFromPantry ? '✅' : '🛒'} {ing.amount} {ing.unit} {ing.name}
            </Text>
          ))}
          {recipe.ingredients.length > 6 && (
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              +{recipe.ingredients.length - 6} more…
            </Text>
          )}

          {recipe.missingIngredients.length > 0 && (
            <View className="mt-2 bg-amber-50 dark:bg-amber-950 rounded-lg p-2.5">
              <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Missing Ingredients:
              </Text>
              {recipe.missingIngredients.map((ing, i) => (
                <Text key={i} className="text-xs text-amber-600 dark:text-amber-400">• {ing}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row gap-2 mt-1">
        <TouchableOpacity
          className="flex-1 bg-primary-600 rounded-xl py-2.5 items-center"
          onPress={onStartCooking}
        >
          <Text className="text-white text-xs font-semibold">🍳 Cook Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="border border-primary-600 rounded-xl px-3 py-2.5 items-center"
          onPress={onSave}
        >
          <Text className="text-primary-600 text-xs font-semibold">💾 Save</Text>
        </TouchableOpacity>
        {recipe.missingIngredients.length > 0 && (
          <TouchableOpacity
            className="border border-amber-500 rounded-xl px-3 py-2.5 items-center"
            onPress={onAddToShopping}
          >
            <Text className="text-amber-600 text-xs font-semibold">🛒 Cart</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
