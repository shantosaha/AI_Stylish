import { ProcessingMode } from '@ai-stylish/shared';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';

const PROCESSING_MODES: { value: ProcessingMode; label: string }[] = [
  { value: ProcessingMode.AUTO, label: 'Automatic' },
  { value: ProcessingMode.LOCAL_PREFERRED, label: 'Local preferred' },
  { value: ProcessingMode.CLOUD_PREFERRED, label: 'Cloud preferred' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const [name, setName] = useState(profile?.name ?? '');
  const [isSaved, setIsSaved] = useState(false);

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafeArea}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleSaveName = () => {
    updateProfile({ name: name.trim() })
      .then(() => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 1500);
      })
      .catch(() => {});
  };

  const handleSelectMode = (mode: ProcessingMode) => {
    updateProfile({ processing_mode: mode }).catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Name
          </ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            onBlur={handleSaveName}
            testID="profile-name"
          />
          {isSaved ? (
            <ThemedText type="small" themeColor="textSecondary">
              Saved
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            AI processing mode
          </ThemedText>
          {PROCESSING_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              style={styles.modeRow}
              onPress={() => handleSelectMode(mode.value)}
              disabled={isLoading}
              testID={`profile-mode-${mode.value}`}>
              <ThemedText type="default">{mode.label}</ThemedText>
              {profile.processing_mode === mode.value ? (
                <ThemedText type="default" themeColor="text">
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </ThemedView>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={() => logout()} testID="profile-logout">
          <ThemedText type="default" style={styles.logoutText}>
            Log out
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
  loadingSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.five }),
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  section: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff10',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  error: {
    color: '#ef4444',
  },
  logoutButton: {
    marginTop: Spacing.four,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#ef444420',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
