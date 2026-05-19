import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react-native';

const ONBOARDING_KEY = '@alchemize_onboarding_seen';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  hintPosition: 'left' | 'right' | 'center';
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Alchemize',
    description: 'Transform your life, one habit at a time. Here is how to navigate.',
    icon: null,
    hintPosition: 'center',
  },
  {
    id: 'swipe-left',
    title: 'Swipe Left to Go Back',
    description: 'From any screen, swipe from the left edge to return.',
    icon: <ChevronLeft color="#a78bfa" size={28} strokeWidth={2.5} />,
    hintPosition: 'left',
  },
  {
    id: 'swipe-right',
    title: 'Swipe Right to Continue',
    description: 'On the home carousel, swipe right to explore features.',
    icon: <ChevronRight color="#a78bfa" size={28} strokeWidth={2.5} />,
    hintPosition: 'right',
  },
  {
    id: 'scroll',
    title: 'Scroll Up & Down',
    description: 'Swipe up or down on lists and journals to browse your content.',
    icon: (
      <View style={{ alignItems: 'center', gap: 4 }}>
        <ArrowUp color="#a78bfa" size={20} strokeWidth={2.5} />
        <ArrowDown color="#a78bfa" size={20} strokeWidth={2.5} />
      </View>
    ),
    hintPosition: 'center',
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const iconSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const check = async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (seen !== 'true') {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    };
    check();
  }, []);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [visible, fadeAnim, slideAnim]);

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const slide = Animated.loop(
      Animated.sequence([
        Animated.timing(iconSlideAnim, { toValue: -10, duration: 700, useNativeDriver: true }),
        Animated.timing(iconSlideAnim, { toValue: 10, duration: 700, useNativeDriver: true }),
        Animated.timing(iconSlideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    slide.start();

    return () => {
      pulse.stop();
      slide.stop();
    };
  }, [visible, stepIndex, pulseAnim, iconSlideAnim]);

  const handleDismiss = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleDismiss();
    }
  };

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="auto">
      <View style={styles.dim} />
      <Animated.View style={[styles.card, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.stepDots}>
          {STEPS.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === stepIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.iconWrap}>
          {step.icon && (
            <Animated.View
              style={{
                transform: [
                  step.hintPosition === 'left'
                    ? { translateX: iconSlideAnim }
                    : step.hintPosition === 'right'
                    ? { translateX: iconSlideAnim }
                    : { translateY: iconSlideAnim },
                ],
              }}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {step.icon}
              </Animated.View>
            </Animated.View>
          )}
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={handleDismiss} style={styles.skipButton} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 2, 20, 0.88)',
  },
  card: {
    width: SCREEN_WIDTH * 0.82,
    maxWidth: 340,
    backgroundColor: 'rgba(20, 12, 40, 0.96)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
  },
  dotActive: {
    backgroundColor: '#a78bfa',
    width: 20,
  },
  iconWrap: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(196, 181, 253, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  skipText: {
    color: 'rgba(196, 181, 253, 0.55)',
    fontSize: 13,
    fontWeight: '500' as const,
  },
});
