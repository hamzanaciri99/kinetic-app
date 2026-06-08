import React from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../components/TopAppBar';
import { GlassCard } from '../components/GlassCard';
import { ProgressRing } from '../components/ProgressRing';
import { LogMealModal, LoggedMeal } from '../components/LogMealModal';
import { useNutrition, MealEntry } from '../context/NutritionContext';
import { LabelCaps, H2, H3, StatDisplay, BodyText } from '../components/Labels';
import { colors } from '../theme/colors';

const MACRO_TARGETS = {
  protein: { target: 180, color: colors.electricLime },
  carbs: { target: 250, color: colors.cyberBlue },
  fat: { target: 65, color: colors.onSurface },
};

export function NutritionScreen() {
  const navigation = useNavigation<any>();
  const { meals, addMeal, updateMeal, removeMeal, consumedToday, macroTotalsToday, dailyCalorieTarget } = useNutrition();
  const [mealModalVisible, setMealModalVisible] = React.useState(false);
  const [editingMeal, setEditingMeal] = React.useState<MealEntry | null>(null);

  const remaining = Math.max(0, dailyCalorieTarget - consumedToday);
  const progressPct = Math.min(100, Math.round((consumedToday / dailyCalorieTarget) * 100));

  // "Recovery Index" reflects how closely today's protein and carb intake track their daily targets —
  // the two macros most tied to training recovery — derived straight from logged meals, never invented.
  const proteinAdherence = Math.min(1, macroTotalsToday.protein / MACRO_TARGETS.protein.target);
  const carbsAdherence = Math.min(1, macroTotalsToday.carbs / MACRO_TARGETS.carbs.target);
  const recoveryIndexPct = Math.round(((proteinAdherence + carbsAdherence) / 2) * 100);

  const macros = (['protein', 'carbs', 'fat'] as const).map((key) => {
    const { target, color } = MACRO_TARGETS[key];
    const value = macroTotalsToday[key];
    return {
      label: key.toUpperCase(),
      value,
      target,
      pct: Math.min(1, value / target),
      color,
      labelColor: color,
    };
  });

  const handleLogMeal = (logged: LoggedMeal) => {
    addMeal({
      name: logged.name,
      meal: logged.type,
      detail: logged.detail,
      kcal: logged.kcal,
      protein: logged.protein,
      carbs: logged.carbs,
      fat: logged.fat,
      weightGrams: logged.weightGrams,
      image: logged.image ?? meals[0]?.image ?? null,
    });
    Alert.alert('Meal Logged', `"${logged.name}" (${logged.kcal} kcal) added to today's chronicle.`);
  };

  const handleUpdateMeal = (id: string, logged: LoggedMeal) => {
    updateMeal(id, {
      name: logged.name,
      meal: logged.type,
      detail: logged.detail,
      kcal: logged.kcal,
      protein: logged.protein,
      carbs: logged.carbs,
      fat: logged.fat,
      weightGrams: logged.weightGrams,
      image: logged.image,
    });
  };

  const openMealEditor = (meal: MealEntry) => {
    setEditingMeal(meal);
    setMealModalVisible(true);
  };

  const openMealLogger = () => {
    setEditingMeal(null);
    setMealModalVisible(true);
  };

  const closeMealModal = () => {
    setMealModalVisible(false);
    setEditingMeal(null);
  };

  const todaysMeals = React.useMemo(() => {
    const today = new Date();
    return meals.filter((m) => {
      const logged = new Date(m.loggedAt);
      return logged.getFullYear() === today.getFullYear() && logged.getMonth() === today.getMonth() && logged.getDate() === today.getDate();
    });
  }, [meals]);

  return (
    <View className="flex-1 bg-background">
      <TopAppBar onSettingsPress={() => navigation.navigate('Settings')} />
      <ScrollView
        className="flex-1 px-margin-mobile"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Daily fuel + recovery ring */}
        <View className="flex-row flex-wrap gap-gutter">
          <GlassCard className="flex-[1.4] justify-center p-md" style={{ minWidth: 220, gap: 8 }}>
            <View className="flex-row items-center justify-between">
              <LabelCaps>DAILY FUEL</LabelCaps>
              <Pressable onPress={() => navigation.navigate('NutritionHistory')} hitSlop={8} className="flex-row items-center gap-1 active:opacity-70">
                <LabelCaps style={{ color: colors.electricLime }}>HISTORY</LabelCaps>
                <MaterialIcons name="chevron-right" size={16} color={colors.electricLime} />
              </Pressable>
            </View>
            <View className="flex-row items-baseline gap-1">
              <StatDisplay
                className="text-[30px] leading-[30px]"
                style={{ textShadowColor: 'rgba(174,213,0,0.4)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } }}
              >
                {consumedToday.toLocaleString()}
              </StatDisplay>
              <H3 className="text-on-surface-variant">/ {dailyCalorieTarget.toLocaleString()} kcal</H3>
            </View>
            <View className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: colors.electricLime,
                  shadowColor: colors.electricLime,
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                }}
              />
            </View>
            <BodyText className="mt-1">
              {remaining > 0 ? `${remaining.toLocaleString()} kcal remaining to reach peak performance.` : "You've hit your target for today."}
            </BodyText>
          </GlassCard>

          <GlassCard className="flex-1 items-center justify-between p-md" style={{ minWidth: 160, gap: 12 }}>
            <LabelCaps>RECOVERY INDEX</LabelCaps>
            <ProgressRing
              size={112}
              strokeWidth={8}
              rings={[
                { progress: proteinAdherence, color: colors.cyberBlue, glowColor: colors.cyberBlue },
                { progress: carbsAdherence, color: colors.electricLime, glowColor: colors.electricLime },
              ]}
            >
              <H3 className="text-primary">{recoveryIndexPct}%</H3>
            </ProgressRing>
            <View />
          </GlassCard>
        </View>

        {/* Macro precision */}
        <GlassCard className="p-md" style={{ gap: 24 }}>
          <View className="flex-row items-end justify-between">
            <View>
              <H3>MACRO PRECISION</H3>
              <BodyText>Actual vs. Target Alignment</BodyText>
            </View>
            <Pressable
              onPress={openMealLogger}
              className="flex-row items-center gap-2 rounded-lg bg-primary-container px-md py-sm active:scale-95"
              style={{ shadowColor: colors.electricLimeDim, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 }}
            >
              <MaterialIcons name="add" size={18} color={colors.onPrimaryContainer} />
              <Text
                className="text-[11px] uppercase tracking-wider text-on-primary-container"
                style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.4 }}
              >
                Log Meal
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: 20 }}>
            {macros.map((m) => (
              <View key={m.label} className="flex-row items-center gap-gutter">
                <View style={{ width: 76 }}>
                  <Text
                    className="text-[11px] uppercase tracking-wider"
                    style={{ fontFamily: 'Inter_700Bold', letterSpacing: 1.1, color: m.labelColor }}
                  >
                    {m.label}
                  </Text>
                  <View className="flex-row items-baseline">
                    <H3 className="text-[17px]">{m.value}</H3>
                    <BodyText className="text-[12px]">/{m.target}g</BodyText>
                  </View>
                </View>
                <View className="h-12 flex-1 justify-center overflow-hidden rounded-lg bg-surface-container-low px-1">
                  <View className="absolute inset-y-2 left-2 right-2 rounded-md bg-surface-container-highest" />
                  <View
                    className="ml-2 h-4 rounded-full"
                    style={{
                      width: `${m.pct * 100}%`,
                      backgroundColor: m.color,
                      shadowColor: m.color,
                      shadowOpacity: 0.45,
                      shadowRadius: 8,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Daily chronicle */}
        <View style={{ gap: 16 }}>
          <H3>DAILY CHRONICLE</H3>
          <View style={{ gap: 8 }}>
            {todaysMeals.length === 0 ? (
              <GlassCard className="items-center p-lg">
                <BodyText className="text-on-surface-variant">No meals logged today yet — tap "Log Meal" to add one.</BodyText>
              </GlassCard>
            ) : (
              todaysMeals.map((meal) => (
                <Pressable key={meal.id} onPress={() => openMealEditor(meal)} className="overflow-hidden rounded-xl active:opacity-80">
                  <GlassCard className="flex-row items-center justify-between p-gutter">
                    <View className="flex-row items-center gap-gutter" style={{ flexShrink: 1 }}>
                      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-surface-container-high">
                        {meal.image ? (
                          <Image source={{ uri: meal.image }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <MaterialIcons name="restaurant" size={20} color={colors.onSurfaceVariant} />
                        )}
                      </View>
                      <View style={{ flexShrink: 1, gap: 2 }}>
                        <LabelCaps style={{ color: colors.electricLime }}>{meal.meal}</LabelCaps>
                        <H3 className="text-[15px] leading-[19px]">{meal.name}</H3>
                        <Text
                          numberOfLines={1}
                          className="text-[12px] text-on-surface-variant"
                          style={{ fontFamily: 'Inter_400Regular' }}
                        >
                          {meal.detail}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end pl-2">
                      <H2 className="text-[20px]">{meal.kcal}</H2>
                      <LabelCaps>KCAL</LabelCaps>
                    </View>
                  </GlassCard>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <LogMealModal
        visible={mealModalVisible}
        onClose={closeMealModal}
        onSubmit={handleLogMeal}
        editing={editingMeal}
        onUpdate={handleUpdateMeal}
        onDelete={removeMeal}
      />
    </View>
  );
}
