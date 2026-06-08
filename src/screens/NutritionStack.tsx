import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NutritionScreen } from './NutritionScreen';
import { NutritionHistoryScreen } from './NutritionHistoryScreen';

export type NutritionStackParamList = {
  NutritionOverview: undefined;
  NutritionHistory: undefined;
};

const Stack = createNativeStackNavigator<NutritionStackParamList>();

/** Nested stack so the Nutrition tab can drill from the daily overview into the calorie history/trends. */
export function NutritionStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NutritionOverview" component={NutritionScreen} />
      <Stack.Screen name="NutritionHistory" component={NutritionHistoryScreen} />
    </Stack.Navigator>
  );
}
