import './global.css';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Lexend_400Regular,
  Lexend_700Bold,
  Lexend_800ExtraBold,
  Lexend_900Black,
} from '@expo-google-fonts/lexend';
import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { MaterialIcons } from '@expo/vector-icons';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CategoriesProvider } from './src/context/CategoriesContext';
import { GalleryProvider } from './src/context/GalleryContext';
import { DataProvider } from './src/context/DataContext';
import { NutritionProvider } from './src/context/NutritionContext';
import { BodyMetricsProvider } from './src/context/BodyMetricsContext';
import { WorkoutProvider } from './src/context/WorkoutContext';
import { OnboardingProvider, useOnboarding } from './src/context/OnboardingContext';
import { OnboardingTutorial } from './src/components/OnboardingTutorial';
import { colors } from './src/theme/colors';

function OnboardingOverlay() {
  const { visible, finishOnboarding } = useOnboarding();
  return <OnboardingTutorial visible={visible} onDone={finishOnboarding} />;
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_700Bold,
    Lexend_800ExtraBold,
    Lexend_900Black,
    Inter_400Regular,
    Inter_700Bold,
    ...MaterialIcons.font,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <DataProvider>
            <CategoriesProvider>
              <GalleryProvider>
                <NutritionProvider>
                  <BodyMetricsProvider>
                    <WorkoutProvider>
                      <View style={{ flex: 1, backgroundColor: colors.background }}>
                        <StatusBar style="light" />
                        <RootNavigator />
                        <OnboardingOverlay />
                      </View>
                    </WorkoutProvider>
                  </BodyMetricsProvider>
                </NutritionProvider>
              </GalleryProvider>
            </CategoriesProvider>
          </DataProvider>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
