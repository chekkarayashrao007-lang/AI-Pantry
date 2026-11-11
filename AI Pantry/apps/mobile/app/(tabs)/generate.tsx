import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGenerateRecipes, useSaveRecipe, useFinishCooking, type Recipe } from '../../hooks/useRecipes';
import { useAddRecipeToShoppingList } from '../../hooks/useShoppingList';
import { RecipeCard } from '../../components/recipe/RecipeCard';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useAppStore } from '../../store/useAppStore';

export default function GenerateScreen() {
  const { mutate: generateRecipes, data, isPending, reset } = useGenerateRecipes(3);
  const { mutate: saveRecipe } = useSaveRecipe();
  const { mutate: addToShopping } = useAddRecipeToShoppingList();
  const { mutate: finishCooking, isPending: isFinishing } = useFinishCooking();
  const { showToast } = useAppStore();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookingMode, setCookingMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const recipes = data?.recipes ?? [];

  function handleSelectRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setCompletedSteps([]);
    setCookingMode(false);
  }

  function handleStartCooking() {
    setCookingMode(true);
  }

  function handleToggleStep(index: number) {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  function handleFinishCooking() {
    if (!selectedRecipe?.id) {
      showToast('Save the recipe first to track cooking', 'warning');
      return;
    }

    const pantryIngredients = selectedRecipe.ingredients.filter((i) => i.isFromPantry);
    finishCooking({
      recipeId: selectedRecipe.id,
      usedIngredients: pantryIngredients.map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      })),
    });
    setSelectedRecipe(null);
    setCookingMode(false);
    setCompletedSteps([]);
  }

  if (cookingMode && selectedRecipe) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
        <ScrollView className="flex-1">
          <View className="px-4 pt-4 pb-6">
            {/* Cooking Mode Header */}
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity onPress={() => setCookingMode(false)}>
                <Text className="text-primary-600 font-medium">← Back</Text>
              </TouchableOpacity>
              <Text className="text-sm text-gray-500 font-medium">
                {completedSteps.length}/{selectedRecipe.instructions.length} steps
              </Text>
            </View>

            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {selectedRecipe.title}
            </Text>
            <Text className="text-gray-500 dark:text-gray-400 mb-6">
              🍴 {selectedRecipe.servings} servings • ⏱ {selectedRecipe.prepTimeMinutes + selectedRecipe.cookTimeMinutes} min
            </Text>

            {/* Progress bar */}
            <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
              <View
                className="h-2 bg-primary-600 rounded-full"
                style={{
                  width: `${(completedSteps.length / selectedRecipe.instructions.length) * 100}%`,
                }}
              />
            </View>

            {/* Steps */}
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">Steps</Text>
            {selectedRecipe.instructions.map((step, index) => (
              <TouchableOpacity
                key={index}
                className={`flex-row gap-3 mb-3 p-4 rounded-xl border ${
                  completedSteps.includes(index)
                    ? 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
                onPress={() => handleToggleStep(index)}
              >
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center flex-shrink-0 ${
                    completedSteps.includes(index) ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <Text className={`text-xs font-bold ${completedSteps.includes(index) ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                    {completedSteps.includes(index) ? '✓' : index + 1}
                  </Text>
                </View>
                <Text
                  className={`flex-1 text-sm leading-6 ${
                    completedSteps.includes(index)
                      ? 'text-primary-700 dark:text-primary-300 line-through'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {step}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Finish Cooking Button */}
            {completedSteps.length === selectedRecipe.instructions.length && (
              <TouchableOpacity
                className="bg-primary-600 rounded-xl py-4 items-center mt-4"
                onPress={handleFinishCooking}
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">🎉 Finish Cooking!</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-24">
          {/* Header */}
          <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">AI Chef ✨</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Generate waste-aware recipes from your pantry
          </Text>

          {/* Generate button */}
          {!isPending && recipes.length === 0 && (
            <TouchableOpacity
              className="bg-primary-600 rounded-2xl py-5 items-center mx-auto w-full mb-6"
              onPress={() => generateRecipes()}
            >
              <Text className="text-white text-lg font-bold">🪄 Generate Recipes</Text>
              <Text className="text-primary-100 text-xs mt-1">
                Using your current pantry inventory
              </Text>
            </TouchableOpacity>
          )}

          {/* Loading skeletons */}
          {isPending && (
            <View className="gap-4">
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center animate-pulse">
                🤔 AI Chef is thinking…
              </Text>
              {[1, 2, 3].map((i) => <SkeletonLoader key={i} className="h-48 rounded-2xl" />)}
            </View>
          )}

          {/* Recipe list */}
          {!isPending && recipes.length > 0 && (
            <View className="gap-4">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {recipes.length} Recipes Generated
                </Text>
                <TouchableOpacity onPress={() => { reset(); }}>
                  <Text className="text-primary-600 text-sm font-medium">Regenerate ↺</Text>
                </TouchableOpacity>
              </View>

              {recipes.map((recipe, index) => (
                <RecipeCard
                  key={index}
                  recipe={recipe}
                  isSelected={selectedRecipe?.title === recipe.title}
                  onSelect={() => handleSelectRecipe(recipe)}
                  onSave={() => saveRecipe(recipe)}
                  onAddToShopping={() =>
                    recipe.missingIngredients.length > 0
                      ? addToShopping(recipe.missingIngredients)
                      : showToast('No missing ingredients!', 'info')
                  }
                  onStartCooking={() => {
                    setSelectedRecipe(recipe);
                    handleStartCooking();
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
