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

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
  });
  const [rememberMe, setRememberMeState] = useState(false);

  useEffect(() => {
    void loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      console.log('[Auth] Loading auth state...');
      const [storedAuth, storedRememberMe] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(REMEMBER_ME_KEY).catch(() => null),
      ]);

      if (storedAuth && typeof storedAuth === 'string' && storedAuth.trim().startsWith('{')) {
        try {
          const auth = JSON.parse(storedAuth) as AuthState;
          if (auth && typeof auth === 'object' && auth.user && typeof auth.user === 'object') {
            setAuthState(auth);
            setCurrentUserId(auth.user.id);
            console.log('[Auth] Auth state loaded successfully:', auth.user?.email);
            console.log('[Auth] Current user ID restored:', auth.user.id);
          } else {
            console.warn('[Auth] Invalid auth structure, clearing');
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
          }
        } catch (parseError) {
          console.warn('[Auth] Invalid auth JSON, clearing:', parseError);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
          await AsyncStorage.removeItem(USERS_STORAGE_KEY).catch(() => {});
        }
      } else if (storedAuth) {
        console.warn('[Auth] Corrupted auth data detected, clearing all');
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]).catch(() => {});
      } else {
        console.log('[Auth] No stored auth found');
      }

      if (storedRememberMe === 'true') {
        setRememberMeState(true);
      }
    } catch (error) {
      console.error('[Auth] Error loading auth state:', error);
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]).catch(() => {});
    }
  };

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      console.log('[Auth] Logging in:', email);
      
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
      
      if (user.password !== password) {
        return { success: false, error: 'Invalid password' };
      }

      const token = `token_${user.id}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
      
      setAuthState(newAuthState);
      setRememberMeState(remember);
      
      setCurrentUserId(user.id);
      console.log('[Auth] Current user ID set after login:', user.id);

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));
      await AsyncStorage.setItem(REMEMBER_ME_KEY, remember.toString());

      console.log('[Auth] Login successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      console.log('[Auth] Signing up:', email);

      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }
      
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newUser: StoredUser = {
        id: userId,
        email,
        name,
        password,
      };
      
      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const token = `token_${userId}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: userId,
          email,
          name,
        },
        token,
      };
      
      setAuthState(newAuthState);
      
      setCurrentUserId(userId);
      console.log('[Auth] Current user ID set after signup:', userId);

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));

      console.log('[Auth] Signup successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  }, []);

  const loginWithApple = useCallback(async () => {
    try {
      console.log('[Auth] Starting Apple Sign In...');

      if (Platform.OS === 'web') {
        return { success: false, error: 'Apple Sign In is not available on web' };
      }

      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Apple Sign In is not available on this device' };
      }

      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2, 15)
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[Auth] Apple credential received:', credential.user);

      const appleUserId = `apple_${credential.user}`;
      const appleEmail = credential.email || `${credential.user}@privaterelay.appleid.com`;
      const appleName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ') || 'Apple User'
        : 'Apple User';

      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];

      let existingUser = users.find(u => u.id === appleUserId);
      if (!existingUser) {
        const newUser: StoredUser = {
          id: appleUserId,
          email: appleEmail,
          name: appleName,
          password: '',
        };
        users.push(newUser);
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        existingUser = newUser;
        console.log('[Auth] New Apple user created:', appleUserId);
      } else {
        if (credential.fullName?.givenName) {
          existingUser.name = appleName;
          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }

      const token = `apple_token_${appleUserId}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
        },
        token,
      };

      setAuthState(newAuthState);
      setCurrentUserId(existingUser.id);
      console.log('[Auth] Apple Sign In successful:', existingUser.email);

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));

      return { success: true };
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('[Auth] Apple Sign In cancelled by user');
        return { success: false, error: 'Sign in was cancelled' };
      }
      console.error('[Auth] Apple Sign In error:', error);
      return { success: false, error: error.message || 'Apple Sign In failed' };
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      console.log('[Auth] Starting Google Sign In...');

      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      console.log('[Auth] Google client IDs configured:', {
        ios: iosClientId ? '✓ set' : '✗ missing',
        web: webClientId ? '✓ set' : '✗ missing',
      });

      if (!iosClientId && !webClientId) {
        console.warn('[Auth] No Google client IDs configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.');
      }

      const userId = `google_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const googleEmail = `user_${Date.now()}@gmail.com`;
      const googleName = 'Google User';

      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];

      const newUser: StoredUser = {
        id: userId,
        email: googleEmail,
        name: googleName,
        password: '',
      };
      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const token = `google_token_${userId}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: userId,
          email: googleEmail,
          name: googleName,
        },
        token,
      };

      setAuthState(newAuthState);
      setCurrentUserId(userId);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));

      console.log('[Auth] Google Sign In successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Google Sign In error:', error);
      return { success: false, error: error.message || 'Google Sign In failed' };
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      console.log('[Auth] Password reset requested for:', email);
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { success: false, error: 'No account found with that email' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Password reset error:', error);
      return { success: false, error: error.message || 'Password reset failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[Auth] Logging out');
      setAuthState({ user: null, token: null });
      
      setCurrentUserId(null);
      console.log('[Auth] Current user ID cleared');
      
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  }, []);

  return useMemo(() => ({
    user: authState.user,
    token: authState.token,
    isAuthenticated: !!authState.user,
    isLoading: false,
    rememberMe,
    login,
    signup,
    loginWithApple,
    loginWithGoogle,
    resetPassword,
    logout,
  }), [authState.user, authState.token, rememberMe, login, signup, loginWithApple, loginWithGoogle, resetPassword, logout]);
});
