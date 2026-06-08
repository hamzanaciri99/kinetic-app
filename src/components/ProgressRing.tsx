import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Ring = {
  progress: number; // 0..1
  color: string;
  glowColor: string;
};

type Props = {
  size: number;
  strokeWidth?: number;
  rings: Ring[];
  trackColor?: string;
  children?: React.ReactNode;
};

/**
 * Concentric SVG progress rings (Daily Snapshot / Recovery Index style).
 * Each ring is drawn as a track + a rotated, dashed progress arc with a soft glow.
 */
export function ProgressRing({ size, strokeWidth = 12, rings, trackColor = '#2A2A2A', children }: Props) {
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {rings.map((ring, i) => {
          const radius = center - strokeWidth / 2 - i * (strokeWidth + 6);
          const circumference = 2 * Math.PI * radius;
          const dashOffset = circumference * (1 - ring.progress);
          return (
            <React.Fragment key={i}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={trackColor}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View className="items-center justify-center">{children}</View>
    </View>
  );
}
