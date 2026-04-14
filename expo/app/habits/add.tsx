import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Timer, CheckSquare, Hash } from 'lucide-react-native';
import { habitsDb } from '@/lib/database';
import type { Habit, HabitType } from '@/types';
import { ASSETS } from '@/constants/assets';

const FREQUENCY_TYPES = ['daily', 'weekly', 'custom'] as const;
const SECTIONS = ['morning', 'health', 'evening', 'custom'] as const;
const ICONS = ['✨', '🏃', '💪', '🧘', '📚', '💧', '🥗', '😴', '🌅', '🎯', '❤️', '🧠'];

const HABIT_TYPES: { type: HabitType; label: string; icon: any }[] = [
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'timer', label: 'Timer', icon: Timer },
  { type: 'counter', label: 'Counter', icon: Hash },
];

const TEMPLATES = [
  { emoji: '🧘', name: 'Meditate', type: 'timer' as HabitType, goal: 15, goalUnit: 'minutes' as const, xpReward: 15, energyReward: 4 },
  { emoji: '💪', name: 'Exercise', type: 'timer' as HabitType, goal: 30, goalUnit: 'minutes' as const, xpReward: 25, energyReward: 8 },
  { emoji: '📚', name: 'Read', type: 'timer' as HabitType, goal: 20, goalUnit: 'minutes' as const, xpReward: 20, energyReward: 5 },
  { emoji: '💧', name: 'Drink Water', type: 'counter' as HabitType, goal: 8, goalUnit: 'times' as const, xpReward: 10, energyReward: 3 },
  { emoji: '🌅', name: 'Wake Up Early', type: 'checkbox' as HabitType, goal: 1, goalUnit: 'times' as const, xpReward: 10, energyReward: 5 },
];

export default function AddHabitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [habitType, setHabitType] = useState<HabitType>('checkbox');
  const [frequencyType, setFrequencyType] = useState<typeof FREQUENCY_TYPES[number]>('daily');
  const [section, setSection] = useState<typeof SECTIONS[number]>('custom');
  const [icon, setIcon] = useState('✨');
  const [goal, setGoal] = useState('1');
  const [goalUnit, setGoalUnit] = useState<'minutes' | 'hours' | 'times'>('times');
  const [xpReward, setXpReward] = useState('5');
  const [energyReward, setEnergyReward] = useState('1');

  const createMutation = useMutation({
    mutationFn: (habit: Habit) => habitsDb.create(habit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      router.back();
    },
  });

  const loadTemplate = (template: typeof TEMPLATES[number]) => {
    setName(template.name);
    setIcon(template.emoji);
    setHabitType(template.type);
    setGoal(template.goal.toString());
    setGoalUnit(template.goalUnit);
    setXpReward(template.xpReward.toString());
    setEnergyReward(template.energyReward.toString());
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    const goalNum = parseInt(goal) || 1;
    const xpNum = parseInt(xpReward) || 5;
    const energyNum = parseInt(energyReward) || 1;

    const habit: Habit & { section?: string } = {
      id: Date.now().toString(),
      name: name.trim(),
      icon,
      goal: goalNum,
      goalUnit: habitType === 'checkbox' ? 'times' : goalUnit,
      type: habitType,
      frequencyType,
      customDays: [],
      currentProgress: 0,
      streak: 0,
      xpReward: xpNum,
      energyReward: energyNum,
      color: '#6366f1',
      lastCompletedDate: '',
      createdAt: Date.now(),
      section,
    };

    createMutation.mutate(habit as Habit);
  };

  return (
    <ImageBackground source={{ uri: ASSETS.bgCosmic }} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={['rgba(10, 10, 30, 0.85)', 'rgba(20, 15, 50, 0.9)']}
        style={styles.overlay}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Habit</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X color="#C9A7FF" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {name === '' && (
            <View style={styles.templatesSection}>
              <Text style={styles.templatesTitle}>Quick Start Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
                {TEMPLATES.map((template, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.templateCard}
                    onPress={() => loadTemplate(template)}
                  >
                    <Text style={styles.templateEmoji}>{template.emoji}</Text>
                    <Text style={styles.templateName}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.label}>Habit Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Exercise, Meditate, Read..."
              placeholderTextColor="rgba(201, 167, 255, 0.4)"
            />

            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconContainer}>
              {ICONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.iconChip, icon === emoji && styles.iconChipActive]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.iconEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeContainer}>
              {HABIT_TYPES.map((ht) => {
                const IconComponent = ht.icon;
                return (
                  <TouchableOpacity
                    key={ht.type}
                    style={[styles.typeCard, habitType === ht.type && styles.typeCardActive]}
                    onPress={() => {
                      setHabitType(ht.type);
                      if (ht.type === 'timer') setGoalUnit('minutes');
                      else if (ht.type === 'counter') setGoalUnit('times');
                    }}
                  >
                    <IconComponent
                      color={habitType === ht.type ? '#FFD700' : 'rgba(201, 167, 255, 0.6)'}
                      size={24}
                    />
                    <Text style={[styles.typeLabel, habitType === ht.type && styles.typeLabelActive]}>
                      {ht.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {habitType !== 'checkbox' && (
              <>
                <Text style={styles.label}>Goal</Text>
                <View style={styles.goalRow}>
                  <TextInput
                    style={[styles.input, styles.goalInput]}
                    value={goal}
                    onChangeText={setGoal}
                    placeholder="1"
                    placeholderTextColor="rgba(201, 167, 255, 0.4)"
                    keyboardType="number-pad"
                  />
                  {habitType === 'timer' && (
                    <View style={styles.unitContainer}>
                      {(['minutes', 'hours'] as const).map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[styles.unitChip, goalUnit === unit && styles.unitChipActive]}
                          onPress={() => setGoalUnit(unit)}
                        >
                          <Text style={[styles.unitText, goalUnit === unit && styles.unitTextActive]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {habitType === 'counter' && (
                    <Text style={styles.unitLabel}>times</Text>
                  )}
                </View>
              </>
            )}

            <Text style={styles.label}>Rewards</Text>
            <View style={styles.rewardsRow}>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>🏆 XP</Text>
                <TextInput
                  style={[styles.input, styles.rewardInput]}
                  value={xpReward}
                  onChangeText={setXpReward}
                  placeholder="5"
                  placeholderTextColor="rgba(201, 167, 255, 0.4)"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>⚡ Energy</Text>
                <TextInput
                  style={[styles.input, styles.rewardInput]}
                  value={energyReward}
                  onChangeText={setEnergyReward}
                  placeholder="1"
                  placeholderTextColor="rgba(201, 167, 255, 0.4)"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.label}>Section</Text>
            <View style={styles.chipContainer}>
              {SECTIONS.map((sec) => (
                <TouchableOpacity
                  key={sec}
                  style={[styles.chip, section === sec && styles.chipActive]}
                  onPress={() => setSection(sec)}
                >
                  <Text style={[styles.chipText, section === sec && styles.chipTextActive]}>
                    {sec.charAt(0).toUpperCase() + sec.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.chipContainer}>
              {FREQUENCY_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, frequencyType === type && styles.chipActive]}
                  onPress={() => setFrequencyType(type)}
                >
                  <Text style={[styles.chipText, frequencyType === type && styles.chipTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={createMutation.isPending}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>
                {createMutation.isPending ? 'Creating...' : 'Create Habit'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#C9A7FF',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.2)',
    backgroundColor: 'rgba(30, 20, 60, 0.4)',
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 12,
    marginTop: 20,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#C9A7FF',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 167, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.5)',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  iconEmoji: {
    fontSize: 24,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  chipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 14,
    color: 'rgba(201, 167, 255, 0.7)',
    fontWeight: '600' as const,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  templatesSection: {
    marginBottom: 20,
  },
  templatesTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  templatesScroll: {
    flexGrow: 0,
  },
  templateCard: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 167, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  templateName: {
    fontSize: 12,
    color: '#C9A7FF',
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 167, 255, 0.3)',
    alignItems: 'center',
    gap: 8,
  },
  typeCardActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  typeLabel: {
    fontSize: 13,
    color: 'rgba(201, 167, 255, 0.6)',
    fontWeight: '600' as const,
  },
  typeLabelActive: {
    color: '#FFD700',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalInput: {
    flex: 1,
  },
  unitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 167, 255, 0.3)',
  },
  unitChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  unitText: {
    fontSize: 13,
    color: 'rgba(201, 167, 255, 0.7)',
    fontWeight: '600' as const,
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  unitLabel: {
    fontSize: 16,
    color: '#C9A7FF',
    fontWeight: '600' as const,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardItem: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#C9A7FF',
    marginBottom: 8,
  },
  rewardInput: {
    marginTop: 0,
  },
  saveButton: {
    borderRadius: 16,
    marginTop: 32,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  saveButtonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
