import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
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
      testID="global-back-button"
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
        <ActivityIndicator color="#a78bfa" size="large" style={layoutStyles.splashLoader} />
      </View>
    </View>
  );
}

function NavigationGuard() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [termsVersion, setTermsVersion] = useState<string | null | 'loading'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const mountedRef = useRef(true);

  // Safety timeout — force proceed after 5 seconds no matter what
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setTimedOut(true);
        if (termsVersion === 'loading') setTermsVersion(null);
      }
    }, 5000);
    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
    };
  }, []);

  const checkTerms = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
      if (mountedRef.current) setTermsVersion(val ?? null);
      console.log('[NavigationGuard] Terms version stored:', val);
    } catch {
      if (mountedRef.current) setTermsVersion(null);
    }
  }, []);

  useEffect(() => {
    void checkTerms();
  }, [checkTerms]);

  useEffect(() => {
    // Wait for both auth and terms to resolve, OR for timeout
    const authReady = isInitialized || timedOut;
    const termsReady = termsVersion !== 'loading';
    if (!authReady || !termsReady) return;

    const termsAccepted = termsVersion === TERMS_VERSION;
    const root = segments[0] as string | undefined;
    const onTerms = root === 'terms';
    const onAuth = root === 'auth';

    console.log('[NavigationGuard] Check:', {
      isInitialized,
      isAuthenticated,
      termsAccepted,
      currentRoute: root,
      timedOut,
    });

    if (!termsAccepted && !onTerms) {
      router.replace('/terms');
      return;
    }

    if (termsAccepted && !isAuthenticated && !onAuth) {
      router.replace('/auth');
      return;
    }

    if (termsAccepted && isAuthenticated && (onAuth || onTerms)) {
      router.replace('/');
      return;
    }
  }, [isInitialized, isAuthenticated, termsVersion, segments, router, timedOut]);

  // Show splash only while truly loading (with timeout protection)
  const authReady = isInitialized || timedOut;
  const termsReady = termsVersion !== 'loading';
  if (!authReady || !termsReady) {
    return <SplashScreen />;
  }

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
        console.log('[App] Registering for push notifications...');
        await registerForPushNotifications();
      } catch (error) {
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
  splashLoader: {
    marginTop: 8,
  },
});