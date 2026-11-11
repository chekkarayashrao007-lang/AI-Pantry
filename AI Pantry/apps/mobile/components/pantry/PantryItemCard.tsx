import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { getExpiryStatus, formatExpiryLabel, formatQuantity } from '../../lib/utils';
import type { PantryItem } from '../../hooks/usePantry';

const CATEGORY_EMOJI: Record<string, string> = {
  Produce: '🥦', Dairy: '🧀', Meat: '🥩', Pantry: '🫙',
  Bakery: '🍞', Frozen: '🧊', Beverages: '🥤', Condiments: '🧴',
};

interface PantryItemCardProps {
  item: PantryItem;
  onDelete: () => void;
}

export function PantryItemCard({ item, onDelete }: PantryItemCardProps) {
  const status = getExpiryStatus(item.expiresAt);
  const expiryLabel = formatExpiryLabel(item.expiresAt);

  const statusStyles = {
    expired: { badge: 'bg-red-100 dark:bg-red-950', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    'expiring-soon': { badge: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-700' },
    fresh: { badge: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', border: 'border-gray-100 dark:border-gray-700' },
    unknown: { badge: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400', border: 'border-gray-100 dark:border-gray-700' },
  };

  const style = statusStyles[status];

  function handleDelete() {
    Alert.alert('Remove Item', `Remove "${item.name}" from your pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <View className={`bg-white dark:bg-gray-800 rounded-xl px-4 py-3.5 border ${style.border}`}>
      <View className="flex-row items-center gap-3">
        <Text className="text-2xl">{CATEGORY_EMOJI[item.category] ?? '📦'}</Text>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-gray-900 dark:text-white text-base" numberOfLines={1}>
              {item.name}
            </Text>
            {item.confidenceScore && item.confidenceScore < 0.7 && (
              <Text className="text-xs text-gray-400">~</Text>
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {formatQuantity(item.quantity, item.unit)}
            </Text>
            <Text className="text-gray-300 dark:text-gray-600">•</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">{item.category}</Text>
          </View>
        </View>

        <View className="items-end gap-1.5">
          <View className={`${style.badge} px-2 py-0.5 rounded-full`}>
            <Text className={`${style.text} text-xs font-semibold`}>
              {status === 'expired' ? '🔴 Expired' :
               status === 'expiring-soon' ? `⚠️ ${expiryLabel}` :
               status === 'fresh' ? `✅ ${expiryLabel}` : '—'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDelete} className="p-1">
            <Text className="text-gray-400 dark:text-gray-500">🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
