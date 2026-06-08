import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { FAB } from '../components/PrimaryButton';
import { SmoothLineChart } from '../components/SmoothLineChart';
import { InputModal } from '../components/InputModal';
import { LabelCaps, H2, H3, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { useBodyMetrics } from '../context/BodyMetricsContext';
import { analyzeTrend } from '../utils/geminiTrendSummary';

type Period = 'weekly' | 'monthly';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).toUpperCase();
}

export function WeightHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { weightEntries, addWeightEntry, removeWeightEntry, latestWeight, weeklySeries, monthlySeries } = useBodyMetrics();
  const [period, setPeriod] = React.useState<Period>('weekly');
  const [logVisible, setLogVisible] = React.useState(false);

  const series = period === 'weekly' ? weeklySeries : monthlySeries;
  const points = series.map((p) => p.kg);
  const labels = series.map((p) => formatDate(p.date));

  const first = series[0]?.kg;
  const last = series[series.length - 1]?.kg;
  const change = first !== undefined && last !== undefined ? last - first : 0;
  const trendingDown = change <= 0;

  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setAiSummary(null);
    setAiError(null);
    setAiLoading(true);

    const trendPoints = series.map((p, i) => ({ label: labels[i], value: p.kg }));
    const periodLabel = period === 'weekly' ? 'last 7 days' : 'last 30 days';

    analyzeTrend('body weight', 'kg', periodLabel, trendPoints)
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
  }, [period, JSON.stringify(points)]);

  const recentEntries = [...weightEntries].reverse().slice(0, 8);

  const handleRemove = (id: string, kg: number) => {
    Alert.alert('Remove Entry', `Remove the ${kg}kg entry from your weight log?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeWeightEntry(id) },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="w-full flex-row items-center gap-2 border-b border-white/10 bg-surface/95 px-margin-mobile"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <H2>Weight History</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-baseline gap-2">
          <H2>{latestWeight ? latestWeight.kg.toFixed(1) : '—'}</H2>
          <H3 className="text-on-surface-variant">kg</H3>
          <LabelCaps className="ml-2">CURRENT</LabelCaps>
        </View>

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
              <LabelCaps>{period === 'weekly' ? 'LAST 7 DAYS' : 'LAST 30 DAYS'}</LabelCaps>
              <H3 className="mt-1">Weight Trend</H3>
            </View>
            <View className="flex-row items-center gap-1">
              <MaterialIcons name={trendingDown ? 'trending-down' : 'trending-up'} size={20} color={trendingDown ? colors.electricLime : colors.cyberBlue} />
              <LabelCaps style={{ color: trendingDown ? colors.electricLime : colors.cyberBlue }}>
                {change === 0 ? 'STEADY' : `${change > 0 ? '+' : ''}${change.toFixed(1)} KG`}
              </LabelCaps>
            </View>
          </View>

          {points.length > 0 ? (
            <>
              <SmoothLineChart points={points} height={140} color={colors.cyberBlue} />
              <View className="flex-row justify-between">
                {labels.map((label, i) => (
                  <Text key={`${label}-${i}`} className="text-[10px] uppercase text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular', letterSpacing: 1 }}>
                    {label}
                  </Text>
                ))}
              </View>
            </>
          ) : (
            <BodyText className="text-on-surface-variant">No entries in this period yet — log a weigh-in to start your trend.</BodyText>
          )}
        </GlassCard>

        <View style={{ gap: 12 }}>
          <H3>RECENT ENTRIES</H3>
          <View style={{ gap: 8 }}>
            {recentEntries.length === 0 ? (
              <GlassCard className="items-center p-lg">
                <BodyText className="text-on-surface-variant">No weight entries yet.</BodyText>
              </GlassCard>
            ) : (
              recentEntries.map((entry) => (
                <Pressable key={entry.id} onPress={() => handleRemove(entry.id, entry.kg)} className="overflow-hidden rounded-xl active:opacity-80">
                  <GlassCard className="flex-row items-center justify-between p-gutter">
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-high">
                        <MaterialIcons name="monitor-weight" size={18} color={colors.cyberBlue} />
                      </View>
                      <LabelCaps>{formatDate(entry.date)}</LabelCaps>
                    </View>
                    <View className="flex-row items-baseline gap-1">
                      <H3>{entry.kg.toFixed(1)}</H3>
                      <BodyText className="text-on-surface-variant">kg</BodyText>
                    </View>
                  </GlassCard>
                </Pressable>
              ))
            )}
          </View>
          {recentEntries.length > 0 ? <BodyText className="text-on-surface-variant">Tap an entry to remove it.</BodyText> : null}
        </View>

        <GlassCard className="flex-row items-start gap-3 border border-white/5 p-md">
          <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
            <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <LabelCaps style={{ color: colors.electricLime }}>AI TREND SUMMARY</LabelCaps>
            {aiLoading ? (
              <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                Analyzing your weight trend…
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
          <H3>{period === 'weekly' ? 'DAILY VALUES' : 'WEEKLY VALUES'}</H3>
          <GlassCard className="overflow-hidden p-0">
            <View className="flex-row items-center justify-between border-b border-white/5 bg-surface-container-high px-md py-3">
              <LabelCaps>RECORDED</LabelCaps>
              <LabelCaps>WEIGHT</LabelCaps>
            </View>
            {series.map((point, i) => (
              <View
                key={`${point.date}-${i}`}
                className="flex-row items-center justify-between px-md py-3"
                style={{ borderBottomWidth: i === series.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
              >
                <View>
                  <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                    {labels[i]}
                  </Text>
                  <Text className="text-[11px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    {formatTimestamp(point.date)}
                  </Text>
                </View>
                <Text className="text-[14px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                  {point.kg.toFixed(1)} kg
                </Text>
              </View>
            ))}
          </GlassCard>
        </View>
      </ScrollView>

      <FAB icon="add" onPress={() => setLogVisible(true)} />

      <InputModal
        visible={logVisible}
        title="Log Weight"
        subtitle="Track your body weight to see your trend over time."
        fields={[{ key: 'kg', label: 'Weight (kg)', placeholder: 'e.g. 82.4', keyboardType: 'decimal-pad' }]}
        onSubmit={(values) => {
          const kg = parseFloat(values.kg);
          if (!Number.isFinite(kg) || kg <= 0) {
            Alert.alert('Invalid Weight', 'Please enter a valid weight in kilograms.');
            return;
          }
          addWeightEntry(kg);
        }}
        onClose={() => setLogVisible(false)}
      />
    </View>
  );
}
