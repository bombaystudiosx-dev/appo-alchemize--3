import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { initDatabase } from '@/lib/database';
import NetworkBanner from '@/components/NetworkBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { registerForPushNotifications } from '@/lib/notifications';
import { TERMS_ACCEPTED_KEY, TERMS_VERSION } from '@/app/terms';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function BackButton() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const canGoBack = (navState?.routes?.length ?? 0) > 1;
  if (!canGoBack) return null;
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={layoutStyles.backButton}
      activeOpacity={0.7}
    >
      <ChevronLeft color="#ffffff" size={18} strokeWidth={2.5} />
      <Text style={layoutStyles.backButtonText}>Back</Text>
    </TouchableOpacity>
  );
}

function SplashScreen() {
  return (
    <View style={layoutStyles.splash}>
      <LinearGradient
        colors={['#080214', '#0c0520', '#10062a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={layoutStyles.splashContent}>
        <Text style={layoutStyles.splashTitle}>Alchemize</Text>
        <ActivityIndicator color="#a78bfa" size="large" style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

function NavigationGuard() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const mountedRef = useRef(true);
  const isNavigating = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Run navigation check every time auth or segments change.
  // Always read AsyncStorage fresh to avoid stale-state issues.
  useEffect(() => {
    let cancelled = false;

    const runGuard = async () => {
      // Wait up to 6s for auth to initialize, then proceed anyway
      let waited = 0;
      while (!isInitialized && waited < 6000) {
        await new Promise(r => setTimeout(r, 100));
        waited += 100;
      }

      if (cancelled || !mountedRef.current) return;

      // Always read fresh from storage
      let termsAccepted = false;
      try {
        const stored = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
        termsAccepted = stored === TERMS_VERSION;
      } catch {
        termsAccepted = false;
      }

      if (cancelled || !mountedRef.current) return;

      if (!ready) setReady(true);

      const root = segments[0] as string | undefined;
      const onTerms = root === 'terms';
      const onAuth = root === 'auth';

      console.log('[NavigationGuard] Check:', {
        isInitialized,
        isAuthenticated,
        termsAccepted,
        currentRoute: root,
      });

      if (isNavigating.current) return;

      if (!termsAccepted && !onTerms) {
        isNavigating.current = true;
        router.replace('/terms');
        setTimeout(() => { isNavigating.current = false; }, 500);
        return;
      }

      if (termsAccepted && !isAuthenticated && !onAuth && !onTerms) {
        isNavigating.current = true;
        router.replace('/auth');
        setTimeout(() => { isNavigating.current = false; }, 500);
        return;
      }

      if (termsAccepted && isAuthenticated && (onAuth || onTerms)) {
        isNavigating.current = true;
        router.replace('/');
        setTimeout(() => { isNavigating.current = false; }, 500);
        return;
      }
    };

    void runGuard();
    return () => { cancelled = true; };
  }, [isInitialized, isAuthenticated, segments]);

  if (!ready) return <SplashScreen />;
  return null;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      try {
        console.log('[App] Initializing database...');
        await initDatabase();
        console.log('[App] Database ready');
      } catch (error) {
        console.error('[App] Database init failed:', error);
      }
      try {
        await registerForPushNotifications();
      } catch {
        console.log('[App] Push notification registration skipped or failed');
      }
    };
    void init();
  }, []);
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <AppInitializer>
                  <NetworkBanner />
                  <NavigationGuard />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#080214' },
                      animation: 'fade',
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="auth" />
                    <Stack.Screen name="terms" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen
                      name="(tabs)"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                </AppInitializer>
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const layoutStyles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  splash: {
    flex: 1,
    backgroundColor: '#080214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    gap: 24,
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(139,92,246,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
});