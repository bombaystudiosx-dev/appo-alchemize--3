export const IMAGE_CONFIG = {
  cachePolicy: 'memory-disk' as const,
  priority: 'high' as const,
  recyclingKey: 'alchemize-images',
  placeholderContentFit: 'cover' as const,
  transition: 200,
  contentFit: 'cover' as const,
};

export const CARD_IMAGE_CONFIG = {
  cachePolicy: 'memory-disk' as const,
  priority: 'high' as const,
  transition: 150,
  contentFit: 'cover' as const,
  recyclingKey: 'alchemize-cards',
};

export const OPTIMIZED_IMAGE_URLS = {
  homeBackground: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/naydnxf8x17oig8jrq47w',
  cosmicBackground: 'https://fv5-3.files.fm/thumb_show.php?i=7th7rn53er&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  manifestationBoardBg: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u',
  affirmationsCard: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/5xvh01k2ftwt4gog83jwy',
  goalsCard: 'https://fv5-4.files.fm/thumb_show.php?i=vekk3swk9c&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  habitsCard: 'https://fv5-5.files.fm/thumb_show.php?i=67bxj4nwpd&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  financialCard: 'https://fv5-4.files.fm/thumb_show.php?i=r42xd2aab8&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  calorieCard: 'https://fv5-3.files.fm/thumb_show.php?i=hshtzcda9e&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  todosCard: 'https://fv5-4.files.fm/thumb_show.php?i=qnpyxuvuy5&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  gratitudeCard: 'https://fv5-4.files.fm/thumb_show.php?i=zqm55g6gzg&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  fitnessCard: 'https://fv5-4.files.fm/thumb_show.php?i=yeepyn9ydx&view&v=1&PHPSESSID=562f76ae684b8b5e8507e14030e7af116d9c6724',
  appointmentsCard: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/q6xkbpb7jmofbuzgauyqz',
};

export async function preloadCriticalImages() {
  const { Image } = await import('expo-image');
  
  console.log('[ImagePreload] Starting aggressive image preload...');
  const criticalImages = [
    OPTIMIZED_IMAGE_URLS.homeBackground,
    OPTIMIZED_IMAGE_URLS.cosmicBackground,
    OPTIMIZED_IMAGE_URLS.manifestationBoardBg,
    OPTIMIZED_IMAGE_URLS.affirmationsCard,
    OPTIMIZED_IMAGE_URLS.goalsCard,
    OPTIMIZED_IMAGE_URLS.habitsCard,
    OPTIMIZED_IMAGE_URLS.financialCard,
    OPTIMIZED_IMAGE_URLS.calorieCard,
    OPTIMIZED_IMAGE_URLS.todosCard,
    OPTIMIZED_IMAGE_URLS.gratitudeCard,
    OPTIMIZED_IMAGE_URLS.fitnessCard,
    OPTIMIZED_IMAGE_URLS.appointmentsCard,
  ];
  
  try {
    const preloadPromises = criticalImages.map(async (uri, index) => {
      try {
        await Image.prefetch(uri, {
          cachePolicy: 'memory-disk',
        });
        console.log(`[ImagePreload] ✓ Image ${index + 1}/${criticalImages.length} loaded`);
        return true;
      } catch {
        console.warn(`[ImagePreload] ✗ Failed: ${uri.substring(0, 60)}...`);
        return false;
      }
    });
    
    await Promise.allSettled(preloadPromises);
    console.log('[ImagePreload] ✓ Preload complete');
  } catch (error) {
    console.warn('[ImagePreload] Error during preload:', error);
  }
}
