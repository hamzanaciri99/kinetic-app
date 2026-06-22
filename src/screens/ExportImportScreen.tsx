import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { H2, H3, BodyText, LabelCaps } from '../components/Labels';
import { GlassCard } from '../components/GlassCard';
import { colors } from '../theme/colors';
import { exportAllData, pickAndImportData } from '../storage/exportImport';

export function ExportImportScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [overrideAll, setOverrideAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAllData();
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (overrideAll) {
      Alert.alert(
        'Override All Data?',
        'This will erase all current app data and replace it with the imported file. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Override All', style: 'destructive', onPress: () => runImport() },
        ],
      );
      return;
    }
    await runImport();
  };

  const runImport = async () => {
    setImporting(true);
    try {
      const result = await pickAndImportData({ overrideConflicts, overrideAll });
      if (result.imported === 0 && result.errors.length === 0) return; // user cancelled
      const errorMsg = result.errors.length > 0 ? `\n\nWarnings:\n• ${result.errors.join('\n• ')}` : '';
      Alert.alert(
        'Import Complete',
        `${result.imported} records imported successfully.${errorMsg}\n\nRestart the app to see all changes.`,
        [{ text: 'OK' }],
      );
    } catch (err) {
      Alert.alert('Import Failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View
        className="w-full flex-row items-center gap-2 border-b border-white/10 bg-surface/95 px-margin-mobile"
        style={{ height: 64 + insets.top, paddingTop: insets.top }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="active:opacity-70">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <H2>Export / Import</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Export Section */}
        <View style={{ gap: 12 }}>
          <LabelCaps>EXPORT</LabelCaps>
          <GlassCard className="p-md" style={{ gap: 16 }}>
            <View style={{ gap: 4 }}>
              <H3>Download Your Data</H3>
              <BodyText>
                Creates a <Text style={{ color: colors.electricLime }}>.zip</Text> file containing all your workouts,
                meals, body-weight entries, photo metadata, and a <Text style={{ color: colors.electricLime }}>photos/</Text> folder
                with every locally-saved progress photo.
              </BodyText>
            </View>

            <View style={{ gap: 8 }}>
              <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-surface-container px-md py-sm">
                <MaterialIcons name="fitness-center" size={16} color={colors.onSurfaceVariant} />
                <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Workout logs &amp; exercises
                </Text>
              </View>
              <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-surface-container px-md py-sm">
                <MaterialIcons name="restaurant" size={16} color={colors.onSurfaceVariant} />
                <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Meal &amp; nutrition logs
                </Text>
              </View>
              <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-surface-container px-md py-sm">
                <MaterialIcons name="photo-library" size={16} color={colors.onSurfaceVariant} />
                <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Progress photos + metadata
                </Text>
              </View>
              <View className="flex-row items-center gap-2 rounded-lg border border-white/5 bg-surface-container px-md py-sm">
                <MaterialIcons name="monitor-weight" size={16} color={colors.onSurfaceVariant} />
                <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                  Body weight log
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleExport}
              disabled={exporting}
              className="h-12 flex-row items-center justify-center gap-2 rounded-lg bg-primary-container active:scale-95"
              style={{
                opacity: exporting ? 0.6 : 1,
                shadowColor: colors.electricLimeDim,
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <MaterialIcons name={exporting ? 'hourglass-empty' : 'download'} size={18} color={colors.onPrimaryContainer} />
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-primary-container"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                {exporting ? 'Exporting…' : 'Export ZIP'}
              </Text>
            </Pressable>
          </GlassCard>
        </View>

        {/* Import Section */}
        <View style={{ gap: 12 }}>
          <LabelCaps>IMPORT</LabelCaps>
          <GlassCard className="p-md" style={{ gap: 20 }}>
            <View style={{ gap: 4 }}>
              <H3>Restore from Backup</H3>
              <BodyText>
                Pick a <Text style={{ color: colors.electricLime }}>kinetic_export_*.zip</Text> file previously exported
                from this app to sync your data back.
              </BodyText>
            </View>

            {/* Conflict options */}
            <View style={{ gap: 12 }}>
              <LabelCaps>CONFLICT RESOLUTION</LabelCaps>

              <Pressable
                onPress={() => {
                  setOverrideConflicts(!overrideConflicts);
                  if (!overrideConflicts && overrideAll) setOverrideAll(false);
                }}
                className="flex-row items-center justify-between rounded-lg border border-white/5 bg-surface-container px-md py-sm active:bg-surface-container-high"
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text className="text-[13px] text-on-surface" style={{ fontFamily: 'Inter_700Bold' }}>
                    Override conflicts
                  </Text>
                  <Text className="text-[11px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    Replace existing records with imported ones when IDs match
                  </Text>
                </View>
                <Switch
                  value={overrideConflicts}
                  onValueChange={(v) => {
                    setOverrideConflicts(v);
                    if (v && overrideAll) setOverrideAll(false);
                  }}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={overrideConflicts ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                />
              </Pressable>

              <Pressable
                onPress={() => {
                  setOverrideAll(!overrideAll);
                  if (!overrideAll) setOverrideConflicts(false);
                }}
                className="flex-row items-center justify-between rounded-lg border px-md py-sm active:opacity-80"
                style={{
                  borderColor: overrideAll ? 'rgba(255,180,171,0.4)' : 'rgba(255,255,255,0.05)',
                  backgroundColor: overrideAll ? 'rgba(255,180,171,0.06)' : undefined,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text className="text-[13px]" style={{ fontFamily: 'Inter_700Bold', color: overrideAll ? colors.error : colors.onSurface }}>
                    Override all
                  </Text>
                  <Text className="text-[11px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    Wipe all current data first, then import everything from the file
                  </Text>
                </View>
                <Switch
                  value={overrideAll}
                  onValueChange={(v) => {
                    setOverrideAll(v);
                    if (v) setOverrideConflicts(false);
                  }}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.errorContainer }}
                  thumbColor={overrideAll ? colors.onErrorContainer : colors.onSurfaceVariant}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleImport}
              disabled={importing}
              className="h-12 flex-row items-center justify-center gap-2 rounded-lg border border-white/10 active:bg-surface-container-highest"
              style={{ opacity: importing ? 0.6 : 1 }}
            >
              <MaterialIcons name={importing ? 'hourglass-empty' : 'upload-file'} size={18} color={colors.onSurface} />
              <Text
                className="text-[13px] uppercase tracking-[2px] text-on-surface"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 2 }}
              >
                {importing ? 'Importing…' : 'Select ZIP File'}
              </Text>
            </Pressable>
          </GlassCard>
        </View>

        {/* Info note */}
        <GlassCard className="flex-row items-start gap-3 border border-white/5 p-md">
          <MaterialIcons name="info-outline" size={18} color={colors.onSurfaceVariant} style={{ marginTop: 1 }} />
          <BodyText style={{ flex: 1, color: colors.onSurfaceVariant }}>
            Remote seed photos (displayed from the internet) are not bundled into the export. Only photos you personally
            captured on your device are included.
          </BodyText>
        </GlassCard>
      </ScrollView>
    </View>
  );
}
