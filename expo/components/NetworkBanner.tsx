import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NetworkBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnected = useRef<boolean | null>(null);

  const hideBanner = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const showBanner = useCallback((restored: boolean) => {
    if (restoredTimer.current) {
      clearTimeout(restoredTimer.current);
      restoredTimer.current = null;
    }
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (restored) {
      restoredTimer.current = setTimeout(() => {
        hideBanner();
      }, 2500);
    }
  }, [translateY, opacity, hideBanner]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      console.log('[Network] Status changed:', connected ? 'online' : 'offline', state.type);

      if (prevConnected.current === null) {
        prevConnected.current = connected;
        setIsConnected(connected);
        if (!connected) {
          showBanner(false);
        }
        return;
      }

      if (prevConnected.current !== connected) {
        prevConnected.current = connected;
        setIsConnected(connected);
        if (!connected) {
          showBanner(false);
        } else {
          showBanner(true);
        }
      }
    });

    return () => {
      unsubscribe();
      if (restoredTimer.current) {
        clearTimeout(restoredTimer.current);
      }
    };
  }, [showBanner]);

  if (isConnected === null) return null;

  const offline = !isConnected;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
        offline ? styles.offlineBg : styles.onlineBg,
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        {offline ? (
          <WifiOff size={15} color="#fff" strokeWidth={2.5} />
        ) : (
          <Wifi size={15} color="#fff" strokeWidth={2.5} />
        )}
        <Text style={styles.text}>
          {offline ? 'No internet connection' : 'Connection restored'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  offlineBg: {
    backgroundColor: '#1a0a2e',
    borderWidth: 1,
    borderColor: 'rgba(180, 80, 255, 0.35)',
  },
  onlineBg: {
    backgroundColor: '#0d2a1a',
    borderWidth: 1,
    borderColor: 'rgba(50, 210, 120, 0.4)',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});
