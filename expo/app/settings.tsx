import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActionSheetIOS,
  Platform,
  Linking,
  Image,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import {
  User,
  Mail,
  Info,
  FileText,
  Shield,
  Palette,
  LogOut,
  ChevronRight,
  Camera,
  X,
  Trash2,
  Eye,
  RefreshCw,
  Watch,
  Activity,
  Heart,
  Zap,
  CheckCircle,
  AlertCircle,
  Download,
  Smartphone,
  Bell,
  CalendarDays,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetDatabase } from '@/lib/database';
import { registerForPushNotifications, getNotificationStatus } from '@/lib/notifications';
import { requestCalendarPermission, getCalendarPermissionStatus } from '@/lib/calendar';
import {
  isHealthKitSupported,
  getStoredPermissions,
  requestHealthKitPermissions,
  revokeHealthKitPermissions,
  syncHealthKitData,
  getLastSyncTime,
  type HealthKitPermissions,
} from '@/lib/healthkit';

const APP_VERSION = '1.0.0';

interface UserProfileData {
  displayName: string;
  email: string;
  photoUri: string | null;
}

const getDefaultProfile = (user: { name: string; email: string } | null): UserProfileData => ({
  displayName: user?.name || 'Alchemize User',
  email: user?.email || '',
  photoUri: null,
});

const STORAGE_KEY = '@alchemize_user_profile';
const FEATURES_VISIBILITY_KEY = '@alchemize_features_visibility';

interface FeatureVisibility {
  [key: string]: boolean;
}

const DEFAULT_FEATURES: { id: string; title: string }[] = [
  { id: 'manifestation-board', title: 'Manifestation Board' },
  { id: 'affirmations', title: 'Affirmations' },
  { id: 'goals', title: 'Set Goals' },
  { id: 'habits', title: 'Habit Tracker' },
  { id: 'financial', title: 'Financial Tracker' },
  { id: 'calorie', title: 'Calorie Tracker' },
  { id: 'todos', title: 'To-Do List' },
  { id: 'gratitude', title: 'Gratitude Journal' },
  { id: 'fitness', title: 'Fitness' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  
  const defaultProfile = useMemo(() => getDefaultProfile(user), [user]);
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [featureVisibility, setFeatureVisibility] = useState<FeatureVisibility>({});
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  const [healthKitModalVisible, setHealthKitModalVisible] = useState(false);
  const [healthKitPermissions, setHealthKitPermissions] = useState<HealthKitPermissions | null>(null);
  const [healthKitLastSync, setHealthKitLastSync] = useState<string | null>(null);
  const [isSyncingHealthKit, setIsSyncingHealthKit] = useState(false);
  const { theme, setTheme } = useTheme();
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const userStorageKey = user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
      const stored = await AsyncStorage.getItem(userStorageKey);
      if (stored && typeof stored === 'string' && stored.startsWith('{')) {
        try {
          const parsed = JSON.parse(stored) as UserProfileData;
          if (parsed && parsed.displayName) {
            setProfile({
              ...parsed,
              email: user?.email || parsed.email,
            });
            console.log('[Settings] Profile loaded:', parsed);
          } else {
            setProfile(getDefaultProfile(user));
          }
        } catch (parseError) {
          console.warn('[Settings] Invalid profile data, using default:', parseError);
          await AsyncStorage.removeItem(userStorageKey);
          setProfile(getDefaultProfile(user));
        }
      } else {
        setProfile(getDefaultProfile(user));
      }
    } catch (error) {
      console.error('[Settings] Error loading profile:', error);
      setProfile(getDefaultProfile(user));
    }
  }, [user]);

  const saveProfile = useCallback(async (newProfile: UserProfileData) => {
    try {
      const userStorageKey = user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
      await AsyncStorage.setItem(userStorageKey, JSON.stringify(newProfile));
      setProfile(newProfile);
      console.log('[Settings] Profile saved:', newProfile);
    } catch (error) {
      console.error('[Settings] Error saving profile:', error);
    }
  }, [user?.id]);

  const loadFeatureVisibility = useCallback(async () => {
    try {
      const userFeatureKey = user?.id ? `${FEATURES_VISIBILITY_KEY}_${user.id}` : FEATURES_VISIBILITY_KEY;
      const stored = await AsyncStorage.getItem(userFeatureKey);
      if (stored && typeof stored === 'string' && stored.startsWith('{')) {
        try {
          const parsed = JSON.parse(stored) as FeatureVisibility;
          setFeatureVisibility(parsed);
          console.log('[Settings] Feature visibility loaded:', parsed);
        } catch (parseError) {
          console.warn('[Settings] Invalid feature visibility data:', parseError);
          await AsyncStorage.removeItem(userFeatureKey);
          const defaultVisibility: FeatureVisibility = {};
          DEFAULT_FEATURES.forEach(f => {
            defaultVisibility[f.id] = true;
          });
          setFeatureVisibility(defaultVisibility);
        }
      } else {
        const defaultVisibility: FeatureVisibility = {};
        DEFAULT_FEATURES.forEach(f => {
          defaultVisibility[f.id] = true;
        });
        setFeatureVisibility(defaultVisibility);
      }
    } catch (error) {
      console.error('[Settings] Error loading feature visibility:', error);
    }
  }, [user?.id]);

  const toggleFeatureVisibility = useCallback(async (featureId: string) => {
    try {
      const userFeatureKey = user?.id ? `${FEATURES_VISIBILITY_KEY}_${user.id}` : FEATURES_VISIBILITY_KEY;
      const newVisibility = {
        ...featureVisibility,
        [featureId]: !featureVisibility[featureId],
      };
      setFeatureVisibility(newVisibility);
      await AsyncStorage.setItem(userFeatureKey, JSON.stringify(newVisibility));
      console.log('[Settings] Feature visibility updated:', newVisibility);
    } catch (error) {
      console.error('[Settings] Error saving feature visibility:', error);
    }
  }, [user?.id, featureVisibility]);


  const loadHealthKitStatus = useCallback(async () => {
    try {
      const permissions = await getStoredPermissions();
      setHealthKitPermissions(permissions);
      const lastSync = await getLastSyncTime();
      setHealthKitLastSync(lastSync);
      console.log('[Settings] HealthKit status loaded:', permissions.overallStatus);
    } catch (error) {
      console.error('[Settings] Error loading HealthKit status:', error);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadFeatureVisibility();
    loadHealthKitStatus();

    if (Platform.OS === 'web') {
      const checkPwaInstalled = () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;
        setIsPwaInstalled(isStandalone);
        console.log('[Settings] PWA installed check:', isStandalone);
      };
      checkPwaInstalled();

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setPwaInstallPrompt(e);
        console.log('[Settings] PWA install prompt captured');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
    if (Platform.OS !== 'web') {
      getNotificationStatus().then(setNotificationsEnabled).catch(() => {});
      getCalendarPermissionStatus().then(setCalendarEnabled).catch(() => {});
    }
  }, [loadProfile, loadFeatureVisibility, loadHealthKitStatus]);

  const handleToggleNotifications = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Push notifications are only available on mobile devices.');
      return;
    }
    if (notificationsEnabled) {
      Alert.alert(
        'Disable Notifications',
        'To disable notifications, go to your device Settings > Notifications > Alchemize.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      const token = await registerForPushNotifications();
      if (token) {
        setNotificationsEnabled(true);
        Alert.alert('Notifications Enabled', 'You will now receive push notifications for reminders and appointments.');
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const handleToggleCalendar = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Calendar integration is only available on mobile devices.');
      return;
    }
    if (calendarEnabled) {
      Alert.alert(
        'Calendar Access',
        'To revoke calendar access, go to your device Settings > Privacy > Calendars > Alchemize.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      const granted = await requestCalendarPermission();
      if (granted) {
        setCalendarEnabled(true);
        Alert.alert('Calendar Connected', 'Appointments will now sync to your iPhone calendar.');
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable calendar access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    }
  };

  const handlePwaInstall = async () => {
    if (isPwaInstalled) {
      Alert.alert('Already Installed', 'Alchemize is already installed on your device.');
      return;
    }

    if (pwaInstallPrompt) {
      try {
        pwaInstallPrompt.prompt();
        const { outcome } = await pwaInstallPrompt.userChoice;
        console.log('[Settings] PWA install outcome:', outcome);
        if (outcome === 'accepted') {
          setIsPwaInstalled(true);
          setPwaInstallPrompt(null);
          Alert.alert('Installed!', 'Alchemize has been added to your home screen.');
        }
      } catch (error) {
        console.error('[Settings] PWA install error:', error);
      }
    } else {
      Alert.alert(
        'Install Alchemize',
        Platform.OS === 'web' 
          ? 'To install: tap the share button in your browser, then select "Add to Home Screen" or "Install App".'
          : 'This feature is only available on web browsers.',
        [{ text: 'OK' }]
      );
    }
  };



  const handleHealthKitPress = () => {
    console.log('[Settings] Opening HealthKit settings...');
    setHealthKitModalVisible(true);
  };

  const handleEnableHealthKit = async () => {
    console.log('[Settings] Enabling HealthKit...');
    try {
      const permissions = await requestHealthKitPermissions();
      setHealthKitPermissions(permissions);
      if (permissions.overallStatus === 'authorized') {
        Alert.alert(
          'Apple Health Connected',
          'Your wearable data will now enhance your tracking. You stay in control of all entries.'
        );
      } else if (permissions.overallStatus === 'unavailable') {
        const { reason } = isHealthKitSupported();
        Alert.alert('Not Available', reason);
      }
    } catch (error) {
      console.error('[Settings] Error enabling HealthKit:', error);
      Alert.alert('Error', 'Failed to connect to Apple Health. Please try again.');
    }
  };

  const handleDisableHealthKit = async () => {
    Alert.alert(
      'Disconnect Apple Health?',
      'This will stop syncing wearable data. Your existing data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await revokeHealthKitPermissions();
            setHealthKitPermissions(null);
            setHealthKitLastSync(null);
            console.log('[Settings] HealthKit disconnected');
          },
        },
      ]
    );
  };

  const handleSyncHealthKit = async () => {
    if (isSyncingHealthKit) return;
    console.log('[Settings] Syncing HealthKit...');
    setIsSyncingHealthKit(true);
    try {
      const result = await syncHealthKitData();
      if (result.success) {
        const lastSync = await getLastSyncTime();
        setHealthKitLastSync(lastSync);
        Alert.alert('Sync Complete', result.message);
      } else {
        Alert.alert('Sync Failed', result.message);
      }
    } catch (error) {
      console.error('[Settings] Error syncing HealthKit:', error);
      Alert.alert('Error', 'Failed to sync with Apple Health.');
    } finally {
      setIsSyncingHealthKit(false);
    }
  };

  const formatLastSync = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleTakePhoto();
          } else if (buttonIndex === 2) {
            handleChooseFromLibrary();
          } else if (buttonIndex === 3) {
            handleRemovePhoto();
          }
        }
      );
    } else {
      Alert.alert(
        'Update Profile Photo',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: handleTakePhoto },
          { text: 'Choose from Library', onPress: handleChooseFromLibrary },
          { text: 'Remove Photo', onPress: handleRemovePhoto, style: 'destructive' },
        ]
      );
    }
  };

  const handleTakePhoto = async () => {
    console.log('[Settings] Requesting camera permissions...');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('[Settings] Camera permission denied');
      setPermissionModalVisible(true);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('[Settings] Photo taken:', uri);
        await saveProfile({ ...profile, photoUri: uri });
      }
    } catch (error) {
      console.error('[Settings] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleChooseFromLibrary = async () => {
    console.log('[Settings] Requesting media library permissions...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('[Settings] Media library permission denied');
      setPermissionModalVisible(true);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('[Settings] Photo selected:', uri);
        await saveProfile({ ...profile, photoUri: uri });
      }
    } catch (error) {
      console.error('[Settings] Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const handleRemovePhoto = async () => {
    console.log('[Settings] Removing photo...');
    await saveProfile({ ...profile, photoUri: null });
  };

  const openEditProfile = () => {
    setEditName(profile.displayName);
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Please enter a valid display name.');
      return;
    }
    await saveProfile({ ...profile, displayName: trimmedName });
    setEditProfileVisible(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Signing out...');
            try {
              await logout();
            } catch (error) {
              console.error('[Settings] Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            console.log('[Settings] Deleting account...');
            try {
              await resetDatabase();
              await logout();
              Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
            } catch (error) {
              console.error('[Settings] Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDatabase();
            Alert.alert('Success', 'All data has been reset');
            router.push('/');
          },
        },
      ]
    );
  };

  const openSystemSettings = () => {
    setPermissionModalVisible(false);
    Linking.openSettings();
  };

  const renderAvatar = (size: number = 80) => {
    if (profile.photoUri) {
      return (
        <Image
          source={{ uri: profile.photoUri }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }
    return (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <User color="#a78bfa" size={size * 0.5} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://fv5-5.files.fm/thumb_show.php?i=m7wgu2m6ks&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.backgroundOverlay} />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
      {/* Account Overview Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
          {renderAvatar(80)}
          <View style={styles.cameraBadge}>
            <Camera color="#fff" size={14} />
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{profile.displayName}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* ACCOUNT Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        
        {!user ? (
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/auth' as any)}>
            <View style={styles.settingRowLeft}>
              <View style={styles.iconContainer}>
                <User color="#a78bfa" size={20} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Sign In / Sign Up</Text>
                <Text style={styles.settingSubtitle}>Create an account or sign in</Text>
              </View>
            </View>
            <ChevronRight color="#666" size={20} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.settingRow} onPress={openEditProfile}>
              <View style={styles.settingRowLeft}>
                <View style={styles.iconContainer}>
                  <User color="#a78bfa" size={20} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Profile</Text>
                  <Text style={styles.settingSubtitle}>Manage your profile details</Text>
                </View>
              </View>
              <ChevronRight color="#666" size={20} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingRow} disabled>
              <View style={styles.settingRowLeft}>
                <View style={styles.iconContainer}>
                  <Mail color="#a78bfa" size={20} />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Email</Text>
                  <Text style={styles.settingSubtitle}>{profile.email}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* APP Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APP</Text>
        
        <TouchableOpacity style={styles.settingRow} onPress={() => setAboutVisible(true)}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Info color="#a78bfa" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>About Alchemize</Text>
              <Text style={styles.settingSubtitle}>Learn more about the app</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => setTermsVisible(true)}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <FileText color="#a78bfa" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Terms & Conditions</Text>
              <Text style={styles.settingSubtitle}>Read our terms of service</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => setPrivacyVisible(true)}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Shield color="#a78bfa" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingSubtitle}>How we handle your data</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => setFeaturesVisible(true)}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Eye color="#a78bfa" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Manage Features</Text>
              <Text style={styles.settingSubtitle}>Choose which features to display</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleHealthKitPress}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Watch color="#ef4444" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Apple Health</Text>
              <Text style={styles.settingSubtitle}>
                {healthKitPermissions?.overallStatus === 'authorized'
                  ? `Connected • Last sync: ${formatLastSync(healthKitLastSync)}`
                  : 'Sync workouts from Apple Watch & Ring'}
              </Text>
            </View>
          </View>
          {healthKitPermissions?.overallStatus === 'authorized' ? (
            <CheckCircle color="#22c55e" size={20} />
          ) : (
            <ChevronRight color="#666" size={20} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleToggleNotifications}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Bell color="#3b82f6" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSubtitle}>
                {notificationsEnabled ? 'Enabled • Receiving reminders' : 'Enable to receive appointment reminders'}
              </Text>
            </View>
          </View>
          {notificationsEnabled ? (
            <CheckCircle color="#22c55e" size={20} />
          ) : (
            <ChevronRight color="#666" size={20} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleToggleCalendar}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <CalendarDays color="#22c55e" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>iPhone Calendar</Text>
              <Text style={styles.settingSubtitle}>
                {calendarEnabled ? 'Connected • Syncing appointments' : 'Sync appointments to your iPhone calendar'}
              </Text>
            </View>
          </View>
          {calendarEnabled ? (
            <CheckCircle color="#22c55e" size={20} />
          ) : (
            <ChevronRight color="#666" size={20} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={() => setThemeModalVisible(true)}>
          <View style={styles.settingRowLeft}>
            <View style={styles.iconContainer}>
              <Palette color="#a78bfa" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Theme</Text>
              <Text style={styles.settingSubtitle}>{theme === 'cosmic-dark' ? 'Cosmic Dark' : 'Cosmic'}</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        {Platform.OS === 'web' && (
          <TouchableOpacity style={styles.settingRow} onPress={handlePwaInstall}>
            <View style={styles.settingRowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                {isPwaInstalled ? (
                  <Smartphone color="#fbbf24" size={20} />
                ) : (
                  <Download color="#fbbf24" size={20} />
                )}
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Install App</Text>
                <Text style={styles.settingSubtitle}>
                  {isPwaInstalled ? 'App is installed on your device' : 'Add Alchemize to your home screen'}
                </Text>
              </View>
            </View>
            {isPwaInstalled ? (
              <CheckCircle color="#22c55e" size={20} />
            ) : (
              <ChevronRight color="#666" size={20} />
            )}
          </TouchableOpacity>
        )}


      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA</Text>
        <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.iconContainer, styles.dangerIcon]}>
              <Trash2 color="#ef4444" size={20} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.dangerTitle}>Reset All Data</Text>
              <Text style={styles.settingSubtitle}>Permanently delete all app data</Text>
            </View>
          </View>
          <ChevronRight color="#666" size={20} />
        </TouchableOpacity>

        {user && (
          <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
            <View style={styles.settingRowLeft}>
              <View style={[styles.iconContainer, styles.dangerIcon]}>
                <Trash2 color="#ef4444" size={20} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.dangerTitle}>Delete Account</Text>
                <Text style={styles.settingSubtitle}>Permanently delete your account and all data</Text>
              </View>
            </View>
            <ChevronRight color="#666" size={20} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sign Out Button - Only show when logged in */}
      {user && (
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerVersion}>Alchemize v{APP_VERSION}</Text>
        <Text style={styles.footerMade}>Made with ✨ and 💜</Text>
      </View>

      {/* Permission Needed Modal */}
      <Modal
        visible={permissionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPermissionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Permission Needed</Text>
            <Text style={styles.modalBody}>
              To update your profile photo, Alchemize needs access to your camera and photo library.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setPermissionModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={openSystemSettings}>
                <Text style={styles.modalButtonPrimaryText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editProfileModal}>
            <View style={styles.editProfileHeader}>
              <Text style={styles.editProfileTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.editAvatarContainer} onPress={handleAvatarPress}>
              {renderAvatar(100)}
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.editProfileButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditProfileVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={aboutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullModal}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>About Alchemize</Text>
              <TouchableOpacity onPress={() => setAboutVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.aboutText}>
                Alchemize is a personal transformation system built to help you turn intention into identity. It combines visualization, repetition, and tracking so your daily actions match the life you&apos;re building.
              </Text>
              <Text style={styles.aboutSubtitle}>Inside Alchemize you can:</Text>
              <Text style={styles.aboutBullet}>• Build a Manifest Board to keep your future front and center</Text>
              <Text style={styles.aboutBullet}>• Write and repeat Affirmations to reprogram self-talk</Text>
              <Text style={styles.aboutBullet}>• Set Goals and break them into aligned, measurable steps</Text>
              <Text style={styles.aboutBullet}>• Track Habits to create consistency and identity change</Text>
              <Text style={styles.aboutBullet}>• Log Fitness and Diet to support discipline and energy</Text>
              <Text style={styles.aboutBullet}>• Track Finances to build clarity and reduce scarcity thinking</Text>
              <Text style={styles.aboutBullet}>• Use Journals and planning tools to reflect, reset, and move forward</Text>
              <Text style={styles.aboutText}>
                Alchemize is designed to be simple enough to use daily and powerful enough to compound results over time.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={termsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullModal}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setTermsVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalTitle}>ALCHEMIZE TERMS & CONDITIONS</Text>
              <Text style={styles.legalDate}>Effective Date: December 16, 2025</Text>

              <Text style={styles.legalSectionTitle}>1. Agreement</Text>
              <Text style={styles.legalText}>
                By downloading, accessing, or using Alchemize (&quot;App&quot;), you agree to these Terms & Conditions (&quot;Terms&quot;). If you do not agree, do not use the App.
              </Text>

              <Text style={styles.legalSectionTitle}>2. Eligibility</Text>
              <Text style={styles.legalText}>
                You must be at least 13 years old to use Alchemize. If you are under 18, you must have permission from a parent/guardian.
              </Text>

              <Text style={styles.legalSectionTitle}>3. Not Medical or Financial Advice</Text>
              <Text style={styles.legalText}>
                Alchemize provides self-improvement tools (e.g., affirmations, habit tracking, fitness/diet logging, goal setting, journaling, finance tracking). The App does not provide medical, mental health, legal, or financial advice and is not a substitute for professional services. Always consult qualified professionals for advice specific to your situation.
              </Text>

              <Text style={styles.legalSectionTitle}>4. Your Account & Security</Text>
              <Text style={styles.legalText}>
                You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. Notify us immediately if you suspect unauthorized access.
              </Text>

              <Text style={styles.legalSectionTitle}>5. Your Content</Text>
              <Text style={styles.legalText}>
                You may input content such as text entries, goals, journal notes, photos, and other materials (&quot;User Content&quot;). You retain ownership of your User Content. You grant Alchemize a limited license to store, process, and display your User Content solely to operate and improve the App.
              </Text>

              <Text style={styles.legalSectionTitle}>6. Acceptable Use</Text>
              <Text style={styles.legalText}>You agree not to:</Text>
              <Text style={styles.legalBullet}>• Use the App for unlawful purposes</Text>
              <Text style={styles.legalBullet}>• Attempt to hack, disrupt, or reverse engineer the App</Text>
              <Text style={styles.legalBullet}>• Upload malicious code or abuse the platform</Text>
              <Text style={styles.legalBullet}>• Infringe the rights of others</Text>

              <Text style={styles.legalSectionTitle}>7. Privacy</Text>
              <Text style={styles.legalText}>
                Your use of Alchemize is also governed by our Privacy Policy. Where these Terms and the Privacy Policy conflict, the Privacy Policy controls for privacy-related topics.
              </Text>

              <Text style={styles.legalSectionTitle}>8. Subscriptions & Payments (if applicable)</Text>
              <Text style={styles.legalText}>
                If Alchemize offers paid features, subscription terms, pricing, and billing details will be shown at purchase. Payments are processed by the relevant app store. Refunds follow the app store&apos;s refund policy unless otherwise required by law.
              </Text>

              <Text style={styles.legalSectionTitle}>9. Changes to the App</Text>
              <Text style={styles.legalText}>
                We may update, modify, or discontinue features of the App at any time. We are not liable for any modifications, suspensions, or discontinuation.
              </Text>

              <Text style={styles.legalSectionTitle}>10. Disclaimer of Warranties</Text>
              <Text style={styles.legalText}>
                The App is provided &quot;as is&quot; and &quot;as available.&quot; We make no warranties of any kind, express or implied, including fitness for a particular purpose and non-infringement.
              </Text>

              <Text style={styles.legalSectionTitle}>11. Limitation of Liability</Text>
              <Text style={styles.legalText}>
                To the maximum extent permitted by law, Alchemize and its creators will not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenue arising from your use of the App.
              </Text>

              <Text style={styles.legalSectionTitle}>12. Termination</Text>
              <Text style={styles.legalText}>
                We may suspend or terminate access to the App if you violate these Terms or if required for security or legal reasons.
              </Text>

              <Text style={styles.legalSectionTitle}>13. Governing Law</Text>
              <Text style={styles.legalText}>
                These Terms are governed by the laws of the jurisdiction where Alchemize is operated, without regard to conflict of law rules.
              </Text>

              <Text style={styles.legalSectionTitle}>14. Contact</Text>
              <Text style={styles.legalText}>
                For support or legal questions, contact: support@alchemize.app
              </Text>
              <View style={styles.legalBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Features Modal */}
      <Modal
        visible={featuresVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeaturesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullModal}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Manage Features</Text>
              <TouchableOpacity onPress={() => setFeaturesVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.featuresDescription}>
                Choose which features you want to see on your home screen. Disabled features will be hidden from the carousel.
              </Text>
              {DEFAULT_FEATURES.map((feature) => (
                <View key={feature.id} style={styles.featureToggleRow}>
                  <Text style={styles.featureToggleTitle}>{feature.title}</Text>
                  <Switch
                    value={featureVisibility[feature.id] !== false}
                    onValueChange={() => toggleFeatureVisibility(feature.id)}
                    trackColor={{ false: '#3a3a3a', true: '#a78bfa' }}
                    thumbColor={featureVisibility[feature.id] !== false ? '#fff' : '#ccc'}
                    ios_backgroundColor="#3a3a3a"
                  />
                </View>
              ))}
              <View style={styles.legalBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.themeModal}>
            <View style={styles.themeModalHeader}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'cosmic-dark' && styles.themeOptionActive,
              ]}
              onPress={async () => {
                await setTheme('cosmic-dark');
                setThemeModalVisible(false);
              }}
            >
              <View>
                <Text style={styles.themeOptionTitle}>Cosmic Dark</Text>
                <Text style={styles.themeOptionDescription}>
                  Card-based carousel navigation with dark cosmic background
                </Text>
              </View>
              {theme === 'cosmic-dark' && (
                <View style={styles.themeCheckmark}>
                  <Text style={styles.themeCheckmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'cosmic' && styles.themeOptionActive,
              ]}
              onPress={async () => {
                await setTheme('cosmic');
                setThemeModalVisible(false);
              }}
            >
              <View>
                <Text style={styles.themeOptionTitle}>Cosmic</Text>
                <Text style={styles.themeOptionDescription}>
                  Orbital navigation with 3D planet-style circular cards
                </Text>
              </View>
              {theme === 'cosmic' && (
                <View style={styles.themeCheckmark}>
                  <Text style={styles.themeCheckmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={privacyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacyVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullModal}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Privacy Policy</Text>
              <TouchableOpacity onPress={() => setPrivacyVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullModalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.legalTitle}>ALCHEMIZE PRIVACY POLICY</Text>
              <Text style={styles.legalDate}>Effective Date: December 16, 2025</Text>

              <Text style={styles.legalSectionTitle}>1. Overview</Text>
              <Text style={styles.legalText}>
                Alchemize respects your privacy. This policy explains what we collect, how we use it, and the choices you have.
              </Text>

              <Text style={styles.legalSectionTitle}>2. Information We Collect</Text>
              <Text style={styles.legalBullet}>• Account info: name, email, login identifiers</Text>
              <Text style={styles.legalBullet}>• Profile info: profile photo (if you choose to upload), display name</Text>
              <Text style={styles.legalBullet}>• App content you create: affirmations, goals, habits, journal entries, logs (fitness, diet, finance), and similar entries</Text>
              <Text style={styles.legalBullet}>• Device/app data: app version, device type, crash logs, and performance metrics (for reliability and improvement)</Text>

              <Text style={styles.legalSectionTitle}>3. How We Use Information</Text>
              <Text style={styles.legalText}>We use your information to:</Text>
              <Text style={styles.legalBullet}>• Provide and operate app features</Text>
              <Text style={styles.legalBullet}>• Save and sync your data (if sync is enabled)</Text>
              <Text style={styles.legalBullet}>• Improve performance, reliability, and user experience</Text>
              <Text style={styles.legalBullet}>• Provide support and respond to requests</Text>
              <Text style={styles.legalBullet}>• Protect against fraud, abuse, or security threats</Text>

              <Text style={styles.legalSectionTitle}>4. Sharing</Text>
              <Text style={styles.legalText}>
                We do not sell your personal information. We may share limited information with:
              </Text>
              <Text style={styles.legalBullet}>• Service providers that help operate the App (hosting, analytics, storage), under confidentiality obligations</Text>
              <Text style={styles.legalBullet}>• Legal authorities if required by law or to protect safety and rights</Text>

              <Text style={styles.legalSectionTitle}>5. Data Storage & Security</Text>
              <Text style={styles.legalText}>
                We use reasonable administrative, technical, and physical safeguards to protect your data. No system is 100% secure, so we cannot guarantee absolute security.
              </Text>

              <Text style={styles.legalSectionTitle}>6. Your Choices</Text>
              <Text style={styles.legalBullet}>• You can update your profile name and photo in Settings</Text>
              <Text style={styles.legalBullet}>• You can sign out at any time</Text>
              <Text style={styles.legalBullet}>• You may request access, correction, or deletion of your data by contacting support@alchemize.app</Text>

              <Text style={styles.legalSectionTitle}>7. Retention</Text>
              <Text style={styles.legalText}>
                We retain personal information only as long as needed to provide the App and comply with legal obligations. You may request deletion.
              </Text>

              <Text style={styles.legalSectionTitle}>8. Children&apos;s Privacy</Text>
              <Text style={styles.legalText}>
                Alchemize is not intended for children under 13. If we learn we collected data from a child under 13, we will delete it.
              </Text>

              <Text style={styles.legalSectionTitle}>9. Changes</Text>
              <Text style={styles.legalText}>
                We may update this Privacy Policy from time to time. We will update the effective date when changes are made.
              </Text>

              <Text style={styles.legalSectionTitle}>10. Contact</Text>
              <Text style={styles.legalText}>
                Questions or requests: support@alchemize.app
              </Text>
              <View style={styles.legalBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HealthKit / Apple Health Modal */}
      <Modal
        visible={healthKitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHealthKitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fullModal}>
            <View style={styles.fullModalHeader}>
              <Text style={styles.fullModalTitle}>Apple Health</Text>
              <TouchableOpacity onPress={() => setHealthKitModalVisible(false)}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fullModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.healthKitHero}>
                <View style={styles.healthKitIconContainer}>
                  <Heart color="#ef4444" size={32} />
                </View>
                <Text style={styles.healthKitHeroTitle}>
                  {healthKitPermissions?.overallStatus === 'authorized'
                    ? 'Connected to Apple Health'
                    : 'Connect Your Wearables'}
                </Text>
                <Text style={styles.healthKitHeroSubtitle}>
                  Wearable data enhances tracking.{"\n"}You stay in control.
                </Text>
              </View>

              {healthKitPermissions?.overallStatus === 'authorized' ? (
                <>
                  <View style={styles.healthKitStatusCard}>
                    <View style={styles.healthKitStatusRow}>
                      <View style={styles.healthKitStatusLeft}>
                        <Zap color="#f59e0b" size={18} />
                        <Text style={styles.healthKitStatusLabel}>Active Energy</Text>
                      </View>
                      <View style={[styles.healthKitStatusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Text style={[styles.healthKitStatusValue, { color: '#22c55e' }]}>Enabled</Text>
                      </View>
                    </View>
                    <View style={styles.healthKitStatusRow}>
                      <View style={styles.healthKitStatusLeft}>
                        <Activity color="#3b82f6" size={18} />
                        <Text style={styles.healthKitStatusLabel}>Workouts</Text>
                      </View>
                      <View style={[styles.healthKitStatusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Text style={[styles.healthKitStatusValue, { color: '#22c55e' }]}>Enabled</Text>
                      </View>
                    </View>
                    <View style={styles.healthKitStatusRow}>
                      <View style={styles.healthKitStatusLeft}>
                        <Watch color="#a78bfa" size={18} />
                        <Text style={styles.healthKitStatusLabel}>Exercise Minutes</Text>
                      </View>
                      <View style={[styles.healthKitStatusBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                        <Text style={[styles.healthKitStatusValue, { color: '#22c55e' }]}>Enabled</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.healthKitSyncInfo}>
                    <Text style={styles.healthKitSyncLabel}>Last Synced</Text>
                    <Text style={styles.healthKitSyncValue}>{formatLastSync(healthKitLastSync)}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.healthKitSyncButton, isSyncingHealthKit && styles.healthKitSyncButtonDisabled]}
                    onPress={handleSyncHealthKit}
                    disabled={isSyncingHealthKit}
                  >
                    <RefreshCw color="#fff" size={20} />
                    <Text style={styles.healthKitSyncButtonText}>
                      {isSyncingHealthKit ? 'Syncing...' : 'Sync Now'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.healthKitDisconnectButton}
                    onPress={handleDisableHealthKit}
                  >
                    <Text style={styles.healthKitDisconnectText}>Disconnect Apple Health</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.healthKitFeatureList}>
                    <View style={styles.healthKitFeatureItem}>
                      <View style={[styles.healthKitFeatureIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Zap color="#f59e0b" size={20} />
                      </View>
                      <View style={styles.healthKitFeatureText}>
                        <Text style={styles.healthKitFeatureTitle}>Active Energy Burned</Text>
                        <Text style={styles.healthKitFeatureDesc}>Track calories from your daily movement</Text>
                      </View>
                    </View>
                    <View style={styles.healthKitFeatureItem}>
                      <View style={[styles.healthKitFeatureIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                        <Activity color="#3b82f6" size={20} />
                      </View>
                      <View style={styles.healthKitFeatureText}>
                        <Text style={styles.healthKitFeatureTitle}>Workouts</Text>
                        <Text style={styles.healthKitFeatureDesc}>Import workouts from Apple Watch & rings</Text>
                      </View>
                    </View>
                    <View style={styles.healthKitFeatureItem}>
                      <View style={[styles.healthKitFeatureIcon, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                        <Watch color="#a78bfa" size={20} />
                      </View>
                      <View style={styles.healthKitFeatureText}>
                        <Text style={styles.healthKitFeatureTitle}>Exercise Minutes</Text>
                        <Text style={styles.healthKitFeatureDesc}>See your daily exercise ring progress</Text>
                      </View>
                    </View>
                  </View>

                  {Platform.OS !== 'ios' && (
                    <View style={styles.healthKitWarning}>
                      <AlertCircle color="#f59e0b" size={20} />
                      <Text style={styles.healthKitWarningText}>
                        {Platform.OS === 'web'
                          ? 'Apple Health is only available on iOS devices. Use the mobile app to sync wearable data.'
                          : 'Apple Health is only available on iOS. Android Health Connect support coming soon.'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.healthKitConnectButton,
                      Platform.OS !== 'ios' && styles.healthKitConnectButtonDisabled,
                    ]}
                    onPress={handleEnableHealthKit}
                    disabled={Platform.OS !== 'ios'}
                  >
                    <Heart color="#fff" size={20} />
                    <Text style={styles.healthKitConnectText}>Connect Apple Health</Text>
                  </TouchableOpacity>

                  <Text style={styles.healthKitDisclaimer}>
                    Your health data stays on your device. We only read workout and activity data to enhance your tracking experience.
                  </Text>
                </>
              )}
              <View style={styles.legalBottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 10, 0.4)',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#1a1a1a',
  },
  avatarPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#a78bfa',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
    marginBottom: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 20,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 20,
  },
  footerVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  footerMade: {
    fontSize: 13,
    color: '#888',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#a78bfa',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editProfileModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  editProfileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editProfileTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  editAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  changePhotoText: {
    fontSize: 14,
    color: '#a78bfa',
    marginTop: 12,
    fontWeight: '600' as const,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  editProfileButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#a78bfa',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  fullModal: {
    backgroundColor: '#0a0a0a',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  fullModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  fullModalScroll: {
    padding: 20,
  },
  aboutText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 20,
  },
  aboutSubtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 12,
  },
  aboutBullet: {
    fontSize: 15,
    color: '#aaa',
    lineHeight: 28,
    paddingLeft: 8,
  },
  legalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  legalDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 24,
    textAlign: 'center',
  },
  legalSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#a78bfa',
    marginTop: 20,
    marginBottom: 8,
  },
  legalText: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 22,
  },
  legalBullet: {
    fontSize: 14,
    color: '#bbb',
    lineHeight: 24,
    paddingLeft: 8,
  },
  legalBottomPadding: {
    height: 40,
  },
  featuresDescription: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 20,
  },
  featureToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  featureToggleTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  themeModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  themeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  themeOptionActive: {
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
  },
  themeOptionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    maxWidth: '85%',
  },
  themeCheckmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#a78bfa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCheckmarkText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700' as const,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  healthKitHero: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  healthKitIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthKitHeroTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  healthKitHeroSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  healthKitStatusCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  healthKitStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  healthKitStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthKitStatusLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500' as const,
  },
  healthKitStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthKitStatusValue: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  healthKitSyncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  healthKitSyncLabel: {
    fontSize: 14,
    color: '#888',
  },
  healthKitSyncValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600' as const,
  },
  healthKitSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a78bfa',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  healthKitSyncButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  healthKitSyncButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  healthKitDisconnectButton: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  healthKitDisconnectText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '600' as const,
  },
  healthKitFeatureList: {
    marginBottom: 20,
  },
  healthKitFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    gap: 14,
  },
  healthKitFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthKitFeatureText: {
    flex: 1,
  },
  healthKitFeatureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  healthKitFeatureDesc: {
    fontSize: 13,
    color: '#888',
  },
  healthKitWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  healthKitWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#f59e0b',
    lineHeight: 20,
  },
  healthKitConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
  },
  healthKitConnectButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  healthKitConnectText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  healthKitDisclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
