import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export default function ErrorState({
  message = 'Something went wrong',
  onRetry,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <AlertTriangle color="#ef4444" size={18} />
        <Text style={styles.compactText}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.compactRetry} activeOpacity={0.7}>
            <RefreshCw color="#a78bfa" size={16} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.errorCard}>
        <View style={styles.iconCircle}>
          <AlertTriangle color="#ef4444" size={28} />
        </View>
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.7}>
            <RefreshCw color="#fff" size={16} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'rgba(20, 10, 40, 0.85)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    minWidth: 240,
    maxWidth: 320,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  retryText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  compactText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500' as const,
    flex: 1,
  },
  compactRetry: {
    padding: 4,
  },
});
