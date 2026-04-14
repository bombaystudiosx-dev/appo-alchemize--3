import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDE_DURATION = 5000;

export default function SlideshowScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: manifestations = [] } = useQuery({
    queryKey: ['manifestations'],
    queryFn: () => manifestationsDb.getAll(),
  });

  const allImages: { uri: string; title: string; intention: string }[] = [];
  manifestations.forEach((manifestation) => {
    manifestation.images.forEach((imageUri) => {
      allImages.push({
        uri: imageUri,
        title: manifestation.title,
        intention: manifestation.intention,
      });
    });
  });

  const animateTransition = useCallback((callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 300);
  }, [fadeAnim]);

  const handleNext = useCallback(() => {
    if (allImages.length === 0) return;
    animateTransition(() => {
      setCurrentIndex((prev) => (prev + 1) % allImages.length);
    });
  }, [allImages.length, animateTransition]);

  const handlePrevious = useCallback(() => {
    if (allImages.length === 0) return;
    animateTransition(() => {
      setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    });
  }, [allImages.length, animateTransition]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying && allImages.length > 0) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, SLIDE_DURATION);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentIndex, allImages.length, handleNext]);

  if (allImages.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No images to display</Text>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentImage = allImages[currentIndex];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          source={{ uri: currentImage.uri }}
          style={styles.image}
          contentFit="contain"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeIconButton} onPress={() => router.back()}>
              <X color="#ffffff" size={28} />
            </TouchableOpacity>
            <Text style={styles.counter}>
              {currentIndex + 1} / {allImages.length}
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{currentImage.title}</Text>
              {currentImage.intention && (
                <Text style={styles.intention}>{currentImage.intention}</Text>
              )}
            </View>

            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlButton} onPress={handlePrevious}>
                <ChevronLeft color="#ffffff" size={32} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
                {isPlaying ? (
                  <Pause color="#ffffff" size={32} fill="#ffffff" />
                ) : (
                  <Play color="#ffffff" size={32} fill="#ffffff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={handleNext}>
                <ChevronRight color="#ffffff" size={32} />
              </TouchableOpacity>
            </View>

            <View style={styles.progressContainer}>
              {allImages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  closeIconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  counter: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  textContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  intention: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginBottom: 24,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 28,
    padding: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
