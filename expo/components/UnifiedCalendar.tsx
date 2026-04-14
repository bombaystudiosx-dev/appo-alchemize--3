import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import { isSameLocalDay, localDateKey, startOfLocalDay } from '@/lib/date-utils';

export interface CalendarEvent {
  date: string;
  type: string;
  count: number;
  title?: string;
  deepLink?: string;
}

function getWeekStart(date: Date): Date {
  const d = startOfLocalDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), diff));
}

function getWeekDays(startDate: Date): Date[] {
  const start = startOfLocalDay(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(startOfLocalDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  }
  return days;
}

export { getWeekStart };

interface UnifiedCalendarProps {
  events: CalendarEvent[];
  selectedWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  isDark?: boolean;
  onEventPress?: (route: string) => void;
  getEventTitle?: (type: string) => string;
  getEventColor?: (type: string) => string;
}

const getDayColor = (dayEvents: CalendarEvent[]): string => {
  if (dayEvents.length === 0) return 'transparent';
  const types = dayEvents.map(e => e.type);
  if (types.includes('gratitude')) return '#fbbf24';
  if (types.includes('workout')) return '#10b981';
  if (types.includes('financial')) return '#06b6d4';
  if (types.includes('habit')) return '#8b5cf6';
  if (types.includes('task')) return '#f59e0b';
  if (types.includes('goal')) return '#ec4899';
  if (types.includes('appointment')) return '#ef4444';
  if (types.includes('manifestation')) return '#d946ef';
  if (types.includes('affirmation')) return '#a78bfa';
  if (types.includes('meal')) return '#f97316';
  return '#6366f1';
};

const EVENT_ROUTES: { [key: string]: string } = {
  financial: '/financial',
  gratitude: '/gratitude',
  task: '/todos',
  appointment: '/appointments',
  goal: '/goals',
  workout: '/fitness',
  habit: '/habits',
  manifestation: '/manifestation-board',
  affirmation: '/affirmations',
  meal: '/calorie',
};

export default function UnifiedCalendar({
  events,
  selectedWeekStart,
  onWeekChange,
  onDayPress,
  isDark = false,
  onEventPress,
  getEventTitle,
  getEventColor,
}: UnifiedCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const weekDays = getWeekDays(selectedWeekStart);
  const [todayTick, setTodayTick] = useState(0);

  const today = startOfLocalDay(new Date());
  void todayTick;

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 10);
    const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const timeout = setTimeout(() => {
      console.log('[UnifiedCalendar] Midnight rollover detected - updating today');
      setTodayTick((t) => t + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [todayTick]);

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = localDateKey(date);
    return events.filter((e) => e.date === dateStr);
  };

  const calStyle = isDark ? calendarThemeStyles.dark : calendarThemeStyles.light;

  const allWeekEvents = weekDays.flatMap((day) => {
    const dateStr = localDateKey(day);
    return getEventsForDate(day).map((event) => ({
      ...event,
      dateStr,
      dayOfWeek: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: day.getDate(),
    }));
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <ChevronLeft size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
        </TouchableOpacity>
        <Text style={[styles.monthText, calStyle.monthText]}>
          {selectedWeekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <ChevronRight size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton}>
            {isExpanded ? (
              <ChevronUp size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.daysContainer}>
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameLocalDay(day, today);
          const dayColor = getDayColor(dayEvents);

          return (
            <TouchableOpacity key={index} style={styles.dayItem} onPress={() => onDayPress(day)} activeOpacity={0.7}>
              <Text style={[styles.dayName, calStyle.dayName]}>
                {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </Text>
              <View style={[
                styles.dayNumber,
                isToday && (isDark ? styles.todayDark : styles.today),
                dayEvents.length > 0 && { borderColor: dayColor, borderWidth: 2 }
              ]}>
                <Text style={[
                  styles.dayText,
                  calStyle.dayText,
                  isToday && styles.todayText
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={styles.eventDots}>
                {dayEvents.slice(0, 3).map((event, i) => (
                  <View
                    key={i}
                    style={[styles.eventDot, { backgroundColor: getDayColor([event]) }]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.expandedHeader}>
            <Text style={[styles.expandedTitle, calStyle.expandedTitle]}>
              Week Activities ({allWeekEvents.length})
            </Text>
          </View>
          <ScrollView
            style={styles.expandedScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {allWeekEvents.length === 0 ? (
              <View style={styles.expandedEmpty}>
                <Text style={[styles.expandedEmptyText, calStyle.expandedEmptyText]}>
                  No activities this week
                </Text>
              </View>
            ) : (
              allWeekEvents.map((event, index) => {
                const eventColor = getEventColor ? getEventColor(event.type) : getDayColor([event]);
                const eventTitle = getEventTitle ? getEventTitle(event.type) : event.type;

                return (
                  <TouchableOpacity
                    key={`${event.dateStr}-${event.type}-${index}`}
                    style={styles.expandedEventItem}
                    onPress={() => {
                      if (onEventPress) {
                        onEventPress(EVENT_ROUTES[event.type] || '/');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.expandedEventIndicator, { backgroundColor: eventColor }]} />
                    <View style={styles.expandedEventContent}>
                      <View style={styles.expandedEventHeader}>
                        <Text style={[styles.expandedEventTitle, calStyle.expandedEventTitle]}>
                          {eventTitle}
                        </Text>
                        <Text style={[styles.expandedEventDate, calStyle.expandedEventDate]}>
                          {event.dayOfWeek} {event.dayNumber}
                        </Text>
                      </View>
                      <Text style={[styles.expandedEventCount, calStyle.expandedEventCount]}>
                        {event.count} {event.count === 1 ? 'entry' : 'entries'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)'} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const calendarThemeStyles = {
  light: {
    monthText: { color: '#fff' },
    dayName: { color: 'rgba(255, 255, 255, 0.8)' },
    dayText: { color: '#fff' },
    expandedTitle: { color: '#fff' },
    expandedEmptyText: { color: 'rgba(255,255,255,0.5)' },
    expandedEventTitle: { color: '#fff' },
    expandedEventDate: { color: 'rgba(255,255,255,0.6)' },
    expandedEventCount: { color: 'rgba(255,255,255,0.5)' },
  },
  dark: {
    monthText: { color: '#fff' },
    dayName: { color: 'rgba(255, 255, 255, 0.7)' },
    dayText: { color: '#fff' },
    expandedTitle: { color: '#fff' },
    expandedEmptyText: { color: 'rgba(255,255,255,0.5)' },
    expandedEventTitle: { color: '#fff' },
    expandedEventDate: { color: 'rgba(255,255,255,0.6)' },
    expandedEventCount: { color: 'rgba(255,255,255,0.5)' },
  },
} as const;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    padding: 4,
  },
  expandButton: {
    padding: 4,
    marginLeft: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
    opacity: 0.7,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  today: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  todayDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderWidth: 2,
    borderColor: '#a78bfa',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  todayText: {
    fontWeight: '700' as const,
  },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
    justifyContent: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  expandedHeader: {
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  expandedScroll: {
    maxHeight: 300,
  },
  expandedEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  expandedEmptyText: {
    fontSize: 14,
  },
  expandedEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  expandedEventIndicator: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  expandedEventContent: {
    flex: 1,
  },
  expandedEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expandedEventTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  expandedEventDate: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  expandedEventCount: {
    fontSize: 12,
  },
});
