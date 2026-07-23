import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContextManagerContent } from '@/components/context/context-manager-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import * as storage from '@/lib/storage';
import { useAuthStore } from '@/state/auth-store';
import { useContextStore } from '@/state/context-store';
import { useWardrobeStore } from '@/state/wardrobe-store';

const LAST_LOCATION_KEY = 'ai_stylish_last_location';

export default function HomeScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const token = useAuthStore((s) => s.token);
  const name = profile?.name?.trim();
  const items = useWardrobeStore((s) => s.items);
  const fetchItems = useWardrobeStore((s) => s.fetchItems);

  const { snapshot, isFromCache, isOffline, hydrateFromCache, fetchToday } = useContextStore();
  const [showContextManager, setShowContextManager] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

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

  const nextEvent = snapshot?.events[0];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {name ? `Hey, ${name}` : 'Welcome'}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
          Add wardrobe items to get your first outfit recommendation.
        </ThemedText>

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
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  offlineBadge: {
    color: '#ef4444',
  },
  cacheBadge: {
    color: '#f59e0b',
  },
});
