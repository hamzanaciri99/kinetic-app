export type TemplateExercise = { name: string; sets: number | null; reps: number | null; weightKg: number | null };

export type WorkoutTemplate = {
  name: string;
  category: string;
  exercises: TemplateExercise[];
};

/** Reconstructs the "4 x 6 @ 100kg" / "4 x 8 @ bodyweight" display string from structured set data. */
export function formatExerciseDetail(exercise: { sets: number | null; reps: number | null; weightKg: number | null }): string {
  if (exercise.sets === null || exercise.reps === null) return '—';
  const weightLabel = exercise.weightKg !== null ? `${exercise.weightKg}kg` : 'bodyweight';
  return `${exercise.sets} x ${exercise.reps} @ ${weightLabel}`;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Leg Day',
    category: 'Legs',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 6, weightKg: 100 },
      { name: 'Romanian Deadlift', sets: 3, reps: 8, weightKg: 80 },
      { name: 'Leg Press', sets: 3, reps: 10, weightKg: 160 },
      { name: 'Leg Curl', sets: 3, reps: 12, weightKg: 45 },
      { name: 'Calf Raise', sets: 4, reps: 15, weightKg: 60 },
    ],
  },
  {
    name: 'Push Day',
    category: 'Chest',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 80 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 50 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weightKg: 30 },
      { name: 'Lateral Raise', sets: 3, reps: 15, weightKg: 10 },
      { name: 'Triceps Pushdown', sets: 3, reps: 12, weightKg: 35 },
    ],
  },
  {
    name: 'Pull Day',
    category: 'Back',
    exercises: [
      { name: 'Deadlift', sets: 4, reps: 5, weightKg: 120 },
      { name: 'Pull-Up', sets: 4, reps: 8, weightKg: null },
      { name: 'Barbell Row', sets: 3, reps: 10, weightKg: 70 },
      { name: 'Face Pull', sets: 3, reps: 15, weightKg: 25 },
      { name: 'Bicep Curl', sets: 3, reps: 12, weightKg: 16 },
    ],
  },
  {
    name: 'Upper Body Day',
    category: 'Full Body',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 6, weightKg: 80 },
      { name: 'Barbell Row', sets: 4, reps: 8, weightKg: 70 },
      { name: 'Overhead Press', sets: 3, reps: 8, weightKg: 50 },
      { name: 'Lat Pulldown', sets: 3, reps: 10, weightKg: 55 },
      { name: 'Hammer Curl', sets: 3, reps: 12, weightKg: 14 },
    ],
  },
  {
    name: 'Custom',
    category: 'Full Body',
    exercises: [],
  },
];
