import { OutfitFeedback } from '@ai-stylish/shared';
import type { Outfit, WardrobeItem } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ItemThumbnail({ item }: { item: WardrobeItem | null }) {
  const theme = useTheme();
  if (!item) return null;
  const primaryImage = item.images.find((img) => img.is_primary) ?? item.images[0];
  return (
    <View style={styles.thumbnailWrap}>
      {primaryImage ? (
        <Image
          source={{ uri: resolveMediaUrl(primaryImage.image_url) }}
          style={[styles.thumbnail, { borderColor: theme.border }]}
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder, { borderColor: theme.border }]} />
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
  onFeedback: (feedbackCode: OutfitFeedback, options?: { isFavorite?: boolean; wornAt?: string }) => void;
  onViewDetails?: () => void;
  isSubmittingFeedback?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const [lastFeedback, setLastFeedback] = useState<OutfitFeedback | null>(null);
  const items = [outfit.top, outfit.bottom, outfit.outerwear, outfit.shoes].filter(
    (item): item is WardrobeItem => item !== null
  );

  const handleFeedback = (code: OutfitFeedback, options?: { isFavorite?: boolean; wornAt?: string }) => {
    setLastFeedback(code);
    onFeedback(code, options);
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }]}
      testID={testID}>
      <ThemedText type="label" themeColor="accent">
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
            <View key={tag} style={[styles.tag, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {tag}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      {outfit.cloud_explanation ? (
        <View
          style={[styles.cloudNote, { borderColor: theme.border }]}
          testID={testID ? `${testID}-cloud-note` : undefined}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            AI stylist note
          </ThemedText>
          <ThemedText type="small">{outfit.cloud_explanation}</ThemedText>
        </View>
      ) : null}

      {onViewDetails ? (
        <Pressable onPress={onViewDetails} testID={`${testID}-view-details`}>
          <ThemedText type="linkPrimary">View preview modes</ThemedText>
        </Pressable>
      ) : null}

      <View style={[styles.feedbackRow, { borderTopColor: theme.border }]}>
        <Pressable
          style={[
            styles.feedbackButton,
            { borderColor: theme.border },
            lastFeedback === OutfitFeedback.LIKE && [
              styles.feedbackButtonActive,
              { backgroundColor: theme.accent, borderColor: theme.accent },
            ],
          ]}
          onPress={() => handleFeedback(OutfitFeedback.LIKE)}
          disabled={isSubmittingFeedback}
          testID={`${testID}-like`}>
          <ThemedText
            type="small"
            themeColor={lastFeedback === OutfitFeedback.LIKE ? 'accentText' : 'text'}>
            Like
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.feedbackButton,
            { borderColor: theme.border },
            lastFeedback === OutfitFeedback.WORN && [
              styles.feedbackButtonActive,
              { backgroundColor: theme.accent, borderColor: theme.accent },
            ],
          ]}
          onPress={() => handleFeedback(OutfitFeedback.WORN, { wornAt: new Date().toISOString() })}
          disabled={isSubmittingFeedback}
          testID={`${testID}-worn`}>
          <ThemedText
            type="small"
            themeColor={lastFeedback === OutfitFeedback.WORN ? 'accentText' : 'text'}>
            Worn it
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.feedbackButton,
            { borderColor: theme.border },
            lastFeedback === OutfitFeedback.FAVORITE && [
              styles.feedbackButtonActive,
              { backgroundColor: theme.accent, borderColor: theme.accent },
            ],
          ]}
          onPress={() => handleFeedback(OutfitFeedback.FAVORITE, { isFavorite: true })}
          disabled={isSubmittingFeedback}
          testID={`${testID}-favorite`}>
          <ThemedText
            type="small"
            themeColor={lastFeedback === OutfitFeedback.FAVORITE ? 'accentText' : 'text'}>
            Favorite
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.feedbackButton,
            { borderColor: theme.border },
            lastFeedback === OutfitFeedback.SKIP && [
              styles.feedbackButtonActive,
              { backgroundColor: theme.accent, borderColor: theme.accent },
            ],
          ]}
          onPress={() => handleFeedback(OutfitFeedback.SKIP)}
          disabled={isSubmittingFeedback}
          testID={`${testID}-skip`}>
          {isSubmittingFeedback ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <ThemedText
              type="small"
              themeColor={lastFeedback === OutfitFeedback.SKIP ? 'accentText' : 'text'}>
              Skip
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
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
    borderRadius: Spacing.one,
    borderWidth: 1,
  },
  thumbnailPlaceholder: {
    backgroundColor: 'transparent',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tag: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  cloudNote: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  feedbackButton: {
    flex: 1,
    borderRadius: Spacing.one,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  feedbackButtonActive: {
    borderWidth: 1,
  },
});
