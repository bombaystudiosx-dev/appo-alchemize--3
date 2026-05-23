import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff, Globe, ChevronRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CRYSTAL_BALL_IMAGE = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/89z8qu274hk8f1cht7vcg.png';

const TRANSLATIONS = {
  en: {
    transformTitle: 'Alchemize',
    transformSubtitle: 'Transform Your Life',
    login: 'Sign In',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    or: 'or continue with',
    signInWithGoogle: 'Google',
    signInWithApple: 'Apple',
    fillFields: 'Please fill in all fields',
    enterName: 'Please enter your name',
    resetTitle: 'Reset Password',
    resetMessage: 'Enter your email to receive reset instructions',
    resetEmail: 'Email address',
    sendReset: 'Send Reset Link',
    cancel: 'Cancel',
    resetSent: 'Reset link sent! Check your email.',
    enterEmail: 'Please enter your email address',
  },
  es: {
    transformTitle: 'Alchemize',
    transformSubtitle: 'Transforma Tu Vida',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    email: 'Correo',
    password: 'Contraseña',
    fullName: 'Nombre Completo',
    rememberMe: 'Recuérdame',
    forgotPassword: '¿Olvidaste tu contraseña?',
    or: 'o continuar con',
    signInWithGoogle: 'Google',
    signInWithApple: 'Apple',
    fillFields: 'Por favor completa todos los campos',
    enterName: 'Por favor ingresa tu nombre',
    resetTitle: 'Restablecer Contraseña',
    resetMessage: 'Ingresa tu correo para recibir instrucciones',
    resetEmail: 'Correo electrónico',
    sendReset: 'Enviar Enlace',
    cancel: 'Cancelar',
    resetSent: '¡Enlace enviado! Revisa tu correo.',
    enterEmail: 'Por favor ingresa tu correo electrónico',
  },
};

export default function AuthScreen() {
  const router = useRouter();
  const { login, signup, loginWithApple, loginWithGoogle, resetPassword } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable).catch(() => setAppleAuthAvailable(false));
    }
  }, []);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [showPassword, setShowPassword] = useState(false);

  const t = TRANSLATIONS[language];

  const handleAuth = async () => {
    if (!email || !password) {
      setError(t.fillFields);
      return;
    }

    if (mode === 'signup' && !name) {
      setError(t.enterName);
      return;
    }

    setIsLoading(true);
    setError('');

    const result =
      mode === 'login'
        ? await login(email, password, rememberMe)
        : await signup(email, password, name);

    setIsLoading(false);

    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error || 'Authentication failed');
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt
      ? Alert.prompt(
          t.resetTitle,
          t.resetMessage,
          async (resetEmail: string) => {
            if (!resetEmail) {
              Alert.alert('Error', t.enterEmail);
              return;
            }
            const result = await resetPassword(resetEmail);
            if (result.success) {
              Alert.alert(t.resetTitle, t.resetSent);
            } else {
              Alert.alert('Error', result.error || 'Failed to send reset link');
            }
          },
          'plain-text',
          email,
          'email-address'
        )
      : Alert.alert(
          t.resetTitle,
          t.resetMessage + '\n\n' + t.resetSent
        );
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const result = await loginWithGoogle();
    setGoogleLoading(false);
    if (result.success) {
      router.replace('/');
    } else if (result.error) {
      setError(result.error);
    }
  };

  const showAppleNative = appleAuthAvailable && Platform.OS !== 'web';
  const showAppleWeb = Platform.OS === 'web';

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
        colors={['transparent', 'rgba(8,2,20,0.6)', 'rgba(8,2,20,0.95)', '#080214']}
        locations={[0, 0.35, 0.55, 0.7]}
        style={styles.gradient}
      />

      <TouchableOpacity
        onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
        style={styles.langToggle}
        activeOpacity={0.7}
      >
        <Globe color="#c4b5fd" size={14} />
        <Text style={styles.langText}>{language === 'en' ? 'ES' : 'EN'}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.spacer} />

          <View style={styles.brandSection}>
            <Text style={styles.title}>{t.transformTitle}</Text>
            <Text style={styles.subtitle}>{t.transformSubtitle}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => { setMode('login'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, mode === 'login' && styles.tabLabelActive]}>
                  {t.login}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => { setMode('signup'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, mode === 'signup' && styles.tabLabelActive]}>
                  {t.signup}
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <View style={styles.field}>
                <User color="rgba(167,139,250,0.5)" size={16} style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldInput}
                  placeholder={t.fullName}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Mail color="rgba(167,139,250,0.5)" size={16} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                placeholder={t.email}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Lock color="rgba(167,139,250,0.5)" size={16} style={styles.fieldIcon} />
              <TextInput
                style={styles.fieldInput}
                placeholder={t.password}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff color="rgba(167,139,250,0.4)" size={16} />
                ) : (
                  <Eye color="rgba(167,139,250,0.4)" size={16} />
                )}
              </TouchableOpacity>
            </View>

            {mode === 'login' && (
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.check, rememberMe && styles.checkOn]}>
                    {rememberMe && <View style={styles.checkDot} />}
                  </View>
                  <Text style={styles.rememberLabel}>{t.rememberMe}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotLabel}>{t.forgotPassword}</Text>
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={styles.errorMsg}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.submitInner}>
                    <Text style={styles.submitText}>
                      {mode === 'login' ? t.login : t.signup}
                    </Text>
                    <ChevronRight color="#fff" size={18} />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>{t.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.8}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={styles.socialLabel}>{t.signInWithGoogle}</Text>
                  </>
                )}
              </TouchableOpacity>

              {showAppleNative && (
                <View style={styles.socialBtn}>
                  {appleLoading ? (
                    <View style={styles.appleLoading}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  ) : (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                      cornerRadius={10}
                      style={styles.appleNativeBtn}
                      onPress={async () => {
                        setAppleLoading(true);
                        setError('');
                        const result = await loginWithApple();
                        setAppleLoading(false);
                        if (result.success) {
                          router.replace('/');
                        } else if (result.error && result.error !== 'Sign in was cancelled') {
                          setError(result.error);
                        }
                      }}
                    />
                  )}
                </View>
              )}

              {showAppleWeb && (
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8} disabled>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.socialLabel}>{t.signInWithApple}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080214',
  },
  flex: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.55,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  langToggle: {
    position: 'absolute',
    top: 54,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  langText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  spacer: {
    flex: 1,
    minHeight: 60,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(139,92,246,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(196,181,253,0.8)',
    letterSpacing: 1.5,
    fontWeight: '500' as const,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(15,8,30,0.85)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.12)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(139,92,246,0.9)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(196,181,253,0.45)',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.12)',
    marginBottom: 10,
    height: 46,
  },
  fieldIcon: {
    marginLeft: 14,
    marginRight: 2,
  },
  fieldInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#fff',
    height: '100%',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  check: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.35)',
    marginRight: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOn: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkDot: {
    width: 7,
    height: 7,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },
  rememberLabel: {
    fontSize: 11,
    color: 'rgba(196,181,253,0.6)',
    fontWeight: '500' as const,
  },
  forgotLabel: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: '600' as const,
  },
  errorMsg: {
    color: '#f87171',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
  },
  submitGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 11,
    color: 'rgba(196,181,253,0.35)',
    fontWeight: '500' as const,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  socialLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  appleLoading: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleNativeBtn: {
    width: '100%',
    height: 44,
  },
  appleIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600' as const,
  },
});
