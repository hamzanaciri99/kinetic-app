import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { SmoothLineChart } from '../components/SmoothLineChart';
import { LabelCaps, H2, H3, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { useWorkouts } from '../context/WorkoutContext';
import { analyzeTrend } from '../utils/geminiTrendSummary';

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).toUpperCase();
}

export function WorkoutHistoryScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { exerciseNames, exerciseHistory } = useWorkouts();
  const [selectedExercise, setSelectedExercise] = React.useState<string | null>(exerciseNames[0] ?? null);

  React.useEffect(() => {
    if (selectedExercise === null && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  const history = selectedExercise ? exerciseHistory(selectedExercise) : [];
  const weightedHistory = history.filter((h) => h.weightKg !== null) as (typeof history[number] & { weightKg: number })[];
  const points = weightedHistory.map((h) => h.weightKg);
  const labels = weightedHistory.map((h) => formatTimestamp(h.date));

  const first = weightedHistory[0]?.weightKg;
  const last = weightedHistory[weightedHistory.length - 1]?.weightKg;
  const change = first !== undefined && last !== undefined ? last - first : 0;
  const trendingUp = change >= 0;

  const [aiSummary, setAiSummary] = React.useState<string | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedExercise || weightedHistory.length === 0) {
      setAiSummary(null);
      setAiError(null);
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    setAiSummary(null);
    setAiError(null);
    setAiLoading(true);

    const trendPoints = weightedHistory.map((h, i) => ({ label: labels[i], value: h.weightKg }));

    analyzeTrend(`${selectedExercise} working weight`, 'kg', 'logged sessions', trendPoints)
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
  }, [selectedExercise, JSON.stringify(points)]);

  return (
    <View className="flex-1 bg-background">
      <View
        className="w-full flex-row items-center gap-2 border-b border-white/10 bg-surface/95 px-margin-mobile"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <H2>Exercise History</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          <LabelCaps>CATEGORIZED BY EXERCISE</LabelCaps>
          {exerciseNames.length === 0 ? (
            <GlassCard className="items-center p-lg">
              <BodyText className="text-on-surface-variant">Log a workout with exercises to build your history.</BodyText>
            </GlassCard>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {exerciseNames.map((name) => {
                const active = name === selectedExercise;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setSelectedExercise(name)}
                    className={`rounded-full border px-4 py-2 active:opacity-70 ${
                      active ? 'border-primary-container bg-primary-container' : 'border-white/10 bg-surface-container'
                    }`}
                  >
                    <Text
                      className="text-[12px] uppercase tracking-wider"
                      style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1, color: active ? colors.onPrimaryContainer : colors.onSurfaceVariant }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {selectedExercise ? (
          <>
            <GlassCard className="p-md" style={{ gap: 16 }}>
              <View className="flex-row items-center justify-between">
                <View>
                  <LabelCaps>WORKING WEIGHT</LabelCaps>
                  <H3 className="mt-1">{selectedExercise}</H3>
                </View>
                {weightedHistory.length > 1 ? (
                  <View className="flex-row items-center gap-1">
                    <MaterialIcons name={trendingUp ? 'trending-up' : 'trending-down'} size={20} color={trendingUp ? colors.electricLime : colors.cyberBlue} />
                    <LabelCaps style={{ color: trendingUp ? colors.electricLime : colors.cyberBlue }}>
                      {change === 0 ? 'STEADY' : `${change > 0 ? '+' : ''}${change.toFixed(0)} KG`}
                    </LabelCaps>
                  </View>
                ) : null}
              </View>

              {points.length > 0 ? (
                <>
                  <SmoothLineChart points={points} height={140} color={colors.electricLime} />
                  <View className="flex-row flex-wrap justify-between" style={{ rowGap: 4 }}>
                    {labels.map((label, i) => (
                      <Text
                        key={`${label}-${i}`}
                        className="text-[9px] uppercase text-on-surface-variant"
                        style={{ fontFamily: 'Inter_400Regular', letterSpacing: 0.5, width: '24%' }}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>
                </>
              ) : (
                <BodyText className="text-on-surface-variant">No logged sets with a working weight for this exercise yet.</BodyText>
              )}
            </GlassCard>

            <GlassCard className="flex-row items-start gap-3 border border-white/5 p-md">
              <View className="mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-primary-container/20">
                <MaterialIcons name="auto-awesome" size={14} color={colors.electricLime} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <LabelCaps style={{ color: colors.electricLime }}>AI TREND SUMMARY</LabelCaps>
                {aiLoading ? (
                  <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    Analyzing your {selectedExercise.toLowerCase()} progression…
                  </Text>
                ) : aiError ? (
                  <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    {aiError}
                  </Text>
                ) : aiSummary ? (
                  <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                    {aiSummary}
                  </Text>
                ) : (
                  <Text className="text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    Log this exercise with a working weight (e.g. "4 x 6 @ 100kg") to get an AI summary of your progress.
                  </Text>
                )}
              </View>
            </GlassCard>

            <View style={{ gap: 12 }}>
              <H3>LOGGED SESSIONS</H3>
              <GlassCard className="overflow-hidden p-0">
                <View className="flex-row items-center justify-between border-b border-white/5 bg-surface-container-high px-md py-3">
                  <LabelCaps>RECORDED</LabelCaps>
                  <LabelCaps>SETS x REPS @ WEIGHT</LabelCaps>
                </View>
                {history.length === 0 ? (
                  <View className="px-md py-4">
                    <BodyText className="text-on-surface-variant">No sessions logged yet.</BodyText>
                  </View>
                ) : (
                  history
                    .slice()
                    .reverse()
                    .map((entry, i) => (
                      <View
                        key={`${entry.workoutId}-${i}`}
                        className="flex-row items-center justify-between px-md py-3"
                        style={{ borderBottomWidth: i === history.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}
                      >
                        <View>
                          <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                            {entry.workoutName}
                          </Text>
                          <Text className="text-[11px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                            {formatTimestamp(entry.date)}
                          </Text>
                        </View>
                        <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                          {entry.detail.toUpperCase()}
                        </Text>
                      </View>
                    ))
                )}
              </GlassCard>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
