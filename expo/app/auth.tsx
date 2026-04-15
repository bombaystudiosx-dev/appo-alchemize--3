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
import { Mail, Lock, User, Eye, EyeOff, Globe } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
    or: 'OR',
    signInWithGoogle: 'Sign in with Google',
    signInWithApple: 'Sign in with Apple',
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
    or: 'O',
    signInWithGoogle: 'Iniciar con Google',
    signInWithApple: 'Iniciar con Apple',
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

  return (
    <View style={styles.container}>
      <Image
        source={CRYSTAL_BALL_IMAGE}
        style={styles.background}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
      <LinearGradient
        colors={['rgba(10,0,30,0.1)', 'rgba(10,0,30,0.55)', 'rgba(10,0,30,0.92)']}
        locations={[0, 0.45, 0.75]}
        style={styles.overlay}
      />

      <TouchableOpacity
        onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
        style={styles.languageButton}
        activeOpacity={0.7}
      >
        <Globe color="#c4b5fd" size={16} />
        <Text style={styles.languageText}>{language === 'en' ? 'ES' : 'EN'}</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.titleText}>{t.transformTitle}</Text>
            <Text style={styles.tagline}>{t.transformSubtitle}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => { setMode('login'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  {t.login}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => { setMode('signup'); setError(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  {t.signup}
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIconContainer}>
                  <User color="rgba(196,181,253,0.6)" size={18} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t.fullName}
                  placeholderTextColor="rgba(196,181,253,0.4)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Mail color="rgba(196,181,253,0.6)" size={18} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor="rgba(196,181,253,0.4)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Lock color="rgba(196,181,253,0.6)" size={18} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t.password}
                placeholderTextColor="rgba(196,181,253,0.4)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff color="rgba(196,181,253,0.5)" size={18} />
                ) : (
                  <Eye color="rgba(196,181,253,0.5)" size={18} />
                )}
              </TouchableOpacity>
            </View>

            {mode === 'login' && (
              <View style={styles.loginOptionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <View style={styles.checkmark} />}
                  </View>
                  <Text style={styles.rememberMeText}>{t.rememberMe}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>{t.forgotPassword}</Text>
                </TouchableOpacity>
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#7c3aed', '#6d28d9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'login' ? t.login : t.signup}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.socialButtonText}>{t.signInWithGoogle}</Text>
                </>
              )}
            </TouchableOpacity>

            {appleAuthAvailable && Platform.OS !== 'web' && (
              <View style={styles.appleButtonWrapper}>
                {appleLoading ? (
                  <View style={styles.appleLoadingContainer}>
                    <ActivityIndicator color="#000" />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={12}
                    style={styles.appleButton}
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

            {Platform.OS === 'web' && (
              <TouchableOpacity style={styles.appleWebButton} activeOpacity={0.8} disabled>
                <Text style={styles.appleWebIcon}></Text>
                <Text style={styles.appleWebText}>{t.signInWithApple}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a001e',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  languageButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.2)',
  },
  languageText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(124,58,237,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(196,181,253,0.9)',
    letterSpacing: 2,
    fontWeight: '500' as const,
    fontStyle: 'italic' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  formContainer: {
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.15)',
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#7c3aed',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(196,181,253,0.5)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    marginBottom: 12,
  },
  inputIconContainer: {
    paddingLeft: 14,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 13,
    fontSize: 14,
    color: '#fff',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  loginOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(196,181,253,0.4)',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkmark: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  rememberMeText: {
    fontSize: 12,
    color: 'rgba(196,181,253,0.7)',
    fontWeight: '500' as const,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600' as const,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
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
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.2)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: 'rgba(196,181,253,0.4)',
    fontWeight: '600' as const,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  appleButtonWrapper: {
    marginBottom: 10,
  },
  appleButton: {
    width: '100%',
    height: 48,
  },
  appleLoadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleWebButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 10,
    gap: 8,
    opacity: 0.6,
  },
  appleWebIcon: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600' as const,
  },
  appleWebText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
});
