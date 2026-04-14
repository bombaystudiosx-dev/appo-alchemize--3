import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Receipt,
  StickyNote,
  Lock,
  CreditCard,
  Eye,
  EyeOff,
  Edit3,
  Save,
  Trash2,
} from 'lucide-react-native';
import { financialIncomeDb, financialExpenseDb, financialNoteDb } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FinancialIncome, FinancialExpense, FinancialNote } from '@/types';
const NOTEPAD_KEY = '@alchemize_financial_notepad';

type FilterPeriod = 'monthly' | 'quarterly' | 'yearly';

function getPeriodRange(period: FilterPeriod, refDate: Date): { start: number; end: number; label: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  if (period === 'monthly') {
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
    const label = refDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { start, end, label };
  }
  if (period === 'quarterly') {
    const q = Math.floor(month / 3);
    const start = new Date(year, q * 3, 1).getTime();
    const end = new Date(year, q * 3 + 3, 0, 23, 59, 59, 999).getTime();
    const qLabel = `Q${q + 1} ${year}`;
    return { start, end, label: qLabel };
  }
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  return { start, end, label: `${year}` };
}

function getMonthDays(year: number, month: number): { day: number; date: Date }[] {
  const days: { day: number; date: Date }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, date: new Date(year, month, d) });
  }
  return days;
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface CalendarCardProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  accentGlow: string;
  year: number;
  month: number;
  onMonthChange: (delta: number) => void;
  highlightedDays: Set<number>;
  selectedDay: number | null;
  onDayPress: (day: number) => void;
}

function CalendarCard({
  title,
  icon,
  accentColor,
  accentGlow,
  year,
  month,
  onMonthChange,
  highlightedDays,
  selectedDay,
  onDayPress,
}: CalendarCardProps) {
  const monthLabel = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const days = getMonthDays(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const blanks: null[] = Array.from({ length: firstDay }, () => null);
  const cells = [...blanks, ...days];

  return (
    <View style={calStyles.card}>
      <View style={[calStyles.cardGlow, { shadowColor: accentGlow }]} />
      <View style={calStyles.cardHeader}>
        <View style={calStyles.cardTitleRow}>
          {icon}
          <Text style={calStyles.cardTitle}>{title}</Text>
        </View>
      </View>
      <View style={calStyles.monthNav}>
        <TouchableOpacity onPress={() => onMonthChange(-1)} style={calStyles.monthArrow}>
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => onMonthChange(1)} style={calStyles.monthArrow}>
          <ChevronRight size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekdayRow}>
        {weekdays.map((wd) => (
          <Text key={wd} style={calStyles.weekdayText}>
            {wd}
          </Text>
        ))}
      </View>
      <View style={calStyles.daysGrid}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={`blank-${idx}`} style={calStyles.dayCell} />;
          }
          const isHighlighted = highlightedDays.has(cell.day);
          const isSelected = selectedDay === cell.day;
          const isToday = isCurrentMonth && cell.day === todayDate;
          return (
            <TouchableOpacity
              key={cell.day}
              style={[
                calStyles.dayCell,
                isHighlighted && { backgroundColor: accentColor + '30', borderColor: accentColor, borderWidth: 1.5 },
                isSelected && { backgroundColor: accentColor + '60' },
                isToday && !isHighlighted && !isSelected && calStyles.todayCell,
              ]}
              onPress={() => onDayPress(cell.day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  calStyles.dayText,
                  isHighlighted && { color: '#fff', fontWeight: '700' as const },
                  isSelected && { color: '#fff', fontWeight: '700' as const },
                  isToday && calStyles.todayText,
                ]}
              >
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function FinancialTrackerScreen() {
  const _router = useRouter();
  const queryClient = useQueryClient();

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('monthly');
  const [incomeCalMonth, setIncomeCalMonth] = useState(new Date().getMonth());
  const [incomeCalYear, setIncomeCalYear] = useState(new Date().getFullYear());
  const [expenseCalMonth, setExpenseCalMonth] = useState(new Date().getMonth());
  const [expenseCalYear, setExpenseCalYear] = useState(new Date().getFullYear());
  const [selectedIncomeDay, setSelectedIncomeDay] = useState<number | null>(null);
  const [selectedExpenseDay, setSelectedExpenseDay] = useState<number | null>(null);

  const [notepadText, setNotepadText] = useState('');
  const [_notepadLoaded, setNotepadLoaded] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showLogins, setShowLogins] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [loginInfo, setLoginInfo] = useState('');
  const [debtNotes, setDebtNotes] = useState('');
  const [debtAmount, setDebtAmount] = useState('');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addModalType, setAddModalType] = useState<'income' | 'expense'>('income');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('salary');
  const [formNote, setFormNote] = useState('');

  const { data: incomeData = [] } = useQuery({
    queryKey: ['financial-income'],
    queryFn: () => financialIncomeDb.getAll(),
  });

  const { data: expenseData = [] } = useQuery({
    queryKey: ['financial-expenses'],
    queryFn: () => financialExpenseDb.getAll(),
  });

  const { data: notesData } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  useEffect(() => {
    if (notesData) {
      setLoginInfo(notesData.noteLoginInfo);
      setDebtNotes(notesData.noteTotalDebt);
      setDebtAmount(notesData.debtAmount.toString());
    }
  }, [notesData]);

  useEffect(() => {
    void AsyncStorage.getItem(NOTEPAD_KEY).then((val) => {
      if (val) setNotepadText(val);
      setNotepadLoaded(true);
    });
  }, []);

  const handleNotepadChange = useCallback((text: string) => {
    setNotepadText(text);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void AsyncStorage.setItem(NOTEPAD_KEY, text);
      console.log('[Financial] Notepad auto-saved');
    }, 1500);
  }, []);

  const saveNotepad = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    void AsyncStorage.setItem(NOTEPAD_KEY, notepadText);
    Alert.alert('Saved', 'Notepad saved successfully.');
  }, [notepadText]);

  const periodRange = useMemo(() => getPeriodRange(filterPeriod, new Date()), [filterPeriod]);

  const filteredIncome = useMemo(
    () => incomeData.filter((i) => i.incomeDate >= periodRange.start && i.incomeDate <= periodRange.end),
    [incomeData, periodRange]
  );

  const filteredExpenses = useMemo(
    () => expenseData.filter((e) => e.expenseDate >= periodRange.start && e.expenseDate <= periodRange.end),
    [expenseData, periodRange]
  );

  const grossIncome = useMemo(() => filteredIncome.reduce((s, i) => s + i.incomeGross, 0), [filteredIncome]);
  const netIncome = useMemo(() => filteredIncome.reduce((s, i) => s + i.incomeNet, 0), [filteredIncome]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + e.expenseAmount, 0), [filteredExpenses]);
  const moneyLeftOver = netIncome - totalExpenses;

  const incomeHighlightDays = useMemo(() => {
    const s = new Set<number>();
    incomeData.forEach((i) => {
      const d = new Date(i.incomeDate);
      if (d.getFullYear() === incomeCalYear && d.getMonth() === incomeCalMonth) {
        s.add(d.getDate());
      }
    });
    return s;
  }, [incomeData, incomeCalYear, incomeCalMonth]);

  const expenseHighlightDays = useMemo(() => {
    const s = new Set<number>();
    expenseData.forEach((e) => {
      const d = new Date(e.expenseDate);
      if (d.getFullYear() === expenseCalYear && d.getMonth() === expenseCalMonth) {
        s.add(d.getDate());
      }
    });
    return s;
  }, [expenseData, expenseCalYear, expenseCalMonth]);

  const recentExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.expenseDate - a.expenseDate).slice(0, 10),
    [filteredExpenses]
  );

  const handleIncomeMonthChange = useCallback(
    (delta: number) => {
      let m = incomeCalMonth + delta;
      let y = incomeCalYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      setIncomeCalMonth(m);
      setIncomeCalYear(y);
      setSelectedIncomeDay(null);
    },
    [incomeCalMonth, incomeCalYear]
  );

  const handleExpenseMonthChange = useCallback(
    (delta: number) => {
      let m = expenseCalMonth + delta;
      let y = expenseCalYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      setExpenseCalMonth(m);
      setExpenseCalYear(y);
      setSelectedExpenseDay(null);
    },
    [expenseCalMonth, expenseCalYear]
  );

  const openAddModal = useCallback((type: 'income' | 'expense') => {
    setAddModalType(type);
    setFormTitle('');
    setFormAmount('');
    setFormCategory(type === 'income' ? 'salary' : 'bills');
    setFormNote('');
    setAddModalVisible(true);
  }, []);

  const addIncomeMutation = useMutation({
    mutationFn: async (income: FinancialIncome) => {
      return financialIncomeDb.create(income);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-income'] });
      setAddModalVisible(false);
      Alert.alert('Success', 'Income added!');
    },
    onError: (err) => {
      console.error('[Financial] Error adding income:', err);
      Alert.alert('Error', 'Failed to add income.');
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: FinancialExpense) => {
      return financialExpenseDb.create(expense);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      setAddModalVisible(false);
      Alert.alert('Success', 'Expense added!');
    },
    onError: (err) => {
      console.error('[Financial] Error adding expense:', err);
      Alert.alert('Error', 'Failed to add expense.');
    },
  });

  const handleAddSubmit = useCallback(() => {
    const amount = parseFloat(formAmount);
    if (!formTitle.trim()) {
      Alert.alert('Missing', 'Please enter a title.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid', 'Please enter a valid amount.');
      return;
    }
    const now = Date.now();
    if (addModalType === 'income') {
      const income: FinancialIncome = {
        id: `inc_${now}_${Math.random().toString(36).slice(2, 8)}`,
        incomeGross: amount,
        incomeNet: amount,
        taxAmount: 0,
        taxPercentage: 0,
        deductions: 0,
        incomeCategory: formCategory as FinancialIncome['incomeCategory'],
        incomeDate: now,
        notes: formNote.trim(),
        createdAt: now,
      };
      addIncomeMutation.mutate(income);
    } else {
      const expense: FinancialExpense = {
        id: `exp_${now}_${Math.random().toString(36).slice(2, 8)}`,
        expenseName: formTitle.trim(),
        expenseAmount: amount,
        expenseCategory: formCategory as FinancialExpense['expenseCategory'],
        expenseDate: now,
        notes: formNote.trim(),
        createdAt: now,
      };
      addExpenseMutation.mutate(expense);
    }
  }, [formTitle, formAmount, formCategory, formNote, addModalType, addIncomeMutation, addExpenseMutation]);

  const saveNotesMutation = useMutation({
    mutationFn: async (note: FinancialNote) => {
      return financialNoteDb.createOrUpdate(note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-notes'] });
      setEditingNotes(false);
      Alert.alert('Saved', 'Financial notes saved.');
    },
  });

  const handleSaveFinancialNotes = useCallback(() => {
    const debt = parseFloat(debtAmount) || 0;
    const note: FinancialNote = {
      id: notesData?.id || 'financial-note-1',
      noteLoginInfo: loginInfo.trim(),
      noteTotalDebt: debtNotes.trim(),
      debtAmount: debt,
      debtDueDate: notesData?.debtDueDate ?? null,
      savingsAmount: notesData?.savingsAmount ?? 0,
      emergencyFund: notesData?.emergencyFund ?? 0,
      savingsNotes: notesData?.savingsNotes ?? '',
      updatedAt: Date.now(),
    };
    saveNotesMutation.mutate(note);
  }, [loginInfo, debtNotes, debtAmount, notesData, saveNotesMutation]);

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => {
      return financialIncomeDb.delete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-income'] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return financialExpenseDb.delete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
    },
  });

  const incomeCategories = ['salary', 'freelance', 'business', 'investment', 'bonus', 'other'];
  const expenseCategories = ['bills', 'business', 'personal', 'food', 'transport', 'entertainment', 'shopping', 'health', 'education', 'other'];

  const formatCurrency = (val: number) =>
    '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.filterRow}>
            {(['monthly', 'quarterly', 'yearly'] as FilterPeriod[]).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.filterTab, filterPeriod === p && styles.filterTabActive]}
                onPress={() => setFilterPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, filterPeriod === p && styles.filterTabTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryGlow} />
            <Text style={styles.summaryTitle}>{periodRange.label} Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Gross Income</Text>
                <Text style={[styles.summaryValue, styles.greenText]}>{formatCurrency(grossIncome)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Net Income</Text>
                <Text style={[styles.summaryValue, styles.greenText]}>{formatCurrency(netIncome)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={[styles.summaryValue, styles.redText]}>{formatCurrency(totalExpenses)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Money Left Over</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    styles.summaryValueBold,
                    moneyLeftOver >= 0 ? styles.greenText : styles.redText,
                  ]}
                >
                  {formatCurrency(moneyLeftOver)}
                </Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.incomeButton]}
                onPress={() => openAddModal('income')}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.expenseButton]}
                onPress={() => openAddModal('expense')}
                activeOpacity={0.8}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

          <CalendarCard
            title="Income Calendar"
            icon={<TrendingUp size={20} color="#10B981" />}
            accentColor="#10B981"
            accentGlow="rgba(16, 185, 129, 0.4)"
            year={incomeCalYear}
            month={incomeCalMonth}
            onMonthChange={handleIncomeMonthChange}
            highlightedDays={incomeHighlightDays}
            selectedDay={selectedIncomeDay}
            onDayPress={setSelectedIncomeDay}
          />

          {selectedIncomeDay !== null && (
            <View style={styles.dayDetailCard}>
              <Text style={styles.dayDetailTitle}>
                Income on {new Date(incomeCalYear, incomeCalMonth, selectedIncomeDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              {incomeData
                .filter((i) => {
                  const d = new Date(i.incomeDate);
                  return d.getFullYear() === incomeCalYear && d.getMonth() === incomeCalMonth && d.getDate() === selectedIncomeDay;
                })
                .map((i) => (
                  <View key={i.id} style={styles.dayDetailItem}>
                    <View style={styles.dayDetailLeft}>
                      <Text style={styles.dayDetailItemTitle}>{i.incomeCategory}</Text>
                      <Text style={[styles.dayDetailItemAmount, styles.greenText]}>{formatCurrency(i.incomeGross)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete Income', 'Are you sure?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteIncomeMutation.mutate(i.id) },
                      ]);
                    }}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              {incomeData.filter((i) => {
                const d = new Date(i.incomeDate);
                return d.getFullYear() === incomeCalYear && d.getMonth() === incomeCalMonth && d.getDate() === selectedIncomeDay;
              }).length === 0 && (
                <Text style={styles.emptyDayText}>No income on this day</Text>
              )}
            </View>
          )}

          <CalendarCard
            title="Expense Calendar"
            icon={<TrendingDown size={20} color="#EF4444" />}
            accentColor="#EF4444"
            accentGlow="rgba(239, 68, 68, 0.4)"
            year={expenseCalYear}
            month={expenseCalMonth}
            onMonthChange={handleExpenseMonthChange}
            highlightedDays={expenseHighlightDays}
            selectedDay={selectedExpenseDay}
            onDayPress={setSelectedExpenseDay}
          />

          {selectedExpenseDay !== null && (
            <View style={styles.dayDetailCard}>
              <Text style={styles.dayDetailTitle}>
                Expenses on {new Date(expenseCalYear, expenseCalMonth, selectedExpenseDay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              {expenseData
                .filter((e) => {
                  const d = new Date(e.expenseDate);
                  return d.getFullYear() === expenseCalYear && d.getMonth() === expenseCalMonth && d.getDate() === selectedExpenseDay;
                })
                .map((e) => (
                  <View key={e.id} style={styles.dayDetailItem}>
                    <View style={styles.dayDetailLeft}>
                      <Text style={styles.dayDetailItemTitle}>{e.expenseName}</Text>
                      <Text style={[styles.dayDetailItemAmount, styles.redText]}>{formatCurrency(e.expenseAmount)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Delete Expense', 'Are you sure?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteExpenseMutation.mutate(e.id) },
                      ]);
                    }}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              {expenseData.filter((e) => {
                const d = new Date(e.expenseDate);
                return d.getFullYear() === expenseCalYear && d.getMonth() === expenseCalMonth && d.getDate() === selectedExpenseDay;
              }).length === 0 && (
                <Text style={styles.emptyDayText}>No expenses on this day</Text>
              )}
            </View>
          )}

          <View style={styles.sectionCard}>
            <View style={styles.sectionCardGlow} />
            <View style={styles.sectionHeader}>
              <Receipt size={20} color="#a78bfa" />
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
            </View>
            {recentExpenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses for this period</Text>
            ) : (
              recentExpenses.map((e) => (
                <View key={e.id} style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseName}>{e.expenseName}</Text>
                    <Text style={styles.expenseCategory}>{e.expenseCategory}</Text>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={[styles.expenseAmount, styles.redText]}>{formatCurrency(e.expenseAmount)}</Text>
                    <Text style={styles.expenseDate}>
                      {new Date(e.expenseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionCardGlow} />
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <StickyNote size={20} color="#fbbf24" />
                <Text style={styles.sectionTitle}>Notepad</Text>
              </View>
              <TouchableOpacity onPress={saveNotepad} style={styles.saveNoteBtn}>
                <Save size={16} color="#fbbf24" />
                <Text style={styles.saveNoteBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notepadInput}
              value={notepadText}
              onChangeText={handleNotepadChange}
              placeholder="Jot down financial thoughts, reminders, goals..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.autoSaveHint}>Auto-saves after you stop typing</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionCardGlow} />
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Lock size={20} color="#fbbf24" />
                <Text style={styles.sectionTitle}>Financial Notes</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (editingNotes) handleSaveFinancialNotes();
                  else setEditingNotes(true);
                }}
                style={styles.editBtn}
              >
                {editingNotes ? <Save size={16} color="#a78bfa" /> : <Edit3 size={16} color="#a78bfa" />}
                <Text style={styles.editBtnText}>{editingNotes ? 'Save' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notesPanel}>
              <View style={[styles.notesPanelHeader, styles.loginPanelHeader]}>
                <Lock size={16} color="#fbbf24" />
                <Text style={styles.notesPanelTitle}>Important Login Info</Text>
                <TouchableOpacity onPress={() => setShowLogins(!showLogins)} style={styles.eyeBtn}>
                  {showLogins ? <EyeOff size={16} color="#fbbf24" /> : <Eye size={16} color="#fbbf24" />}
                </TouchableOpacity>
              </View>
              {editingNotes ? (
                <TextInput
                  style={styles.notesInput}
                  value={loginInfo}
                  onChangeText={setLoginInfo}
                  placeholder="Bank logins, investment credentials..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  secureTextEntry={!showLogins}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.notesPanelContent}>
                  {loginInfo ? (showLogins ? loginInfo : '••••••••••••••••••••') : 'No login info saved'}
                </Text>
              )}
            </View>

            <View style={[styles.notesPanel, { marginTop: 12 }]}>
              <View style={[styles.notesPanelHeader, styles.debtPanelHeader]}>
                <CreditCard size={16} color="#EF4444" />
                <Text style={[styles.notesPanelTitle, { color: '#EF4444' }]}>Total Debt Notes</Text>
              </View>
              {editingNotes ? (
                <>
                  <TextInput
                    style={styles.notesInput}
                    value={debtNotes}
                    onChangeText={setDebtNotes}
                    placeholder="Debt details, payment plans..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={styles.debtAmountRow}>
                    <Text style={styles.debtAmountLabel}>Total Debt Amount</Text>
                    <View style={styles.debtAmountInputWrap}>
                      <Text style={styles.debtCurrency}>$</Text>
                      <TextInput
                        style={styles.debtAmountInput}
                        value={debtAmount}
                        onChangeText={setDebtAmount}
                        placeholder="0.00"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.notesPanelContent}>
                    {debtNotes || 'No debt notes'}
                  </Text>
                  <View style={styles.debtTotalRow}>
                    <Text style={styles.debtTotalLabel}>Total Debt Amount</Text>
                    <Text style={styles.debtTotalValue}>
                      {formatCurrency(parseFloat(debtAmount) || 0)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>

      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {addModalType === 'income' ? 'Add Income' : 'Add Expense'}
            </Text>

            <Text style={styles.modalLabel}>
              {addModalType === 'income' ? 'Source / Title' : 'Expense Name'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder={addModalType === 'income' ? 'e.g. Salary, Freelance gig' : 'e.g. Rent, Groceries'}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />

            <Text style={styles.modalLabel}>Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={formAmount}
              onChangeText={setFormAmount}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="decimal-pad"
            />

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {(addModalType === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, formCategory === cat && styles.categoryChipActive]}
                  onPress={() => setFormCategory(cat)}
                >
                  <Text
                    style={[styles.categoryChipText, formCategory === cat && styles.categoryChipTextActive]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              value={formNote}
              onChangeText={setFormNote}
              placeholder="Additional details..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                addModalType === 'income' ? styles.submitBtnIncome : styles.submitBtnExpense,
              ]}
              onPress={handleAddSubmit}
              disabled={addIncomeMutation.isPending || addExpenseMutation.isPending}
              activeOpacity={0.8}
            >
              <Text style={styles.submitBtnText}>
                {(addIncomeMutation.isPending || addExpenseMutation.isPending)
                  ? 'Saving...'
                  : addModalType === 'income'
                  ? 'Add Income'
                  : 'Add Expense'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const calStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 10, 30, 0.75)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 16,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.9)',
    minWidth: 130,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 1,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  todayCell: {
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
  },
  todayText: {
    color: '#a78bfa',
    fontWeight: '700' as const,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050211',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 2, 17, 0.65)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  filterTabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.45)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: 'rgba(15, 10, 30, 0.75)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    overflow: 'hidden',
  },
  summaryGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    shadowColor: 'rgba(139, 92, 246, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  summaryItem: {
    width: '47%' as any,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  summaryValueBold: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  greenText: {
    color: '#10B981',
  },
  redText: {
    color: '#EF4444',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  incomeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  expenseButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  dayDetailCard: {
    backgroundColor: 'rgba(15, 10, 30, 0.7)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    marginTop: -8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayDetailTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  dayDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dayDetailLeft: {
    flex: 1,
  },
  dayDetailItemTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    textTransform: 'capitalize',
  },
  dayDetailItemAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  emptyDayText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 10, 30, 0.75)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  sectionCardGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 22,
    shadowColor: 'rgba(139, 92, 246, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  expenseCategory: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  expenseDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  notepadInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  autoSaveHint: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.3)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  saveNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveNoteBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#fbbf24',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#a78bfa',
  },
  notesPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notesPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  loginPanelHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
    paddingBottom: 10,
  },
  debtPanelHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
    paddingBottom: 10,
  },
  notesPanelTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fbbf24',
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  notesPanelContent: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  notesInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#fff',
    minHeight: 70,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  debtAmountRow: {
    marginTop: 12,
  },
  debtAmountLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
  },
  debtAmountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  debtCurrency: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#EF4444',
    marginRight: 6,
  },
  debtAmountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#EF4444',
    paddingVertical: 10,
  },
  debtTotalRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.15)',
  },
  debtTotalLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  debtTotalValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(15, 10, 30, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 92, 246, 0.3)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryScroll: {
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.35)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnIncome: {
    backgroundColor: '#10B981',
  },
  submitBtnExpense: {
    backgroundColor: '#EF4444',
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
