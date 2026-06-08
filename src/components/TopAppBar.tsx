import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuC2YlUr9g5FLGQoxDfhKPl8qqhAqikJPnu2rrZKKROww0Gq55JT5xpYOc3zmdupG6VFz0_So7p2cVfjxwxMydxuMK1v3kXwEDVc5fpDbSXnOfdm0-eRQd4idXuzYpJ8td5NF4MnPrpbju2ys1yohUKQkgE8JGp4OAtaDWO2_5pAU7FMuK0P8HuPtrbp-BhdMsnDTUjhrf412n_jUnPLRVUMYrD1dZbJ9IqCE8MfdkQtnKl0WbKvui9fSbwY22yGC6QhPiROpLSutrns';

export function TopAppBar({ onSettingsPress }: { onSettingsPress?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="h-16 w-full flex-row items-center justify-between border-b border-white/10 bg-surface/95 px-margin-mobile"
      style={{ height: 64 + insets.top, paddingTop: insets.top }}
    >
      <View className="flex-row items-center gap-base">
        <View className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-surface-container-highest">
          <Image source={{ uri: AVATAR }} className="h-full w-full" resizeMode="cover" />
        </View>
        <Text
          className="font-h2 text-2xl italic text-primary-container"
          style={{ fontFamily: 'Lexend_900Black', fontStyle: 'italic', color: colors.primaryContainer, letterSpacing: -0.5 }}
        >
          KINETIC
        </Text>
      </View>
      <Pressable onPress={onSettingsPress} hitSlop={12} className="active:opacity-70">
        <MaterialIcons name="settings" size={24} color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}
