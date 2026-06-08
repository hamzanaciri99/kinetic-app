import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

type Props = {
  points?: number[];
  width?: number | `${number}%`;
  height?: number;
  color?: string;
  minValue?: number;
  maxValue?: number;
};

const DEMO_POINTS = [62, 58, 64, 40, 50, 30, 45, 10];

function buildSmoothPath(values: number[], viewBoxW: number, viewBoxH: number, minValue: number, maxValue: number) {
  const range = Math.max(1, maxValue - minValue);
  const stepX = values.length > 1 ? viewBoxW / (values.length - 1) : 0;
  const coords = values.map((value, i) => ({
    x: i * stepX,
    y: viewBoxH - ((value - minValue) / range) * viewBoxH,
  }));

  if (coords.length === 1) {
    return `M${coords[0].x},${coords[0].y} L${coords[0].x},${coords[0].y}`;
  }

  let path = `M${coords[0].x},${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const midX = (curr.x + next.x) / 2;
    path += ` Q${curr.x},${curr.y} ${midX},${(curr.y + next.y) / 2}`;
  }
  const last = coords[coords.length - 1];
  path += ` T${last.x},${last.y}`;
  return path;
}

/**
 * Smooth gradient-filled line chart with a glowing dot on the latest point.
 * Pass `points` to render real data; falls back to a demo curve when omitted.
 */
export function SmoothLineChart({ points, width = '100%', height = 110, color = colors.electricLime, minValue, maxValue }: Props) {
  const data = points && points.length > 0 ? points : DEMO_POINTS;
  const viewBoxW = 400;
  const viewBoxH = 100;

  const lo = minValue ?? Math.min(...data);
  const hi = maxValue ?? Math.max(...data);

  const linePath = buildSmoothPath(data, viewBoxW, viewBoxH, lo, hi);
  const fillPath = `${linePath} V${viewBoxH} H0 Z`;

  const range = Math.max(1, hi - lo);
  const lastValue = data[data.length - 1];
  const lastX = data.length > 1 ? viewBoxW : 0;
  const lastY = viewBoxH - ((lastValue - lo) / range) * viewBoxH;

  return (
    <View style={{ width, height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={fillPath} fill="url(#chartGradient)" />
        <Path d={linePath} stroke={color} strokeWidth={3} strokeLinecap="round" fill="transparent" />
        <Circle cx={lastX} cy={lastY} r={5} fill={color} />
      </Svg>
    </View>
  );
}
