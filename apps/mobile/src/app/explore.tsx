import { ProcessingMode } from '@ai-stylish/shared';
import type { TonePreference } from '@ai-stylish/shared';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BodyProfileContent } from '@/components/body/body-profile-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';

const PROCESSING_MODES: { value: ProcessingMode; label: string }[] = [
  { value: ProcessingMode.AUTO, label: 'Automatic' },
  { value: ProcessingMode.LOCAL_PREFERRED, label: 'Local preferred' },
  { value: ProcessingMode.CLOUD_PREFERRED, label: 'Cloud preferred' },
];

const TONE_OPTIONS: { value: TonePreference; label: string }[] = [
  { value: 'practical', label: 'Practical' },
  { value: 'direct', label: 'Direct' },
  { value: 'encouraging', label: 'Encouraging' },
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
  const [showBodyProfile, setShowBodyProfile] = useState(false);

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafeArea}>
          <ActivityIndicator color={theme.text} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (showBodyProfile) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <BodyProfileContent onBack={() => setShowBodyProfile(false)} />
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

  const handleSelectTone = (tone: TonePreference) => {
    updateProfile({ tone_preference: tone }).catch(() => {});
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
          <ThemedText type="label" themeColor="accent">
            Name
          </ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            onBlur={handleSaveName}
            testID="profile-name"
          />
          {isSaved ? (
            <ThemedText type="small" themeColor="positive">
              Saved
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
          <ThemedText type="label" themeColor="accent">
            AI processing mode
          </ThemedText>
          {PROCESSING_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              style={[styles.modeRow, { borderTopColor: theme.border }]}
              onPress={() => handleSelectMode(mode.value)}
              disabled={isLoading}
              testID={`profile-mode-${mode.value}`}>
              <ThemedText type="default">{mode.label}</ThemedText>
              {profile.processing_mode === mode.value ? (
                <ThemedText type="default" themeColor="accent" style={styles.checkmark}>
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
          <ThemedText type="label" themeColor="accent">
            Assistant tone
          </ThemedText>
          {TONE_OPTIONS.map((tone) => (
            <Pressable
              key={tone.value}
              style={[styles.modeRow, { borderTopColor: theme.border }]}
              onPress={() => handleSelectTone(tone.value)}
              disabled={isLoading}
              testID={`profile-tone-${tone.value}`}>
              <ThemedText type="default">{tone.label}</ThemedText>
              {profile.tone_preference === tone.value ? (
                <ThemedText type="default" themeColor="accent" style={styles.checkmark}>
                  ✓
                </ThemedText>
              ) : null}
            </Pressable>
          ))}
        </ThemedView>

        <Pressable onPress={() => setShowBodyProfile(true)} testID="profile-body-link">
          <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="default">Body profile</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Photos and body traits for fit-aware recommendations
            </ThemedText>
          </ThemedView>
        </Pressable>

        {error ? (
          <ThemedText type="small" themeColor="negative">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={[styles.logoutButton, { borderColor: theme.negative }]}
          onPress={() => logout()}
          testID="profile-logout">
          <ThemedText type="default" themeColor="negative" style={styles.logoutText}>
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
    marginBottom: Spacing.one,
  },
  section: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  input: {
    fontFamily: Fonts.sans,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
  },
  checkmark: {
    fontFamily: Fonts.sansSemiBold,
  },
  logoutButton: {
    marginTop: Spacing.four,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: Fonts.sansSemiBold,
  },
});
