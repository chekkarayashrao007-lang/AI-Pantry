import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center justify-center pt-1">
      <Text className="text-xl">{emoji}</Text>
      <Text
        className={`text-[10px] mt-0.5 font-medium ${
          focused ? 'text-primary-600' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        },
      }}
    >
      <Tabs.Screen
        name="pantry"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🥦" label="Pantry" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✨" label="AI Chef" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📖" label="Saved" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🛒" label="Shopping" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
