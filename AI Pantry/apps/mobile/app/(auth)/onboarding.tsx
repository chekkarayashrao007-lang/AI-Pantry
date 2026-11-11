import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { apiFetch } from '../../lib/utils';

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Keto', 'Paleo', 'Halal', 'Kosher', 'Nut-Free',
];

const CUISINE_OPTIONS = [
  'Italian', 'Indian', 'Mexican', 'Chinese', 'Japanese',
  'Mediterranean', 'Thai', 'American', 'French', 'Middle Eastern',
];

const ALLERGY_OPTIONS = [
  'Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs',
  'Dairy', 'Wheat/Gluten', 'Soy', 'Sesame',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [maxCookTime, setMaxCookTime] = useState(45);
  const [saving, setSaving] = useState(false);

  const totalSteps = 3;

  function toggleItem(list: string[], item: string, setter: (val: string[]) => void) {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  }

  function MultiSelectChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <TouchableOpacity
        className={`px-3 py-2 rounded-full border mr-2 mb-2 ${
          selected
            ? 'bg-primary-600 border-primary-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
        }`}
        onPress={onPress}
      >
        <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await apiFetch('/api/preferences', {
        method: 'POST',
        body: JSON.stringify({
          dietaryRestrictions: dietary,
          allergies,
          preferredCuisines: cuisines,
          maxCookTimeMinutes: maxCookTime,
        }),
      }, session.access_token);

      router.replace('/(tabs)/pantry');
    } catch (error) {
      console.error('Onboarding save error:', error);
      // Navigate anyway — preferences can be set later
      router.replace('/(tabs)/pantry');
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    {
      title: 'Dietary Preferences',
      subtitle: 'Select all that apply',
      content: (
        <View className="flex-row flex-wrap mt-4">
          {DIETARY_OPTIONS.map((opt) => (
            <MultiSelectChip
              key={opt}
              label={opt}
              selected={dietary.includes(opt)}
              onPress={() => toggleItem(dietary, opt, setDietary)}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'Allergies',
      subtitle: 'We will never include these in recipes',
      content: (
        <View className="flex-row flex-wrap mt-4">
          {ALLERGY_OPTIONS.map((opt) => (
            <MultiSelectChip
              key={opt}
              label={opt}
              selected={allergies.includes(opt)}
              onPress={() => toggleItem(allergies, opt, setAllergies)}
            />
          ))}
        </View>
      ),
    },
    {
      title: 'Favourite Cuisines',
      subtitle: 'What cuisines do you love?',
      content: (
        <View>
          <View className="flex-row flex-wrap mt-4">
            {CUISINE_OPTIONS.map((opt) => (
              <MultiSelectChip
                key={opt}
                label={opt}
                selected={cuisines.includes(opt)}
                onPress={() => toggleItem(cuisines, opt, setCuisines)}
              />
            ))}
          </View>
          <View className="mt-6">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Max cooking time: {maxCookTime} minutes
            </Text>
            <View className="flex-row gap-3">
              {[15, 30, 45, 60, 90].map((time) => (
                <TouchableOpacity
                  key={time}
                  className={`flex-1 py-2.5 rounded-lg border items-center ${
                    maxCookTime === time
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                  }`}
                  onPress={() => setMaxCookTime(time)}
                >
                  <Text className={`text-sm font-medium ${maxCookTime === time ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {time}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView className="flex-1 px-6 pt-8">
        {/* Progress */}
        <View className="flex-row gap-2 mb-8">
          {steps.map((_, i) => (
            <View
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </View>

        <Text className="text-xs font-medium text-primary-600 uppercase tracking-widest mb-1">
          Step {step + 1} of {totalSteps}
        </Text>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          {currentStep.title}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 mb-2">
          {currentStep.subtitle}
        </Text>

        {currentStep.content}

        <View className="h-20" />
      </ScrollView>

      {/* Navigation */}
      <View className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex-row gap-3">
        {step > 0 && (
          <TouchableOpacity
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl py-4 items-center"
            onPress={() => setStep((s) => s - 1)}
          >
            <Text className="text-gray-700 dark:text-gray-300 font-medium">Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="flex-1 bg-primary-600 rounded-xl py-4 items-center"
          onPress={step < totalSteps - 1 ? () => setStep((s) => s + 1) : handleFinish}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">
              {step < totalSteps - 1 ? 'Next →' : 'Start Cooking! 🍳'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
