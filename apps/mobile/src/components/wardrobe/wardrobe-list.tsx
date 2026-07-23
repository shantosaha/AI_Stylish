import { WARDROBE_CATEGORY_LABELS } from '@ai-stylish/shared';
import type { WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface WardrobeListProps {
  items: WardrobeItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddPress: () => void;
  onItemPress: (item: WardrobeItem) => void;
}

function ItemCard({ item, onPress }: { item: WardrobeItem; onPress: () => void }) {
  const primaryImage = item.images.find((img) => img.is_primary) ?? item.images[0];
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`wardrobe-item-${item.id}`}>
      <ThemedView type="backgroundElement" style={styles.cardInner}>
        {primaryImage ? (
          <Image source={{ uri: resolveMediaUrl(primaryImage.image_url) }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
        <ThemedText type="smallBold" numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {WARDROBE_CATEGORY_LABELS[item.category]}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function WardrobeList({ items, isLoading, error, onRetry, onAddPress, onItemPress }: WardrobeListProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Wardrobe
        </ThemedText>
        <Pressable style={styles.addButton} onPress={onAddPress} testID="wardrobe-add-button">
          <ThemedText type="default" style={styles.addButtonText}>
            + Add item
          </ThemedText>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.text} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText type="default" style={styles.error}>
            {error}
          </ThemedText>
          <Pressable onPress={onRetry} style={styles.retryButton} testID="wardrobe-retry">
            <ThemedText type="linkPrimary">Try again</ThemedText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyState}>
          <ThemedText type="default" themeColor="textSecondary" style={styles.centerText}>
            Your wardrobe is empty. Add your first item to get outfit recommendations.
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <ItemCard item={item} onPress={() => onItemPress(item)} />}
          testID="wardrobe-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    padding: Spacing.two,
  },
  emptyState: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    alignItems: 'center',
  },
  listContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  row: {
    gap: Spacing.three,
  },
  card: {
    flex: 1,
  },
  cardInner: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.two,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.two,
    backgroundColor: '#00000010',
  },
});
