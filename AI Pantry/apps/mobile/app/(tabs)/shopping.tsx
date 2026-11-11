import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useShoppingList,
  useToggleShoppingItem,
  useAddToShoppingList,
  useDeleteShoppingItem,
} from '../../hooks/useShoppingList';
import { useAddPantryItem } from '../../hooks/usePantry';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import type { ShoppingItem } from '../../hooks/useShoppingList';

export default function ShoppingScreen() {
  const { data: items = [], isLoading, refetch, isRefetching } = useShoppingList();
  const { mutate: toggleItem } = useToggleShoppingItem();
  const { mutate: addItem, isPending: isAdding } = useAddToShoppingList();
  const { mutate: deleteItem } = useDeleteShoppingItem();
  const { mutate: addToPantry } = useAddPantryItem();

  const [newItemName, setNewItemName] = useState('');

  function handleAddItem() {
    if (!newItemName.trim()) return;
    addItem({ name: newItemName.trim(), quantity: 1, unit: 'pcs' });
    setNewItemName('');
  }

  function handleToggle(item: ShoppingItem) {
    toggleItem(item.id);

    if (!item.isBought) {
      // Item being marked as bought — offer to add to pantry
      Alert.alert(
        'Add to Pantry?',
        `Add "${item.name}" to your pantry?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, Add',
            onPress: () => {
              addToPantry({
                name: item.name,
                category: item.category as any,
                quantity: item.quantity,
                unit: item.unit,
              });
            },
          },
        ]
      );
    }
  }

  const unboughtItems = items.filter((i) => !i.isBought);
  const boughtItems = items.filter((i) => i.isBought);

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Shopping List</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {unboughtItems.length} items to buy
        </Text>
      </View>

      {/* Add item input */}
      <View className="px-4 pb-3 flex-row gap-2">
        <TextInput
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm"
          placeholder="Add item…"
          placeholderTextColor="#9ca3af"
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          className={`bg-primary-600 rounded-xl px-4 items-center justify-center ${!newItemName.trim() ? 'opacity-50' : ''}`}
          onPress={handleAddItem}
          disabled={!newItemName.trim() || isAdding}
        >
          <Text className="text-white font-bold text-lg">+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="px-4 gap-3">
          {[1, 2, 3].map((i) => <SkeletonLoader key={i} className="h-14 rounded-xl" />)}
        </View>
      ) : (
        <FlatList
          data={[...unboughtItems, ...boughtItems]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              className={`mx-4 mb-2 flex-row items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3.5 border ${
                item.isBought
                  ? 'border-gray-100 dark:border-gray-800 opacity-60'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              <TouchableOpacity
                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                  item.isBought
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-gray-400 dark:border-gray-500'
                }`}
                onPress={() => handleToggle(item)}
              >
                {item.isBought && <Text className="text-white text-xs">✓</Text>}
              </TouchableOpacity>

              <View className="flex-1">
                <Text
                  className={`font-medium text-gray-900 dark:text-white ${item.isBought ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}
                >
                  {item.name}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {item.quantity} {item.unit} • {item.category}
                </Text>
              </View>

              <TouchableOpacity
                className="p-1.5"
                onPress={() => deleteItem(item.id)}
              >
                <Text className="text-gray-400 dark:text-gray-500 text-lg">×</Text>
              </TouchableOpacity>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-5xl mb-4">🛒</Text>
              <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Shopping list is empty
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2 px-8">
                Generate a recipe and tap "Add Missing to Cart" to populate your list.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
