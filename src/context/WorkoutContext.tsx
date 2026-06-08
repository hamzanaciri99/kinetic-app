import React, { createContext, useContext, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { makeId } from '../utils/date';
import { formatExerciseDetail, type TemplateExercise } from '../data/workoutTemplates';

export type WorkoutEntry = {
  id: string;
  name: string;
  loggedAt: string;
  exercises: TemplateExercise[];
};

export type NewWorkout = { name: string; exercises: TemplateExercise[] };

export type ExerciseHistoryPoint = {
  workoutId: string;
  workoutName: string;
  date: string;
  detail: string;
  weightKg: number | null;
};

function daysAgoAt(daysAgo: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const seedWorkouts: WorkoutEntry[] = [
  {
    id: makeId(),
    name: 'LEG DAY A',
    loggedAt: daysAgoAt(27, 6, 45),
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weightKg: 90 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 72 },
      { name: 'Leg Press', sets: 3, reps: 10, weightKg: 140 },
    ],
  },
  {
    id: makeId(),
    name: 'PUSH PERFORMANCE',
    loggedAt: daysAgoAt(24, 6, 30),
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 72 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 44 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 10 },
    ],
  },
  {
    id: makeId(),
    name: 'PULL HYPERTROPHY',
    loggedAt: daysAgoAt(22, 17, 15),
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 5, weightKg: 110 },
      { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null },
      { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 64 },
    ],
  },
  {
    id: makeId(),
    name: 'LEG DAY A',
    loggedAt: daysAgoAt(20, 6, 45),
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weightKg: 95 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 75 },
      { name: 'Leg Press', sets: 3, reps: 10, weightKg: 150 },
    ],
  },
  {
    id: makeId(),
    name: 'PUSH PERFORMANCE',
    loggedAt: daysAgoAt(17, 6, 30),
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 76 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 46 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 10 },
    ],
  },
  {
    id: makeId(),
    name: 'PULL HYPERTROPHY',
    loggedAt: daysAgoAt(15, 17, 15),
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 5, weightKg: 115 },
      { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null },
      { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 67 },
    ],
  },
  {
    id: makeId(),
    name: 'LEG DAY A',
    loggedAt: daysAgoAt(13, 6, 45),
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weightKg: 97 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 78 },
      { name: 'Leg Press', sets: 3, reps: 10, weightKg: 155 },
    ],
  },
  {
    id: makeId(),
    name: 'PUSH PERFORMANCE',
    loggedAt: daysAgoAt(10, 6, 30),
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 78 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 48 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 12 },
    ],
  },
  {
    id: makeId(),
    name: 'PULL HYPERTROPHY',
    loggedAt: daysAgoAt(8, 17, 15),
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 5, weightKg: 118 },
      { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null },
      { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 70 },
    ],
  },
  {
    id: makeId(),
    name: 'LEG DAY A',
    loggedAt: daysAgoAt(6, 6, 45),
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weightKg: 100 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 80 },
      { name: 'Leg Press', sets: 3, reps: 10, weightKg: 160 },
    ],
  },
  {
    id: makeId(),
    name: 'PULL HYPERTROPHY',
    loggedAt: daysAgoAt(3, 17, 15),
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 5, weightKg: 120 },
      { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null },
      { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 70 },
    ],
  },
  {
    id: makeId(),
    name: 'PUSH PERFORMANCE',
    loggedAt: daysAgoAt(1, 6, 30),
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 80 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 50 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 12 },
    ],
  },
];

type WorkoutContextValue = {
  workouts: WorkoutEntry[];
  addWorkout: (workout: NewWorkout) => void;
  exerciseNames: string[];
  exerciseHistory: (name: string) => ExerciseHistoryPoint[];
  totalVolumeKg: number;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>(seedWorkouts);

  useClearOnReset('workouts', () => setWorkouts([]));

  const value = useMemo<WorkoutContextValue>(() => {
    const sorted = [...workouts].sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : a.loggedAt > b.loggedAt ? 1 : 0));

    const namesSet = new Set<string>();
    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        if (exercise.name.trim()) namesSet.add(exercise.name.trim());
      }
    }
    const exerciseNames = Array.from(namesSet).sort((a, b) => a.localeCompare(b));

    let totalVolumeKg = 0;
    for (const workout of workouts) {
      for (const exercise of workout.exercises) {
        if (exercise.sets !== null && exercise.reps !== null && exercise.weightKg !== null) {
          totalVolumeKg += exercise.sets * exercise.reps * exercise.weightKg;
        }
      }
    }

    return {
      workouts: [...workouts].sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : a.loggedAt > b.loggedAt ? -1 : 0)),
      addWorkout: (workout) => {
        setWorkouts((prev) => [{ ...workout, id: makeId(), loggedAt: new Date().toISOString() }, ...prev]);
      },
      exerciseNames,
      totalVolumeKg,
      exerciseHistory: (name) => {
        const points: ExerciseHistoryPoint[] = [];
        for (const workout of sorted) {
          for (const exercise of workout.exercises) {
            if (exercise.name.trim() === name) {
              points.push({
                workoutId: workout.id,
                workoutName: workout.name,
                date: workout.loggedAt,
                detail: formatExerciseDetail(exercise),
                weightKg: exercise.weightKg,
              });
            }
          }
        }
        return points;
      },
    };
  }, [workouts]);

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkouts() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkouts must be used within a WorkoutProvider');
  return ctx;
}
