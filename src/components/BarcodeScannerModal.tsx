import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { H3, BodyText } from './Labels';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
};

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

/** Full-screen camera overlay that scans product barcodes and reports the first result back. */
export function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
    }
  }, [visible]);

  const handleBarcodeScanned = (result: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScanned(result.data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-background p-margin-mobile" style={{ gap: 16 }}>
            <MaterialIcons name="qr-code-scanner" size={48} color={colors.onSurfaceVariant} />
            <H3 className="text-center">Camera Access Needed</H3>
            <BodyText className="text-center">Allow camera access to scan a product's barcode and auto-fill its nutrition info.</BodyText>
            <Pressable
              onPress={requestPermission}
              className="h-12 items-center justify-center rounded-lg bg-primary-container px-md active:scale-95"
            >
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                Grant Access
              </Text>
            </Pressable>
          </View>
        )}

        <View className="absolute left-0 right-0 flex-row items-center justify-between px-margin-mobile" style={{ top: 56 }}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface/80 active:opacity-70"
          >
            <MaterialIcons name="close" size={22} color={colors.onSurface} />
          </Pressable>
          <View className="rounded-full border border-white/10 bg-surface/80 px-md py-xs">
            <Text className="text-[12px] text-on-surface" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 0.6 }}>
              Align the barcode within frame
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        {permission?.granted ? (
          <View className="absolute inset-x-0 items-center" style={{ top: '42%' }}>
            <View className="h-28 w-72 rounded-2xl border-2" style={{ borderColor: colors.electricLime }} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
