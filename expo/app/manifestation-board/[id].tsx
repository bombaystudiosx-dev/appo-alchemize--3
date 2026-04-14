import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Text, Dimensions, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X, Trash2, Camera, Upload } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MOOD_TAGS: { key: Manifestation['category']; label: string; emoji: string }[] = [
  { key: 'wealth', label: 'Wealth', emoji: '💰' },
  { key: 'love', label: 'Love', emoji: '💞' },
  { key: 'health', label: 'Health', emoji: '🌿' },
  { key: 'focus', label: 'Focus', emoji: '🎯' },
  { key: 'creativity', label: 'Creativity', emoji: '🎨' },
  { key: 'healing', label: 'Healing', emoji: '💫' },
];

const MOOD_EMOJI_MAP: Record<string, string> = {
  wealth: '💰',
  love: '💞',
  health: '🌿',
  focus: '🎯',
  creativity: '🎨',
  healing: '💫',
  career: '🎯',
  relationships: '💞',
  other: '✨',
};

export default function ManifestationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Manifestation['category']>('wealth');
  const [intention, setIntention] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const { data: manifestation } = useQuery({
    queryKey: ['manifestation', id],
    queryFn: () => manifestationsDb.getById(id!),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (manifestation) {
      setTitle(manifestation.title);
      setCategory(manifestation.category);
      setIntention(manifestation.intention);
      setImages(manifestation.images);
    }
  }, [manifestation]);

  const updateMutation = useMutation({
    mutationFn: (updated: Manifestation) => manifestationsDb.update(updated),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      void queryClient.invalidateQueries({ queryKey: ['manifestation', id] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (deleteId: string) => manifestationsDb.delete(deleteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      router.back();
    },
  });

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!manifestation) return;

    const updated: Manifestation = {
      ...manifestation,
      title: title.trim(),
      category,
      intention: intention.trim(),
      images,
      updatedAt: Date.now(),
    };
    updateMutation.mutate(updated);
  }, [title, category, intention, images, manifestation, updateMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Manifestation',
      'Are you sure you want to delete this manifestation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id!),
        },
      ]
    );
  }, [deleteMutation, id]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return false;
      }
    }
    return true;
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImages([result.assets[0].uri]);
      }
    } catch (error) {
      console.error('[ManifestationDetail] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [requestPermissions]);

  const handleTakePhoto = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not Available', 'Camera is not available on web.');
        return;
      }
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImages([result.assets[0].uri]);
      }
    } catch (error) {
      console.error('[ManifestationDetail] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  if (!manifestation) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0c0520', '#1a0a3e']} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (isEditing) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a3e', '#0c0520', '#0d1033']} style={styles.background}>
          <View style={styles.editHeader}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setIsEditing(false)}>
              <X color="#ffffff" size={22} />
              <Text style={styles.headerBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={handleSave}>
              <Save color="#a78bfa" size={22} />
              <Text style={[styles.headerBtnText, { color: '#a78bfa' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.editContent}>
            <Text style={styles.editLabel}>Title</Text>
            <TextInput
              style={styles.editInput}
              value={title}
              onChangeText={setTitle}
              placeholder="My manifestation..."
              placeholderTextColor="rgba(180,170,200,0.5)"
            />

            <Text style={styles.editLabel}>Intention</Text>
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={intention}
              onChangeText={setIntention}
              placeholder="Describe your intention..."
              placeholderTextColor="rgba(180,170,200,0.5)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.editLabel}>Mood Tag</Text>
            <View style={styles.editMoodGrid}>
              {MOOD_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag.key}
                  style={[styles.editMoodTag, category === tag.key && styles.editMoodTagActive]}
                  onPress={() => setCategory(tag.key)}
                >
                  <Text style={styles.editMoodEmoji}>{tag.emoji}</Text>
                  <Text style={[styles.editMoodLabel, category === tag.key && styles.editMoodLabelActive]}>
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.editLabel}>Vision Image</Text>
            <View style={styles.editImageButtons}>
              <TouchableOpacity style={styles.editImageBtn} onPress={handlePickImage}>
                <Upload color="#c4b5fd" size={20} />
                <Text style={styles.editImageBtnText}>Upload</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editImageBtn} onPress={handleTakePhoto}>
                <Camera color="#c4b5fd" size={20} />
                <Text style={styles.editImageBtnText}>Camera</Text>
              </TouchableOpacity>
            </View>

            {images.length > 0 && (
              <View style={styles.editImagePreviewWrap}>
                <Image source={{ uri: images[0] }} style={styles.editImagePreview} contentFit="cover" />
                <TouchableOpacity style={styles.editRemoveImg} onPress={() => setImages([])}>
                  <Trash2 color="#ffffff" size={16} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  const moodEmoji = MOOD_EMOJI_MAP[manifestation.category] ?? '✨';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0c0520', '#1a0a3e', '#0c0520']} style={styles.background}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.detailContent}>
          {manifestation.images.length > 0 ? (
            <View style={styles.heroImageContainer}>
              <Image
                source={{ uri: manifestation.images[0] }}
                style={styles.heroImage}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(12, 5, 32, 0.9)']}
                style={styles.heroGradient}
              />
            </View>
          ) : (
            <LinearGradient
              colors={['#4c1d95', '#6d28d9']}
              style={styles.heroPlaceholder}
            >
              <Text style={styles.heroInitial}>
                {manifestation.title.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}

          <View style={styles.detailInfo}>
            <View style={styles.detailCategoryRow}>
              <Text style={styles.detailMoodEmoji}>{moodEmoji}</Text>
              <Text style={styles.detailCategory}>
                {manifestation.category.charAt(0).toUpperCase() + manifestation.category.slice(1)}
              </Text>
            </View>
            <Text style={styles.detailTitle}>{manifestation.title}</Text>
            {manifestation.intention ? (
              <Text style={styles.detailIntention}>{manifestation.intention}</Text>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.detailActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
            <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.actionBtnGradient}>
              <Edit2 color="#ffffff" size={18} />
              <Text style={styles.actionBtnText}>Edit</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <View style={styles.deleteBtnInner}>
              <Trash2 color="#ef4444" size={18} />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#c4b5fd',
    fontSize: 16,
  },

  detailContent: {
    paddingBottom: 100,
  },
  heroImageContainer: {
    width: SCREEN_WIDTH,
    height: 340,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInitial: {
    fontSize: 64,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.4)',
  },
  detailInfo: {
    padding: 20,
  },
  detailCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  detailMoodEmoji: {
    fontSize: 16,
  },
  detailCategory: {
    fontSize: 13,
    color: '#a78bfa',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 14,
    lineHeight: 32,
  },
  detailIntention: {
    fontSize: 15,
    color: 'rgba(200, 190, 220, 0.8)',
    lineHeight: 23,
  },
  detailActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(12, 5, 32, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.15)',
  },
  editBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  deleteBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600' as const,
  },

  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.15)',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  headerBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  editContent: {
    padding: 20,
    paddingBottom: 40,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(200, 190, 220, 0.8)',
    marginBottom: 8,
    marginTop: 16,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  editTextArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  editMoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  editMoodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minWidth: 72,
  },
  editMoodTagActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderColor: 'rgba(124, 58, 237, 0.6)',
  },
  editMoodEmoji: {
    fontSize: 18,
  },
  editMoodLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(200, 190, 220, 0.6)',
  },
  editMoodLabelActive: {
    color: '#ffffff',
  },
  editImageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editImageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  editImageBtnText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  editImagePreviewWrap: {
    marginTop: 12,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  editImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  editRemoveImg: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderRadius: 14,
    padding: 6,
  },
});
