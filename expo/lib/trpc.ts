import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppRouter } from "@/backend/trpc/router-types";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;

  if (!url) {
    console.warn('[TRPC] EXPO_PUBLIC_RORK_API_BASE_URL not set');
    return 'https://placeholder.rork.app';
  }

  return url;
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      async headers() {
        try {
          const authData = await AsyncStorage.getItem('@alchemize_auth');
          if (authData && typeof authData === 'string' && authData.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(authData);
              if (parsed && typeof parsed === 'object' && parsed.token && typeof parsed.token === 'string') {
                return {
                  authorization: `Bearer ${parsed.token}`,
                };
              }
            } catch (parseError) {
              console.warn('[TRPC] Invalid auth JSON, clearing:', parseError);
              await AsyncStorage.removeItem('@alchemize_auth').catch(() => {});
            }
          }
        } catch (error) {
          console.warn('[TRPC] Error reading auth data:', error);
        }
        return {};
      },
    }),
  ],
});
