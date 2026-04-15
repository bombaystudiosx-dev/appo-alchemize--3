import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_ID_KEY = '@alchemize_calendar_id';
const CALENDAR_ENABLED_KEY = '@alchemize_calendar_enabled';

let Calendar: typeof import('expo-calendar') | null = null;

async function getCalendarModule() {
  if (Platform.OS === 'web') return null;
  if (!Calendar) {
    try {
      Calendar = await import('expo-calendar');
    } catch (error) {
      console.error('[Calendar] Failed to import expo-calendar:', error);
      return null;
    }
  }
  return Calendar;
}

export async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const cal = await getCalendarModule();
    if (!cal) return false;

    const { status: existingStatus } = await cal.getCalendarPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await cal.requestCalendarPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    console.log('[Calendar] Permission:', granted ? 'granted' : 'denied');
    await AsyncStorage.setItem(CALENDAR_ENABLED_KEY, granted ? 'true' : 'false');
    return granted;
  } catch (error) {
    console.error('[Calendar] Error requesting permission:', error);
    return false;
  }
}

export async function isCalendarEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CALENDAR_ENABLED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export async function getCalendarPermissionStatus(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const cal = await getCalendarModule();
    if (!cal) return false;
    const { status } = await cal.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function getOrCreateAlchemizeCalendar(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const cal = await getCalendarModule();
    if (!cal) return null;

    const storedId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
    if (storedId) {
      try {
        const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);
        const exists = calendars.find((c: any) => c.id === storedId);
        if (exists) {
          console.log('[Calendar] Using existing Alchemize calendar:', storedId);
          return storedId;
        }
      } catch {
        console.log('[Calendar] Stored calendar not found, creating new one');
      }
    }

    if (Platform.OS === 'ios') {
      const defaultCalendar = await cal.getDefaultCalendarAsync();
      if (defaultCalendar) {
        console.log('[Calendar] Using default iOS calendar:', defaultCalendar.id);
        await AsyncStorage.setItem(CALENDAR_ID_KEY, defaultCalendar.id);
        return defaultCalendar.id;
      }
    }

    const calendars = await cal.getCalendarsAsync(cal.EntityTypes.EVENT);
    const writableCalendar = calendars.find(
      (c: any) => c.allowsModifications && c.source
    );

    if (writableCalendar) {
      console.log('[Calendar] Using writable calendar:', writableCalendar.id);
      await AsyncStorage.setItem(CALENDAR_ID_KEY, writableCalendar.id);
      return writableCalendar.id;
    }

    console.log('[Calendar] No writable calendar found');
    return null;
  } catch (error) {
    console.error('[Calendar] Error getting/creating calendar:', error);
    return null;
  }
}

export async function addAppointmentToCalendar(
  title: string,
  date: number,
  time: string,
  notes?: string,
  category?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const cal = await getCalendarModule();
    if (!cal) return null;

    const hasPermission = await getCalendarPermissionStatus();
    if (!hasPermission) {
      const granted = await requestCalendarPermission();
      if (!granted) {
        console.log('[Calendar] Permission denied, cannot add event');
        return null;
      }
    }

    const calendarId = await getOrCreateAlchemizeCalendar();
    if (!calendarId) {
      console.log('[Calendar] No calendar available');
      return null;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const eventId = await cal.createEventAsync(calendarId, {
      title: `${category ? `[${category.charAt(0).toUpperCase() + category.slice(1)}] ` : ''}${title}`,
      startDate,
      endDate,
      notes: notes || undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      alarms: [{ relativeOffset: -15 }],
    });

    console.log('[Calendar] Event created:', eventId);
    return eventId;
  } catch (error) {
    console.error('[Calendar] Error adding event:', error);
    return null;
  }
}

export async function removeEventFromCalendar(eventId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const cal = await getCalendarModule();
    if (!cal) return false;

    await cal.deleteEventAsync(eventId);
    console.log('[Calendar] Event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('[Calendar] Error removing event:', error);
    return false;
  }
}

export async function promptAddToCalendar(
  title: string,
  date: number,
  time: string,
  notes?: string,
  category?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  return new Promise((resolve) => {
    Alert.alert(
      'Add to Calendar',
      `Would you like to add "${title}" to your iPhone calendar?`,
      [
        { text: 'No Thanks', style: 'cancel', onPress: () => resolve(null) },
        {
          text: 'Add to Calendar',
          onPress: async () => {
            const eventId = await addAppointmentToCalendar(title, date, time, notes, category);
            resolve(eventId);
          },
        },
      ]
    );
  });
}
