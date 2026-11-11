import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePantryItems, useDeletePantryItem, useBulkAddPantryItems } from '../../hooks/usePantry';
import { PantryItemCard } from '../../components/pantry/PantryItemCard';
import { AddItemModal } from '../../components/pantry/AddItemModal';
import { SkeletonLoader } from '../../components/ui/SkeletonLoader';
import { useAppStore } from '../../store/useAppStore';
import { imageToBase64, apiFetch } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

export default function PantryScreen() {
  const { data: items = [], isLoading, refetch, isRefetching } = usePantryItems();
  const { mutate: deleteItem } = useDeletePantryItem();
  const { mutate: bulkAdd, isPending: isBulkAdding } = useBulkAddPantryItems();
  const { showToast, setScanningPantry, isScanningPantry } = useAppStore();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Produce', 'Dairy', 'Meat', 'Pantry', 'Bakery', 'Frozen'];

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const expiredCount = items.filter((i) => i.isExpired).length;
  const expiringSoonCount = items.filter((i) => {
    if (!i.expiresAt || i.isExpired) return false;
    const daysLeft = Math.ceil((new Date(i.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  }).length;

  async function handleScanPantry() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Camera access is needed to scan your pantry.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    setScanningPantry(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let imageBase64 = result.assets[0].base64;

      if (!imageBase64) {
        imageBase64 = await imageToBase64(result.assets[0].uri);
      }

      const response = await apiFetch<{
        success: boolean;
        data: {
          detectedItems: Array<{
            name: string;
            category: string;
            estimatedQuantity: number;
            unit: string;
            estimatedDaysFresh: number;
            confidenceScore: number;
          }>;
        };
      }>(
        '/api/vision/scan-pantry',
        {
          method: 'POST',
          body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
        },
        session?.access_token
      );

      if (response.data.detectedItems.length === 0) {
        showToast('No items detected. Try a clearer photo.', 'warning');
        return;
      }

      const now = new Date();
      bulkAdd(
        response.data.detectedItems.map((item) => ({
          name: item.name,
          category: item.category as any,
          quantity: item.estimatedQuantity,
          unit: item.unit,
          expiresAt: new Date(
            now.getTime() + item.estimatedDaysFresh * 24 * 60 * 60 * 1000
          ).toISOString(),
          confidenceScore: item.confidenceScore,
        }))
      );

      showToast(`Detected ${response.data.detectedItems.length} items!`, 'success');
    } catch (error: any) {
      showToast(error.message ?? 'Failed to scan pantry', 'error');
    } finally {
      setScanningPantry(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">My Pantry</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">{items.length} items</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`bg-amber-500 rounded-xl px-3 py-2.5 flex-row items-center gap-1.5 ${isScanningPantry || isBulkAdding ? 'opacity-60' : ''}`}
              onPress={handleScanPantry}
              disabled={isScanningPantry || isBulkAdding}
            >
              <Text className="text-white font-semibold text-sm">
                {isScanningPantry || isBulkAdding ? '⏳ Scanning…' : '📷 Scan'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-primary-600 rounded-xl px-3 py-2.5"
              onPress={() => setShowAddModal(true)}
            >
              <Text className="text-white font-semibold text-sm">+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Alert banners */}
        {expiredCount > 0 && (
          <View className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 mb-2 flex-row items-center gap-2">
            <Text className="text-red-600 font-semibold text-sm">🚨 {expiredCount} item{expiredCount > 1 ? 's' : ''} expired</Text>
          </View>
        )}
        {expiringSoonCount > 0 && (
          <View className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2 mb-2 flex-row items-center gap-2">
            <Text className="text-amber-700 font-semibold text-sm">⚠️ {expiringSoonCount} item{expiringSoonCount > 1 ? 's' : ''} expiring soon</Text>
          </View>
        )}

        {/* Search */}
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm mt-1"
          placeholder="🔍 Search pantry…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="pl-4 pb-2"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            className={`mr-2 px-3.5 py-2 rounded-full border ${
              selectedCategory === cat
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === cat ? 'text-white' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Item list */}
      {isLoading ? (
        <View className="px-4 gap-3 mt-2">
          {[1, 2, 3, 4].map((i) => <SkeletonLoader key={i} className="h-20 rounded-xl" />)}
        </View>
      ) : filteredItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">📦</Text>
          <Text className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-center">
            {search ? 'No items match your search' : 'Your pantry is empty'}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            {search ? 'Try a different search term' : 'Tap "Scan" to scan your pantry or "+ Add" to add items manually'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PantryItemCard
              item={item}
              onDelete={() => deleteItem(item.id)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddItemModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </SafeAreaView>
  );
}
