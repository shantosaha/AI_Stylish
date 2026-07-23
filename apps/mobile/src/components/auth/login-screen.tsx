import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';

export function LoginScreen({ onSwitchToSignup }: { onSwitchToSignup: () => void }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    login(email.trim(), password).catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Welcome back
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Log in to see your wardrobe recommendations.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.form}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              clearError();
            }}
            testID="login-email"
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError();
            }}
            testID="login-password"
          />

          {error ? (
            <ThemedText type="small" themeColor="text" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="login-submit">
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="default" style={styles.buttonText}>
                Log in
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Pressable onPress={onSwitchToSignup} style={styles.switchLink}>
          <ThemedText type="link" themeColor="textSecondary">
            Don&apos;t have an account? <ThemedText type="linkPrimary">Sign up</ThemedText>
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  form: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff10',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
