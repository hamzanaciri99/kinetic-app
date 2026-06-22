import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useClearOnReset } from './DataContext';
import { makeId } from '../utils/date';
import { formatExerciseDetail, type TemplateExercise } from '../data/workoutTemplates';
import * as db from '../storage/database';

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

function dbRowToEntry(row: db.DbWorkout): WorkoutEntry {
  let exercises: TemplateExercise[] = [];
  try {
    exercises = JSON.parse(row.exercises_json);
  } catch {}
  return { id: row.id, name: row.name, loggedAt: row.logged_at, exercises };
}

type WorkoutContextValue = {
  workouts: WorkoutEntry[];
  addWorkout: (workout: NewWorkout) => void;
  exerciseNames: string[];
  exerciseHistory: (name: string) => ExerciseHistoryPoint[];
  totalVolumeKg: number;
};

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);

  useEffect(() => {
    db.getAllWorkouts()
      .then((rows) => setWorkouts(rows.map(dbRowToEntry)))
      .catch(() => {});
  }, []);

  useClearOnReset('workouts', () => {
    db.clearWorkouts()
      .then(() => setWorkouts([]))
      .catch(() => setWorkouts([]));
  });

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
        const id = makeId();
        const loggedAt = new Date().toISOString();
        const entry: WorkoutEntry = { ...workout, id, loggedAt };
        const dbRow: db.DbWorkout = {
          id,
          name: workout.name,
          logged_at: loggedAt,
          exercises_json: JSON.stringify(workout.exercises),
        };
        db.insertWorkout(dbRow).catch(() => {});
        setWorkouts((prev) => [entry, ...prev]);
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
