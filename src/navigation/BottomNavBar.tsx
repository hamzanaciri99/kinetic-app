import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

const TAB_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Dashboard: 'dashboard',
  Workouts: 'fitness-center',
  Nutrition: 'restaurant',
  Gallery: 'collections',
};

export function BottomNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View className="absolute bottom-0 w-full items-center px-4 pb-3">
      <View
        className="h-20 w-full flex-row items-center justify-around rounded-full border-t border-white/5 bg-surface-container-lowest/95 px-4"
        style={{
          shadowColor: colors.electricLimeDim,
          shadowOpacity: 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconName = TAB_ICONS[route.name] ?? 'circle';

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const activeColor = colors.primaryContainer;
          const inactiveColor = colors.onSurfaceVariant;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              className="flex-1 items-center justify-center gap-1 active:opacity-70"
              style={isFocused ? { transform: [{ scale: 1.08 }] } : undefined}
            >
              <MaterialIcons
                name={iconName}
                size={24}
                color={isFocused ? activeColor : inactiveColor}
                style={
                  isFocused
                    ? { textShadowColor: 'rgba(174,213,0,0.5)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }
                    : undefined
                }
              />
              <Text
                className="text-[11px] uppercase tracking-wider"
                style={{
                  fontFamily: 'Inter_700Bold',
                  letterSpacing: 1,
                  color: isFocused ? activeColor : inactiveColor,
                }}
              >
                {route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
