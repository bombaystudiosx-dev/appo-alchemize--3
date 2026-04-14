import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar as CalendarIcon, ChevronRight, X } from 'lucide-react-native';
import type { CalendarEvent } from './UnifiedCalendar';

interface DayEventsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: CalendarEvent[];
  onEventPress: (route: string) => void;
  getEventTitle: (type: string) => string;
  getEventColor: (type: string) => string;
  isDark?: boolean;
}

export default function DayEventsModal({
  visible,
  onClose,
  selectedDate,
  events,
  onEventPress,
  getEventTitle,
  getEventColor,
  isDark = false,
}: DayEventsModalProps) {
  const accentColor = isDark ? '#a78bfa' : '#8b5cf6';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.content, isDark && styles.contentDark]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.header, isDark && styles.headerDark]}>
            <View style={styles.headerLeft}>
              <CalendarIcon size={24} color={accentColor} />
              <Text style={styles.title}>
                {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No activities on this day</Text>
              </View>
            ) : (
              events.map((event, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.eventItem, isDark && styles.eventItemDark]}
                  onPress={() => {
                    onClose();
                    onEventPress(event.type);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.eventIndicator, { backgroundColor: getEventColor(event.type) }]} />
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle}>{getEventTitle(event.type)}</Text>
                    <Text style={styles.eventCount}>{event.count} {event.count === 1 ? 'item' : 'items'}</Text>
                  </View>
                  <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'rgba(20,20,30,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.3)',
  },
  contentDark: {
    backgroundColor: 'rgba(15,15,30,0.98)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(167,139,250,0.4)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerDark: {
    borderBottomColor: 'rgba(167,139,250,0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventItemDark: {
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderColor: 'rgba(167,139,250,0.2)',
  },
  eventIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
