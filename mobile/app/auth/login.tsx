import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, PrimaryCTA, GhostButton, ErrorBanner } from '../../src/components/ui';
import { colors, typography, spacing, radius } from '../../src/theme';
import { login } from '../../src/services/authApi';
import { extractErrorMessage } from '../../src/lib/errors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      router.replace('/(tabs)/reply');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.root}>
        <Text style={styles.headline}>Welcome back</Text>
        {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.textFaint} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor={colors.textFaint} value={password} onChangeText={setPassword} secureTextEntry />
        </View>
        <PrimaryCTA label="Sign in" onPress={handleLogin} loading={loading} />
        <GhostButton label="Create account" onPress={() => router.push('/auth/signup')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: spacing[4], gap: spacing[4], justifyContent: 'center' },
  headline: { ...typography.title, color: colors.text, textAlign: 'center', marginBottom: spacing[2] },
  form: { gap: spacing[3] },
  input: { ...typography.body, color: colors.text, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.hairline, padding: spacing[4] },
});
