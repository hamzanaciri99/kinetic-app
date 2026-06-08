import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../components/TopAppBar';
import { GlassCard } from '../components/GlassCard';
import { ProgressRing } from '../components/ProgressRing';
import { PrimaryButton } from '../components/PrimaryButton';
import { LabelCaps, H1, H2, H3, StatDisplay, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { useBodyMetrics } from '../context/BodyMetricsContext';
import { useNutrition } from '../context/NutritionContext';
import { useWorkouts } from '../context/WorkoutContext';
import { SmoothLineChart } from '../components/SmoothLineChart';
import { generateCoachInsights, explainMetric, CoachInsights } from '../utils/geminiCoachInsights';

const MACRO_TARGETS = { protein: 180, carbs: 250, fat: 65 };
const DAY_MS = 24 * 60 * 60 * 1000;

function loadLabel(sessionsThisWeek: number): string {
  if (sessionsThisWeek === 0) return 'Resting';
  if (sessionsThisWeek <= 2) return 'Light';
  if (sessionsThisWeek <= 4) return 'Optimal';
  return 'High';
}

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { latestWeight, weeklySeries, monthlySeries } = useBodyMetrics();
  const { consumedToday, macroTotalsToday, dailyCalorieTarget, dailyTotals } = useNutrition();
  const { workouts } = useWorkouts();
  const weightPoints = weeklySeries.map((p) => p.kg);
  const trendingDown = weeklySeries.length > 1 && weeklySeries[weeklySeries.length - 1].kg <= weeklySeries[0].kg;

  const remaining = Math.max(0, dailyCalorieTarget - consumedToday);
  const remainingDisplay = remaining >= 1000 ? `${(remaining / 1000).toFixed(1)}k` : `${remaining}`;
  const kcalProgress = Math.min(1, dailyCalorieTarget > 0 ? consumedToday / dailyCalorieTarget : 0);
  const proteinProgress = Math.min(1, macroTotalsToday.protein / MACRO_TARGETS.protein);

  const now = Date.now();
  const last7Workouts = workouts.filter((w) => now - new Date(w.loggedAt).getTime() <= 7 * DAY_MS);
  const last30Workouts = workouts.filter((w) => now - new Date(w.loggedAt).getTime() <= 30 * DAY_MS);
  const lastWorkout = workouts[0] ?? null;
  const hoursSinceLastWorkout = lastWorkout ? (now - new Date(lastWorkout.loggedAt).getTime()) / (60 * 60 * 1000) : null;
  const recoveryPct = hoursSinceLastWorkout === null ? null : Math.max(10, Math.min(100, Math.round((hoursSinceLastWorkout / 48) * 100)));
  const trainingLoadLabel = loadLabel(last7Workouts.length);

  const last7Totals = dailyTotals.filter((d) => now - new Date(d.date).getTime() <= 7 * DAY_MS);
  const last30Totals = dailyTotals.filter((d) => now - new Date(d.date).getTime() <= 30 * DAY_MS);
  const avgKcal7 = last7Totals.length ? Math.round(last7Totals.reduce((s, d) => s + d.kcal, 0) / last7Totals.length) : null;
  const avgKcal30 = last30Totals.length ? Math.round(last30Totals.reduce((s, d) => s + d.kcal, 0) / last30Totals.length) : null;
  const weekWeightChange = weeklySeries.length > 1 ? weeklySeries[weeklySeries.length - 1].kg - weeklySeries[0].kg : null;
  const monthWeightChange = monthlySeries.length > 1 ? monthlySeries[monthlySeries.length - 1].kg - monthlySeries[0].kg : null;

  const insightsContext = [
    last7Workouts.length
      ? `Training: ${last7Workouts.length} session(s) in the last 7 days (${last7Workouts.map((w) => w.name).join(', ')}) and ${last30Workouts.length} session(s) in the last 30 days.`
      : `Training: no sessions logged in the last 7 days, ${last30Workouts.length} session(s) in the last 30 days.`,
    lastWorkout && hoursSinceLastWorkout !== null ? `Most recent session was about ${Math.round(hoursSinceLastWorkout)} hours ago.` : 'No workouts logged yet.',
    avgKcal7 !== null
      ? `Nutrition: averaged ${avgKcal7} kcal/day over the last 7 days against a ${dailyCalorieTarget} kcal daily target.`
      : 'Nutrition: no meals logged in the last 7 days.',
    avgKcal30 !== null ? `Averaged ${avgKcal30} kcal/day over the last 30 days.` : '',
    weekWeightChange !== null ? `Body weight: changed ${weekWeightChange >= 0 ? '+' : ''}${weekWeightChange.toFixed(1)} kg over the last 7 days.` : '',
    monthWeightChange !== null ? `Changed ${monthWeightChange >= 0 ? '+' : ''}${monthWeightChange.toFixed(1)} kg over the last 30 days.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const [insights, setInsights] = React.useState<CoachInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [insightsError, setInsightsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setInsights(null);
    setInsightsError(null);
    setInsightsLoading(true);

    generateCoachInsights(insightsContext)
      .then((result) => {
        if (!cancelled) setInsights(result);
      })
      .catch((err) => {
        if (!cancelled) setInsightsError(err instanceof Error ? err.message : 'Could not generate AI insights right now.');
      })
      .finally(() => {
        if (!cancelled) setInsightsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [insightsContext]);

  const [metricDetail, setMetricDetail] = React.useState<{ title: string; metricName: string; context: string } | null>(null);
  const [metricExplanation, setMetricExplanation] = React.useState<string | null>(null);
  const [metricLoading, setMetricLoading] = React.useState(false);
  const [metricError, setMetricError] = React.useState<string | null>(null);

  const openMetricDetail = (title: string, metricName: string, context: string) => {
    setMetricDetail({ title, metricName, context });
    setMetricExplanation(null);
    setMetricError(null);
    setMetricLoading(true);

    explainMetric(metricName, context)
      .then((explanation) => setMetricExplanation(explanation))
      .catch((err) => setMetricError(err instanceof Error ? err.message : 'Could not generate an AI explanation right now.'))
      .finally(() => setMetricLoading(false));
  };

  const recoveryContext = lastWorkout && hoursSinceLastWorkout !== null
    ? `Showing ${recoveryPct}% recovery, estimated from the ${Math.round(hoursSinceLastWorkout)} hours since the user's last logged session ("${lastWorkout.name}"). ${last7Workouts.length} session(s) logged in the last 7 days.`
    : 'No workouts have been logged yet, so recovery cannot be estimated from training data.';

  const trainingLoadContext = `Showing "${trainingLoadLabel}" training load, based on ${last7Workouts.length} session(s) logged in the last 7 days${
    last7Workouts.length ? ` (${last7Workouts.map((w) => w.name).join(', ')})` : ''
  } and ${last30Workouts.length} in the last 30 days.`;

  return (
    <View className="flex-1 bg-background">
      <TopAppBar onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Snapshot */}
        <View style={{ gap: 12 }}>
          <LabelCaps>DAILY SNAPSHOT</LabelCaps>
          <GlassCard className="items-center p-md">
            <ProgressRing
              size={232}
              strokeWidth={12}
              rings={[
                { progress: kcalProgress, color: colors.electricLimeDim, glowColor: colors.electricLimeDim },
                { progress: proteinProgress, color: colors.cyberBlue, glowColor: colors.cyberBlue },
              ]}
            >
              <StatDisplay className="text-[30px] leading-[30px] text-primary" style={{ color: colors.onSurface }}>
                {remainingDisplay}
              </StatDisplay>
              <LabelCaps className="mt-1">KCAL REMAINING</LabelCaps>
            </ProgressRing>

            <View className="mt-lg w-full flex-row justify-around">
              <View className="items-center">
                <H3 style={{ color: colors.electricLimeDim }}>{Math.round(macroTotalsToday.protein)}g</H3>
                <LabelCaps className="mt-1">PROTEIN</LabelCaps>
              </View>
              <View className="items-center">
                <H3 style={{ color: colors.cyberBlue }}>{Math.round(macroTotalsToday.carbs)}g</H3>
                <LabelCaps className="mt-1">CARBS</LabelCaps>
              </View>
              <View className="items-center">
                <H3 className="text-primary">{Math.round(macroTotalsToday.fat)}g</H3>
                <LabelCaps className="mt-1">FATS</LabelCaps>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Start Workout CTA */}
        <PrimaryButton label="Start Workout" onPress={() => navigation.navigate('Workouts')} />

        {/* Secondary grid */}
        <View style={{ gap: 16 }}>
          <Pressable onPress={() => navigation.navigate('WeightHistory')} className="overflow-hidden rounded-xl active:opacity-90">
            <GlassCard className="p-md" style={{ gap: 12 }}>
              <View className="flex-row items-center justify-between">
                <LabelCaps>RECENT WEIGHT</LabelCaps>
                <MaterialIcons name={trendingDown ? 'trending-down' : 'trending-up'} size={20} color={colors.cyberBlue} />
              </View>
              <View className="flex-row items-baseline gap-1">
                <H1>{latestWeight ? latestWeight.kg.toFixed(1) : '—'}</H1>
                <H3 className="text-on-surface-variant">kg</H3>
              </View>
              {weightPoints.length > 0 ? (
                <SmoothLineChart points={weightPoints} height={80} color={colors.cyberBlue} />
              ) : (
                <View className="h-20 w-full items-center justify-center">
                  <BodyText className="text-on-surface-variant">Log a weigh-in to see your trend.</BodyText>
                </View>
              )}
            </GlassCard>
          </Pressable>

          <GlassCard className="p-md" style={{ gap: 12 }}>
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
              </View>
              <LabelCaps style={{ color: colors.electricLime }}>AI INSIGHTS</LabelCaps>
            </View>

            {insightsLoading ? (
              <BodyText className="text-on-surface-variant">Reviewing your training, meals, and progress…</BodyText>
            ) : insightsError ? (
              <BodyText className="text-on-surface-variant">{insightsError}</BodyText>
            ) : insights ? (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 4 }}>
                  <LabelCaps>LAST 7 DAYS</LabelCaps>
                  <BodyText className="text-on-surface">{insights.weekSummary}</BodyText>
                </View>
                <View style={{ gap: 4 }}>
                  <LabelCaps>LAST 30 DAYS</LabelCaps>
                  <BodyText className="text-on-surface">{insights.monthSummary}</BodyText>
                </View>
                {insights.tips.length > 0 ? (
                  <View style={{ gap: 6 }}>
                    <LabelCaps style={{ color: colors.cyberBlue }}>TIPS</LabelCaps>
                    {insights.tips.map((tip, i) => (
                      <View key={i} className="flex-row items-start gap-2">
                        <MaterialIcons name="lightbulb" size={16} color={colors.cyberBlue} style={{ marginTop: 2 }} />
                        <BodyText className="flex-1 text-on-surface">{tip}</BodyText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <BodyText className="text-on-surface-variant">Log workouts, meals, and weigh-ins to get a personalized AI recap.</BodyText>
            )}
          </GlassCard>
        </View>

        {/* Weekly metrics */}
        <View style={{ gap: 12 }}>
          <LabelCaps>WEEKLY METRICS</LabelCaps>
          <View className="flex-row gap-gutter">
            <Pressable
              className="flex-1 active:opacity-80"
              onPress={() => openMetricDetail('Recovery', 'Recovery', recoveryContext)}
            >
              <GlassCard className="border-l-4 p-md" style={{ borderLeftColor: colors.electricLime, gap: 2 }}>
                <View className="flex-row items-center justify-between">
                  <LabelCaps>RECOVERY</LabelCaps>
                  <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
                </View>
                <H3 className="mt-1">{recoveryPct !== null ? `${recoveryPct}%` : '—'}</H3>
                <BodyText className="text-on-surface-variant" style={{ fontSize: 11 }}>Tap for AI detail</BodyText>
              </GlassCard>
            </Pressable>
            <Pressable
              className="flex-1 active:opacity-80"
              onPress={() => openMetricDetail('Training Load', 'Training Load', trainingLoadContext)}
            >
              <GlassCard className="border-l-4 p-md" style={{ borderLeftColor: colors.cyberBlue, gap: 2 }}>
                <View className="flex-row items-center justify-between">
                  <LabelCaps>TRAINING LOAD</LabelCaps>
                  <MaterialIcons name="auto-awesome" size={14} color={colors.cyberBlue} />
                </View>
                <H3 className="mt-1">{trainingLoadLabel}</H3>
                <BodyText className="text-on-surface-variant" style={{ fontSize: 11 }}>Tap for AI detail</BodyText>
              </GlassCard>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={metricDetail !== null} transparent animationType="fade" onRequestClose={() => setMetricDetail(null)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setMetricDetail(null)}>
          <Pressable
            className="rounded-t-2xl border border-white/10 bg-surface-container-high p-margin-mobile"
            style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, gap: 12, paddingBottom: 32 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
              </View>
              <H2>{metricDetail?.title ?? ''}</H2>
            </View>
            {metricLoading ? (
              <BodyText className="text-on-surface-variant">Analyzing what's behind this number…</BodyText>
            ) : metricError ? (
              <BodyText className="text-on-surface-variant">{metricError}</BodyText>
            ) : metricExplanation ? (
              <BodyText className="text-on-surface">{metricExplanation}</BodyText>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
