import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';

export default function HomeScreen() {
  const profile = useAuthStore((s) => s.profile);
  const name = profile?.name?.trim();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {name ? `Hey, ${name}` : 'Welcome'}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Add wardrobe items to get your first outfit recommendation.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.emptyState}>
          <ThemedText type="default" themeColor="textSecondary">
            Your wardrobe is empty. Item upload is coming in the next phase.
          </ThemedText>
        </ThemedView>
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
  subtitle: {},
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginTop: Spacing.four,
    alignItems: 'center',
  },
});
