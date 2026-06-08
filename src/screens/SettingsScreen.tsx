import React from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../components/GlassCard';
import { ClearDataModal } from '../components/ClearDataModal';
import { InputModal } from '../components/InputModal';
import { LabelCaps, H2, H3, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';
import { useCategories } from '../context/CategoriesContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useNutrition } from '../context/NutritionContext';

function SettingsRow({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-lg px-2 py-3 active:bg-surface-container-high"
    >
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={icon} size={20} color={colors.onSurfaceVariant} />
        <Text className="text-[14px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
          {label}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { categories, addCategory, removeCategory } = useCategories();
  const { replayOnboarding } = useOnboarding();
  const { dailyCalorieTarget, setDailyCalorieTarget } = useNutrition();
  const [newCategory, setNewCategory] = React.useState('');
  const [clearDataVisible, setClearDataVisible] = React.useState(false);
  const [calorieTargetVisible, setCalorieTargetVisible] = React.useState(false);

  const handleSetCalorieTarget = (values: Record<string, string>) => {
    const target = parseInt(values.target, 10);
    if (!Number.isFinite(target) || target <= 0) {
      Alert.alert('Invalid Limit', 'Please enter a valid number of calories.');
      return;
    }
    setDailyCalorieTarget(target);
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already Exists', `"${trimmed}" is already in your category list.`);
      return;
    }
    addCategory(trimmed);
    setNewCategory('');
  };

  const handleRemoveCategory = (name: string) => {
    Alert.alert('Remove Category', `Remove "${name}" from your progress photo categories?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeCategory(name) },
    ]);
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
        <H2>Settings</H2>
      </View>

      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12 }}>
          <LabelCaps>ACCOUNT</LabelCaps>
          <GlassCard className="p-2">
            <SettingsRow icon="person" label="Profile" onPress={() => Alert.alert('Profile', 'Profile editing is coming soon.')} />
            <View className="h-px bg-white/5" />
            <SettingsRow
              icon="notifications"
              label="Notifications"
              onPress={() => Alert.alert('Notifications', 'Notification preferences are coming soon.')}
            />
            <View className="h-px bg-white/5" />
            <SettingsRow
              icon="logout"
              label="Log Out"
              onPress={() =>
                Alert.alert('Log Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: () => Alert.alert('Logged Out', "You've been logged out.") },
                ])
              }
            />
          </GlassCard>
        </View>

        <View style={{ gap: 12 }}>
          <LabelCaps>HELP</LabelCaps>
          <GlassCard className="p-2">
            <SettingsRow icon="school" label="Replay Tutorial" onPress={replayOnboarding} />
          </GlassCard>
        </View>

        <View style={{ gap: 12 }}>
          <LabelCaps>NUTRITION</LabelCaps>
          <GlassCard className="p-2">
            <Pressable
              onPress={() => setCalorieTargetVisible(true)}
              className="flex-row items-center justify-between rounded-lg px-2 py-3 active:bg-surface-container-high"
            >
              <View className="flex-row items-center gap-3">
                <MaterialIcons name="local-fire-department" size={20} color={colors.onSurfaceVariant} />
                <View>
                  <Text className="text-[14px] text-on-surface" style={{ fontFamily: 'Inter_400Regular' }}>
                    Daily Calorie Limit
                  </Text>
                  <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                    {dailyCalorieTarget.toLocaleString()} kcal / day
                  </Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </GlassCard>
        </View>

        <View style={{ gap: 12 }}>
          <LabelCaps>PROGRESS PHOTO CATEGORIES</LabelCaps>
          <GlassCard className="p-md" style={{ gap: 16 }}>
            <BodyText>Organize your progress photos by muscle group. Remove ones you don't need or add your own.</BodyText>

            <View className="flex-row flex-wrap gap-2">
              {categories.length === 0 ? (
                <BodyText className="text-on-surface-variant">No categories yet — add one below.</BodyText>
              ) : (
                categories.map((category) => (
                  <View
                    key={category}
                    className="flex-row items-center gap-1.5 rounded-full border border-white/10 bg-surface-container-high py-1 pl-3 pr-1.5"
                  >
                    <Text className="text-[12px] text-on-surface" style={{ fontFamily: 'Inter_700Bold', letterSpacing: 0.4 }}>
                      {category}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveCategory(category)}
                      hitSlop={8}
                      className="h-6 w-6 items-center justify-center rounded-full active:bg-surface-container-highest"
                    >
                      <MaterialIcons name="close" size={14} color={colors.onSurfaceVariant} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            <View className="flex-row items-center gap-2">
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="e.g. Shoulders"
                placeholderTextColor={colors.onSurfaceVariant}
                onSubmitEditing={handleAddCategory}
                returnKeyType="done"
                className="h-11 flex-1 rounded-lg border border-white/10 bg-surface-container px-md text-on-surface"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14 }}
              />
              <Pressable
                onPress={handleAddCategory}
                className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container active:scale-95"
              >
                <MaterialIcons name="add" size={22} color={colors.onPrimaryContainer} />
              </Pressable>
            </View>
          </GlassCard>
        </View>

        <View style={{ gap: 12 }}>
          <LabelCaps style={{ color: colors.error }}>DANGER ZONE</LabelCaps>
          <Pressable
            onPress={() => setClearDataVisible(true)}
            className="flex-row items-center gap-3 rounded-xl border px-md py-md active:scale-[0.98]"
            style={{ borderColor: 'rgba(255,180,171,0.35)', backgroundColor: 'rgba(255,180,171,0.08)' }}
          >
            <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,180,171,0.16)' }}>
              <MaterialIcons name="delete-forever" size={22} color={colors.error} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text className="text-[14px] text-error" style={{ fontFamily: 'Inter_700Bold' }}>
                Clear All Data
              </Text>
              <Text className="text-[12px] text-on-surface-variant" style={{ fontFamily: 'Inter_400Regular' }}>
                Permanently erase workouts, meals, photos, and categories
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.error} />
          </Pressable>
        </View>
      </ScrollView>

      <ClearDataModal visible={clearDataVisible} onClose={() => setClearDataVisible(false)} />

      <InputModal
        visible={calorieTargetVisible}
        title="Daily Calorie Limit"
        subtitle="Set the daily calorie target used across your Dashboard and Nutrition screens."
        fields={[{ key: 'target', label: 'Calories per day', placeholder: `e.g. ${dailyCalorieTarget}`, keyboardType: 'numeric' }]}
        onSubmit={handleSetCalorieTarget}
        onClose={() => setCalorieTargetVisible(false)}
      />
    </View>
  );
}
