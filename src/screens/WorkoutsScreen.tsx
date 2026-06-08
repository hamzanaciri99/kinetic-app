import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../components/TopAppBar';
import { GlassCard } from '../components/GlassCard';
import { SmoothLineChart } from '../components/SmoothLineChart';
import { Chip, FAB } from '../components/PrimaryButton';
import { WorkoutLogModal, LoggedWorkout } from '../components/WorkoutLogModal';
import { useWorkouts, WorkoutEntry } from '../context/WorkoutContext';
import { formatExerciseDetail } from '../data/workoutTemplates';
import { useBodyMetrics } from '../context/BodyMetricsContext';
import { LabelCaps, H1, H3, StatDisplay, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatWorkoutDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' }).toUpperCase().replace(',', ' •');
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

function formatVolume(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}M`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)}K`;
  return `${Math.round(kg)}`;
}

function weekStartMs(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

/** Counts consecutive most-recent weeks (including this week) that have at least one logged workout. */
function workoutStreakWeeks(workouts: WorkoutEntry[]): number {
  if (workouts.length === 0) return 0;
  const weeksWithWorkout = new Set(workouts.map((w) => weekStartMs(w.loggedAt)));
  let streak = 0;
  let cursor = weekStartMs(new Date().toISOString());
  while (weeksWithWorkout.has(cursor)) {
    streak += 1;
    cursor -= 7 * DAY_MS;
  }
  return streak;
}

export function WorkoutsScreen() {
  const navigation = useNavigation<any>();
  const { workouts, addWorkout, exerciseNames, exerciseHistory, totalVolumeKg } = useWorkouts();
  const { latestWeight, weeklySeries } = useBodyMetrics();
  const [workoutModalVisible, setWorkoutModalVisible] = React.useState(false);

  const handleLogWorkout = (workout: LoggedWorkout) => {
    addWorkout({ name: workout.name.toUpperCase(), exercises: workout.exercises });
    Alert.alert('Workout Logged', `"${workout.name}" was added to your workout log.`);
  };

  const showWorkoutDetail = (w: WorkoutEntry) => {
    const exerciseLines = w.exercises.length
      ? w.exercises.map((e) => `• ${e.name} — ${formatExerciseDetail(e)}`).join('\n')
      : 'No exercises logged for this session.';
    Alert.alert(w.name, `${formatWorkoutDate(w.loggedAt)}\n\nExercises\n${exerciseLines}`);
  };

  // Primary lift: whichever logged exercise has the longest history of parseable working weights.
  const primaryLift = React.useMemo(() => {
    let best: { name: string; history: { date: string; weightKg: number }[] } | null = null;
    for (const name of exerciseNames) {
      const weighted = exerciseHistory(name)
        .filter((h) => h.weightKg !== null)
        .map((h) => ({ date: h.date, weightKg: h.weightKg as number }));
      if (weighted.length > 1 && (!best || weighted.length > best.history.length)) {
        best = { name, history: weighted };
      }
    }
    return best;
  }, [exerciseNames, exerciseHistory]);

  const liftPoints = primaryLift ? primaryLift.history.map((h) => h.weightKg) : [];
  const liftLabels = primaryLift ? primaryLift.history.map((h) => formatShortDate(h.date)) : [];
  const liftFirst = primaryLift?.history[0]?.weightKg ?? null;
  const liftLast = primaryLift?.history[primaryLift.history.length - 1]?.weightKg ?? null;
  const liftPctChange = liftFirst !== null && liftLast !== null && liftFirst !== 0 ? Math.round(((liftLast - liftFirst) / liftFirst) * 100) : null;

  const weightPoints = weeklySeries.map((p) => p.kg);
  const weightTrendingDown = weeklySeries.length > 1 && weeklySeries[weeklySeries.length - 1].kg <= weeklySeries[0].kg;

  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  const avgExercises = workouts.length > 0 ? Math.round(totalExercises / workouts.length) : 0;
  const streakWeeks = workoutStreakWeeks(workouts);

  const metrics = [
    { label: 'TOTAL VOLUME', value: formatVolume(totalVolumeKg), unit: 'KG', accent: colors.electricLime },
    { label: 'WORKOUTS', value: `${workouts.length}`, unit: '', accent: colors.cyberBlue },
    { label: 'AVG EXERCISES', value: `${avgExercises}`, unit: '/ SESSION', accent: colors.electricLime },
    { label: 'STREAK', value: `${streakWeeks}`, unit: streakWeeks === 1 ? 'WEEK' : 'WEEKS', accent: colors.cyberBlue },
  ];

  return (
    <View className="flex-1 bg-background">
      <TopAppBar onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Strength metric */}
        <View style={{ gap: 16 }}>
          <View className="flex-row items-end justify-between">
            <View>
              <LabelCaps className="mb-1">STRENGTH EVOLUTION</LabelCaps>
              <H1>{primaryLift ? primaryLift.name.toUpperCase() : 'NO LIFTS YET'}</H1>
            </View>
            {primaryLift && liftLast !== null ? (
              <View className="items-end" style={{ gap: 4 }}>
                <View className="flex-row items-baseline">
                  <StatDisplay
                    className="text-[28px] leading-[28px]"
                    style={{ textShadowColor: 'rgba(174,213,0,0.35)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }}
                  >
                    {liftLast}
                  </StatDisplay>
                  <H3 className="ml-1 text-on-surface-variant">KG</H3>
                </View>
                {liftPctChange !== null ? (
                  <Chip
                    label={`${liftPctChange >= 0 ? '+' : ''}${liftPctChange}% Since First Logged`}
                    variant={liftPctChange >= 0 ? 'lime' : 'blue'}
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          <GlassCard className="h-64 justify-end overflow-hidden p-gutter">
            <View className="absolute inset-0 flex-row justify-between p-gutter opacity-10">
              {[0, 1, 2, 3].map((i) => (
                <View key={i} className="h-full w-px bg-white" />
              ))}
            </View>
            {liftPoints.length > 0 ? (
              <>
                <SmoothLineChart points={liftPoints} height={170} />
                <View className="mt-2 flex-row justify-between">
                  {liftLabels.map((label, i) => (
                    <Text
                      key={`${label}-${i}`}
                      className="text-[10px] uppercase tracking-wider"
                      style={{
                        fontFamily: 'Inter_700Bold',
                        letterSpacing: 1,
                        color: i === liftLabels.length - 1 ? colors.onSurface : colors.onSurfaceVariant,
                      }}
                    >
                      {label}
                    </Text>
                  ))}
                </View>
              </>
            ) : (
              <View className="h-full w-full items-center justify-center px-lg">
                <BodyText className="text-center text-on-surface-variant">
                  Log the same exercise with a working weight (e.g. "4 x 6 @ 100kg") across a few sessions to see your strength trend here.
                </BodyText>
              </View>
            )}
          </GlassCard>
        </View>

        {/* Body weight */}
        <Pressable onPress={() => navigation.navigate('WeightHistory')} className="overflow-hidden rounded-xl active:opacity-90">
          <GlassCard className="p-gutter" style={{ gap: 12 }}>
            <View className="flex-row items-center justify-between">
              <LabelCaps>BODY WEIGHT</LabelCaps>
              <MaterialIcons name={weightTrendingDown ? 'trending-down' : 'trending-up'} size={20} color={colors.cyberBlue} />
            </View>
            <View className="flex-row items-baseline gap-1">
              <H1 className="text-[22px] leading-[26px]" style={{ color: colors.cyberBlue }}>
                {latestWeight ? latestWeight.kg.toFixed(1) : '—'}
              </H1>
              <H3 className="text-on-surface-variant">KG</H3>
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

        {/* Workout log */}
        <View style={{ gap: 16 }}>
          <View className="flex-row items-center justify-between">
            <H3 className="uppercase">Workout Log</H3>
            <Pressable
              onPress={() => navigation.navigate('WorkoutHistory')}
              className="flex-row items-center gap-1 active:opacity-70"
              hitSlop={8}
            >
              <Text className="text-[11px] uppercase tracking-wider text-primary-container" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.4 }}>
                History
              </Text>
              <MaterialIcons name="history" size={20} color={colors.electricLime} />
            </Pressable>
          </View>
          <View style={{ gap: 8 }}>
            {workouts.map((w) => {
              const topSet = w.exercises[0] ? formatExerciseDetail(w.exercises[0]) : '—';
              return (
                <Pressable key={w.id} onPress={() => showWorkoutDetail(w)} className="overflow-hidden rounded-xl active:opacity-80">
                  <GlassCard className="flex-row items-center justify-between p-gutter">
                    <View className="flex-row items-center gap-gutter">
                      <View className="h-12 w-12 items-center justify-center rounded bg-surface-container-high">
                        <MaterialIcons name="fitness-center" size={22} color={colors.electricLime} />
                      </View>
                      <View>
                        <H3 className="text-[15px]">{w.name}</H3>
                        <Text className="text-[10px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                          {formatWorkoutDate(w.loggedAt)}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-lg">
                      <View className="items-center">
                        <LabelCaps>EXERCISES</LabelCaps>
                        <H3 className="text-[14px]">{w.exercises.length}</H3>
                      </View>
                      <View className="items-end">
                        <LabelCaps>TOP SET</LabelCaps>
                        <H3 className="text-[14px]" style={{ color: colors.electricLime }}>
                          {topSet.toUpperCase()}
                        </H3>
                      </View>
                      <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Metric cards bento grid */}
        <View className="flex-row flex-wrap gap-gutter">
          {metrics.map((m) => (
            <GlassCard key={m.label} className="basis-[47%] grow border-l-4 p-gutter" style={{ borderLeftColor: m.accent }}>
              <LabelCaps>{m.label}</LabelCaps>
              <View className="mt-1 flex-row items-baseline gap-1">
                <H3 className="text-[22px]">{m.value}</H3>
                {m.unit ? <LabelCaps>{m.unit}</LabelCaps> : null}
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
      <FAB icon="add" onPress={() => setWorkoutModalVisible(true)} />

      <WorkoutLogModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
        onSubmit={handleLogWorkout}
        previousWorkouts={workouts}
      />
    </View>
  );
}
