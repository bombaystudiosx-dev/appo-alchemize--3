import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || '';

export const OAUTH_REDIRECT_URI = makeRedirectUri({
  scheme: 'alchemize',
  path: 'auth/callback',
});

export const GOOGLE_OAUTH_CONFIG = {
  clientId: GOOGLE_CLIENT_ID,
  redirectUri: OAUTH_REDIRECT_URI,
  scopes: ['openid', 'profile', 'email'],
  responseType: 'code',
};

export const FACEBOOK_OAUTH_CONFIG = {
  clientId: FACEBOOK_APP_ID,
  redirectUri: OAUTH_REDIRECT_URI,
  scopes: ['public_profile', 'email'],
  responseType: 'code',
};
