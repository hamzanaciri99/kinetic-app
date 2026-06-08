import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { SmoothLineChart } from '../components/SmoothLineChart';
import { LabelCaps, H2, H3, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { useNutrition } from '../context/NutritionContext';
import { dayKey } from '../utils/date';
import { analyzeTrend } from '../utils/geminiTrendSummary';

type Period = 'weekly' | 'monthly';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function buildWeeklySeries(dailyTotals: { date: string; kcal: number }[]) {
  const byDate = new Map(dailyTotals.map((d) => [d.date, d.kcal]));
  const points: number[] = [];
  const labels: string[] = [];
  const timestamps: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    points.push(byDate.get(dayKey(d)) ?? 0);
    labels.push(DAY_LABELS[d.getDay()]);
    timestamps.push(d.toISOString());
  }
  return { points, labels, timestamps };
}

function buildMonthlySeries(dailyTotals: { date: string; kcal: number }[]) {
  const byDate = new Map(dailyTotals.map((d) => [d.date, d.kcal]));
  const points: number[] = [];
  const labels: string[] = [];
  const timestamps: string[] = [];
  // 5 weekly buckets, oldest to newest, each averaging the 7 days within it.
  for (let week = 4; week >= 0; week--) {
    let sum = 0;
    let count = 0;
    for (let day = 6; day >= 0; day--) {
      const d = new Date();
      d.setDate(d.getDate() - week * 7 - day);
      const value = byDate.get(dayKey(d));
      if (value !== undefined) {
        sum += value;
        count += 1;
      }
    }
    points.push(count > 0 ? Math.round(sum / count) : 0);
    labels.push(week === 0 ? 'THIS WK' : `-${week}W`);
    // Anchor the bucket's timestamp to the most recent day within it (today - week*7).
    const anchor = new Date();
    anchor.setDate(anchor.getDate() - week * 7);
    timestamps.push(anchor.toISOString());
  }
  return { points, labels, timestamps };
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).toUpperCase();
}

export function NutritionHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { dailyTotals } = useNutrition();
  const [period, setPeriod] = React.useState<Period>('weekly');

  const series = period === 'weekly' ? buildWeeklySeries(dailyTotals) : buildMonthlySeries(dailyTotals);
  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setAiSummary(null);
    setAiError(null);
    setAiLoading(true);

    const points = series.labels.map((label, i) => ({ label, value: series.points[i] }));
    const periodLabel = period === 'weekly' ? 'last 7 days' : 'last 5 weeks';

    analyzeTrend('calorie intake', 'kcal', periodLabel, points)
      .then((summary) => {
        if (!cancelled) setAiSummary(summary);
      })
      .catch((err) => {
        if (!cancelled) setAiError(err instanceof Error ? err.message : 'Could not generate an AI summary right now.');
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, JSON.stringify(series.points)]);

  const nonZero = series.points.filter((p) => p > 0);
  const avg = nonZero.length > 0 ? Math.round(nonZero.reduce((sum, p) => sum + p, 0) / nonZero.length) : 0;
  const total = series.points.reduce((sum, p) => sum + p, 0);

  const firstHalf = series.points.slice(0, Math.ceil(series.points.length / 2));
  const secondHalf = series.points.slice(Math.ceil(series.points.length / 2));
  const firstAvg = firstHalf.length ? firstHalf.reduce((s, p) => s + p, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length ? secondHalf.reduce((s, p) => s + p, 0) / secondHalf.length : 0;
  const trendingUp = secondAvg >= firstAvg;

  return (
    <View className="flex-1 bg-background">
      <View
        className="w-full flex-row items-center gap-2 border-b border-white/10 bg-surface/95 px-margin-mobile"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <H2>Calorie History</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row gap-2 self-start rounded-full border border-white/10 bg-surface-container-high p-1">
          {(['weekly', 'monthly'] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: period === p ? colors.primaryContainer : 'transparent' }}
            >
              <Text
                className="text-[12px] uppercase tracking-wider"
                style={{
                  fontFamily: 'Inter_700Bold',
                  letterSpacing: 1.2,
                  color: period === p ? colors.onPrimaryContainer : colors.onSurfaceVariant,
                }}
              >
                {p === 'weekly' ? 'Weekly' : 'Monthly'}
              </Text>
            </Pressable>
          ))}
        </View>

        <GlassCard className="p-md" style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <View>
              <LabelCaps>{period === 'weekly' ? 'LAST 7 DAYS' : 'LAST 5 WEEKS'}</LabelCaps>
              <H3 className="mt-1">Calorie Trend</H3>
            </View>
            <View className="flex-row items-center gap-1">
              <MaterialIcons name={trendingUp ? 'trending-up' : 'trending-down'} size={20} color={trendingUp ? colors.electricLime : colors.cyberBlue} />
              <LabelCaps style={{ color: trendingUp ? colors.electricLime : colors.cyberBlue }}>{trendingUp ? 'TRENDING UP' : 'TRENDING DOWN'}</LabelCaps>
            </View>
          </View>

          <SmoothLineChart points={series.points} height={140} color={colors.electricLime} minValue={0} />

          <View className="flex-row justify-between">
            {series.labels.map((label, i) => (
              <Text key={`${label}-${i}`} className="text-[10px] uppercase text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular', letterSpacing: 1 }}>
                {label}
              </Text>
            ))}
          </View>

          <View className="flex-row justify-around border-t border-white/5 pt-4">
            <View className="items-center">
              <H3>{avg.toLocaleString()}</H3>
              <LabelCaps className="mt-1">AVG / DAY</LabelCaps>
            </View>
            <View className="items-center">
              <H3>{total.toLocaleString()}</H3>
              <LabelCaps className="mt-1">TOTAL KCAL</LabelCaps>
            </View>
          </View>
        </GlassCard>

        <BodyText className="text-on-surface-variant">
          This chart reflects the actual sum of calories logged each day in your chronicle — log meals consistently for a more complete trend.
        </BodyText>

        <GlassCard className="flex-row items-start gap-3 border border-white/5 p-md">
          <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
            <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <LabelCaps style={{ color: colors.electricLime }}>AI TREND SUMMARY</LabelCaps>
            {aiLoading ? (
              <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                Analyzing your calorie trend…
              </Text>
            ) : aiError ? (
              <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                {aiError}
              </Text>
            ) : (
              <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                {aiSummary}
              </Text>
            )}
          </View>
        </GlassCard>

        <View style={{ gap: 12 }}>
          <H3>{period === 'weekly' ? 'DAILY VALUES' : 'WEEKLY AVERAGES'}</H3>
          <GlassCard className="overflow-hidden p-0">
            <View className="flex-row items-center justify-between border-b border-white/5 bg-surface-container-high px-md py-3">
              <LabelCaps>RECORDED</LabelCaps>
              <LabelCaps>KCAL</LabelCaps>
            </View>
            {series.labels.map((label, i) => (
              <View
                key={`${label}-${i}`}
                className="flex-row items-center justify-between px-md py-3"
                style={{ borderBottomWidth: i === series.labels.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
              >
                <View>
                  <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                    {label}
                  </Text>
                  <Text className="text-[11px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    {formatTimestamp(series.timestamps[i])}
                  </Text>
                </View>
                <Text className="text-[14px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                  {series.points[i].toLocaleString()}
                </Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}
