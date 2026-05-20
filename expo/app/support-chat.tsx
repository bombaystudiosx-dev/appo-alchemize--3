import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Wrench, X, RefreshCw, Zap, Shield, Database, Bell, ChevronRight } from 'lucide-react-native';
import { generateText } from '@rork-ai/toolkit-sdk';
import { resetDatabase, ensureDatabase } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  fixActions?: FixAction[];
  timestamp: number;
}

interface FixAction {
  id: string;
  label: string;
  description: string;
  action: () => void | Promise<void>;
  icon: 'refresh' | 'database' | 'bell' | 'shield' | 'zap';
}

const RORK_API_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? '';

function FixButton({ action, isLast }: { action: FixAction; isLast: boolean }) {
  const [running, setRunning] = useState(false);

  const handlePress = async () => {
    setRunning(true);
    try {
      await action.action();
    } catch (e) {
      console.error('[FixAction] Error:', e);
    } finally {
      setRunning(false);
    }
  };

  const iconMap = {
    refresh: <RefreshCw size={14} color="#22c55e" />,
    database: <Database size={14} color="#a78bfa" />,
    bell: <Bell size={14} color="#f59e0b" />,
    shield: <Shield size={14} color="#38bdf8" />,
    zap: <Zap size={14} color="#f97316" />,
  };

  return (
    <TouchableOpacity
      style={[styles.fixButton, isLast && styles.fixButtonLast]}
      onPress={handlePress}
      disabled={running}
      activeOpacity={0.8}
    >
      {running ? (
        <ActivityIndicator size="small" color="#22c55e" />
      ) : (
        iconMap[action.icon]
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.fixButtonLabel}>{action.label}</Text>
        <Text style={styles.fixButtonDesc}>{action.description}</Text>
      </View>
      <ChevronRight size={14} color="#666" />
    </TouchableOpacity>
  );
}

export default function SupportChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your Alchemize Repair Assistant. Describe what's not working — I'll diagnose it and offer one-tap fixes.\n\nCommon issues I can help with:\n• Data not saving\n• AI camera/food scan failing\n• Workout calorie estimation not working\n• App freezing or crashing\n• Notifications not arriving",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const buildFixActions = useCallback((issue: string, userMessage: string): FixAction[] => {
    const actions: FixAction[] = [];
    const lower = (issue + userMessage).toLowerCase();

    if (lower.includes('save') || lower.includes('data') || lower.includes('database') || lower.includes('log')) {
      actions.push({
        id: 'reload-db',
        label: 'Reload Database',
        description: 'Re-initialize SQLite connection',
        action: async () => {
          await ensureDatabase();
          Alert.alert('Database Reloaded', 'Database connection has been re-initialized.');
        },
        icon: 'database',
      });
    }

    if (lower.includes('camera') || lower.includes('scan') || lower.includes('photo') || lower.includes('food') || lower.includes('calorie') || lower.includes('ai')) {
      actions.push({
        id: 'check-api',
        label: 'Check AI API Key',
        description: `Toolkit key ${RORK_API_KEY ? 'is set' : 'is MISSING'}`,
        action: async () => {
          Alert.alert(
            'AI API Status',
            RORK_API_KEY
              ? 'EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY is configured. If AI still fails, the image may be unclear or the service may be temporarily unavailable.'
              : 'EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY is NOT set. AI features will not work. Please contact support.',
          );
        },
        icon: 'zap',
      });
    }

    if (lower.includes('notification') || lower.includes('reminder') || lower.includes('alert') || lower.includes('bell')) {
      actions.push({
        id: 'check-notifications',
        label: 'Check Notification Permissions',
        description: 'Verify push notification settings',
        action: async () => {
          if (Platform.OS === 'web') {
            Alert.alert('Not Available', 'Push notifications are only available on mobile devices.');
            return;
          }
          const { Notifications } = await import('expo-notifications');
          const settings = await Notifications.getPermissionsAsync();
          Alert.alert(
            'Notification Status',
            settings.granted
              ? 'Notifications are enabled. If reminders are not firing, try toggling them off and on in Settings.'
              : 'Notifications are NOT granted. Please enable them in your device settings.',
          );
        },
        icon: 'bell',
      });
    }

    if (lower.includes('crash') || lower.includes('freeze') || lower.includes('slow') || lower.includes('hang')) {
      actions.push({
        id: 'clear-cache',
        label: 'Clear App Cache',
        description: 'Reset temporary storage and reload',
        action: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.includes('cache') || k.includes('temp'));
            if (cacheKeys.length > 0) {
              await AsyncStorage.multiRemove(cacheKeys);
            }
            Alert.alert('Cache Cleared', `${cacheKeys.length} temporary items removed.`);
          } catch {
            Alert.alert('Cache Cleared', 'Temporary storage has been reset.');
          }
        },
        icon: 'refresh',
      });
    }

    actions.push({
      id: 'reset-data',
      label: 'Reset All Data',
      description: 'Clear everything and start fresh',
      action: async () => {
        Alert.alert(
          'Reset All Data?',
          'This will permanently delete all app data. This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reset',
              style: 'destructive',
              onPress: async () => {
                await resetDatabase();
                Alert.alert('Data Reset', 'All app data has been cleared. Restart the app to begin fresh.');
              },
            },
          ],
        );
      },
      icon: 'shield',
    });

    return actions;
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const result = await generateText({
        messages: [
          {
            role: 'system',
            content: `You are the Alchemize Repair Assistant, a concise technical support bot inside a React Native wellness app.\n\nApp features:\n- Calorie tracker with AI food photo scanning (uses expo-camera + @rork-ai/toolkit-sdk generateObject)\n- Workout logger with AI calorie estimation (uses generateObject)\n- Gratitude journal, affirmations, goals, habits, financial tracker\n- SQLite local database via expo-sqlite\n- Push notifications via expo-notifications\n- Apple Health integration\n\nRules:\n- Diagnose briefly (1-2 sentences)\n- Never ask the user to do multi-step manual fixes\n- Offer one-tap fix buttons instead\n- If the issue is about data not saving, suspect database userId mismatch or SQLite NOT NULL constraint failure\n- If the issue is about AI/camera, suspect missing EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY or image quality\n- If the issue is about notifications, suspect permission or background task limits\n- Be encouraging, not robotic`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result || "I'm not sure about that issue. Try one of the repair options below, or describe the problem with more detail.",
        fixActions: buildFixActions(result || '', text),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('[SupportChat] AI error:', error);
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: "I couldn't reach the AI diagnosis service right now. You can still try the quick fixes below.",
        fixActions: buildFixActions('', text),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, scrollToBottom, buildFixActions]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#080214', '#0c0520']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Wrench size={18} color="#a78bfa" />
          <Text style={styles.headerTitle}>Repair Assistant</Text>
        </View>
        <View style={styles.closeBtnPlaceholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === 'user' ? styles.userText : styles.assistantText,
              ]}
            >
              {msg.text}
            </Text>

            {msg.fixActions && msg.fixActions.length > 0 && (
              <View style={styles.fixActionsContainer}>
                {msg.fixActions.map((action, idx) => (
                  <FixButton key={action.id} action={action} isLast={idx === msg.fixActions!.length - 1} />
                ))}
              </View>
            )}
          </View>
        ))}

        {isLoading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color="#a78bfa" />
            <Text style={styles.loadingText}>Diagnosing...</Text>
          </View>
        )}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe the bug or issue..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} color={input.trim() ? '#fff' : '#555'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080214',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPlaceholder: {
    width: 36,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 18,
    padding: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: 'rgba(255,255,255,0.88)',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#a78bfa',
  },
  fixActionsContainer: {
    marginTop: 12,
    gap: 8,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fixButtonLast: {
    marginBottom: 0,
  },
  fixButtonLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  fixButtonDesc: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#080214',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
