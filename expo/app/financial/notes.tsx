import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, CreditCard, PiggyBank } from 'lucide-react-native';
import { financialNoteDb } from '@/lib/database';
import type { FinancialNote } from '@/types';

export default function FinancialNotesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [loginInfo, setLoginInfo] = useState('');
  const [showLoginInfo, setShowLoginInfo] = useState(false);
  const [debtNotes, setDebtNotes] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [savingsAmount, setSavingsAmount] = useState('');
  const [emergencyFund, setEmergencyFund] = useState('');
  const [savingsNotes, setSavingsNotes] = useState('');

  const [loginsY, setLoginsY] = useState(0);
  const [debtY, setDebtY] = useState(0);
  const [savingsY, setSavingsY] = useState(0);

  const { data: existingNotes } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  useEffect(() => {
    if (existingNotes) {
      setLoginInfo(existingNotes.noteLoginInfo);
      setDebtNotes(existingNotes.noteTotalDebt);
      setDebtAmount(existingNotes.debtAmount.toString());
      setSavingsAmount(existingNotes.savingsAmount.toString());
      setEmergencyFund(existingNotes.emergencyFund.toString());
      setSavingsNotes(existingNotes.savingsNotes || '');
    }
  }, [existingNotes]);

  useEffect(() => {
    if (params.section && scrollViewRef.current) {
      setTimeout(() => {
        let yOffset = 0;
        if (params.section === 'logins') yOffset = loginsY;
        else if (params.section === 'debt') yOffset = debtY;
        else if (params.section === 'savings') yOffset = savingsY;
        
        scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
      }, 300);
    }
  }, [params.section, loginsY, debtY, savingsY]);

  const saveMutation = useMutation({
    mutationFn: (note: FinancialNote) => financialNoteDb.createOrUpdate(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-notes'] });
      Alert.alert('Success', 'Notes saved successfully');
      router.back();
    },
  });

  const handleSave = () => {
    const debt = parseFloat(debtAmount) || 0;
    const savings = parseFloat(savingsAmount) || 0;
    const emergency = parseFloat(emergencyFund) || 0;

    const note: FinancialNote = {
      id: existingNotes?.id || 'financial-note-1',
      noteLoginInfo: loginInfo.trim(),
      noteTotalDebt: debtNotes.trim(),
      debtAmount: debt,
      debtDueDate: null,
      savingsAmount: savings,
      emergencyFund: emergency,
      savingsNotes: savingsNotes.trim(),
      updatedAt: Date.now(),
    };

    saveMutation.mutate(note);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
      >
        <View 
          style={styles.section}
          onLayout={(e) => setLoginsY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, styles.loginsIcon]}>
              <Lock color="#8B5CF6" size={20} />
            </View>
            <Text style={styles.sectionTitle}>Important Logins</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Store your important financial account credentials securely
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={loginInfo}
              onChangeText={setLoginInfo}
              placeholder="Bank logins, investment accounts, credit card portals..."
              placeholderTextColor="#555"
              secureTextEntry={!showLoginInfo}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowLoginInfo(!showLoginInfo)}
            >
              {showLoginInfo ? (
                <EyeOff color="#8B5CF6" size={22} />
              ) : (
                <Eye color="#8B5CF6" size={22} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View 
          style={styles.section}
          onLayout={(e) => setDebtY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, styles.debtIcon]}>
              <CreditCard color="#EF4444" size={20} />
            </View>
            <Text style={styles.sectionTitle}>Debt</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Track your total debt and keep notes about payments
          </Text>
          <Text style={styles.label}>Total Debt Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              value={debtAmount}
              onChangeText={setDebtAmount}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.label}>Debt Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={debtNotes}
            onChangeText={setDebtNotes}
            placeholder="Credit cards, student loans, car payments, mortgage details..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <View 
          style={styles.section}
          onLayout={(e) => setSavingsY(e.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconContainer, styles.savingsIcon]}>
              <PiggyBank color="#10B981" size={20} />
            </View>
            <Text style={styles.sectionTitle}>Savings</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Keep track of your savings and emergency fund progress
          </Text>
          <Text style={styles.label}>Savings Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={[styles.currencySymbol, styles.savingsSymbol]}>$</Text>
            <TextInput
              style={[styles.amountInput, styles.savingsInput]}
              value={savingsAmount}
              onChangeText={setSavingsAmount}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.label}>Emergency Fund</Text>
          <View style={styles.amountInputContainer}>
            <Text style={[styles.currencySymbol, styles.savingsSymbol]}>$</Text>
            <TextInput
              style={[styles.amountInput, styles.savingsInput]}
              value={emergencyFund}
              onChangeText={setEmergencyFund}
              placeholder="0.00"
              placeholderTextColor="#555"
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.label}>Savings Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={savingsNotes}
            onChangeText={setSavingsNotes}
            placeholder="Savings goals, account details, investment notes..."
            placeholderTextColor="#555"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? 'Saving...' : 'Save All Notes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loginsIcon: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  debtIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  savingsIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 56,
    minHeight: 140,
    paddingTop: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#EF4444',
    marginRight: 8,
  },
  savingsSymbol: {
    color: '#10B981',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#EF4444',
    paddingVertical: 16,
  },
  savingsInput: {
    color: '#10B981',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
