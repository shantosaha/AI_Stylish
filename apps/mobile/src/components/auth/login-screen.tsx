import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
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
        <ThemedText type="label" themeColor="accent" style={styles.eyebrow}>
          AI Stylish
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          Welcome back
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Log in to see your wardrobe recommendations.
        </ThemedText>

        <ThemedView
          type="backgroundElement"
          style={[styles.form, { borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
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
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
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
            <ThemedText type="small" themeColor="negative">
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[
              styles.button,
              { backgroundColor: theme.accent },
              !canSubmit && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            testID="login-submit">
            {isLoading ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <ThemedText type="default" style={[styles.buttonText, { color: theme.accentText }]}>
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
    gap: Spacing.two,
  },
  eyebrow: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  form: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    fontFamily: Fonts.sans,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.one,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: Fonts.sansSemiBold,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
