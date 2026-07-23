import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  WorkSans_400Regular,
  WorkSans_500Medium,
  WorkSans_600SemiBold,
} from '@expo-google-fonts/work-sans';
import { useFonts } from 'expo-font';
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
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Load once at the root, before any tab mounts - a queued mutation must
    // be visible to the very first successful API call after reconnecting,
    // regardless of which tab the app happens to land on.
    if (token) loadSyncQueue();
  }, [token, loadSyncQueue]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {isHydrated ? token ? <AppTabs /> : <AuthFlow /> : <LoadingScreen />}
    </ThemeProvider>
  );
}
