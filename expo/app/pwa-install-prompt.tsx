import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Download, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PWA_PROMPT_KEY = '@alchemize_pwa_prompt_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const checkDismissed = async () => {
      const dismissed = await AsyncStorage.getItem(PWA_PROMPT_KEY);
      if (dismissed) return;

      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handler);

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    };

    checkDismissed();
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(PWA_PROMPT_KEY, 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Download color="#fbbf24" size={24} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Install Alchemize</Text>
          <Text style={styles.subtitle}>Add to home screen for quick access</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleInstall} style={styles.installButton}>
            <Text style={styles.installText}>Install</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <X color="#9ca3af" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  content: {
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  installText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#000',
  },
  dismissButton: {
    padding: 4,
  },
});
