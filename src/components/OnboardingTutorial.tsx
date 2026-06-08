import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { H2, BodyText, LabelCaps } from './Labels';

type Props = {
  visible: boolean;
  onDone: () => void;
};

type Slide = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'bolt',
    title: 'Welcome to Kinetic',
    body: 'Your all-in-one training companion — track workouts, nutrition, and visual progress, all in one glowing dashboard.',
  },
  {
    icon: 'fitness-center',
    title: 'Log Every Session',
    body: 'Record workouts from ready-made templates, track your body weight over time, and watch your strength curve climb.',
  },
  {
    icon: 'restaurant',
    title: 'Fuel With Precision',
    body: 'Log meals by hand, scan a barcode, or snap a photo of your food — Kinetic figures out the macros and tracks them for you.',
  },
  {
    icon: 'photo-library',
    title: 'See Your Transformation',
    body: 'Capture progress photos, sort them into categories, and pick any two entries to highlight as a before-and-after.',
  },
  {
    icon: 'tune',
    title: 'Make It Yours',
    body: "Customize your photo categories, manage or clear your data, and replay this tutorial anytime from Settings.",
  },
];

/** Full-screen first-run walkthrough — also replayable on demand from Settings. */
export function OnboardingTutorial({ visible, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  React.useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const slide = SLIDES[index];

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    setIndex((prev) => Math.min(SLIDES.length - 1, prev + 1));
  };

  const handleBack = () => setIndex((prev) => Math.max(0, prev - 1));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDone}>
      <View className="flex-1 bg-background px-margin-mobile" style={{ paddingTop: 72, paddingBottom: 40 }}>
        <Pressable onPress={onDone} className="absolute right-margin-mobile active:opacity-70" style={{ top: 56, zIndex: 1 }} hitSlop={12}>
          <Text className="text-[12px] uppercase tracking-wider text-on-surface-variant" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.4 }}>
            Skip
          </Text>
        </Pressable>

        <View className="flex-1 items-center justify-center" style={{ gap: 24 }}>
          <View
            className="h-24 w-24 items-center justify-center rounded-full bg-primary-container"
            style={{ shadowColor: colors.electricLimeDim, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 }}
          >
            <MaterialIcons name={slide.icon} size={44} color={colors.onPrimaryContainer} />
          </View>

          <View style={{ gap: 12 }}>
            <H2 className="text-center">{slide.title}</H2>
            <BodyText className="text-center" style={{ paddingHorizontal: 12 }}>
              {slide.body}
            </BodyText>
          </View>
        </View>

        <View style={{ gap: 20 }}>
          <View className="flex-row items-center justify-center gap-2">
            {SLIDES.map((_, i) => (
              <View
                key={i}
                className="rounded-full"
                style={{
                  height: 6,
                  width: i === index ? 22 : 6,
                  backgroundColor: i === index ? colors.electricLime : colors.surfaceContainerHighest,
                }}
              />
            ))}
          </View>

          <View className="flex-row items-center gap-3">
            {index > 0 ? (
              <Pressable
                onPress={handleBack}
                className="h-14 w-14 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleNext}
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary-container active:scale-95"
              style={{
                shadowColor: colors.electricLimeDim,
                shadowOpacity: 0.4,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
            >
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                {isLast ? 'Get Started' : 'Next'}
              </Text>
              <MaterialIcons name={isLast ? 'check' : 'arrow-forward'} size={20} color={colors.onPrimaryContainer} />
            </Pressable>
          </View>

          <LabelCaps className="text-center text-on-surface-variant">
            {index + 1} / {SLIDES.length}
          </LabelCaps>
        </View>
      </View>
    </Modal>
  );
}
