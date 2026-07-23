import type { Outfit, PreviewType, RecommendationRun } from '@ai-stylish/shared';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { resolveMediaUrl } from '@/api/client';
import { AssistantScreen } from '@/components/recommendation/assistant-screen';
import { ItemThumbnail } from '@/components/recommendation/outfit-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';
import { usePreviewStore } from '@/state/preview-store';

const MODES: { type: PreviewType; label: string }[] = [
  { type: 'combined_card', label: 'Item card' },
  { type: 'mannequin', label: 'Mannequin' },
  { type: 'collage', label: 'Collage' },
  { type: 'realistic', label: 'Realistic' },
];

export function OutfitDetailScreen({
  label,
  outfit,
  runId,
  onBack,
  onRefined,
}: {
  label: string;
  outfit: Outfit;
  runId: string;
  onBack: () => void;
  onRefined: (run: RecommendationRun) => void;
}) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const assetsForOutfit = usePreviewStore((s) => s.assets[outfit.id]);
  const loadingKey = usePreviewStore((s) => s.loadingKey);
  const error = usePreviewStore((s) => s.error);
  const generate = usePreviewStore((s) => s.generate);

  const [mode, setMode] = useState<PreviewType>('combined_card');
  const [showAssistant, setShowAssistant] = useState(false);

  const asset = assetsForOutfit?.[mode];
  const isLoading = loadingKey === `${outfit.id}:${mode}`;
  const collageAsset = assetsForOutfit?.collage;

  useEffect(() => {
    if (!token || mode === 'combined_card' || asset) return;
    generate(token, outfit.id, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode, outfit.id, asset]);

  useEffect(() => {
    if (!token) return;
    if (mode === 'realistic' && asset?.status === 'failed' && !collageAsset) {
      generate(token, outfit.id, 'collage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mode, asset?.status, outfit.id, collageAsset]);

  const items = [outfit.top, outfit.bottom, outfit.outerwear, outfit.shoes].filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  if (showAssistant) {
    return (
      <AssistantScreen
        runId={runId}
        outfit={outfit}
        onBack={() => setShowAssistant(false)}
        onRefined={onRefined}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backLink} testID="outfit-detail-back">
        <ThemedText type="linkPrimary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        {label}
      </ThemedText>

      <Pressable onPress={() => setShowAssistant(true)} testID="outfit-detail-ask-assistant">
        <ThemedText type="linkPrimary">Ask the assistant</ThemedText>
      </Pressable>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <Pressable
            key={m.type}
            onPress={() => setMode(m.type)}
            style={[
              styles.modeButton,
              { borderColor: theme.border },
              mode === m.type && { backgroundColor: theme.accent, borderColor: theme.accent },
            ]}
            testID={`preview-mode-${m.type}`}>
            <ThemedText type="small" themeColor={mode === m.type ? 'accentText' : 'text'}>
              {m.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedView
        type="backgroundElement"
        style={[styles.previewArea, { borderColor: theme.border }]}>
        {mode === 'combined_card' ? (
          <View style={styles.itemRow} testID="preview-combined-card">
            {items.map((item) => (
              <ItemThumbnail key={item.id} item={item} />
            ))}
          </View>
        ) : isLoading ? (
          <View style={styles.centered} testID="preview-loading">
            <ActivityIndicator color={theme.text} />
            <ThemedText type="small" themeColor="textSecondary">
              Generating preview…
            </ThemedText>
          </View>
        ) : mode === 'realistic' && asset?.status === 'failed' ? (
          <View testID="preview-fallback-notice">
            <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
              {(asset.metadata.reason as string | undefined) ??
                'Realistic preview is not available yet. Showing the collage preview instead.'}
            </ThemedText>
            {collageAsset?.local_uri ? (
              <Image
                source={{ uri: resolveMediaUrl(collageAsset.local_uri) }}
                style={styles.previewImage}
                testID="preview-image"
              />
            ) : (
              <View style={styles.itemRow}>
                {items.map((item) => (
                  <ItemThumbnail key={item.id} item={item} />
                ))}
              </View>
            )}
          </View>
        ) : asset?.local_uri ? (
          <Image
            source={{ uri: resolveMediaUrl(asset.local_uri) }}
            style={styles.previewImage}
            testID="preview-image"
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Preview not available.
          </ThemedText>
        )}
      </ThemedView>

      {error ? (
        <ThemedText type="small" themeColor="negative">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
  },
  backLink: {
    paddingVertical: Spacing.one,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  modeButton: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  previewArea: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.four,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  previewImage: {
    width: 280,
    height: 373,
    borderRadius: Spacing.one,
  },
  notice: {
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
});
