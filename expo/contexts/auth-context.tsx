import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { setCurrentUserId } from '@/lib/database';

const AUTH_STORAGE_KEY = '@alchemize_auth';
const REMEMBER_ME_KEY = '@alchemize_remember_me';
const USERS_STORAGE_KEY = '@alchemize_users';

// Apple reviewer credentials — seeded on every launch
export const APPLE_REVIEWER_EMAIL = 'apple@alchemize.app';
export const APPLE_REVIEWER_PASSWORD = 'Alchemize2024!';
export const APPLE_REVIEWER_NAME = 'Apple Reviewer';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

// Seeds the Apple reviewer test account and accepts terms so the reviewer
// lands directly on the Sign In screen every time.
async function seedAppleReviewerAccount() {
  try {
    const { TERMS_ACCEPTED_KEY, TERMS_VERSION } = await import('@/app/terms');
    // Accept terms for reviewer
    await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, TERMS_VERSION);
    // Add reviewer to users list if not already present
    const existing = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    const users: StoredUser[] = existing ? JSON.parse(existing) : [];
    const alreadyExists = users.some(
      (u) => u.email.toLowerCase() === APPLE_REVIEWER_EMAIL.toLowerCase()
    );
    if (!alreadyExists) {
      users.push({
        id: 'apple_reviewer_account',
        email: APPLE_REVIEWER_EMAIL,
        name: APPLE_REVIEWER_NAME,
        password: APPLE_REVIEWER_PASSWORD,
      });
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      console.log('[Auth] Apple reviewer test account seeded');
    }
  } catch (e) {
    console.warn('[Auth] Could not seed reviewer account:', e);
  }
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
  });
  const [rememberMe, setRememberMeState] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    void loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      console.log('[Auth] Loading auth state...');
      // Always seed the reviewer account first
      await seedAppleReviewerAccount();
      const [storedAuth, storedRememberMe] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(REMEMBER_ME_KEY).catch(() => null),
      ]);
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          if (parsed && parsed.user && parsed.token) {
            setAuthState(parsed);
            if (parsed.user.id) {
              await setCurrentUserId(parsed.user.id);
            }
            console.log('[Auth] Auth state loaded successfully:', parsed.user.email);
            console.log('[Auth] Current user ID restored:', parsed.user.id);
          } else {
            console.warn('[Auth] Corrupted auth data detected, clearing all');
            await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]);
          }
        } catch {
          console.warn('[Auth] Corrupted auth data detected, clearing all');
          await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]);
        }
      } else {
        console.log('[Auth] No stored auth found');
      }
      if (storedRememberMe === 'true') {
        setRememberMeState(true);
      }
    } catch (error) {
      console.error('[Auth] Error loading auth state:', error);
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]).catch(() => {});
    } finally {
      setIsInitialized(true);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      console.log('[Auth] Logging in:', email);
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
      if (user.password !== password) {
        return { success: false, error: 'Invalid password. Please try again.' };
      }
      const token = `token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const authData: AuthState = {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await setCurrentUserId(user.id);
      setAuthState(authData);
      console.log('[Auth] Login successful:', email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      console.log('[Auth] Signing up:', email);
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'An account with this email already exists.' };
      }
      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newUser: StoredUser = { id: userId, email, name, password };
      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      const token = `token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const authData: AuthState = {
        user: { id: userId, email, name },
        token,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await setCurrentUserId(userId);
      setAuthState(authData);
      console.log('[Auth] Signup successful:', email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Signup error:', error);
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      console.log('[Auth] Google IOS Client ID present:', !!GOOGLE_IOS_CLIENT_ID);
      console.log('[Auth] Google Web Client ID present:', !!GOOGLE_WEB_CLIENT_ID);
      if (!GOOGLE_IOS_CLIENT_ID && !GOOGLE_WEB_CLIENT_ID) {
        console.warn('[Auth] Google client IDs not configured');
        return { success: false, error: 'Google sign-in is not configured.' };
      }
      return { success: false, error: 'Google sign-in coming soon.' };
    } catch (error) {
      console.error('[Auth] Google login error:', error);
      return { success: false, error: 'Google sign-in failed.' };
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    try {
      if (Platform.OS !== 'ios') {
        return { success: false, error: 'Apple sign-in is only available on iOS.' };
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const email = credential.email || `apple_${credential.user}@privaterelay.appleid.com`;
      const name = credential.fullName
        ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
        : 'Apple User';
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      let user = users.find(u => u.id === `apple_${credential.user}`);
      if (!user) {
        user = { id: `apple_${credential.user}`, email, name, password: '' };
        users.push(user);
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
      const token = `apple_token_${Date.now()}`;
      const authData: AuthState = {
        user: { id: user.id, email: user.email, name: user.name },
        token,
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      await setCurrentUserId(user.id);
      setAuthState(authData);
      return { success: true };
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      console.error('[Auth] Apple login error:', error);
      return { success: false, error: 'Apple sign-in failed.' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { success: false, error: 'No account found with this email.' };
      }
      console.log('[Auth] Password reset requested for:', email);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An error occurred. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({ user: null, token: null });
      console.log('[Auth] Logged out successfully');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  }, []);

  const setRememberMe = useCallback(async (value: boolean) => {
    setRememberMeState(value);
    await AsyncStorage.setItem(REMEMBER_ME_KEY, value.toString());
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      const userId = authState.user?.id;
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY]);
      if (userId) {
        const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
        const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
        const filtered = users.filter(u => u.id !== userId);
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
      }
      setAuthState({ user: null, token: null });
      console.log('[Auth] Account deleted');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Delete account error:', error);
      return { success: false, error: 'Could not delete account.' };
    }
  }, [authState.user?.id]);

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: !!authState.user,
    isInitialized,
    rememberMe,
    login,
    signup,
    loginWithGoogle,
    loginWithApple,
    resetPassword,
    logout,
    setRememberMe,
    deleteAccount,
  };
});