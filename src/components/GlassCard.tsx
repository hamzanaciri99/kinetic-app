import React from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Glassmorphism container matching the design system's `.glass-panel` / `.glass-card`:
 * translucent dark fill, soft top border to "catch the light", rounded-xl corners.
 */
export function GlassCard({ className = '', style, children, ...rest }: Props) {
  return (
    <View
      className={`rounded-xl border border-white/10 bg-surface-container/80 ${className}`}
      style={[{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1 }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
