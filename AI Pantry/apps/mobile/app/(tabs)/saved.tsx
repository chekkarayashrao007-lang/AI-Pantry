import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSavedRecipes } from '../../hooks/useRecipes';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';

export default function SavedScreen() {
  const { data: recipes = [], isLoading, refetch, isRefetching } = useSavedRecipes();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Saved Recipes</Text>
        <View className="gap-3">
          {[1, 2, 3].map((i) => <SkeletonLoader key={i} className="h-32 rounded-xl" />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Saved Recipes</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{recipes.length} saved</Text>
      </View>

      {recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">📖</Text>
          <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
            No saved recipes yet
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            Generate recipes in the AI Chef tab and save your favourites here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id ?? item.title}
          renderItem={({ item }) => (
            <View className="mx-4 mb-3 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="font-bold text-base text-gray-900 dark:text-white">{item.title}</Text>
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
                <View className={`px-2 py-1 rounded-lg ${
                  item.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-950' :
                  item.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-950' :
                  'bg-red-100 dark:bg-red-950'
                }`}>
                  <Text className={`text-xs font-semibold ${
                    item.difficulty === 'Easy' ? 'text-green-700 dark:text-green-400' :
                    item.difficulty === 'Medium' ? 'text-amber-700 dark:text-amber-400' :
                    'text-red-700 dark:text-red-400'
                  }`}>
                    {item.difficulty}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-4 mt-3">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  ⏱ {item.prepTimeMinutes + item.cookTimeMinutes} min
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  🍴 {item.servings} servings
                </Text>
                {item.nutritionalData && (
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    🔥 {item.nutritionalData.calories} cal
                  </Text>
                )}
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
