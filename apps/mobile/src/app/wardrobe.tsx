import type { WardrobeItem } from '@ai-stylish/shared';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddItemScreen } from '@/components/wardrobe/add-item-screen';
import { ItemDetailScreen } from '@/components/wardrobe/item-detail-screen';
import { ThemedView } from '@/components/themed-view';
import { WardrobeList } from '@/components/wardrobe/wardrobe-list';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/state/auth-store';
import { useWardrobeStore } from '@/state/wardrobe-store';

type Mode = { type: 'list' } | { type: 'add' } | { type: 'detail'; item: WardrobeItem };

export default function WardrobeScreen() {
  const token = useAuthStore((s) => s.token);
  const items = useWardrobeStore((s) => s.items);
  const isLoading = useWardrobeStore((s) => s.isLoading);
  const error = useWardrobeStore((s) => s.error);
  const isFromCache = useWardrobeStore((s) => s.isFromCache);
  const isOffline = useWardrobeStore((s) => s.isOffline);
  const fetchItems = useWardrobeStore((s) => s.fetchItems);
  const hydrateFromCache = useWardrobeStore((s) => s.hydrateFromCache);

  const [mode, setMode] = useState<Mode>({ type: 'list' });

  useEffect(() => {
    if (!token) return;
    (async () => {
      await hydrateFromCache();
      await fetchItems(token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const refresh = () => {
    if (token) fetchItems(token);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {mode.type === 'add' ? (
          <AddItemScreen
            onDone={() => {
              setMode({ type: 'list' });
              refresh();
            }}
            onCancel={() => setMode({ type: 'list' })}
          />
        ) : mode.type === 'detail' ? (
          <ItemDetailScreen
            item={items.find((i) => i.id === mode.item.id) ?? mode.item}
            onBack={() => {
              setMode({ type: 'list' });
              refresh();
            }}
          />
        ) : (
          <WardrobeList
            items={items}
            isLoading={isLoading && items.length === 0}
            error={error}
            isFromCache={isFromCache}
            isOffline={isOffline}
            onRetry={refresh}
            onAddPress={() => setMode({ type: 'add' })}
            onItemPress={(item) => setMode({ type: 'detail', item })}
          />
        )}
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
    paddingBottom: BottomTabInset + Spacing.three,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.five }),
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
});
