import React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { LabelCaps, H2, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { PhotoLightboxModal } from '../components/PhotoLightboxModal';
import { useBodyMetrics } from '../context/BodyMetricsContext';
import { useNutrition } from '../context/NutritionContext';
import { useWorkouts } from '../context/WorkoutContext';
import { uriToBase64 } from '../utils/imageToBase64';
import { analyzeProgressInDepth, ProgressAnalysis } from '../utils/geminiProgressCompare';

const DAY_MS = 24 * 60 * 60 * 1000;

const SECTIONS: { key: keyof ProgressAnalysis; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] = [
  { key: 'physiqueChange', icon: 'auto-awesome', label: 'PHYSIQUE CHANGE' },
  { key: 'focusAssessment', icon: 'track-changes', label: 'WHERE TO FOCUS' },
  { key: 'dietAndTrainingFeedback', icon: 'restaurant', label: 'DIET & TRAINING FEEDBACK' },
];

export function ProgressAnalysisScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { before, after } = route.params as { before: string; after: string };

  const { latestWeight, weeklySeries, monthlySeries } = useBodyMetrics();
  const { dailyTotals, dailyCalorieTarget } = useNutrition();
  const { workouts } = useWorkouts();

  const [lightboxUri, setLightboxUri] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<ProgressAnalysis | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const now = Date.now();
    const last7Workouts = workouts.filter((w) => now - new Date(w.loggedAt).getTime() <= 7 * DAY_MS);
    const last30Workouts = workouts.filter((w) => now - new Date(w.loggedAt).getTime() <= 30 * DAY_MS);
    const last7Totals = dailyTotals.filter((d) => now - new Date(d.date).getTime() <= 7 * DAY_MS);
    const last30Totals = dailyTotals.filter((d) => now - new Date(d.date).getTime() <= 30 * DAY_MS);
    const avgKcal7 = last7Totals.length ? Math.round(last7Totals.reduce((s, d) => s + d.kcal, 0) / last7Totals.length) : null;
    const avgKcal30 = last30Totals.length ? Math.round(last30Totals.reduce((s, d) => s + d.kcal, 0) / last30Totals.length) : null;
    const weekWeightChange = weeklySeries.length > 1 ? weeklySeries[weeklySeries.length - 1].kg - weeklySeries[0].kg : null;
    const monthWeightChange = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 1].kg - monthlySeries[0].kg : null;

    const context = [
      latestWeight ? `Current body weight: ${latestWeight.kg.toFixed(1)} kg.` : 'No body weight logged yet.',
      weekWeightChange !== null ? `Body weight changed ${weekWeightChange >= 0 ? '+' : ''}${weekWeightChange.toFixed(1)} kg over the last 7 days.` : '',
      monthWeightChange !== null ? `Changed ${monthWeightChange >= 0 ? '+' : ''}${monthWeightChange.toFixed(1)} kg over the last 30 days.` : '',
      last7Workouts.length
        ? `Training: ${last7Workouts.length} session(s) in the last 7 days (${last7Workouts.map((w) => w.name).join(', ')}) and ${last30Workouts.length} session(s) in the last 30 days.`
        : `Training: no sessions logged in the last 7 days, ${last30Workouts.length} session(s) in the last 30 days.`,
      avgKcal7 !== null
        ? `Nutrition: averaged ${avgKcal7} kcal/day over the last 7 days against a ${dailyCalorieTarget} kcal daily target.`
        : 'Nutrition: no meals logged in the last 7 days.',
      avgKcal30 !== null ? `Averaged ${avgKcal30} kcal/day over the last 30 days.` : '',
    ]
      .filter(Boolean)
      .join(' ');

    let cancelled = false;
    setAnalysis(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const [beforeBase64, afterBase64] = await Promise.all([uriToBase64(before), uriToBase64(after)]);
        if (cancelled) return;
        const result = await analyzeProgressInDepth(beforeBase64, afterBase64, context);
        if (cancelled) return;
        setAnalysis(result);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not generate an AI analysis right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [before, after]);

  return (
    <View className="flex-1 bg-background">
      <View
        className="w-full flex-row items-center gap-2 border-b border-white/10 bg-surface/95 px-margin-mobile"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <H2>Progress Analysis</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/10 bg-surface-container">
          <View className="absolute inset-0 flex-row">
            <Pressable className="relative w-1/2 overflow-hidden border-r border-primary-container/30" onPress={() => setLightboxUri(before)}>
              <Image source={{ uri: before }} className="h-full w-full" resizeMode="cover" />
              <View className="absolute bottom-base left-base rounded-sm border border-white/10 bg-surface-container-lowest/80 px-base py-xs">
                <LabelCaps className="text-on-surface">BEFORE</LabelCaps>
              </View>
            </Pressable>
            <Pressable className="relative w-1/2 overflow-hidden" onPress={() => setLightboxUri(after)}>
              <Image source={{ uri: after }} className="h-full w-full" resizeMode="cover" />
              <View className="absolute bottom-base right-base rounded-sm border border-white/10 bg-primary-container px-base py-xs">
                <LabelCaps className="text-on-primary">AFTER</LabelCaps>
              </View>
            </Pressable>
          </View>

          <View className="absolute top-base flex-row items-center gap-1 self-center rounded-full border border-white/20 bg-surface/90 px-md py-xs">
            <MaterialIcons name="auto-awesome" size={12} color={colors.electricLime} />
            <LabelCaps className="tracking-widest text-primary">AI COMPARISON</LabelCaps>
          </View>

          <View
            className="absolute inset-y-0 left-1/2 w-0.5 -ml-px"
            style={{ backgroundColor: 'rgba(199,243,0,0.8)', shadowColor: colors.electricLime, shadowOpacity: 0.6, shadowRadius: 10 }}
          >
            <View className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary-container">
              <MaterialIcons name="unfold-more" size={16} color={colors.onPrimary} />
            </View>
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <LabelCaps style={{ color: colors.electricLime }}>FULL AI ANALYSIS</LabelCaps>

          {loading ? (
            <GlassCard className="flex-row items-center gap-3 border border-white/5 p-md">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
              </View>
              <BodyText className="text-on-surface-variant">Analyzing your photos against your training, diet, and weight history…</BodyText>
            </GlassCard>
          ) : error ? (
            <GlassCard className="flex-row items-center gap-3 border border-white/5 p-md">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                <MaterialIcons name="error-outline" size={14} color={colors.electricLime} />
              </View>
              <BodyText className="text-on-surface-variant">{error}</BodyText>
            </GlassCard>
          ) : analysis ? (
            SECTIONS.map((section) => (
              <GlassCard key={section.key} className="flex-row items-start gap-3 border border-white/5 p-md">
                <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                  <MaterialIcons name={section.icon} size={14} color={colors.electricLime} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <LabelCaps style={{ color: colors.electricLime }}>{section.label}</LabelCaps>
                  <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                    {analysis[section.key]}
                  </Text>
                </View>
              </GlassCard>
            ))
          ) : null}
        </View>
      </ScrollView>

      <PhotoLightboxModal visible={lightboxUri !== null} uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </View>
  );
}
