import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from 'lucide-react-native';

const STORAGE_KEY = '@alchemize_gesture_onboarding_v1';
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Step {
  id: string;
  title: string;
  subtitle: string;
  direction: 'left' | 'right' | 'vertical';
}

const STEPS: Step[] = [
  {
    id: 'continue',
    title: 'Swipe right to continue',
    subtitle: 'Move forward through the app with a swipe from the left edge.',
    direction: 'right',
  },
  {
    id: 'back',
    title: 'Swipe left to go back',
    subtitle: 'Return to the previous screen any time with a swipe left.',
    direction: 'left',
  },
  {
    id: 'scroll',
    title: 'Swipe up or down to scroll',
    subtitle: 'Browse longer lists and content with a vertical swipe.',
    direction: 'vertical',
  },
];

export default function GestureOnboarding() {
  const [visible, setVisible] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!seen) {
          setVisible(true);
        }
      } catch (e) {
        console.error('[GestureOnboarding] load error', e);
      }
    })();
  }, []);

  const startStepAnimation = useCallback((direction: Step['direction']) => {
    translate.stopAnimation();
    pulse.stopAnimation();
    translate.setValue(0);
    pulse.setValue(0);

    const moveTo = direction === 'left' ? -90 : direction === 'right' ? 90 : 0;
    const moveDuration = 1100;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translate, {
            toValue: moveTo,
            duration: moveDuration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: moveDuration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translate, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(180),
      ])
    );
    loop.start();

    if (direction === 'vertical') {
      const vertLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(translate, {
            toValue: -50,
            duration: 800,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translate, {
            toValue: 50,
            duration: 1200,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translate, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ])
      );
      loop.stop();
      vertLoop.start();
    }
  }, [translate, pulse]);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(fade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fade]);

  useEffect(() => {
    if (!visible) return;
    const step = STEPS[stepIndex];
    if (!step) return;
    startStepAnimation(step.direction);
  }, [stepIndex, visible, startStepAnimation]);

  const close = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      console.error('[GestureOnboarding] save error', e);
    }
    Animated.timing(fade, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [fade]);

  const next = useCallback(() => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      close();
    }
  }, [stepIndex, close]);

  const back = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  if (!visible) return null;

  const step = STEPS[stepIndex];
  if (!step) return null;

  const isVertical = step.direction === 'vertical';
  const trail = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
  const trailScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.4] });

  return (
    <Animated.View pointerEvents="box-none" style={[styles.overlay, { opacity: fade }]}>
      <View pointerEvents="auto" style={styles.dimmer} />
      <View pointerEvents="auto" style={styles.content}>
        <TouchableOpacity style={styles.skipButton} onPress={close} testID="gesture-onboarding-skip">
          <X color="#fff" size={18} />
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.stageContainer}>
          <View style={styles.stage}>
            {!isVertical && (
              <Animated.View
                style={[
                  styles.trail,
                  {
                    opacity: trail,
                    transform: [
                      { scaleX: trailScale },
                      { translateX: step.direction === 'right' ? -10 : 10 },
                    ],
                  },
                ]}
              />
            )}
            <Animated.View
              style={[
                styles.fingerCircle,
                {
                  transform: isVertical
                    ? [{ translateY: translate }]
                    : [{ translateX: translate }],
                },
              ]}
            >
              <View style={styles.fingerInner}>
                {step.direction === 'right' && <ChevronRight color="#fff" size={28} />}
                {step.direction === 'left' && <ChevronLeft color="#fff" size={28} />}
                {step.direction === 'vertical' && (
                  <View style={styles.verticalIcons}>
                    <ChevronUp color="#fff" size={20} />
                    <ChevronDown color="#fff" size={20} />
                  </View>
                )}
              </View>
            </Animated.View>
          </View>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>
        </View>

        <View style={styles.dots}>
          {STEPS.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === stepIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={back}
            disabled={stepIndex === 0}
            style={[styles.controlButton, stepIndex === 0 && styles.controlButtonDisabled]}
          >
            <Text style={styles.controlButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={next} style={styles.primaryButton} testID="gesture-onboarding-next">
            <Text style={styles.primaryButtonText}>
              {stepIndex === STEPS.length - 1 ? "Got It" : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 28, 0.92)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  skipButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  skipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  stageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stage: {
    width: Math.min(SCREEN_W - 80, 280),
    height: Math.min(SCREEN_H * 0.32, 260),
    borderRadius: 24,
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trail: {
    position: 'absolute',
    width: 120,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a78bfa',
  },
  fingerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.6)',
  },
  fingerInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#a78bfa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalIcons: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: -4,
  },
  textBlock: {
    paddingHorizontal: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center' as const,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center' as const,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#a78bfa',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#a78bfa',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
});
