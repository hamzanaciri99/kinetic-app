import React from 'react';
import { Text, TextProps } from 'react-native';

/** label-caps: 12px / uppercase / wide tracking / bold Inter — used for all caption-style labels. */
export function LabelCaps({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`font-label-caps text-[11px] uppercase tracking-[1.2px] text-on-surface-variant ${className}`}
      style={[{ fontFamily: 'Inter_700Bold', letterSpacing: 1.1 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function H1({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[32px] leading-[36px] text-primary ${className}`}
      style={[{ fontFamily: 'Lexend_800ExtraBold', letterSpacing: -1.2 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function H2({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[24px] leading-[28px] text-primary ${className}`}
      style={[{ fontFamily: 'Lexend_700Bold', letterSpacing: -0.5 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function H3({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[17px] leading-[21px] text-primary ${className}`}
      style={[{ fontFamily: 'Lexend_700Bold' }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function StatDisplay({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[42px] leading-[42px] text-primary-container ${className}`}
      style={[{ fontFamily: 'Lexend_800ExtraBold', letterSpacing: -1.8 }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function BodyText({ className = '', style, children, ...rest }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-[14px] leading-[20px] text-on-surface-variant ${className}`}
      style={[{ fontFamily: 'Inter_400Regular' }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
