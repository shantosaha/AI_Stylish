import { OutfitFeedback } from '@ai-stylish/shared';
import type { Outfit, WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function ItemThumbnail({ item }: { item: WardrobeItem | null }) {
  if (!item) return null;
  const primaryImage = item.images.find((img) => img.is_primary) ?? item.images[0];
  return (
    <View style={styles.thumbnailWrap}>
      {primaryImage ? (
        <Image source={{ uri: resolveMediaUrl(primaryImage.image_url) }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {item.name}
      </ThemedText>
    </View>
  );
}

export function OutfitCard({
  label,
  outfit,
  onFeedback,
  onViewDetails,
  isSubmittingFeedback,
  testID,
}: {
  label: string;
  outfit: Outfit;
  onFeedback: (feedbackCode: OutfitFeedback) => void;
  onViewDetails?: () => void;
  isSubmittingFeedback?: boolean;
  testID?: string;
}) {
  const [lastFeedback, setLastFeedback] = useState<OutfitFeedback | null>(null);
  const items = [outfit.top, outfit.bottom, outfit.outerwear, outfit.shoes].filter(
    (item): item is WardrobeItem => item !== null
  );

  const handleFeedback = (code: OutfitFeedback) => {
    setLastFeedback(code);
    onFeedback(code);
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card} testID={testID}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>

      <View style={styles.itemRow}>
        {items.map((item) => (
          <ItemThumbnail key={item.id} item={item} />
        ))}
      </View>

      {outfit.explanation_tags.length > 0 ? (
        <View style={styles.tagRow}>
          {outfit.explanation_tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <ThemedText type="small" themeColor="textSecondary">
                {tag}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {onViewDetails ? (
        <Pressable onPress={onViewDetails} testID={`${testID}-view-details`}>
          <ThemedText type="linkPrimary">View preview modes</ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.feedbackRow}>
        <Pressable
          style={[styles.feedbackButton, lastFeedback === OutfitFeedback.LIKE && styles.feedbackButtonActive]}
          onPress={() => handleFeedback(OutfitFeedback.LIKE)}
          disabled={isSubmittingFeedback}
          testID={`${testID}-like`}>
          <ThemedText type="small">Like</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.feedbackButton, lastFeedback === OutfitFeedback.WORN && styles.feedbackButtonActive]}
          onPress={() => handleFeedback(OutfitFeedback.WORN)}
          disabled={isSubmittingFeedback}
          testID={`${testID}-worn`}>
          <ThemedText type="small">Worn it</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.feedbackButton, lastFeedback === OutfitFeedback.SKIP && styles.feedbackButtonActive]}
          onPress={() => handleFeedback(OutfitFeedback.SKIP)}
          disabled={isSubmittingFeedback}
          testID={`${testID}-skip`}>
          {isSubmittingFeedback ? <ActivityIndicator size="small" /> : <ThemedText type="small">Skip</ThemedText>}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  thumbnailWrap: {
    width: 72,
    gap: Spacing.half,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
  },
  thumbnailPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: Spacing.two,
    backgroundColor: '#00000010',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tag: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: '#ffffff10',
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  feedbackButton: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    backgroundColor: '#ffffff10',
  },
  feedbackButtonActive: {
    backgroundColor: '#2563eb40',
  },
});
