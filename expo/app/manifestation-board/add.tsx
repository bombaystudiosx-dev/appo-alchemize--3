import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Camera, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

interface SelectedImageState {
  uri: string;
  width?: number;
  height?: number;
}

const IMAGE_MEDIA_TYPE = 'images' as const;
const CAMERA_FACING_BACK = 'back' as const;
const CAMERA_MODE_PICTURE = 'picture' as const;
const CAMERA_RATIO = '16:9' as const;
const PERMISSION_GRANTED = 'granted' as const;
const IMAGE_PICKER_QUALITY = 0.8;
const IMAGE_PICKER_ASPECT: [number, number] = [4, 5];
const DEFAULT_MANIFESTATION_CATEGORY: Manifestation['category'] = 'other';
const DEFAULT_MANIFESTATION_TITLE = 'My Vision';
const DEFAULT_EMPTY_DESCRIPTION = '';
const DEFAULT_MANIFESTATION_ORDER = 0;
const CAMERA_BUTTON_LABEL_NATIVE = 'Open Camera';
const CAMERA_BUTTON_LABEL_WEB = 'Use Upload';
const IMAGE_PICK_ERROR_MESSAGE = 'Failed to pick image';
const IMAGE_CAPTURE_ERROR_MESSAGE = 'Failed to capture image';
const CREATE_ERROR_MESSAGE = 'Failed to create manifestation. Please try again.';
const MISSING_INFO_MESSAGE = 'Please add a vision image or write an intention.';
const LIBRARY_PERMISSION_MESSAGE = 'Please allow access to your photo library.';
const CAMERA_PERMISSION_MESSAGE = 'Please allow camera access.';
const WEB_CAMERA_MESSAGE = 'Camera preview is only available on native devices. Please use Upload instead.';
const CAMERA_MODAL_TITLE = 'Capture your portal image';
const CAMERA_MODAL_SUBTITLE = 'Frame your vision and save the exact photo to your board.';
const CAMERA_CLOSE_LABEL = 'Close';
const CAMERA_CAPTURE_LABEL = 'Capture';
const CAMERA_PERMISSION_LABEL = 'Camera access is needed to capture your vision image.';
const CAMERA_PERMISSION_BUTTON_LABEL = 'Allow Camera Access';
const CAMERA_MISSING_ASSET_MESSAGE = 'No photo was captured. Please try again.';
const CONSOLE_SCOPE = '[AddManifestation]';

const MOOD_TAGS: {
  key: Manifestation['category'];
  label: string;
  emoji: string;
}[] = [
  { key: 'wealth', label: 'Wealth', emoji: '💰' },
  { key: 'love', label: 'Love', emoji: '💞' },
  { key: 'health', label: 'Health', emoji: '🌿' },
  { key: 'focus', label: 'Focus', emoji: '🎯' },
  { key: 'creativity', label: 'Creativity', emoji: '🎨' },
  { key: 'healing', label: 'Healing', emoji: '💫' },
];

export default function AddManifestationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const [intention, setIntention] = useState<string>('');
  const [selectedMood, setSelectedMood] = useState<Manifestation['category'] | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImageState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  const createMutation = useMutation({
    mutationFn: (manifestation: Manifestation) => manifestationsDb.create(manifestation),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      router.back();
    },
    onError: (error) => {
      console.error(`${CONSOLE_SCOPE} Create failed:`, error);
      Alert.alert('Error', CREATE_ERROR_MESSAGE);
    },
  });

  const isWeb = Platform.OS === 'web';
  const cameraButtonLabel = useMemo(() => {
    return isWeb ? CAMERA_BUTTON_LABEL_WEB : CAMERA_BUTTON_LABEL_NATIVE;
  }, [isWeb]);

  const imageUri = selectedImage?.uri ?? null;

  const requestPermissions = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log(`${CONSOLE_SCOPE} Media library permission status:`, status);

    if (status !== PERMISSION_GRANTED) {
      Alert.alert('Permission Required', LIBRARY_PERMISSION_MESSAGE);
      return false;
    }

    return true;
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [IMAGE_MEDIA_TYPE],
        allowsEditing: true,
        quality: IMAGE_PICKER_QUALITY,
        aspect: IMAGE_PICKER_ASPECT,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });
        console.log(`${CONSOLE_SCOPE} Image selected:`, asset.uri);
      }
    } catch (error) {
      console.error(`${CONSOLE_SCOPE} Error picking image:`, error);
      Alert.alert('Error', IMAGE_PICK_ERROR_MESSAGE);
    }
  }, [requestPermissions]);

  const handleCamera = useCallback(async () => {
    try {
      if (isWeb) {
        Alert.alert('Not Available', WEB_CAMERA_MESSAGE);
        return;
      }

      const permissionResponse = cameraPermission ?? await requestCameraPermission();
      console.log(`${CONSOLE_SCOPE} Camera permission status:`, permissionResponse?.status);

      if (permissionResponse?.status !== PERMISSION_GRANTED) {
        Alert.alert('Permission Required', CAMERA_PERMISSION_MESSAGE);
        return;
      }

      setIsCameraOpen(true);
    } catch (error) {
      console.error(`${CONSOLE_SCOPE} Error opening camera:`, error);
      Alert.alert('Error', IMAGE_CAPTURE_ERROR_MESSAGE);
    }
  }, [cameraPermission, isWeb, requestCameraPermission]);

  const handleNativeCapture = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: [IMAGE_MEDIA_TYPE],
        quality: IMAGE_PICKER_QUALITY,
        allowsEditing: true,
        aspect: IMAGE_PICKER_ASPECT,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });
        setIsCameraOpen(false);
        console.log(`${CONSOLE_SCOPE} Photo captured via native camera:`, asset.uri);
        return;
      }

      Alert.alert('No Photo', CAMERA_MISSING_ASSET_MESSAGE);
    } catch (error) {
      console.error(`${CONSOLE_SCOPE} Error capturing native photo:`, error);
      Alert.alert('Error', IMAGE_CAPTURE_ERROR_MESSAGE);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const handleCreate = useCallback(() => {
    if (!intention.trim() && !imageUri) {
      Alert.alert('Missing Info', MISSING_INFO_MESSAGE);
      return;
    }

    const createdAt = Date.now();
    const manifestation: Manifestation = {
      id: createdAt.toString(),
      title: intention.trim() || DEFAULT_MANIFESTATION_TITLE,
      description: DEFAULT_EMPTY_DESCRIPTION,
      category: selectedMood ?? DEFAULT_MANIFESTATION_CATEGORY,
      intention: intention.trim(),
      images: imageUri ? [imageUri] : [],
      isFavorite: false,
      order: DEFAULT_MANIFESTATION_ORDER,
      createdAt,
      updatedAt: createdAt,
    };

    console.log(`${CONSOLE_SCOPE} Creating manifestation:`, manifestation.id, manifestation.category);
    createMutation.mutate(manifestation);
  }, [intention, imageUri, selectedMood, createMutation]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Add Manifestation',
          headerStyle: { backgroundColor: '#0c0520' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
          headerTitleStyle: { color: '#ffffff' },
        }}
      />

      <LinearGradient
        colors={['#1a0a3e', '#0c0520', '#0d1033']}
        style={styles.background}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>✨</Text>
            <Text style={styles.headerTitle}>Add Manifestation</Text>
          </View>

          <Text style={styles.sectionLabel}>Vision Image</Text>
          <View style={styles.imageUploadArea}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  activeOpacity={0.7}
                >
                  <X color="#ffffff" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleUpload}
                    activeOpacity={0.7}
                    testID="upload-button"
                  >
                    <Upload color="#c4b5fd" size={24} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleCamera}
                    activeOpacity={0.7}
                    testID="camera-button"
                  >
                    <Camera color="#c4b5fd" size={24} />
                    <Text style={styles.uploadButtonText}>{cameraButtonLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Your Intention</Text>
          <TextInput
            style={styles.intentionInput}
            value={intention}
            onChangeText={setIntention}
            placeholder="I am attracting abundance and joy..."
            placeholderTextColor="rgba(180, 170, 200, 0.5)"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            testID="intention-input"
          />

          <Text style={styles.sectionLabel}>Mood Tag (optional)</Text>
          <View style={styles.moodGrid}>
            {MOOD_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.key}
                style={[
                  styles.moodTag,
                  selectedMood === tag.key && styles.moodTagActive,
                ]}
                onPress={() =>
                  setSelectedMood((prev) => (prev === tag.key ? null : tag.key))
                }
                activeOpacity={0.7}
                testID={`mood-${tag.key}`}
              >
                <Text style={styles.moodEmoji}>{tag.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === tag.key && styles.moodLabelActive,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
            testID="create-portal-button"
          >
            <LinearGradient
              colors={['#7c3aed', '#4f46e5', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {createMutation.isPending ? 'Creating...' : 'Create Portal'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>

      <Modal
        visible={isCameraOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsCameraOpen(false)}
        transparent={false}
      >
        <View style={styles.cameraModalContainer}>
          <LinearGradient
            colors={['#05010f', '#0c0520', '#110a2f']}
            style={styles.cameraModalBackground}
          >
            <View style={styles.cameraModalHeader}>
              <TouchableOpacity
                style={styles.cameraHeaderButton}
                onPress={() => setIsCameraOpen(false)}
                activeOpacity={0.8}
                testID="close-camera-button"
              >
                <X color="#ffffff" size={18} />
                <Text style={styles.cameraHeaderButtonText}>{CAMERA_CLOSE_LABEL}</Text>
              </TouchableOpacity>

              <View style={styles.cameraHeaderCopy}>
                <Text style={styles.cameraModalTitle}>{CAMERA_MODAL_TITLE}</Text>
                <Text style={styles.cameraModalSubtitle}>{CAMERA_MODAL_SUBTITLE}</Text>
              </View>
            </View>

            {cameraPermission?.granted ? (
              <View style={styles.cameraShell}>
                <CameraView
                  style={styles.cameraPreview}
                  facing={CAMERA_FACING_BACK}
                  mode={CAMERA_MODE_PICTURE}
                  ratio={CAMERA_RATIO}
                  testID="native-camera-preview"
                />
                <View style={styles.cameraFooter}>
                  <TouchableOpacity
                    style={styles.cameraCaptureButton}
                    onPress={handleNativeCapture}
                    activeOpacity={0.85}
                    testID="capture-photo-button"
                  >
                    <LinearGradient
                      colors={['#8b5cf6', '#6366f1', '#3b82f6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.cameraCaptureGradient}
                    >
                      <Camera color="#ffffff" size={20} />
                      <Text style={styles.cameraCaptureText}>{CAMERA_CAPTURE_LABEL}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.cameraPermissionCard}>
                <Text style={styles.cameraPermissionText}>{CAMERA_PERMISSION_LABEL}</Text>
                <TouchableOpacity
                  style={styles.cameraPermissionButton}
                  onPress={() => {
                    void requestCameraPermission();
                  }}
                  activeOpacity={0.8}
                  testID="request-camera-permission-button"
                >
                  <Text style={styles.cameraPermissionButtonText}>{CAMERA_PERMISSION_BUTTON_LABEL}</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0520',
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(200, 190, 220, 0.8)',
    marginBottom: 10,
    marginTop: 4,
  },
  imageUploadArea: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderStyle: 'dashed' as const,
    overflow: 'hidden',
    marginBottom: 24,
    minHeight: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  uploadButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#c4b5fd',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 120,
    marginBottom: 24,
    lineHeight: 22,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '23%' as any,
    minWidth: 72,
  },
  moodTagActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderColor: 'rgba(124, 58, 237, 0.6)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(200, 190, 220, 0.6)',
  },
  moodLabelActive: {
    color: '#ffffff',
  },
  createButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#05010f',
  },
  cameraModalBackground: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  cameraModalHeader: {
    gap: 14,
    marginBottom: 20,
  },
  cameraHeaderButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cameraHeaderButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cameraHeaderCopy: {
    gap: 6,
  },
  cameraModalTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  cameraModalSubtitle: {
    color: 'rgba(213, 201, 255, 0.72)',
    fontSize: 14,
    lineHeight: 20,
  },
  cameraShell: {
    flex: 1,
    gap: 16,
  },
  cameraPreview: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.24)',
    backgroundColor: '#140826',
  },
  cameraFooter: {
    paddingTop: 4,
  },
  cameraCaptureButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  cameraCaptureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 24,
  },
  cameraCaptureText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  cameraPermissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 18,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
  },
  cameraPermissionText: {
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  cameraPermissionButton: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(124, 58, 237, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.24)',
  },
  cameraPermissionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
