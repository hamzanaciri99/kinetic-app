import React from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../components/TopAppBar';
import { GlassCard } from '../components/GlassCard';
import { LabelCaps, H1, H3 } from '../components/Labels';
import { colors } from '../theme/colors';
import { useCategories } from '../context/CategoriesContext';
import { useGallery } from '../context/GalleryContext';
import { pickProgressPhoto } from '../utils/imagePicker';
import { PhotoLightboxModal } from '../components/PhotoLightboxModal';
import { uriToBase64 } from '../utils/imageToBase64';
import { analyzeProgressComparison } from '../utils/geminiProgressCompare';

export function GalleryOverviewScreen() {
  const navigation = useNavigation<any>();
  const { categories } = useCategories();
  const { timeline, compare, addCapture: addCaptureToGallery, setCompareImage, toggleFeatured } = useGallery();
  const [view, setView] = React.useState<'grid' | 'calendar'>('grid');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [categorizingImage, setCategorizingImage] = React.useState<string | null>(null);
  const [comparePickerSlot, setComparePickerSlot] = React.useState<'before' | 'after' | null>(null);
  const [lightboxUri, setLightboxUri] = React.useState<string | null>(null);
  const [aiDescription, setAiDescription] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setAiDescription(null);
    setAiError(null);
    setAiLoading(true);

    (async () => {
      try {
        const [beforeBase64, afterBase64] = await Promise.all([uriToBase64(compare.before), uriToBase64(compare.after)]);
        if (cancelled) return;
        const description = await analyzeProgressComparison(beforeBase64, afterBase64);
        if (cancelled) return;
        setAiDescription(description);
      } catch (err) {
        if (cancelled) return;
        setAiError(err instanceof Error ? err.message : 'Could not generate an AI comparison right now.');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [compare.before, compare.after]);

  const addCapture = (image: string, category?: string) => {
    addCaptureToGallery(image, category);
    Alert.alert('Capture Added', 'Your new progress photo has been added to the timeline.');
  };

  const handleNewCapture = async () => {
    const uri = await pickProgressPhoto();
    if (!uri) return;
    if (categories.length === 0) {
      addCapture(uri);
      return;
    }
    setCategorizingImage(uri);
  };

  const handlePickCategory = (category: string | null) => {
    const image = categorizingImage;
    setCategorizingImage(null);
    if (!image) return;
    addCapture(image, category ?? undefined);
  };

  const handlePickCompareImage = (image: string) => {
    const slot = comparePickerSlot;
    setComparePickerSlot(null);
    if (!slot) return;
    setCompareImage(slot, image);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I've logged ${timeline.length} progress entries on Kinetic 💪`,
      });
    } catch {
      Alert.alert('Share Failed', 'Something went wrong while sharing your progress.');
    }
  };

  const filteredTimeline = activeCategory ? timeline.filter((item) => item.category === activeCategory) : timeline;

  const handleViewToggle = (next: 'grid' | 'calendar') => {
    setView(next);
    if (next === 'calendar') {
      Alert.alert('Calendar View', 'Calendar layout is coming soon — showing grid view for now.');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <TopAppBar onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Overview header */}
        <View style={{ gap: 16 }}>
          <View className="flex-row items-end justify-between">
            <View>
              <LabelCaps className="mb-1">GALLERY OVERVIEW</LabelCaps>
              <View className="flex-row items-baseline gap-2">
                <H1>{timeline.length}</H1>
                <H3 style={{ color: colors.electricLime }}>Entries</H3>
              </View>
            </View>
            <Pressable
              onPress={handleNewCapture}
              className="flex-row items-center gap-2 rounded-lg bg-primary-container px-md py-sm active:scale-95"
              style={{ shadowColor: colors.electricLimeDim, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}
            >
              <MaterialIcons name="add-a-photo" size={18} color={colors.onPrimary} />
              <Text
                className="text-[11px] uppercase tracking-wider text-on-primary"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.4 }}
              >
                New Capture
              </Text>
            </Pressable>
          </View>

          {/* Compare split-view card */}
          <Pressable
            onPress={() => navigation.navigate('ProgressAnalysis', { before: compare.before, after: compare.after })}
            className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/10 bg-surface-container active:opacity-90"
          >
            <View className="absolute inset-0 flex-row">
              <View className="relative w-1/2 overflow-hidden border-r border-primary-container/30">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setLightboxUri(compare.before);
                  }}
                >
                  <Image source={{ uri: compare.before }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setComparePickerSlot('before');
                  }}
                  className="absolute bottom-base left-base flex-row items-center gap-1 rounded-sm border border-white/10 bg-surface-container-lowest/80 px-base py-xs active:opacity-70"
                >
                  <LabelCaps className="text-on-surface">BEFORE</LabelCaps>
                  <MaterialIcons name="edit" size={12} color={colors.onSurface} />
                </Pressable>
              </View>
              <View className="relative w-1/2 overflow-hidden">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setLightboxUri(compare.after);
                  }}
                >
                  <Image source={{ uri: compare.after }} className="h-full w-full" resizeMode="cover" />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    setComparePickerSlot('after');
                  }}
                  className="absolute bottom-base right-base flex-row items-center gap-1 rounded-sm border border-white/10 bg-primary-container px-base py-xs active:opacity-70"
                >
                  <LabelCaps className="text-on-primary">AFTER</LabelCaps>
                  <MaterialIcons name="edit" size={12} color={colors.onPrimary} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => navigation.navigate('ProgressAnalysis', { before: compare.before, after: compare.after })}
              className="absolute top-base flex-row items-center gap-1.5 self-center rounded-full bg-primary-container px-md py-xs active:scale-95"
              style={{ shadowColor: colors.electricLimeDim, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 }}
            >
              <MaterialIcons name="auto-awesome" size={14} color={colors.onPrimaryContainer} />
              <LabelCaps style={{ color: colors.onPrimaryContainer }} className="tracking-widest">
                AI COMPARISON
              </LabelCaps>
              <MaterialIcons name="chevron-right" size={14} color={colors.onPrimaryContainer} />
            </Pressable>

            <View
              className="absolute inset-y-0 left-1/2 w-0.5 -ml-px"
              style={{ backgroundColor: 'rgba(199,243,0,0.8)', shadowColor: colors.electricLime, shadowOpacity: 0.6, shadowRadius: 10 }}
            >
              <View className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary-container">
                <MaterialIcons name="unfold-more" size={16} color={colors.onPrimary} />
              </View>
            </View>
          </Pressable>

          <GlassCard className="flex-row items-start gap-3 border border-white/5 p-md">
            <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
              <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <LabelCaps style={{ color: colors.electricLime }}>AI-GENERATED COMPARISON</LabelCaps>
              {aiLoading ? (
                <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Analyzing your before &amp; after photos…
                </Text>
              ) : aiError ? (
                <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  {aiError}
                </Text>
              ) : (
                <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                  {aiDescription}
                </Text>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Social share bar */}
        <GlassCard className="flex-row items-center justify-between border border-white/5 bg-surface-container-high p-md">
          <View className="flex-row items-center gap-sm" style={{ flexShrink: 1 }}>
            <MaterialIcons name="rocket-launch" size={22} color={colors.secondaryFixed} />
            <View style={{ flexShrink: 1 }}>
              <LabelCaps className="text-on-surface">POST TO COMMUNITY</LabelCaps>
              <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                Share your transformation with the community
              </Text>
            </View>
          </View>
          <Pressable
            onPress={handleShare}
            className="rounded-lg border px-md py-sm active:opacity-80"
            style={{ borderColor: colors.secondaryFixed }}
          >
            <Text
              className="text-[11px] uppercase tracking-wider"
              style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.2, color: colors.secondaryFixed }}
            >
              Share Progress
            </Text>
          </Pressable>
        </GlassCard>

        {/* Timeline grid */}
        <View style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <H3 className="text-primary">TIMELINE</H3>
            <View className="flex-row gap-1">
              <Pressable
                onPress={() => handleViewToggle('grid')}
                className={`h-8 w-8 items-center justify-center rounded active:opacity-80 ${view === 'grid' ? 'bg-surface-container-highest' : ''}`}
              >
                <MaterialIcons name="grid-view" size={18} color={view === 'grid' ? colors.electricLime : colors.onSurfaceVariant} />
              </Pressable>
              <Pressable
                onPress={() => handleViewToggle('calendar')}
                className={`h-8 w-8 items-center justify-center rounded active:opacity-80 ${view === 'calendar' ? 'bg-surface-container-highest' : ''}`}
              >
                <MaterialIcons name="calendar-today" size={18} color={view === 'calendar' ? colors.electricLime : colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>

          {categories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Pressable
                onPress={() => setActiveCategory(null)}
                className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                  activeCategory === null ? 'border-primary-container bg-primary-container' : 'border-white/10 bg-surface-container'
                }`}
              >
                <Text
                  className="text-[11px] uppercase tracking-wider"
                  style={{
                    fontFamily: 'Inter_700Bold',
                    letterSpacing: 1,
                    color: activeCategory === null ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                  }}
                >
                  All
                </Text>
              </Pressable>
              {categories.map((category) => {
                const active = category === activeCategory;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setActiveCategory(category)}
                    className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                      active ? 'border-primary-container bg-primary-container' : 'border-white/10 bg-surface-container'
                    }`}
                  >
                    <Text
                      className="text-[11px] uppercase tracking-wider"
                      style={{
                        fontFamily: 'Inter_700Bold',
                        letterSpacing: 1,
                        color: active ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                      }}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          <View className="flex-row flex-wrap gap-1">
            {filteredTimeline.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setLightboxUri(item.image)}
                className="relative aspect-square overflow-hidden rounded-sm bg-surface-container-low"
                style={{ width: '32.6%' }}
              >
                <Image source={{ uri: item.image }} className="h-full w-full" resizeMode="cover" style={{ opacity: item.featured ? 1 : 0.85 }} />
                {item.featured ? (
                  <View className="absolute inset-0" style={{ backgroundColor: 'rgba(199,243,0,0.18)', borderWidth: 2, borderColor: colors.electricLime }} />
                ) : null}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleFeatured(item.id);
                  }}
                  hitSlop={6}
                  className="absolute left-1 top-1 h-6 w-6 items-center justify-center rounded-full active:scale-90"
                  style={{ backgroundColor: 'rgba(19,19,19,0.55)' }}
                >
                  <MaterialIcons
                    name={item.featured ? 'star' : 'star-border'}
                    size={14}
                    color={item.featured ? colors.electricLime : colors.onSurface}
                  />
                </Pressable>
                {item.category ? (
                  <View className="absolute right-1 top-1 rounded-sm px-1" style={{ backgroundColor: 'rgba(19,19,19,0.8)' }}>
                    <Text className="text-[8px] uppercase" style={{ fontFamily: 'Inter_700Bold', color: colors.onSurface, letterSpacing: 0.6 }}>
                      {item.category}
                    </Text>
                  </View>
                ) : null}
                <View
                  className="absolute bottom-1 right-1 rounded-sm px-1"
                  style={{ backgroundColor: item.featured ? colors.electricLime : 'rgba(19,19,19,0.8)' }}
                >
                  <Text
                    className="text-[8px]"
                    style={{ fontFamily: 'Inter_700Bold', color: item.featured ? colors.onPrimary : colors.onSurface }}
                  >
                    {item.date}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={categorizingImage !== null} transparent animationType="fade" onRequestClose={() => handlePickCategory(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable className="flex-1 justify-end bg-black/60" onPress={() => handlePickCategory(null)}>
            <Pressable
              className="rounded-t-2xl border border-white/10 bg-surface-container-high p-margin-mobile"
              style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, gap: 16, paddingBottom: 32 }}
              onPress={(e) => e.stopPropagation()}
            >
              <View>
                <H3>Categorize Photo</H3>
                <Text className="mt-1 text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Which muscle group does this progress photo belong to?
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => (
                  <Pressable
                    key={category}
                    onPress={() => handlePickCategory(category)}
                    className="rounded-full border border-white/10 bg-surface-container px-3 py-1.5 active:opacity-70"
                  >
                    <Text
                      className="text-[11px] uppercase tracking-wider text-on-surface"
                      style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}
                    >
                      {category}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => handlePickCategory(null)}
                className="h-12 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
              >
                <Text
                  className="text-[13px] uppercase tracking-[2px] text-on-surface-variant"
                  style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                >
                  Skip
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={comparePickerSlot !== null} transparent animationType="fade" onRequestClose={() => setComparePickerSlot(null)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setComparePickerSlot(null)}>
          <Pressable
            className="rounded-t-2xl border border-white/10 bg-surface-container-high p-margin-mobile"
            style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, gap: 16, maxHeight: '80%' }}
            onPress={(e) => e.stopPropagation()}
          >
            <View>
              <H3>Choose {comparePickerSlot === 'after' ? 'After' : 'Before'} Photo</H3>
              <Text className="mt-1 text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                Pick an entry from your timeline to highlight at the top of your gallery.
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap gap-1" style={{ paddingBottom: 24 }}>
                {timeline.map((item) => {
                  const selected = item.image === compare[comparePickerSlot ?? 'before'];
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handlePickCompareImage(item.image)}
                      className="relative aspect-square overflow-hidden rounded-sm bg-surface-container-low active:opacity-80"
                      style={{ width: '32.6%' }}
                    >
                      <Image source={{ uri: item.image }} className="h-full w-full" resizeMode="cover" style={{ opacity: selected ? 1 : 0.85 }} />
                      {selected ? (
                        <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(199,243,0,0.18)', borderWidth: 2, borderColor: colors.electricLime }}>
                          <MaterialIcons name="check-circle" size={22} color={colors.electricLime} />
                        </View>
                      ) : null}
                      <View className="absolute bottom-1 right-1 rounded-sm px-1" style={{ backgroundColor: 'rgba(19,19,19,0.8)' }}>
                        <Text className="text-[8px]" style={{ fontFamily: 'Inter_700Bold', color: colors.onSurface }}>
                          {item.date}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setComparePickerSlot(null)}
              className="h-12 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
              style={{ marginBottom: 16 }}
            >
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-surface-variant"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <PhotoLightboxModal visible={lightboxUri !== null} uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </View>
  );
}
