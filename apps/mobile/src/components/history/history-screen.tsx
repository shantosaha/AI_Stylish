import { OUTFIT_FEEDBACK_LABELS } from '@ai-stylish/shared';
import type { HistoryEntry, Outfit } from '@ai-stylish/shared';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ItemThumbnail } from '@/components/recommendation/outfit-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/state/auth-store';
import { useHistoryStore } from '@/state/history-store';

// Order-independent key of an outfit's item ids - used to detect "you were
// recommended/wore this exact combo before" without any API change.
function outfitKey(outfit: Outfit): string {
  return [outfit.top?.id, outfit.bottom?.id, outfit.outerwear?.id, outfit.shoes?.id]
    .filter((id): id is string => !!id)
    .sort()
    .join('|');
}

function computeRepeatIds(entries: HistoryEntry[]): Set<string> {
  const seen = new Set<string>();
  const repeats = new Set<string>();
  for (const entry of entries) {
    const key = outfitKey(entry.outfit);
    if (seen.has(key)) {
      repeats.add(entry.id);
    } else {
      seen.add(key);
    }
  }
  return repeats;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const token = useAuthStore((s) => s.token);
  const { entries, isLoading, error, fetchHistory } = useHistoryStore();

  useEffect(() => {
    if (token) fetchHistory(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const repeatIds = computeRepeatIds(entries);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backLink} testID="history-back">
        <ThemedText type="linkPrimary">← Back</ThemedText>
      </Pressable>

      <ThemedText type="title" style={styles.title}>
        History
      </ThemedText>

      {isLoading ? (
        <View style={styles.centered} testID="history-loading">
          <ActivityIndicator color={theme.text} />
        </View>
      ) : error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : entries.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.card} testID="history-empty">
          <ThemedText type="default" themeColor="textSecondary">
            No history yet. Mark an outfit as worn or favorite to start building your history.
          </ThemedText>
        </ThemedView>
      ) : (
        entries.map((entry) => {
          const items = [entry.outfit.top, entry.outfit.bottom, entry.outfit.outerwear, entry.outfit.shoes].filter(
            (item): item is NonNullable<typeof item> => item !== null
          );
          return (
            <ThemedView type="backgroundElement" style={styles.card} key={entry.id} testID="history-entry">
              <View style={styles.itemRow}>
                {items.map((item) => (
                  <ItemThumbnail key={item.id} item={item} />
                ))}
              </View>
              <View style={styles.badgeRow}>
                {entry.feedback_code ? (
                  <View style={styles.badge}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {OUTFIT_FEEDBACK_LABELS[entry.feedback_code]}
                    </ThemedText>
                  </View>
                ) : null}
                {entry.is_favorite ? (
                  <View style={styles.badge}>
                    <ThemedText type="small" themeColor="textSecondary">
                      ★ Favorite
                    </ThemedText>
                  </View>
                ) : null}
                {entry.worn_at ? (
                  <View style={styles.badge}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Worn {formatDate(entry.worn_at)}
                    </ThemedText>
                  </View>
                ) : null}
                {repeatIds.has(entry.id) ? (
                  <View style={styles.repeatBadge} testID={`history-repeat-${entry.id}`}>
                    <ThemedText type="small">Repeat outfit</ThemedText>
                  </View>
                ) : null}
              </View>
            </ThemedView>
          );
        })
      )}
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
    lineHeight: 36,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: '#ffffff10',
  },
  repeatBadge: {
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    backgroundColor: '#f59e0b40',
  },
  error: {
    color: '#ef4444',
  },
});
