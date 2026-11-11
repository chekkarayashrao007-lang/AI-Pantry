import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAddPantryItem } from '../../hooks/usePantry';

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen', 'Beverages', 'Condiments'];
const UNITS = ['pcs', 'g', 'kg', 'oz', 'ml', 'l', 'tbsp', 'tsp', 'cups'];

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddItemModal({ visible, onClose }: AddItemModalProps) {
  const { mutate: addItem, isPending } = useAddPantryItem();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Pantry');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiresAt, setExpiresAt] = useState('');

  function handleAdd() {
    if (!name.trim()) return;

    addItem({
      name: name.trim(),
      category: category as any,
      quantity: parseFloat(quantity) || 1,
      unit,
      expiresAt: expiresAt || undefined,
    });

    // Reset form
    setName('');
    setQuantity('1');
    setExpiresAt('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white dark:bg-gray-900">
        {/* Handle bar */}
        <View className="items-center pt-3 pb-2">
          <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </View>

        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-between items-center py-3 mb-4">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Add Pantry Item</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-gray-500 dark:text-gray-400 text-base">Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Item name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Name *</Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="e.g., Roma Tomatoes"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>

          {/* Category */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  className={`mr-2 px-3 py-2 rounded-full border ${
                    category === cat
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => setCategory(cat)}
                >
                  <Text className={`text-sm font-medium ${category === cat ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Quantity + Unit */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                placeholder="1"
                placeholderTextColor="#9ca3af"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    className={`mr-1.5 px-3 py-3 rounded-xl border ${
                      unit === u
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    }`}
                    onPress={() => setUnit(u)}
                  >
                    <Text className={`text-sm font-medium ${unit === u ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Expiry date */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Expiry Date (optional)
            </Text>
            <TextInput
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              value={expiresAt}
              onChangeText={setExpiresAt}
            />
          </View>
        </ScrollView>

        {/* Add button */}
        <View className="px-6 pb-10 pt-4 border-t border-gray-100 dark:border-gray-800">
          <TouchableOpacity
            className={`bg-primary-600 rounded-xl py-4 items-center ${!name.trim() ? 'opacity-50' : ''}`}
            onPress={handleAdd}
            disabled={!name.trim() || isPending}
          >
            {isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Add to Pantry</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
