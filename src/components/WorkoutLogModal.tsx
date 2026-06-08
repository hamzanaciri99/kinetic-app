import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { LabelCaps, H3, BodyText } from './Labels';
import { WORKOUT_TEMPLATES, TemplateExercise } from '../data/workoutTemplates';
import type { WorkoutEntry } from '../context/WorkoutContext';

export type LoggedWorkout = {
  name: string;
  exercises: TemplateExercise[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (workout: LoggedWorkout) => void;
  /** Previously logged sessions the user can pick as a starting point instead of a built-in template. */
  previousWorkouts?: WorkoutEntry[];
};

function formatPreviousDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
}

let exerciseUid = 0;
function nextExerciseId() {
  exerciseUid += 1;
  return `ex-${exerciseUid}`;
}

type DraftExercise = { id: string; name: string; sets: string; reps: string; weight: string };

function numberToText(value: number | null): string {
  return value !== null ? String(value) : '';
}

function textToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDraft(exercises: TemplateExercise[]): DraftExercise[] {
  return exercises.map((e) => ({
    id: nextExerciseId(),
    name: e.name,
    sets: numberToText(e.sets),
    reps: numberToText(e.reps),
    weight: numberToText(e.weightKg),
  }));
}

/** Bottom-sheet for logging a full workout session: pick a template (or start blank), then edit the name and exercise list before saving. */
export function WorkoutLogModal({ visible, onClose, onSubmit, previousWorkouts = [] }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const [selectedSourceId, setSelectedSourceId] = useState(`template:${WORKOUT_TEMPLATES[0].name}`);
  const [name, setName] = useState(WORKOUT_TEMPLATES[0].name);
  const [exercises, setExercises] = useState<DraftExercise[]>(() => toDraft(WORKOUT_TEMPLATES[0].exercises));

  useEffect(() => {
    if (visible) {
      const template = WORKOUT_TEMPLATES[0];
      setSelectedSourceId(`template:${template.name}`);
      setName(template.name);
      setExercises(toDraft(template.exercises));
    }
  }, [visible]);

  const applyTemplate = (templateName: string) => {
    const template = WORKOUT_TEMPLATES.find((t) => t.name === templateName);
    if (!template) return;
    setSelectedSourceId(`template:${templateName}`);
    setName(template.name);
    setExercises(toDraft(template.exercises));
  };

  const applyPreviousWorkout = (workout: WorkoutEntry) => {
    setSelectedSourceId(`prev:${workout.id}`);
    setName(workout.name);
    setExercises(toDraft(workout.exercises));
  };

  const updateExercise = (id: string, key: 'name' | 'sets' | 'reps' | 'weight', value: string) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [key]: value } : e)));
  };

  const removeExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, { id: nextExerciseId(), name: '', sets: '', reps: '', weight: '' }]);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const cleanedExercises = exercises
      .map((e) => ({
        name: e.name.trim(),
        sets: textToNumber(e.sets),
        reps: textToNumber(e.reps),
        weightKg: textToNumber(e.weight),
      }))
      .filter((e) => e.name.length > 0);

    if (!trimmedName) return;

    onSubmit({ name: trimmedName, exercises: cleanedExercises });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={onClose} className="absolute inset-0 bg-black/60" />
          <View
            className="rounded-t-2xl border border-white/10 bg-surface-container-high"
            style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, height: windowHeight * 0.88 }}
          >
            <View className="p-margin-mobile" style={{ gap: 4 }}>
              <H3>Log Workout</H3>
              <BodyText>Start from a template or build your session from scratch.</BodyText>
            </View>

            <ScrollView
              className="flex-1 px-margin-mobile"
              contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 8 }}>
                <LabelCaps>Template</LabelCaps>
                <View className="flex-row flex-wrap gap-2">
                  {WORKOUT_TEMPLATES.map((template) => {
                    const active = selectedSourceId === `template:${template.name}`;
                    return (
                      <Pressable
                        key={template.name}
                        onPress={() => applyTemplate(template.name)}
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
                          {template.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {previousWorkouts.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <LabelCaps>Or Use a Previous Session</LabelCaps>
                  <View className="flex-row flex-wrap gap-2">
                    {previousWorkouts.slice(0, 8).map((workout) => {
                      const active = selectedSourceId === `prev:${workout.id}`;
                      return (
                        <Pressable
                          key={workout.id}
                          onPress={() => applyPreviousWorkout(workout)}
                          className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                            active ? 'border-cyber-blue bg-cyber-blue/20' : 'border-white/10 bg-surface-container'
                          }`}
                          style={active ? { borderColor: colors.cyberBlue, backgroundColor: 'rgba(0,212,255,0.12)' } : undefined}
                        >
                          <Text
                            className="text-[11px] uppercase tracking-wider"
                            style={{
                              fontFamily: 'Inter_700Bold',
                              letterSpacing: 1,
                              color: active ? colors.cyberBlue : colors.onSurfaceVariant,
                            }}
                          >
                            {workout.name} • {formatPreviousDate(workout.loggedAt)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 6 }}>
                <LabelCaps>Workout Name</LabelCaps>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Leg Day A"
                  placeholderTextColor={colors.onSurfaceVariant}
                  className="h-12 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
                />
              </View>

              <View style={{ gap: 8 }}>
                <View className="flex-row items-center justify-between">
                  <LabelCaps>Exercises</LabelCaps>
                  <Pressable onPress={addExercise} className="flex-row items-center gap-1 active:opacity-70">
                    <MaterialIcons name="add" size={16} color={colors.primaryContainer} />
                    <Text
                      className="text-[11px] uppercase tracking-wider text-primary-container"
                      style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}
                    >
                      Add Exercise
                    </Text>
                  </Pressable>
                </View>

                {exercises.length === 0 ? (
                  <BodyText className="text-on-surface-variant">No exercises yet — add one above.</BodyText>
                ) : (
                  <View style={{ gap: 10 }}>
                    {exercises.map((exercise, index) => (
                      <View
                        key={exercise.id}
                        className="rounded-lg border border-white/10 bg-surface-container p-3"
                        style={{ gap: 8 }}
                      >
                        <View className="flex-row items-center justify-between">
                          <LabelCaps className="text-[10px]">EXERCISE {index + 1}</LabelCaps>
                          <Pressable onPress={() => removeExercise(exercise.id)} hitSlop={8} className="active:opacity-70">
                            <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
                          </Pressable>
                        </View>
                        <TextInput
                          value={exercise.name}
                          onChangeText={(text) => updateExercise(exercise.id, 'name', text)}
                          placeholder="Exercise name"
                          placeholderTextColor={colors.onSurfaceVariant}
                          className="h-11 rounded-lg border border-white/10 bg-surface-container-high px-md text-on-surface"
                          style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                        />
                        <View className="flex-row gap-2">
                          <TextInput
                            value={exercise.sets}
                            onChangeText={(text) => updateExercise(exercise.id, 'sets', text)}
                            placeholder="Sets"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="number-pad"
                            className="h-11 flex-1 rounded-lg border border-white/10 bg-surface-container-high px-md text-on-surface"
                            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                          />
                          <TextInput
                            value={exercise.reps}
                            onChangeText={(text) => updateExercise(exercise.id, 'reps', text)}
                            placeholder="Reps"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="number-pad"
                            className="h-11 flex-1 rounded-lg border border-white/10 bg-surface-container-high px-md text-on-surface"
                            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                          />
                          <TextInput
                            value={exercise.weight}
                            onChangeText={(text) => updateExercise(exercise.id, 'weight', text)}
                            placeholder="Weight (kg)"
                            placeholderTextColor={colors.onSurfaceVariant}
                            keyboardType="decimal-pad"
                            className="h-11 flex-[1.4] rounded-lg border border-white/10 bg-surface-container-high px-md text-on-surface"
                            style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                          />
                        </View>
                        <Text className="text-[10px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                          Leave weight blank for bodyweight exercises.
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="flex-row gap-3 p-margin-mobile" style={{ paddingBottom: 32 }}>
              <Pressable
                onPress={onClose}
                className="h-12 flex-1 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
              >
                <Text
                  className="text-[13px] uppercase tracking-[2px] text-on-surface-variant"
                  style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                className="h-12 flex-1 items-center justify-center rounded-lg bg-primary-container active:scale-95"
                style={{
                  shadowColor: colors.electricLimeDim,
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
              >
                <Text
                  className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                  style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                >
                  Log It
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
