import { WARDROBE_CATEGORY_LABELS } from '@ai-stylish/shared';
import type { WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface WardrobeListProps {
  items: WardrobeItem[];
  isLoading: boolean;
  error: string | null;
  isFromCache?: boolean;
  isOffline?: boolean;
  onRetry: () => void;
  onAddPress: () => void;
  onItemPress: (item: WardrobeItem) => void;
}

function ItemCard({ item, onPress }: { item: WardrobeItem; onPress: () => void }) {
  const theme = useTheme();
  const primaryImage = item.images.find((img) => img.is_primary) ?? item.images[0];
  return (
    <Pressable style={styles.card} onPress={onPress} testID={`wardrobe-item-${item.id}`}>
      <ThemedView type="backgroundElement" style={[styles.cardInner, { borderColor: theme.border }]}>
        {primaryImage ? (
          <Image source={{ uri: resolveMediaUrl(primaryImage.image_url) }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnailPlaceholder, { borderColor: theme.border }]} />
        )}
        <ThemedText type="smallBold" numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText type="label" themeColor="textSecondary">
          {WARDROBE_CATEGORY_LABELS[item.category]}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function WardrobeList({
  items,
  isLoading,
  error,
  isFromCache,
  isOffline,
  onRetry,
  onAddPress,
  onItemPress,
}: WardrobeListProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Wardrobe
        </ThemedText>
        <Pressable
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={onAddPress}
          testID="wardrobe-add-button">
          <ThemedText type="default" style={[styles.addButtonText, { color: theme.accentText }]}>
            + Add item
          </ThemedText>
        </Pressable>
      </View>

      {isOffline || isFromCache ? (
        <ThemedText
          type="small"
          themeColor={isOffline ? 'negative' : 'accent'}
          style={styles.cacheBadge}
          testID="wardrobe-list-cache-badge">
          {isOffline ? 'Offline — showing saved data' : 'Showing cached data'}
        </ThemedText>
      ) : null}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText type="default" themeColor="negative" style={styles.centerText}>
            {error}
          </ThemedText>
          <Pressable onPress={onRetry} style={styles.retryButton} testID="wardrobe-retry">
            <ThemedText type="linkPrimary">Try again</ThemedText>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.emptyState, { borderColor: theme.border }]}>
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
    fontSize: 28,
    lineHeight: 34,
  },
  addButton: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  addButtonText: {
    fontFamily: Fonts.sansSemiBold,
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
  cacheBadge: {
    paddingBottom: Spacing.two,
  },
  retryButton: {
    padding: Spacing.two,
  },
  emptyState: {
    borderRadius: Spacing.two,
    borderWidth: 1,
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
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.one,
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
});
