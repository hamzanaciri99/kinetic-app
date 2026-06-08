import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { LabelCaps, H3, BodyText } from './Labels';
import { pickImage, pickImageWithData } from '../utils/imagePicker';
import { lookupBarcodeProduct, FoodReference } from '../utils/foodLookup';
import { analyzeFoodPhoto } from '../utils/geminiFood';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import type { MealEntry } from '../context/NutritionContext';

export type LoggedMeal = {
  name: string;
  type: string;
  detail: string;
  weightGrams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  image: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (meal: LoggedMeal) => void;
  editing?: MealEntry | null;
  onUpdate?: (id: string, meal: LoggedMeal) => void;
  onDelete?: (id: string) => void;
};

const EMPTY_FORM = { name: '', type: '', weight: '', kcal: '', protein: '', carbs: '', fat: '' };

function mealToForm(meal: MealEntry): typeof EMPTY_FORM {
  return {
    name: meal.name,
    type: meal.meal,
    weight: meal.weightGrams ? String(meal.weightGrams) : '',
    kcal: String(meal.kcal),
    protein: String(meal.protein),
    carbs: String(meal.carbs),
    fat: String(meal.fat),
  };
}

function round(n: number) {
  return Math.max(0, Math.round(n));
}

/** Bottom-sheet for logging a meal: manual entry, photo attachment, and AI-assisted barcode/photo scanning with proportional macro scaling by weight. */
export function LogMealModal({ visible, onClose, onSubmit, editing, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const referenceRef = useRef<FoodReference | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(editing ? mealToForm(editing) : EMPTY_FORM);
      setImage(editing?.image ?? null);
      setAnalyzing(false);
      referenceRef.current = null;
    }
  }, [visible, editing]);

  const setField = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyReference = (reference: FoodReference, name?: string) => {
    referenceRef.current = reference;
    const grams = reference.gramsPerServing;
    setForm({
      name: name ?? reference.name,
      type: '',
      weight: String(round(grams)),
      kcal: String(round(reference.kcalPerGram * grams)),
      protein: String(round(reference.proteinPerGram * grams)),
      carbs: String(round(reference.carbsPerGram * grams)),
      fat: String(round(reference.fatPerGram * grams)),
    });
  };

  const handleWeightChange = (value: string) => {
    setField('weight', value);
    const reference = referenceRef.current;
    const grams = parseFloat(value);
    if (!reference || !Number.isFinite(grams) || grams <= 0) return;
    setForm((prev) => ({
      ...prev,
      weight: value,
      kcal: String(round(reference.kcalPerGram * grams)),
      protein: String(round(reference.proteinPerGram * grams)),
      carbs: String(round(reference.carbsPerGram * grams)),
      fat: String(round(reference.fatPerGram * grams)),
    }));
  };

  const handleAttachPhoto = async () => {
    const uri = await pickImage({ title: 'Attach Meal Photo', message: 'Add a photo of what you ate.' });
    if (uri) setImage(uri);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setScannerVisible(false);
    setAnalyzing(true);
    try {
      const reference = await lookupBarcodeProduct(barcode);
      if (!reference) {
        Alert.alert('Product Not Found', "We couldn't find that barcode in the product database. Enter the details manually.");
        return;
      }
      applyReference(reference);
    } catch {
      Alert.alert('Lookup Failed', 'Something went wrong while looking up that barcode.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSnapFoodPhoto = async () => {
    const picked = await pickImageWithData({ title: 'Snap Food Photo', message: 'Take or choose a photo of your food to identify it.' });
    if (!picked) return;
    setImage(picked.uri);
    setAnalyzing(true);
    try {
      const reference = await analyzeFoodPhoto(picked.base64);
      applyReference(reference);
      Alert.alert('Food Identified', `Estimated as "${reference.name}" — adjust the weight or macros if needed.`);
    } catch (error) {
      Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Something went wrong while analyzing that photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    const kcal = parseInt(form.kcal, 10);
    if (!name || !Number.isFinite(kcal) || kcal <= 0) {
      Alert.alert('Missing Info', 'Please enter a meal name and a valid calorie amount.');
      return;
    }

    const meal: LoggedMeal = {
      name,
      type: (form.type.trim() || 'SNACK').toUpperCase(),
      detail: editing ? editing.detail : referenceRef.current ? `${round(parseFloat(form.weight) || 0)}g logged` : 'Logged manually',
      weightGrams: round(parseFloat(form.weight) || 0),
      kcal: round(kcal),
      protein: round(parseFloat(form.protein) || 0),
      carbs: round(parseFloat(form.carbs) || 0),
      fat: round(parseFloat(form.fat) || 0),
      image,
    };

    if (editing && onUpdate) {
      onUpdate(editing.id, meal);
    } else {
      onSubmit(meal);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editing || !onDelete) return;
    Alert.alert('Delete Meal', `Remove "${editing.name}" from your chronicle?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(editing.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
          <Pressable
            className="rounded-t-2xl border border-white/10 bg-surface-container-high"
            style={{ borderTopColor: 'rgba(255,255,255,0.18)', borderTopWidth: 1, maxHeight: '90%' }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="p-margin-mobile" style={{ gap: 4 }}>
              <H3>{editing ? 'Edit Meal' : 'Log Meal'}</H3>
              <BodyText>
                {editing ? 'Adjust the details or remove this entry.' : 'Add what you ate manually, or scan it to auto-fill the details.'}
              </BodyText>
            </View>

            <ScrollView
              className="px-margin-mobile"
              contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: 8 }}>
                <LabelCaps>Scan Food</LabelCaps>
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setScannerVisible(true)}
                    disabled={analyzing}
                    className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface-container active:opacity-70"
                    style={{ opacity: analyzing ? 0.5 : 1 }}
                  >
                    <MaterialIcons name="qr-code-scanner" size={18} color={colors.onSurface} />
                    <Text className="text-[12px] uppercase tracking-wider text-on-surface" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>
                      Scan Barcode
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSnapFoodPhoto}
                    disabled={analyzing}
                    className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-white/10 bg-surface-container active:opacity-70"
                    style={{ opacity: analyzing ? 0.5 : 1 }}
                  >
                    <MaterialIcons name="photo-camera" size={18} color={colors.onSurface} />
                    <Text className="text-[12px] uppercase tracking-wider text-on-surface" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>
                      Snap Food Photo
                    </Text>
                  </Pressable>
                </View>
                {analyzing ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color={colors.electricLime} />
                    <BodyText>Identifying your food…</BodyText>
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 8 }}>
                <LabelCaps>Photo</LabelCaps>
                {image ? (
                  <View className="flex-row items-center gap-3">
                    <View className="h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-surface-container">
                      <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
                    </View>
                    <Pressable onPress={() => setImage(null)} className="flex-row items-center gap-1 active:opacity-70">
                      <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
                      <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_700Bold' }}>
                        Remove Photo
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleAttachPhoto}
                    className="h-11 flex-row items-center justify-center gap-2 self-start rounded-lg border border-white/10 bg-surface-container px-md active:opacity-70"
                  >
                    <MaterialIcons name="add-a-photo" size={18} color={colors.onSurface} />
                    <Text className="text-[12px] uppercase tracking-wider text-on-surface" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1 }}>
                      Attach Photo
                    </Text>
                  </Pressable>
                )}
              </View>

              <View className="flex-row gap-3">
                <View style={{ flex: 1.4, gap: 6 }}>
                  <LabelCaps>Meal Name</LabelCaps>
                  <TextInput
                    value={form.name}
                    onChangeText={(text) => setField('name', text)}
                    placeholder="e.g. Greek Yogurt Bowl"
                    placeholderTextColor={colors.onSurfaceVariant}
                    className="h-12 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <LabelCaps>Type</LabelCaps>
                  <TextInput
                    value={form.type}
                    onChangeText={(text) => setField('type', text)}
                    placeholder="Breakfast"
                    placeholderTextColor={colors.onSurfaceVariant}
                    className="h-12 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <LabelCaps>Weight / Size (g)</LabelCaps>
                <TextInput
                  value={form.weight}
                  onChangeText={handleWeightChange}
                  placeholder="e.g. 250"
                  placeholderTextColor={colors.onSurfaceVariant}
                  keyboardType="numeric"
                  className="h-12 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
                />
                {referenceRef.current ? (
                  <BodyText className="text-[12px]">Macros below scale automatically as you adjust the weight.</BodyText>
                ) : null}
              </View>

              <View style={{ gap: 8 }}>
                <LabelCaps>Macros</LabelCaps>
                <View className="flex-row flex-wrap gap-3">
                  {([
                    { key: 'kcal' as const, label: 'Calories (kcal)' },
                    { key: 'protein' as const, label: 'Protein (g)' },
                    { key: 'carbs' as const, label: 'Carbs (g)' },
                    { key: 'fat' as const, label: 'Fat (g)' },
                  ]).map((field) => (
                    <View key={field.key} style={{ flexBasis: '47%', flexGrow: 1, gap: 6 }}>
                      <LabelCaps className="text-[10px]">{field.label}</LabelCaps>
                      <TextInput
                        value={form[field.key]}
                        onChangeText={(text) => setField(field.key, text)}
                        placeholder="0"
                        placeholderTextColor={colors.onSurfaceVariant}
                        keyboardType="numeric"
                        className="h-11 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                        style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {editing && onDelete ? (
              <View className="px-margin-mobile">
                <Pressable
                  onPress={handleDelete}
                  className="h-11 flex-row items-center justify-center gap-2 rounded-lg border border-error/30 active:opacity-70"
                >
                  <MaterialIcons name="delete-outline" size={18} color={colors.error} />
                  <Text className="text-[12px] uppercase tracking-wider text-error" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.4 }}>
                    Delete Meal
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View className="flex-row gap-3 p-margin-mobile" style={{ paddingBottom: 32 }}>
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
                  {editing ? 'Save Changes' : 'Log It'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      <BarcodeScannerModal visible={scannerVisible} onClose={() => setScannerVisible(false)} onScanned={handleBarcodeScanned} />
    </Modal>
  );
}
