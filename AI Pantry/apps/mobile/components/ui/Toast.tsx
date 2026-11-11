import { useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useAppStore } from '../../store/useAppStore';

function ToastItem({ id, message, type }: { id: string; message: string; type: string }) {
  const { dismissToast } = useAppStore();
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        dismissToast(id);
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const bgColor =
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-amber-500' :
    'bg-gray-800';

  const icon =
    type === 'success' ? '✅' :
    type === 'error' ? '❌' :
    type === 'warning' ? '⚠️' : 'ℹ️';

  return (
    <Animated.View style={{ opacity }}>
      <View className={`${bgColor} rounded-xl px-4 py-3 flex-row items-center gap-2 mb-2 shadow-lg`}>
        <Text>{icon}</Text>
        <Text className="text-white font-medium flex-1 text-sm">{message}</Text>
      </View>
    </Animated.View>
  );
}

export function ToastContainer() {
  const { toasts } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <View className="absolute bottom-24 left-4 right-4 z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </View>
  );
}
