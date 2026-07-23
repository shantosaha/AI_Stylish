import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';

const MIN_PASSWORD_LENGTH = 8;

export function SignupScreen({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    passwordsMatch &&
    !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    signup(email.trim(), password).catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="label" themeColor="accent" style={styles.eyebrow}>
          AI Stylish
        </ThemedText>
        <ThemedText type="title" style={styles.title}>
          Create account
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Build your wardrobe and get daily outfit picks.
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
            testID="signup-email"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Password (min 8 characters)"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password-new"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              clearError();
            }}
            testID="signup-password"
          />
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Confirm password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="password-new"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              clearError();
            }}
            testID="signup-confirm-password"
          />

          {!passwordsMatch && confirmPassword.length > 0 ? (
            <ThemedText type="small" themeColor="negative">
              Passwords don&apos;t match
            </ThemedText>
          ) : null}
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
            testID="signup-submit">
            {isLoading ? (
              <ActivityIndicator color={theme.accentText} />
            ) : (
              <ThemedText type="default" style={[styles.buttonText, { color: theme.accentText }]}>
                Sign up
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <Pressable onPress={onSwitchToLogin} style={styles.switchLink}>
          <ThemedText type="link" themeColor="textSecondary">
            Already have an account? <ThemedText type="linkPrimary">Log in</ThemedText>
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
