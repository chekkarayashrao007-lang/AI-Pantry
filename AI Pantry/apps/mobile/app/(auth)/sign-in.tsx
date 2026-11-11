import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  async function handleSendOTP() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });

      if (error) throw error;
      setOtpSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: 'email',
      });

      if (error) throw error;
      // Auth state change handled by _layout.tsx
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Brand */}
          <View className="items-center mb-10">
            <Text className="text-6xl mb-2">🧑‍🍳</Text>
            <Text className="text-4xl font-bold text-primary-600">PantryIQ</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-2 text-base">
              AI-powered pantry management{'\n'}& zero-waste recipe generation
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email Address
              </Text>
              <TextInput
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!otpSent}
              />
            </View>

            {otpSent && (
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Verification Code
                </Text>
                <TextInput
                  className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white bg-white dark:bg-gray-800 tracking-widest"
                  placeholder="000000"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Check your email for a 6-digit code
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-primary-600 rounded-xl py-4 items-center mt-2"
              onPress={otpSent ? handleVerifyOTP : handleSendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {otpSent ? 'Verify & Sign In' : 'Send Verification Code'}
                </Text>
              )}
            </TouchableOpacity>

            {otpSent && (
              <TouchableOpacity
                className="items-center py-2"
                onPress={() => { setOtpSent(false); setOtp(''); }}
              >
                <Text className="text-primary-600 text-sm">
                  ← Use a different email
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-xs text-center text-gray-400 dark:text-gray-600 mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
