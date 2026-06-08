import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkoutsScreen } from './WorkoutsScreen';
import { WorkoutHistoryScreen } from './WorkoutHistoryScreen';

export type WorkoutsStackParamList = {
  WorkoutsOverview: undefined;
  WorkoutHistory: undefined;
};

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

/** Nested stack so the Workouts tab can drill from the session log into per-exercise history/trends. */
export function WorkoutsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkoutsOverview" component={WorkoutsScreen} />
      <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
    </Stack.Navigator>
  );
}
