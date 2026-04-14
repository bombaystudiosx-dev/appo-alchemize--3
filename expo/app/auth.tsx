import React, { useState } from 'react';
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
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your name');
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



  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/signin-background.png')}
        style={styles.background}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
        style={styles.overlay}
      />

      <View style={styles.languageToggle}>
        <TouchableOpacity
          onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
          style={styles.languageButton}
          activeOpacity={0.7}
        >
          <Text style={styles.languageText}>{language === 'en' ? 'ES' : 'EN'}</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.tagline}>{language === 'en' ? 'Transform Your Life' : 'Transforma Tu Vida'}</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && styles.tabActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                  {language === 'en' ? 'Login' : 'Iniciar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => setMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  {language === 'en' ? 'Sign Up' : 'Registrarse'}
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'en' ? 'Full Name' : 'Nombre Completo'}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
placeholder={language === 'en' ? 'Email' : 'Correo'}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
placeholder={language === 'en' ? 'Password' : 'Contraseña'}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />
            </View>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <View style={styles.checkmark} />}
                </View>
                <Text style={styles.rememberMeText}>{language === 'en' ? 'Remember Me' : 'Recuérdame'}</Text>
              </TouchableOpacity>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAuth}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8b5cf6', '#6366f1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'login' ? (language === 'en' ? 'Login' : 'Iniciar') : (language === 'en' ? 'Sign Up' : 'Registrarse')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>


          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 96,
  },
  languageToggle: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  languageButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  languageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700' as const,
  },

  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2.5,
    fontWeight: '600' as const,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  inputContainer: {
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkmark: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  rememberMeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
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
    marginBottom: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryButtonGradient: {
    paddingVertical: 13,
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
    marginBottom: 12,
    marginTop: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600' as const,
  },
  socialButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  socialButtonIcon: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
