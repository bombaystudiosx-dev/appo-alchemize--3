import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Calendar, Clock, User, Briefcase, FileText, Check } from 'lucide-react-native';
import { appointmentsDb } from '@/lib/database';
import type { Appointment, AppointmentCategory } from '@/types';
import { startOfLocalDay } from '@/lib/date-utils';
import DateTimePicker from '@react-native-community/datetimepicker';

const PERSONAL_COLOR = '#3b82f6';
const BUSINESS_COLOR = '#22c55e';

export default function AddAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();

  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [category, setCategory] = useState<AppointmentCategory>('personal');
  const [notes, setNotes] = useState('');
  const [reminder, setReminder] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (params.date) {
      const dateTimestamp = parseInt(params.date, 10);
      if (!isNaN(dateTimestamp)) {
        setSelectedDate(startOfLocalDay(new Date(dateTimestamp)));
      }
    }

    if (params.id) {
      loadAppointment(params.id);
    }
  }, [params.date, params.id]);

  const loadAppointment = async (id: string) => {
    if (Platform.OS === 'web') return;
    try {
      const appointments = await appointmentsDb.getAll();
      const appointment = appointments.find((a) => a.id === id);
      if (appointment) {
        setTitle(appointment.title);
        setSelectedDate(new Date(appointment.date));
        setSelectedTime(appointment.time);
        setCategory(appointment.category);
        setNotes(appointment.notes);
        setReminder(appointment.reminder);
        setIsEditing(true);
        setEditingId(id);
        console.log('[Appointments] Loaded appointment for editing:', id);
      }
    } catch (error) {
      console.error('[Appointments] Error loading appointment:', error);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      console.log('[Appointments] Title is required');
      return;
    }

    if (Platform.OS === 'web') {
      router.back();
      return;
    }

    try {
      const appointment: Appointment = {
        id: editingId || `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        date: startOfLocalDay(selectedDate).getTime(),
        time: selectedTime,
        category,
        notes: notes.trim(),
        reminder,
        createdAt: isEditing ? Date.now() : Date.now(),
      };

      if (isEditing) {
        await appointmentsDb.update(appointment);
        console.log('[Appointments] Updated appointment:', appointment.id);
      } else {
        await appointmentsDb.create(appointment);
        console.log('[Appointments] Created appointment:', appointment.id);
      }

      router.back();
    } catch (error) {
      console.error('[Appointments] Error saving:', error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  };

  const getTimeDate = () => {
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const timeOptions = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00',
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit Appointment' : 'New Appointment',
          headerStyle: { backgroundColor: '#0f0f1a' },
          headerTintColor: '#fff',
        }}
      />
      <LinearGradient colors={['#0f0f1a', '#1a1a2e', '#16213e']} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Appointment title"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'personal' && styles.categoryButtonActivePersonal,
                  ]}
                  onPress={() => setCategory('personal')}
                >
                  <User
                    size={20}
                    color={category === 'personal' ? '#fff' : PERSONAL_COLOR}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: category === 'personal' ? '#fff' : PERSONAL_COLOR },
                    ]}
                  >
                    Personal
                  </Text>
                  {category === 'personal' && (
                    <View style={styles.checkBadge}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    category === 'business' && styles.categoryButtonActiveBusiness,
                  ]}
                  onPress={() => setCategory('business')}
                >
                  <Briefcase
                    size={20}
                    color={category === 'business' ? '#fff' : BUSINESS_COLOR}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      { color: category === 'business' ? '#fff' : BUSINESS_COLOR },
                    ]}
                  >
                    Business
                  </Text>
                  {category === 'business' && (
                    <View style={[styles.checkBadge, { backgroundColor: BUSINESS_COLOR }]}>
                      <Check size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color="#a78bfa" />
                <Text style={styles.dateTimeText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  themeVariant="dark"
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time</Text>
              {Platform.OS === 'web' ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.timeScrollView}
                  contentContainerStyle={styles.timeScrollContent}
                >
                  {timeOptions.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeChip,
                        selectedTime === time && styles.timeChipActive,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          selectedTime === time && styles.timeChipTextActive,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Clock size={20} color="#a78bfa" />
                    <Text style={styles.dateTimeText}>{selectedTime}</Text>
                  </TouchableOpacity>
                  {showTimePicker && (
                    <DateTimePicker
                      value={getTimeDate()}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleTimeChange}
                      themeVariant="dark"
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <View style={styles.notesContainer}>
                <FileText size={20} color="rgba(255,255,255,0.4)" style={styles.notesIcon} />
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes or details..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.reminderToggle}
              onPress={() => setReminder(!reminder)}
              activeOpacity={0.7}
            >
              <View style={styles.reminderInfo}>
                <Clock size={20} color="#a78bfa" />
                <Text style={styles.reminderText}>Set Reminder</Text>
              </View>
              <View
                style={[
                  styles.toggleTrack,
                  reminder && styles.toggleTrackActive,
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    reminder && styles.toggleThumbActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                !title.trim() && styles.saveButtonDisabled,
                {
                  backgroundColor:
                    category === 'personal' ? PERSONAL_COLOR : BUSINESS_COLOR,
                },
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Update Appointment' : 'Save Appointment'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  categoryButtonActivePersonal: {
    backgroundColor: PERSONAL_COLOR,
    borderColor: PERSONAL_COLOR,
  },
  categoryButtonActiveBusiness: {
    backgroundColor: BUSINESS_COLOR,
    borderColor: BUSINESS_COLOR,
  },
  categoryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  checkBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PERSONAL_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f1a',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#fff',
  },
  timeScrollView: {
    marginHorizontal: -4,
  },
  timeScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeChipActive: {
    backgroundColor: 'rgba(167,139,250,0.3)',
    borderColor: '#a78bfa',
  },
  timeChipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  timeChipTextActive: {
    color: '#fff',
  },
  notesContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notesIcon: {
    marginTop: 2,
  },
  notesInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: '#a78bfa',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,15,26,0.95)',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
