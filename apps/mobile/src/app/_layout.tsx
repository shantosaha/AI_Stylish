import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthFlow } from '@/components/auth/auth-flow';
import { LoadingScreen } from '@/components/loading-screen';
import { useAuthStore } from '@/state/auth-store';
import { useSyncQueueStore } from '@/state/sync-queue-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const hydrate = useAuthStore((s) => s.hydrate);
  const loadSyncQueue = useSyncQueueStore((s) => s.loadQueue);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Load once at the root, before any tab mounts - a queued mutation must
    // be visible to the very first successful API call after reconnecting,
    // regardless of which tab the app happens to land on.
    if (token) loadSyncQueue();
  }, [token, loadSyncQueue]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isHydrated ? token ? <AppTabs /> : <AuthFlow /> : <LoadingScreen />}
    </ThemeProvider>
  );
}
