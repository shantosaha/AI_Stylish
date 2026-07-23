import type { Outfit, OutfitFeedback, RecommendationRun } from '@ai-stylish/shared';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContextManagerContent } from '@/components/context/context-manager-content';
import { HistoryScreen } from '@/components/history/history-screen';
import { OutfitCard } from '@/components/recommendation/outfit-card';
import { OutfitDetailScreen } from '@/components/recommendation/outfit-detail-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as storage from '@/lib/storage';
import { useAuthStore } from '@/state/auth-store';
import { useContextStore } from '@/state/context-store';
import { useRecommendationStore } from '@/state/recommendation-store';
import { useWardrobeStore } from '@/state/wardrobe-store';

const LAST_LOCATION_KEY = 'ai_stylish_last_location';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.token);
  const name = profile?.name?.trim();
  const items = useWardrobeStore((s) => s.items);
  const isLoadingWardrobe = useWardrobeStore((s) => s.isLoading);
  const fetchItems = useWardrobeStore((s) => s.fetchItems);

  const { snapshot, isFromCache, isOffline, hydrateFromCache, fetchToday } = useContextStore();
  const {
    run,
    isLoading: isLoadingRecommendation,
    isSubmittingFeedback,
    error: recommendationError,
    generateToday,
    submitFeedback,
    setRun,
  } = useRecommendationStore();

  const [showContextManager, setShowContextManager] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [hasRequestedRecommendation, setHasRequestedRecommendation] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<{ label: string; outfit: Outfit; runId: string } | null>(
    null
  );

  const handleFeedback = (
    outfit: Outfit,
    code: OutfitFeedback,
    options?: { isFavorite?: boolean; wornAt?: string }
  ) => {
    if (!token) return;
    submitFeedback(token, outfit.id, code, options?.isFavorite, options?.wornAt).catch(() => {});
  };

  const handleRefined = (newRun: RecommendationRun) => {
    setRun(newRun);
    setSelectedOutfit(null);
  };

  const hasTop = items.some((i) => i.category === 'tops');
  const hasBottom = items.some((i) => i.category === 'bottoms');
  const hasShoes = items.some((i) => i.category === 'shoes');
  const canRecommend = hasTop && hasBottom && hasShoes;

  useEffect(() => {
    if (token) fetchItems(token);
  }, [token, fetchItems]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      await hydrateFromCache();
      const lastLocation = await storage.getItem(LAST_LOCATION_KEY);
      if (lastLocation) {
        const { lat, lon } = JSON.parse(lastLocation);
        fetchToday(token, lat, lon);
      } else {
        fetchToday(token);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token || isLoadingWardrobe || !canRecommend || hasRequestedRecommendation) return;
    setHasRequestedRecommendation(true);
    (async () => {
      const lastLocation = await storage.getItem(LAST_LOCATION_KEY);
      if (lastLocation) {
        const { lat, lon } = JSON.parse(lastLocation);
        generateToday(token, lat, lon);
      } else {
        generateToday(token);
      }
    })();
  }, [token, isLoadingWardrobe, canRecommend, hasRequestedRecommendation, generateToday]);

  const handleEnableLocation = async () => {
    if (!token) return;
    setIsRequestingLocation(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.granted) {
        const position = await Location.getCurrentPositionAsync();
        const { latitude, longitude } = position.coords;
        await storage.setItem(LAST_LOCATION_KEY, JSON.stringify({ lat: latitude, lon: longitude }));
        await fetchToday(token, latitude, longitude);
        await generateToday(token, latitude, longitude);
      }
    } finally {
      setIsRequestingLocation(false);
    }
  };

  if (showContextManager) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ContextManagerContent onBack={() => setShowContextManager(false)} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (showHistory) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <HistoryScreen onBack={() => setShowHistory(false)} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (selectedOutfit) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <OutfitDetailScreen
              label={selectedOutfit.label}
              outfit={selectedOutfit.outfit}
              runId={selectedOutfit.runId}
              onBack={() => setSelectedOutfit(null)}
              onRefined={handleRefined}
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const nextEvent = snapshot?.events[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            {name ? `Hey, ${name}` : 'Welcome'}
          </ThemedText>

          {!canRecommend ? (
            <Pressable onPress={() => router.push('/wardrobe')} testID="home-recommendation-empty">
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="default" themeColor="textSecondary">
                  Add at least one top, one bottom, and one pair of shoes to get your first outfit
                  recommendation.
                </ThemedText>
              </ThemedView>
            </Pressable>
          ) : isLoadingRecommendation ? (
            <ThemedView type="backgroundElement" style={[styles.card, styles.centered]}>
              <ActivityIndicator color={theme.text} />
              <ThemedText type="default" themeColor="textSecondary">
                Finding today&apos;s outfit…
              </ThemedText>
            </ThemedView>
          ) : recommendationError ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="small" style={styles.errorText}>
                {recommendationError}
              </ThemedText>
              <Pressable
                onPress={() => token && generateToday(token)}
                testID="home-recommendation-retry">
                <ThemedText type="linkPrimary">Try again</ThemedText>
              </Pressable>
            </ThemedView>
          ) : run ? (
            <>
              <OutfitCard
                label="Today's pick"
                outfit={run.main_outfit}
                onFeedback={(code, options) => handleFeedback(run.main_outfit, code, options)}
                onViewDetails={() =>
                  setSelectedOutfit({ label: "Today's pick", outfit: run.main_outfit, runId: run.id })
                }
                isSubmittingFeedback={isSubmittingFeedback}
                testID="outfit-main"
              />
              <ThemedText type="smallBold" themeColor="textSecondary">
                Alternatives
              </ThemedText>
              <OutfitCard
                label="Alternative 1"
                outfit={run.alt_outfit_1}
                onFeedback={(code, options) => handleFeedback(run.alt_outfit_1, code, options)}
                onViewDetails={() =>
                  setSelectedOutfit({ label: 'Alternative 1', outfit: run.alt_outfit_1, runId: run.id })
                }
                isSubmittingFeedback={isSubmittingFeedback}
                testID="outfit-alt1"
              />
              <OutfitCard
                label="Alternative 2"
                outfit={run.alt_outfit_2}
                onFeedback={(code, options) => handleFeedback(run.alt_outfit_2, code, options)}
                onViewDetails={() =>
                  setSelectedOutfit({ label: 'Alternative 2', outfit: run.alt_outfit_2, runId: run.id })
                }
                isSubmittingFeedback={isSubmittingFeedback}
                testID="outfit-alt2"
              />
            </>
          ) : null}

          <Pressable onPress={() => setShowContextManager(true)} testID="home-context-card">
            <ThemedView type="backgroundElement" style={styles.card}>
              {(isOffline || isFromCache) && (
                <ThemedText type="small" style={isOffline ? styles.offlineBadge : styles.cacheBadge}>
                  {isOffline ? 'Offline — showing saved data' : 'Showing cached data'}
                </ThemedText>
              )}
              <ThemedText type="smallBold">
                {snapshot?.weather
                  ? `${Math.round(snapshot.weather.temperature)}°C · ${snapshot.weather.condition}${
                      snapshot.weather.is_stale ? ' (stale)' : ''
                    }`
                  : 'Weather unavailable'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Currently: {snapshot?.routine_block ?? '—'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {snapshot && snapshot.events.length > 0
                  ? `${snapshot.events.length} event${snapshot.events.length === 1 ? '' : 's'} today${
                      nextEvent ? ` · Next: ${nextEvent.title}` : ''
                    }`
                  : 'No events today'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          {!snapshot?.weather && (
            <Pressable
              onPress={handleEnableLocation}
              disabled={isRequestingLocation}
              testID="home-enable-location">
              <ThemedText type="linkPrimary">
                {isRequestingLocation ? 'Requesting…' : 'Enable weather'}
              </ThemedText>
            </Pressable>
          )}

          <Pressable onPress={() => router.push('/wardrobe')} testID="home-wardrobe-link">
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="default" themeColor="textSecondary">
                {items.length > 0
                  ? `${items.length} item${items.length === 1 ? '' : 's'} in your wardrobe. Tap to manage.`
                  : 'Your wardrobe is empty. Tap to add your first item.'}
              </ThemedText>
            </ThemedView>
          </Pressable>

          <Pressable onPress={() => setShowHistory(true)} testID="home-history-link">
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText type="default" themeColor="textSecondary">
                History — past recommendations, favorites, and worn outfits.
              </ThemedText>
            </ThemedView>
          </Pressable>
        </ScrollView>
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
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.five }),
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  centered: {
    alignItems: 'center',
  },
  offlineBadge: {
    color: '#ef4444',
  },
  cacheBadge: {
    color: '#f59e0b',
  },
  errorText: {
    color: '#ef4444',
  },
});
