import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GalleryOverviewScreen } from './GalleryOverviewScreen';
import { ProgressAnalysisScreen } from './ProgressAnalysisScreen';

export type GalleryStackParamList = {
  GalleryOverview: undefined;
  ProgressAnalysis: { before: string; after: string };
};

const Stack = createNativeStackNavigator<GalleryStackParamList>();

/** Nested stack so the Gallery tab can drill from the overview into the AI progress analysis. */
export function GalleryScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GalleryOverview" component={GalleryOverviewScreen} />
      <Stack.Screen name="ProgressAnalysis" component={ProgressAnalysisScreen} />
    </Stack.Navigator>
  );
}
