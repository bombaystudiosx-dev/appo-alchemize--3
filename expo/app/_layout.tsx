import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useRootNavigationState, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, Platform, View, Image } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { initDatabase } from '@/lib/db/core';
import NetworkBanner from "@/components/NetworkBanner";
import GestureOnboarding from "@/components/GestureOnboarding";
import { registerForPushNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync().catch(() => {});

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

function GestureOnboardingGate() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading || !isAuthenticated) return null;
  return <GestureOnboarding />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (isLoading) return;
    if (!navState?.key) return;
    const inAuth = segments[0] === 'auth';
    if (!isAuthenticated && !inAuth) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuth) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, navState?.key, router]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={layoutStyles.splash}>
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={layoutStyles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTintColor: "#ffffff",
        headerStyle: { backgroundColor: '#0c0520' },
        headerShadowVisible: false,
        headerTitleStyle: { color: '#ffffff' },
        headerLeft: () => <BackButton />,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth" options={{ title: "Welcome", headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Alchemize", headerShown: false }} />
      <Stack.Screen name="manifestation-board/index" options={{ title: "Portal Board", headerShown: true }} />
      <Stack.Screen name="manifestation-board/[id]" options={{ title: "Manifestation Detail", headerStyle: { backgroundColor: '#0c0520' }, headerTintColor: '#ffffff' }} />
      <Stack.Screen name="manifestation-board/add" options={{ title: "Add Manifestation", headerShown: true, presentation: "modal" }} />
      <Stack.Screen name="manifestation-board/slideshow" options={{ title: "Slideshow", headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="goals/index" options={{ title: "Goals" }} />
      <Stack.Screen name="goals/[id]" options={{ title: "Goal Detail" }} />
      <Stack.Screen name="goals/add" options={{ title: "Add Goal", presentation: "modal" }} />
      <Stack.Screen name="habits/index" options={{ title: "Habits" }} />
      <Stack.Screen name="habits/add" options={{ title: "Add Habit", presentation: "modal" }} />
      <Stack.Screen name="financial/index" options={{ title: "Financial Tracker" }} />
      <Stack.Screen name="calorie/index" options={{ title: "Calorie Tracker" }} />
      <Stack.Screen name="calorie/add" options={{ title: "Add Meal", presentation: "modal" }} />
      <Stack.Screen name="todos/index" options={{ title: "To-Do List" }} />
      <Stack.Screen name="todos/add" options={{ title: "Add Task", presentation: "modal" }} />
      <Stack.Screen name="gratitude/index" options={{ title: "Gratitude Journal" }} />
      <Stack.Screen name="gratitude/add" options={{ title: "Add Entry", presentation: "modal" }} />
      <Stack.Screen name="fitness/index" options={{ title: "Fitness" }} />
      <Stack.Screen name="fitness/add" options={{ title: "Add Workout", presentation: "modal" }} />
      <Stack.Screen name="fitness/workout" options={{ title: "Workout", presentation: "modal" }} />
      <Stack.Screen name="fitness/browse" options={{ title: "Browse Workouts" }} />
      <Stack.Screen name="calorie/scan" options={{ title: "Scan Food", presentation: "modal" }} />
      <Stack.Screen name="calorie/profile" options={{ title: "Profile", presentation: "modal" }} />
      <Stack.Screen name="calorie/meal-prep" options={{ title: "Meal Prep" }} />
      <Stack.Screen name="financial/notes" options={{ title: "Financial Notes" }} />
      <Stack.Screen name="affirmations/index" options={{ title: "Affirmations" }} />
      <Stack.Screen name="affirmations/[id]" options={{ title: "Edit Affirmation" }} />
      <Stack.Screen name="affirmations/add" options={{ title: "Add Affirmation", presentation: "modal" }} />
      <Stack.Screen name="affirmations/play" options={{ title: "Play Mode", headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="quick-add" options={{ title: "Quick Add", presentation: "modal" }} />
      <Stack.Screen name="appointments/index" options={{ title: "Appointments" }} />
      <Stack.Screen name="appointments/add" options={{ title: "Add Appointment", presentation: "modal" }} />
      <Stack.Screen name="pwa-install-prompt" options={{ title: "Install App", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('[App] Initializing database...');
      initDatabase()
        .then(() => console.log('[App] Database ready'))
        .catch((err) => console.error('[App] Database init failed:', err));

      console.log('[App] Registering for push notifications...');
      registerForPushNotifications()
        .then((token) => {
          if (token) console.log('[App] Push token registered:', token);
          else console.log('[App] Push notification registration skipped or failed');
        })
        .catch((err) => console.error('[App] Push registration error:', err));
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <GestureHandlerRootView style={layoutStyles.root}>
              <View style={layoutStyles.root}>
                <AuthGate>
                  <RootLayoutNav />
                </AuthGate>
                <NetworkBanner />
                <GestureOnboardingGate />
              </View>
            </GestureHandlerRootView>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c0520',
  },
  splashImage: {
    width: 200,
    height: 200,
  },
});
