import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';

const ACCEPTED_KEY = 'terms_accepted_v1';

interface Props {
  children: React.ReactNode;
}

export default function TermsGate({ children }: Props) {
  const [checkedStorage, setCheckedStorage] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [agreed, setAgreed] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(ACCEPTED_KEY)
      .then((v) => {
        setAccepted(v === 'true');
        setCheckedStorage(true);
      })
      .catch(() => setCheckedStorage(true));
  }, []);

  const handleToggle = useCallback(() => {
    setAgreed((prev) => !prev);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!agreed) return;
    try {
      await AsyncStorage.setItem(ACCEPTED_KEY, 'true');
    } catch (err) {
      console.error('[TermsGate] Failed to persist acceptance', err);
    }
    setAccepted(true);
  }, [agreed]);

  if (!checkedStorage) {
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
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={styles.splashImg}
          resizeMode="contain"
        />
        <Text style={styles.welcomeTitle}>Welcome to Alchemize</Text>
        <Text style={styles.welcomeSubtitle}>
          Please review and accept our Terms & Privacy Policy to continue.
        </Text>
      </View>

      <View style={styles.termsBox}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
          persistentScrollbar={true}
          nestedScrollEnabled={true}
          testID="terms-scroll"
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

          <Text style={styles.h2}>6. Data Security & No Liability for Breaches</Text>
          <Text style={styles.p}>
            We take reasonable steps to protect your data, but no system is 100% secure. You acknowledge
            and agree that:
          </Text>
          <Text style={styles.bullet}>• We are NOT responsible for any data leaks, breaches, unauthorized access, hacking, or loss of data caused by third-party services, network providers, device compromise, or events outside our reasonable control.</Text>
          <Text style={styles.bullet}>• We are NOT liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the App, including but not limited to loss of data, profits, or privacy.</Text>
          <Text style={styles.bullet}>• You use the App at your own risk.</Text>

          <Text style={styles.h2}>7. Account & Authentication</Text>
          <Text style={styles.p}>
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account. Notify us immediately of any unauthorized use.
          </Text>

          <Text style={styles.h2}>8. Health & Fitness Data</Text>
          <Text style={styles.p}>
            Optional integrations (such as HealthKit, Bluetooth devices, wearables, and the calorie
            scanner) only function with your explicit permission. You may revoke permissions at any time
            in your device settings. Data accuracy is not guaranteed.
          </Text>

          <Text style={styles.h2}>9. Notifications & Calendar</Text>
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
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.checkRow}
          onPress={handleToggle}
          activeOpacity={0.8}
          testID="terms-checkbox"
        >
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed && <Check color="#fff" size={16} strokeWidth={3} />}
          </View>
          <Text style={styles.checkText}>
            I have read and agree to the Terms & Privacy Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, !agreed && styles.continueDisabled]}
          onPress={handleContinue}
          disabled={!agreed}
          activeOpacity={0.85}
          testID="terms-continue-button"
        >
          <LinearGradient
            colors={agreed ? ['#8b5cf6', '#7c3aed', '#6d28d9'] : ['#3a2a55', '#2a1a45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueGradient}
          >
            <Text style={styles.continueText}>Continue</Text>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  splashImg: {
    width: 72,
    height: 72,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(196,181,253,0.75)',
    textAlign: 'center',
    maxWidth: 320,
  },
  termsBox: {
    flex: 1,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    backgroundColor: 'rgba(20,10,40,0.55)',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
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
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    paddingLeft: 8,
  },
  endNote: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(196,181,253,0.5)',
    fontStyle: 'italic' as const,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingVertical: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.6)',
    backgroundColor: 'rgba(15,8,30,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxOn: {
    backgroundColor: '#7c3aed',
    borderColor: '#a78bfa',
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  continueBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueDisabled: {
    opacity: 0.6,
  },
  continueGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
