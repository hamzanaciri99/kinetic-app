import React from 'react';
import { Pressable, PressableProps, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

type Props = PressableProps & {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  className?: string;
};

/** Solid Electric Lime CTA with the brand's signature outer glow. */
export function PrimaryButton({ label, icon, className = '', style, ...rest }: Props) {
  return (
    <Pressable
      className={`h-14 w-full flex-row items-center justify-center gap-2 rounded-lg bg-primary-container active:scale-95 ${className}`}
      style={[
        {
          shadowColor: colors.electricLimeDim,
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        },
        style as any,
      ]}
      {...rest}
    >
      {icon ? <MaterialIcons name={icon} size={20} color={colors.onPrimaryContainer} /> : null}
      <Text
        className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
        style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Round floating action button used for quick logging/capture. */
export function FAB({ icon = 'add', onPress }: { icon?: keyof typeof MaterialIcons.glyphMap; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-28 right-margin-mobile h-14 w-14 items-center justify-center rounded-full bg-primary-container active:scale-95"
      style={{
        shadowColor: colors.electricLimeDim,
        shadowOpacity: 0.45,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
      }}
    >
      <MaterialIcons name={icon} size={28} color={colors.onPrimaryContainer} />
    </Pressable>
  );
}

/** Small pill-shaped chip / tag, e.g. "+12% THIS MONTH" or "STRENGTH". */
export function Chip({
  label,
  variant = 'lime',
}: {
  label: string;
  variant?: 'lime' | 'blue' | 'glass';
}) {
  const styles = {
    lime: { bg: 'bg-primary-container', text: 'text-on-primary-container' },
    blue: { bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
    glass: { bg: 'bg-surface/80 border border-white/10', text: 'text-primary-container' },
  }[variant];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${styles.bg}`}>
      <Text
        className={`text-[10px] font-bold uppercase tracking-wider ${styles.text}`}
        style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}
      >
        {label}
      </Text>
    </View>
  );
}
