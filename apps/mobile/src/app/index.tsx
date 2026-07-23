import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';
import { useWardrobeStore } from '@/state/wardrobe-store';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.token);
  const name = profile?.name?.trim();
  const items = useWardrobeStore((s) => s.items);
  const fetchItems = useWardrobeStore((s) => s.fetchItems);

  useEffect(() => {
    if (token) fetchItems(token);
  }, [token, fetchItems]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {name ? `Hey, ${name}` : 'Welcome'}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Add wardrobe items to get your first outfit recommendation.
        </ThemedText>

        <Pressable onPress={() => router.push('/wardrobe')} testID="home-wardrobe-link">
          <ThemedView type="backgroundElement" style={styles.emptyState}>
            <ThemedText type="default" themeColor="textSecondary">
              {items.length > 0
                ? `${items.length} item${items.length === 1 ? '' : 's'} in your wardrobe. Tap to manage.`
                : 'Your wardrobe is empty. Tap to add your first item.'}
            </ThemedText>
          </ThemedView>
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
