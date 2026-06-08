import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';
import { LabelCaps, H3 } from './Labels';

type Field = {
  key: string;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  fields: Field[];
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
};

/** Bottom-sheet style form used across the app for "Log X" actions. */
export function InputModal({ visible, title, subtitle, fields, confirmLabel = 'Save', onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setValues({});
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(values);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable
          className="rounded-t-2xl border border-white/10 bg-surface-container-high p-margin-mobile"
          style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, gap: 16, paddingBottom: 32 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View>
            <H3>{title}</H3>
            {subtitle ? (
              <Text className="mt-1 text-[13px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          {fields.map((field) => (
            <View key={field.key} style={{ gap: 6 }}>
              <LabelCaps>{field.label}</LabelCaps>
              <TextInput
                value={values[field.key] ?? ''}
                onChangeText={(text) => setValues((prev) => ({ ...prev, [field.key]: text }))}
                placeholder={field.placeholder}
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType={field.keyboardType ?? 'default'}
                className="h-12 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
              />
            </View>
          ))}

          <View className="mt-2 flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="h-12 flex-1 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
            >
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-surface-variant"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              className="h-12 flex-1 items-center justify-center rounded-lg bg-primary-container active:scale-95"
              style={{
                shadowColor: colors.electricLimeDim,
                shadowOpacity: 0.4,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
            >
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
