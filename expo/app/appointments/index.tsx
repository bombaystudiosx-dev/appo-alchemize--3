import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Briefcase,
  User,
  Edit3,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react-native';
import { appointmentsDb } from '@/lib/database';
import type { Appointment } from '@/types';
import { localDateKey } from '@/lib/date-utils';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const PERSONAL_COLOR = '#3b82f6';
const BUSINESS_COLOR = '#22c55e';
const BACKGROUND_IMAGE = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/8vtok42y20eo2gnggtrih';

type FilterType = 'all' | 'personal' | 'business';

interface DayCellProps {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasPersonal: boolean;
  hasBusiness: boolean;
  onPress: (dateKey: string) => void;
}

const DayCell = memo(function DayCell({
  dateKey,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  hasPersonal,
  hasBusiness,
  onPress,
}: DayCellProps) {
  const handlePress = useCallback(() => {
    onPress(dateKey);
  }, [dateKey, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        isSelected && styles.dayCellSelected,
        isToday && !isSelected && styles.dayCellToday,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayText,
          !isCurrentMonth && styles.dayTextOther,
          isSelected && styles.dayTextSelected,
          isToday && styles.dayTextToday,
        ]}
      >
        {dayNumber}
      </Text>
      {(hasPersonal || hasBusiness) && (
        <View style={styles.dotContainer}>
          {hasPersonal && <View style={[styles.dot, { backgroundColor: PERSONAL_COLOR }]} />}
          {hasBusiness && <View style={[styles.dot, { backgroundColor: BUSINESS_COLOR }]} />}
        </View>
      )}
    </TouchableOpacity>
  );
});

interface AppointmentCardProps {
  appointment: Appointment;
  onPress: (appointment: Appointment) => void;
}

const AppointmentCard = memo(function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  const handlePress = useCallback(() => {
    onPress(appointment);
  }, [appointment, onPress]);

  const isPersonal = appointment.category === 'personal';
  const color = isPersonal ? PERSONAL_COLOR : BUSINESS_COLOR;

  return (
    <TouchableOpacity
      style={[styles.appointmentCard, { borderLeftColor: color }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.appointmentHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: `${color}20` }]}>
          {isPersonal ? (
            <User size={12} color={color} />
          ) : (
            <Briefcase size={12} color={color} />
          )}
          <Text style={[styles.categoryText, { color }]}>
            {appointment.category}
          </Text>
        </View>
        <View style={styles.timeContainer}>
          <Clock size={12} color="rgba(255,255,255,0.6)" />
          <Text style={styles.timeText}>{appointment.time}</Text>
        </View>
      </View>
      <Text style={styles.appointmentTitle}>{appointment.title}</Text>
      {appointment.notes ? (
        <Text style={styles.appointmentNotes} numberOfLines={2}>
          {appointment.notes}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => localDateKey(new Date()));
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'clear'>('delete');
  const isNavigating = useRef(false);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const loadAppointments = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const data = await appointmentsDb.getAll();
      setAppointments(data);
      console.log('[Appointments] Loaded', data.length, 'appointments');
    } catch (error) {
      console.error('[Appointments] Error loading:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [loadAppointments])
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const result: { dateKey: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(currentYear, currentMonth, day);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    const endPadding = 42 - result.length;
    for (let i = 1; i <= endPadding; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: i,
        isCurrentMonth: false,
      });
    }

    return result;
  }, [currentYear, currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, { personal: boolean; business: boolean; items: Appointment[] }>();
    
    for (const apt of appointments) {
      const key = localDateKey(new Date(apt.date));
      if (!map.has(key)) {
        map.set(key, { personal: false, business: false, items: [] });
      }
      const entry = map.get(key)!;
      entry.items.push(apt);
      if (apt.category === 'personal') entry.personal = true;
      if (apt.category === 'business') entry.business = true;
    }
    
    return map;
  }, [appointments]);

  const selectedDateAppointments = useMemo(() => {
    const entry = appointmentsByDate.get(selectedDateKey);
    if (!entry) return [];
    if (filter === 'all') return entry.items;
    return entry.items.filter(apt => apt.category === filter);
  }, [appointmentsByDate, selectedDateKey, filter]);

  const todayKey = useMemo(() => localDateKey(new Date()), []);

  const monthLabel = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  }, [currentYear, currentMonth]);

  const selectedDateLabel = useMemo(() => {
    const [year, month, day] = selectedDateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [selectedDateKey]);

  const selectedDateTimestamp = useMemo(() => {
    const [year, month, day] = selectedDateKey.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }, [selectedDateKey]);

  const goToPreviousMonth = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setViewDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return newDate;
    });
    setTimeout(() => {
      isNavigating.current = false;
    }, 100);
  }, []);

  const goToNextMonth = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setViewDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return newDate;
    });
    setTimeout(() => {
      isNavigating.current = false;
    }, 100);
  }, []);

  const handleDayPress = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
  }, []);

  const handleAppointmentPress = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailModalVisible(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedAppointment) {
      setDetailModalVisible(false);
      router.push(`/appointments/add?id=${selectedAppointment.id}` as any);
    }
  }, [selectedAppointment, router]);

  const handleDelete = useCallback(() => {
    if (!selectedAppointment) return;
    setConfirmAction('delete');
    setConfirmModalVisible(true);
  }, [selectedAppointment]);

  const handleClearAll = useCallback(() => {
    setConfirmAction('clear');
    setConfirmModalVisible(true);
  }, []);

  const executeConfirmAction = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      if (confirmAction === 'delete' && selectedAppointment) {
        await appointmentsDb.delete(selectedAppointment.id);
        console.log('[Appointments] Deleted appointment:', selectedAppointment.id);
        setDetailModalVisible(false);
      } else if (confirmAction === 'clear') {
        for (const apt of appointments) {
          await appointmentsDb.delete(apt.id);
        }
        console.log('[Appointments] Cleared all appointments');
      }
      setConfirmModalVisible(false);
      setSelectedAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('[Appointments] Error:', error);
    }
  }, [confirmAction, selectedAppointment, appointments, loadAppointments]);

  const personalCount = useMemo(() => 
    appointments.filter(a => a.category === 'personal').length, 
    [appointments]
  );
  
  const businessCount = useMemo(() => 
    appointments.filter(a => a.category === 'business').length, 
    [appointments]
  );

  const handleAddAppointment = useCallback(() => {
    router.push(`/appointments/add?date=${selectedDateTimestamp}` as any);
  }, [router, selectedDateTimestamp]);

  const closeDetailModal = useCallback(() => {
    setDetailModalVisible(false);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmModalVisible(false);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Appointments',
          headerStyle: { backgroundColor: '#0f0f1a' },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <RotateCcw size={20} color="#ef4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.backgroundContainer}>
        <Image
          source={{ uri: BACKGROUND_IMAGE }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          recyclingKey="appointments-bg"
        />
        <View style={styles.backgroundOverlay} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({appointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'personal' && styles.filterButtonActivePersonal,
            ]}
            onPress={() => setFilter('personal')}
          >
            <User size={14} color={filter === 'personal' ? '#fff' : PERSONAL_COLOR} />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'personal' ? '#fff' : PERSONAL_COLOR },
              ]}
            >
              Personal ({personalCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'business' && styles.filterButtonActiveBusiness,
            ]}
            onPress={() => setFilter('business')}
          >
            <Briefcase size={14} color={filter === 'business' ? '#fff' : BUSINESS_COLOR} />
            <Text
              style={[
                styles.filterText,
                { color: filter === 'business' ? '#fff' : BUSINESS_COLOR },
              ]}
            >
              Business ({businessCount})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color="#a78bfa" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{monthLabel}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <ChevronRight size={24} color="#a78bfa" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {DAYS_OF_WEEK.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((dayData, index) => {
              const entry = appointmentsByDate.get(dayData.dateKey);
              const hasPersonal = filter === 'business' ? false : (entry?.personal ?? false);
              const hasBusiness = filter === 'personal' ? false : (entry?.business ?? false);

              return (
                <DayCell
                  key={`${currentYear}-${currentMonth}-${index}`}
                  dateKey={dayData.dateKey}
                  dayNumber={dayData.dayNumber}
                  isCurrentMonth={dayData.isCurrentMonth}
                  isToday={dayData.dateKey === todayKey}
                  isSelected={dayData.dateKey === selectedDateKey}
                  hasPersonal={hasPersonal}
                  hasBusiness={hasBusiness}
                  onPress={handleDayPress}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.selectedDateSection}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#a78bfa" />
            <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>
          </View>

          {selectedDateAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No appointments for this day</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddAppointment}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addButtonText}>Add Appointment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            selectedDateAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onPress={handleAppointmentPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={handleAddAppointment}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8b5cf6', '#a78bfa']}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetailModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDetailModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedAppointment && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalCategoryBadge,
                      {
                        backgroundColor:
                          selectedAppointment.category === 'personal'
                            ? `${PERSONAL_COLOR}20`
                            : `${BUSINESS_COLOR}20`,
                      },
                    ]}
                  >
                    {selectedAppointment.category === 'personal' ? (
                      <User size={16} color={PERSONAL_COLOR} />
                    ) : (
                      <Briefcase size={16} color={BUSINESS_COLOR} />
                    )}
                    <Text
                      style={[
                        styles.modalCategoryText,
                        {
                          color:
                            selectedAppointment.category === 'personal'
                              ? PERSONAL_COLOR
                              : BUSINESS_COLOR,
                        },
                      ]}
                    >
                      {selectedAppointment.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeDetailModal} style={styles.modalClose}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedAppointment.title}</Text>

                <View style={styles.modalInfoRow}>
                  <Calendar size={18} color="#a78bfa" />
                  <Text style={styles.modalInfoText}>
                    {new Date(selectedAppointment.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Clock size={18} color="#a78bfa" />
                  <Text style={styles.modalInfoText}>{selectedAppointment.time}</Text>
                </View>

                {selectedAppointment.notes ? (
                  <View style={styles.modalNotesSection}>
                    <Text style={styles.modalNotesLabel}>Notes</Text>
                    <Text style={styles.modalNotesText}>{selectedAppointment.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                    <Edit3 size={18} color="#fff" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={confirmModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeConfirmModal}
      >
        <Pressable style={styles.confirmOverlay} onPress={closeConfirmModal}>
          <Pressable style={styles.confirmContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>
              {confirmAction === 'delete' ? 'Delete Appointment?' : 'Clear All Appointments?'}
            </Text>
            <Text style={styles.confirmText}>
              {confirmAction === 'delete'
                ? 'This action cannot be undone.'
                : 'This will delete all your appointments. This action cannot be undone.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeConfirmModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={executeConfirmAction}>
                <Text style={styles.confirmButtonText}>
                  {confirmAction === 'delete' ? 'Delete' : 'Clear All'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 26, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  headerButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderColor: '#a78bfa',
  },
  filterButtonActivePersonal: {
    backgroundColor: `${PERSONAL_COLOR}30`,
    borderColor: PERSONAL_COLOR,
  },
  filterButtonActiveBusiness: {
    backgroundColor: `${BUSINESS_COLOR}30`,
    borderColor: BUSINESS_COLOR,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  filterTextActive: {
    color: '#fff',
  },
  calendarCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(167,139,250,0.3)',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#a78bfa',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#fff',
  },
  dayTextOther: {
    color: 'rgba(255,255,255,0.3)',
  },
  dayTextSelected: {
    fontWeight: '700' as const,
  },
  dayTextToday: {
    color: '#a78bfa',
    fontWeight: '700' as const,
  },
  dotContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedDateSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyState: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(167,139,250,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#a78bfa',
  },
  appointmentCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(20,20,35,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderTopColor: 'rgba(167,139,250,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalCategoryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  modalClose: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 20,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  modalInfoText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  modalNotesSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  modalNotesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalNotesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmContent: {
    backgroundColor: 'rgba(30,30,50,0.98)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
