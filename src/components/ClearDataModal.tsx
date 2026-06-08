import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { H3, BodyText, LabelCaps } from './Labels';
import { useDataReset, CLEARABLE_CATEGORIES } from '../context/DataContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Stage = 'confirm' | 'deleting' | 'done';

const STEP_DELAY_MS = 550;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Confirms, then walks through each data category with an animated progress bar — wiping all in-app data via DataContext's reset signals. */
export function ClearDataModal({ visible, onClose }: Props) {
  const { clearCategory } = useDataReset();
  const [stage, setStage] = useState<Stage>('confirm');
  const [completedCount, setCompletedCount] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setStage('confirm');
      setCompletedCount(0);
      cancelledRef.current = false;
    } else {
      cancelledRef.current = true;
    }
  }, [visible]);

  const handleClose = () => {
    cancelledRef.current = true;
    onClose();
  };

  const runDeletion = async () => {
    setStage('deleting');
    for (let i = 0; i < CLEARABLE_CATEGORIES.length; i++) {
      await delay(STEP_DELAY_MS);
      if (cancelledRef.current) return;
      clearCategory(CLEARABLE_CATEGORIES[i].key);
      setCompletedCount(i + 1);
    }
    if (cancelledRef.current) return;
    await delay(300);
    if (!cancelledRef.current) setStage('done');
  };

  const progressPct = Math.round((completedCount / CLEARABLE_CATEGORIES.length) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={stage === 'deleting' ? () => {} : handleClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-margin-mobile">
        <View
          className="w-full overflow-hidden rounded-2xl border bg-surface-container-high p-margin-mobile"
          style={{ borderColor: 'rgba(255,255,255,0.12)', gap: 20, maxWidth: 420 }}
        >
          {stage === 'confirm' ? (
            <>
              <View className="items-center" style={{ gap: 12 }}>
                <View className="h-14 w-14 items-center justify-center rounded-full bg-error-container">
                  <MaterialIcons name="warning" size={28} color={colors.onErrorContainer} />
                </View>
                <H3 className="text-center">Clear All Data?</H3>
                <BodyText className="text-center">
                  This permanently deletes everything stored in Kinetic — workout logs, meal logs, progress photos, and
                  categories. This cannot be undone.
                </BodyText>
              </View>

              <View style={{ gap: 8 }}>
                {CLEARABLE_CATEGORIES.map((item) => (
                  <View
                    key={item.key}
                    className="flex-row items-center gap-3 rounded-lg border border-white/5 bg-surface-container px-md py-sm"
                  >
                    <MaterialIcons name={item.icon} size={18} color={colors.onSurfaceVariant} />
                    <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleClose}
                  className="h-12 flex-1 items-center justify-center rounded-lg border border-white/10 active:opacity-70"
                >
                  <Text
                    className="text-[13px] uppercase tracking-[2px] text-on-surface-variant"
                    style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable onPress={runDeletion} className="h-12 flex-1 items-center justify-center rounded-lg bg-error active:scale-95">
                  <Text
                    className="text-[13px] uppercase tracking-[2px] text-on-error"
                    style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                  >
                    Clear Everything
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {stage === 'deleting' ? (
            <>
              <View className="items-center" style={{ gap: 8 }}>
                <H3 className="text-center">Clearing Your Data…</H3>
                <BodyText className="text-center">Please wait while we remove everything.</BodyText>
              </View>

              <View style={{ gap: 10 }}>
                <View className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: colors.error,
                      shadowColor: colors.error,
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    }}
                  />
                </View>
                <LabelCaps className="self-end text-on-surface-variant">{progressPct}%</LabelCaps>
              </View>

              <View style={{ gap: 8 }}>
                {CLEARABLE_CATEGORIES.map((item, index) => {
                  const status: 'done' | 'active' | 'pending' =
                    index < completedCount ? 'done' : index === completedCount ? 'active' : 'pending';
                  return (
                    <View
                      key={item.key}
                      className="flex-row items-center gap-3 rounded-lg border border-white/5 bg-surface-container px-md py-sm"
                      style={{ opacity: status === 'pending' ? 0.5 : 1 }}
                    >
                      {status === 'done' ? (
                        <MaterialIcons name="check-circle" size={18} color={colors.electricLime} />
                      ) : status === 'active' ? (
                        <ActivityIndicator size="small" color={colors.error} />
                      ) : (
                        <MaterialIcons name={item.icon} size={18} color={colors.onSurfaceVariant} />
                      )}
                      <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                        {status === 'done' ? `${item.label} — cleared` : item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {stage === 'done' ? (
            <>
              <View className="items-center" style={{ gap: 12 }}>
                <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-container">
                  <MaterialIcons name="check" size={28} color={colors.onPrimaryContainer} />
                </View>
                <H3 className="text-center">All Clear</H3>
                <BodyText className="text-center">Kinetic has been reset to a clean slate — you're ready for a fresh start.</BodyText>
              </View>
              <Pressable onPress={handleClose} className="h-12 items-center justify-center rounded-lg bg-primary-container active:scale-95">
                <Text
                  className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                  style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
                >
                  Done
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
