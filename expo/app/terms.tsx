import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShieldCheck, Lock, Eye, X } from 'lucide-react-native';
import { useAuth } from '@/contexts/auth-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CRYSTAL_BALL_IMAGE = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/89z8qu274hk8f1cht7vcg.png';

export const TERMS_ACCEPTED_KEY = '@alchemize_terms_accepted';
export const TERMS_VERSION = '1.0.0';

export default function TermsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [declined, setDeclined] = useState(false);
  const checkScale = useRef(new Animated.Value(1)).current;

  const handleCheckToggle = () => {
    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 300 }),
    ]).start();
    setAgreed(!agreed);
    if (declined) setDeclined(false);
  };

  const handleAgree = async () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please check the box to confirm you agree to the Terms & Agreement before continuing.');
      return;
    }
    setIsSubmitting(true);
    try {
      await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, TERMS_VERSION);
      console.log('[Terms] Terms accepted, version:', TERMS_VERSION);
      if (isAuthenticated) {
        router.replace('/');
      } else {
        router.replace('/auth');
      }
    } catch (error) {
      console.error('[Terms] Error saving terms acceptance:', error);
      Alert.alert('Error', 'Could not save your agreement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = () => {
    setDeclined(true);
    setAgreed(false);
  };

  return (
    <View style={styles.container}>
      <Image
        source={CRYSTAL_BALL_IMAGE}
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
      <LinearGradient
        colors={['rgba(8,2,20,0.55)', 'rgba(8,2,20,0.78)', 'rgba(8,2,20,0.97)', '#080214']}
        locations={[0, 0.25, 0.48, 0.65]}
        style={styles.gradient}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        testID="terms-scroll"
      >
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>Alchemize</Text>
          <Text style={styles.brandSub}>Terms & Privacy Agreement</Text>
        </View>

        <View style={styles.trustPillsRow}>
          <View style={styles.trustPill}>
            <ShieldCheck color="#22c55e" size={14} />
            <Text style={styles.trustPillText}>No tracking</Text>
          </View>
          <View style={styles.trustPill}>
            <Lock color="#a78bfa" size={14} />
            <Text style={styles.trustPillText}>No data selling</Text>
          </View>
          <View style={styles.trustPill}>
            <Eye color="#60a5fa" size={14} />
            <Text style={styles.trustPillText}>Private by design</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Before You Begin</Text>
          <Text style={styles.cardIntro}>
            Alchemize is a personal transformation tool. Before you access the app, please read and agree to the following.
          </Text>

          <View style={styles.dividerLine} />

          <Text style={styles.sectionLabel}>📋 TERMS OF USE</Text>
          <Text style={styles.bodyText}>
            By using Alchemize, you agree to use the app for lawful personal-development purposes only. You must be at least 13 years old. Alchemize does not provide medical, financial, or mental health advice — always consult qualified professionals for those needs.
          </Text>

          <Text style={styles.sectionLabel}>🔐 YOUR DATA & PRIVACY</Text>
          <View style={styles.privacyList}>
            <PrivacyRow
              icon="🚫"
              title="We do not track you"
              body="Alchemize does not use advertising trackers, behavioral analytics, or third-party tracking SDKs."
            />
            <PrivacyRow
              icon="🔒"
              title="We do not sell your data"
              body="Your journal entries, goals, habits, and all personal content are yours. We will never sell, rent, or share them with third parties for commercial purposes."
            />
            <PrivacyRow
              icon="📱"
              title="Stored locally on your device"
              body="Most data is stored locally. When optional cloud sync is used, it is encrypted and accessible only by you."
            />
            <PrivacyRow
              icon="💜"
              title="Wellness content is private"
              body="Journal entries, affirmations, manifestations, and all wellness content are handled with strict privacy and never analyzed for advertising."
            />
          </View>

          <Text style={styles.sectionLabel}>⚖️ DISCLAIMER</Text>
          <Text style={styles.bodyText}>
            The app is provided &quot;as is&quot; without warranty. We may update these terms — if the terms version changes, we will ask for your agreement again.
          </Text>

          <View style={styles.dividerLine} />

          <TouchableOpacity
            onPress={handleCheckToggle}
            style={styles.agreeCheckRow}
            activeOpacity={0.8}
            testID="terms-agree-checkbox"
          >
            <Animated.View style={[styles.checkbox, agreed && styles.checkboxChecked, { transform: [{ scale: checkScale }] }]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </Animated.View>
            <Text style={styles.agreeLabel}>
              I have read and agree to the{' '}
              <Text style={styles.agreeLabelBold}>Terms & Agreement</Text>
              {' '}and understand how Alchemize handles my data.
            </Text>
          </TouchableOpacity>

          {declined && (
            <View style={styles.declinedBanner}>
              <X color="#f87171" size={14} />
              <Text style={styles.declinedText}>
                You must agree to the Terms to use Alchemize. Tap the checkbox above to continue.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.agreeBtn, !agreed && styles.agreeBtnDisabled]}
            onPress={handleAgree}
            disabled={isSubmitting}
            activeOpacity={0.85}
            testID="terms-agree-button"
          >
            <LinearGradient
              colors={agreed ? ['#8b5cf6', '#7c3aed', '#6d28d9'] : ['rgba(139,92,246,0.3)', 'rgba(124,58,237,0.3)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.agreeBtnGradient}
            >
              <Text style={[styles.agreeBtnText, !agreed && styles.agreeBtnTextDisabled]}>
                {isSubmitting ? 'Saving...' : 'Continue to Alchemize'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDecline}
            style={styles.declineBtn}
            activeOpacity={0.7}
            testID="terms-decline-button"
          >
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>

          <Text style={styles.versionNote}>
            Terms version {TERMS_VERSION} · Effective April 2026
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function PrivacyRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={privacyRowStyles.row}>
      <Text style={privacyRowStyles.icon}>{icon}</Text>
      <View style={privacyRowStyles.textCol}>
        <Text style={privacyRowStyles.title}>{title}</Text>
        <Text style={privacyRowStyles.body}>{body}</Text>
      </View>
    </View>
  );
}

const privacyRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  icon: {
    fontSize: 18,
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#e9d5ff',
    marginBottom: 3,
  },
  body: {
    fontSize: 13,
    color: 'rgba(196,181,253,0.75)',
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080214',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  brandRow: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 16,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(139,92,246,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  brandSub: {
    fontSize: 13,
    color: 'rgba(196,181,253,0.8)',
    letterSpacing: 1,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  trustPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.18)',
  },
  trustPillText: {
    fontSize: 11,
    color: 'rgba(196,181,253,0.9)',
    fontWeight: '600' as const,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(12,5,26,0.88)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.14)',
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  cardIntro: {
    fontSize: 14,
    color: 'rgba(196,181,253,0.8)',
    lineHeight: 22,
    marginBottom: 18,
  },
  dividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(139,92,246,0.2)',
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(167,139,250,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
    marginTop: 4,
  },
  bodyText: {
    fontSize: 13,
    color: 'rgba(196,181,253,0.75)',
    lineHeight: 20,
    marginBottom: 16,
  },
  privacyList: {
    marginBottom: 16,
  },
  agreeCheckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    backgroundColor: 'rgba(139,92,246,0.08)',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  agreeLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(196,181,253,0.85)',
    lineHeight: 20,
  },
  agreeLabelBold: {
    fontWeight: '700' as const,
    color: '#c4b5fd',
  },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 14,
  },
  declinedText: {
    flex: 1,
    fontSize: 12,
    color: '#fca5a5',
    lineHeight: 18,
  },
  agreeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  agreeBtnDisabled: {
    opacity: 0.7,
  },
  agreeBtnGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  agreeBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  agreeBtnTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  declineBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  declineBtnText: {
    fontSize: 13,
    color: 'rgba(196,181,253,0.45)',
    fontWeight: '500' as const,
  },
  versionNote: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(139,92,246,0.4)',
    fontWeight: '500' as const,
  },
  bottomSpacer: {
    height: 20,
  },
});
