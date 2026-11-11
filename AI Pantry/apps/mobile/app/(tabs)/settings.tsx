import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';

export default function SettingsScreen() {
  const { user, signOut } = useAppStore();

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  function SettingRow({ icon, label, value, onPress, danger }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    danger?: boolean;
  }) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-3 py-3.5 px-4 bg-white dark:bg-gray-800"
        onPress={onPress}
        disabled={!onPress}
      >
        <Text className="text-xl">{icon}</Text>
        <View className="flex-1">
          <Text className={`font-medium ${danger ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
            {label}
          </Text>
          {value && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{value}</Text>
          )}
        </View>
        {onPress && <Text className="text-gray-400">›</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100 dark:bg-gray-950">
      <ScrollView>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white px-4 pt-4 pb-4">
          Settings
        </Text>

        {/* Profile */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-4 mb-2">
            Account
          </Text>
          <View className="rounded-xl overflow-hidden mx-4 border border-gray-100 dark:border-gray-700">
            <SettingRow icon="👤" label="Signed in as" value={user?.email ?? 'Unknown'} />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="🥗" label="Dietary Preferences" onPress={() => {}} />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="⚠️" label="Allergies" onPress={() => {}} />
          </View>
        </View>

        {/* App settings */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-4 mb-2">
            Preferences
          </Text>
          <View className="rounded-xl overflow-hidden mx-4 border border-gray-100 dark:border-gray-700">
            <SettingRow icon="🔔" label="Expiry Notifications" onPress={() => {}} />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="📏" label="Measurement Units" value="Metric" onPress={() => {}} />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="🌙" label="Dark Mode" value="System default" onPress={() => {}} />
          </View>
        </View>

        {/* About */}
        <View className="mb-6">
          <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest px-4 mb-2">
            About
          </Text>
          <View className="rounded-xl overflow-hidden mx-4 border border-gray-100 dark:border-gray-700">
            <SettingRow icon="📋" label="Version" value="1.0.0" />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="🔒" label="Privacy Policy" onPress={() => {}} />
            <View className="h-px bg-gray-100 dark:bg-gray-700" />
            <SettingRow icon="📄" label="Terms of Service" onPress={() => {}} />
          </View>
        </View>

        {/* Sign out */}
        <View className="mx-4 mb-10">
          <TouchableOpacity
            className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl py-4 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-red-600 font-semibold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
