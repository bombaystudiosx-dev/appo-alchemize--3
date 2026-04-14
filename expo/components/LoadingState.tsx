import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Loader } from 'lucide-react-native';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export default function LoadingState({ message = 'Loading...', compact = false }: LoadingStateProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    spin.start();
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [spinAnim, pulseAnim]);

  const rotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Loader color="#a78bfa" size={20} />
        </Animated.View>
        <Text style={styles.compactText}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.loaderCard}>
        <Animated.View style={{ transform: [{ rotate: rotation }], opacity: pulseAnim }}>
          <Loader color="#a78bfa" size={32} />
        </Animated.View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0.6, 1],
                    outputRange: [i === 1 ? 1 : 0.4, i === 1 ? 0.4 : 1],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  loaderCard: {
    backgroundColor: 'rgba(20, 10, 40, 0.85)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    minWidth: 180,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '500' as const,
    marginTop: 16,
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#a78bfa',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  compactText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
