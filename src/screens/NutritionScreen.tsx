import React from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../components/TopAppBar';
import { GlassCard } from '../components/GlassCard';
import { LogMealModal, LoggedMeal } from '../components/LogMealModal';
import { useNutrition, MealEntry } from '../context/NutritionContext';
import { LabelCaps, H3, StatDisplay, BodyText, H2 } from '../components/Labels';
import { colors } from '../theme/colors';

export function NutritionScreen() {
  const navigation = useNavigation<any>();
  const { meals, addMeal, updateMeal, removeMeal, consumedToday, dailyCalorieTarget } = useNutrition();
  const [mealModalVisible, setMealModalVisible] = React.useState(false);
  const [editingMeal, setEditingMeal] = React.useState<MealEntry | null>(null);

  const remaining = Math.max(0, dailyCalorieTarget - consumedToday);
  const progressPct = Math.min(100, Math.round((consumedToday / dailyCalorieTarget) * 100));

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
        {/* Hero: Daily fuel */}
        <GlassCard className="p-md" style={{ gap: 8 }}>
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

        <Pressable
          onPress={openMealLogger}
          className="flex-row items-center justify-center gap-2 rounded-lg bg-primary-container px-md py-md active:scale-95"
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
