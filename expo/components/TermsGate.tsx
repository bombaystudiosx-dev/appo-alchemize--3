import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, Check } from 'lucide-react-native';

const ACCEPTED_KEY = 'terms_accepted_v1';

interface Props {
  children: React.ReactNode;
}

export default function TermsGate({ children }: Props) {
  const [checked, setChecked] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [scrolledToEnd, setScrolledToEnd] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(ACCEPTED_KEY)
      .then((v) => {
        setAccepted(v === 'true');
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 24) {
      setScrolledToEnd(true);
    }
  }, []);

  const handleAccept = useCallback(async () => {
    if (!scrolledToEnd) return;
    try {
      await AsyncStorage.setItem(ACCEPTED_KEY, 'true');
    } catch (err) {
      console.error('[TermsGate] Failed to persist acceptance', err);
    }
    setAccepted(true);
  }, [scrolledToEnd]);

  if (!checked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#a78bfa" />
      </View>
    );
  }

  if (accepted) return <>{children}</>;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0b2e', '#0c0520', '#080214']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <ShieldCheck color="#c4b5fd" size={28} />
        </View>
        <Text style={styles.title}>Terms & Privacy</Text>
        <Text style={styles.subtitle}>Please review and scroll to the end to continue</Text>
      </View>

      <View style={styles.scrollWrap}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.h2}>1. Acceptance</Text>
          <Text style={styles.p}>
            By using Alchemize ("the App"), you agree to be bound by these Terms of Service and our Privacy Policy.
            If you do not agree, you must not use the App.
          </Text>

          <Text style={styles.h2}>2. Use of the App</Text>
          <Text style={styles.p}>
            Alchemize provides personal development tools including goal tracking, habits, journaling,
            calorie tracking, fitness logging, manifestation boards, and other lifestyle features. The
            App is provided for personal, non-commercial use only.
          </Text>

          <Text style={styles.h2}>3. Not Medical or Professional Advice</Text>
          <Text style={styles.p}>
            Content in Alchemize (including nutritional estimates, fitness suggestions, AI-generated
            insights, and journaling prompts) is for informational purposes only and is NOT a substitute
            for professional medical, psychological, financial, or legal advice. Always consult a
            qualified professional before making decisions that affect your health, finances, or wellbeing.
          </Text>

          <Text style={styles.h2}>4. AI-Generated Content</Text>
          <Text style={styles.p}>
            Some features use artificial intelligence to estimate calories, transcribe content, generate
            affirmations, and analyze data. AI output may be inaccurate, incomplete, or misleading. You
            are responsible for verifying any information before relying on it.
          </Text>

          <Text style={styles.h2}>5. Your Data</Text>
          <Text style={styles.p}>
            We store the data you choose to add to the App (such as goals, habits, photos, journal
            entries, meals, and workouts) to provide the App's features. Some data may be processed by
            third-party providers (e.g. authentication, push notifications, cloud storage). We do not
            sell your personal data.
          </Text>

          <Text style={styles.h2}>6. Data Security &amp; No Liability for Breaches</Text>
          <Text style={styles.p}>
            We take reasonable steps to protect your data, but no system is 100% secure. You acknowledge
            and agree that:
          </Text>
          <Text style={styles.bullet}>• We are NOT responsible for any data leaks, breaches, unauthorized access, hacking, or loss of data caused by third-party services, network providers, device compromise, or events outside our reasonable control.</Text>
          <Text style={styles.bullet}>• We are NOT liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the App, including but not limited to loss of data, profits, or privacy.</Text>
          <Text style={styles.bullet}>• You use the App at your own risk.</Text>

          <Text style={styles.h2}>7. Account &amp; Authentication</Text>
          <Text style={styles.p}>
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account. Notify us immediately of any unauthorized use.
          </Text>

          <Text style={styles.h2}>8. Health &amp; Fitness Data</Text>
          <Text style={styles.p}>
            Optional integrations (such as HealthKit, Bluetooth devices, wearables, and the calorie
            scanner) only function with your explicit permission. You may revoke permissions at any time
            in your device settings. Data accuracy is not guaranteed.
          </Text>

          <Text style={styles.h2}>9. Notifications &amp; Calendar</Text>
          <Text style={styles.p}>
            With your permission, the App may send push notifications and add events to your device
            calendar. You can disable these at any time in settings.
          </Text>

          <Text style={styles.h2}>10. User Content</Text>
          <Text style={styles.p}>
            You retain ownership of content you create in the App. You agree not to upload content that
            is illegal, infringing, harmful, harassing, or violates the rights of others.
          </Text>

          <Text style={styles.h2}>11. Termination</Text>
          <Text style={styles.p}>
            You may delete your account at any time from Settings. We may suspend or terminate access
            for violations of these Terms.
          </Text>

          <Text style={styles.h2}>12. Changes to These Terms</Text>
          <Text style={styles.p}>
            We may update these Terms from time to time. Continued use of the App after changes
            constitutes acceptance of the updated Terms.
          </Text>

          <Text style={styles.h2}>13. Governing Law</Text>
          <Text style={styles.p}>
            These Terms are governed by the laws of your country of residence, without regard to
            conflict-of-law principles.
          </Text>

          <Text style={styles.h2}>14. Contact</Text>
          <Text style={styles.p}>
            Questions about these Terms or our Privacy Policy can be sent through the Support option
            in Settings.
          </Text>

          <Text style={styles.endNote}>— End of Terms & Privacy Policy —</Text>
        </ScrollView>

        {!scrolledToEnd && (
          <LinearGradient
            colors={['transparent', 'rgba(8,2,20,0.85)']}
            style={styles.fade}
            pointerEvents="none"
          />
        )}
      </View>

      <View style={styles.footer}>
        {!scrolledToEnd && (
          <Text style={styles.scrollHint}>Scroll to the bottom to enable Accept</Text>
        )}
        <TouchableOpacity
          style={[styles.acceptBtn, !scrolledToEnd && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!scrolledToEnd}
          activeOpacity={0.85}
          testID="terms-accept-button"
        >
          <LinearGradient
            colors={scrolledToEnd ? ['#8b5cf6', '#7c3aed', '#6d28d9'] : ['#3a2a55', '#2a1a45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.acceptGradient}
          >
            {scrolledToEnd && <Check color="#fff" size={18} />}
            <Text style={styles.acceptText}>
              {scrolledToEnd ? 'I Accept the Terms & Privacy' : 'Please scroll to the end'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080214',
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#080214',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(196,181,253,0.7)',
    textAlign: 'center',
  },
  scrollWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(15,8,30,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  h2: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#c4b5fd',
    marginTop: 14,
    marginBottom: 6,
  },
  p: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    paddingLeft: 6,
  },
  endNote: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(196,181,253,0.5)',
    fontStyle: 'italic' as const,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  scrollHint: {
    fontSize: 11,
    color: 'rgba(196,181,253,0.55)',
    textAlign: 'center',
    marginBottom: 8,
  },
  acceptBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
