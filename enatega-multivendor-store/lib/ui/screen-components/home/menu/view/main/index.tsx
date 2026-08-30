import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { useCurrency } from "@/lib/utils/methods/use-currency";
import ConfirmModal from "@/lib/ui/useable-components/confirm-modal";
import {
  RESTAURANT_ADDONS,
  RESTAURANT_CATEGORIES_PAGINATED,
} from "@/lib/apollo/queries/menu.query";
import {
  DELETE_ADDON,
  DELETE_CATEGORY,
  DELETE_FOOD,
  UPDATE_FOOD_OUT_OF_STOCK,
} from "@/lib/apollo/mutations/menu.mutation";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import NoRecordFound from "@/lib/ui/useable-components/no-record-found";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import CategoryFormSheet, {
  CategoryFormSheetHandle,
} from "@/lib/ui/screen-components/home/menu/category-form-sheet";
import FoodFormSheet, {
  FoodFormSheetHandle,
} from "@/lib/ui/screen-components/home/menu/food-form-sheet";
import AddonFormSheet, {
  AddonFormSheetHandle,
} from "@/lib/ui/screen-components/home/menu/addon-form-sheet";
import {
  IAddon,
  ICategory,
  IFood,
  IRestaurantAddonsResponse,
  IRestaurantCategoriesPaginatedResponse,
} from "@/lib/utils/interfaces/menu.interface";

type MenuTab = "menu" | "addons";

export default function MenuMain() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { format } = useCurrency();
  const { userId: restaurantId } = useUserContext();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState<MenuTab>("menu");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const categorySheetRef = useRef<CategoryFormSheetHandle>(null);
  const foodSheetRef = useRef<FoodFormSheetHandle>(null);
  const addonSheetRef = useRef<AddonFormSheetHandle>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const { data, loading } = useQuery<IRestaurantCategoriesPaginatedResponse>(
    RESTAURANT_CATEGORIES_PAGINATED,
    {
      variables: { restaurantId, page, limit: 10, search },
      skip: !restaurantId,
      fetchPolicy: "cache-and-network",
    },
  );

  const { data: addonsData, loading: loadingAddons } =
    useQuery<IRestaurantAddonsResponse>(RESTAURANT_ADDONS, {
      variables: { id: restaurantId },
      skip: !restaurantId,
      fetchPolicy: "cache-and-network",
    });

  const categories = data?.restaurantCategoriesPaginated?.data ?? [];
  const totalPages = data?.restaurantCategoriesPaginated?.totalPages ?? 1;
  const addons = addonsData?.restaurant?.addons ?? [];

  const categoriesRefetch = [
    {
      query: RESTAURANT_CATEGORIES_PAGINATED,
      variables: { restaurantId, page, limit: 10, search },
    },
  ];
  const addonsRefetch = [
    { query: RESTAURANT_ADDONS, variables: { id: restaurantId } },
  ];

  const [deleteCategory] = useMutation(DELETE_CATEGORY, {
    refetchQueries: categoriesRefetch,
    onError: (e) => showMessage({ message: e.message, type: "danger" }),
  });
  const [deleteFood] = useMutation(DELETE_FOOD, {
    refetchQueries: categoriesRefetch,
    onError: (e) => showMessage({ message: e.message, type: "danger" }),
  });
  const [deleteAddon] = useMutation(DELETE_ADDON, {
    refetchQueries: addonsRefetch,
    onError: (e) => showMessage({ message: e.message, type: "danger" }),
  });
  const [toggleOutOfStock] = useMutation(UPDATE_FOOD_OUT_OF_STOCK, {
    refetchQueries: categoriesRefetch,
    onError: (e) => showMessage({ message: e.message, type: "danger" }),
  });

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const confirmDeleteCategory = (category: ICategory) => {
    setPendingDelete({
      title: t("Delete Category"),
      message: t(`Delete "${category.title}" and all its food items?`),
      onConfirm: () =>
        deleteCategory({
          variables: { id: category._id, restaurant: restaurantId },
        }),
    });
  };

  const confirmDeleteFood = (food: IFood, categoryId: string) => {
    setPendingDelete({
      title: t("Delete Food Item"),
      message: t(`Delete "${food.title}"?`),
      onConfirm: () =>
        deleteFood({
          variables: { id: food._id, restaurant: restaurantId, categoryId },
        }),
    });
  };

  const confirmDeleteAddon = (addon: IAddon) => {
    setPendingDelete({
      title: t("Delete Addon"),
      message: t(`Delete "${addon.title}"?`),
      onConfirm: () =>
        deleteAddon({ variables: { id: addon._id, restaurant: restaurantId } }),
    });
  };

  const priceLabel = (food: IFood) => {
    if (!food.variations.length) return "";
    const prices = food.variations.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max
      ? format(min)
      : `${t("from")} ${format(min)}`;
  };

  const renderFoodRow = (food: IFood, category: ICategory) => (
    <View
      key={food._id}
      className="flex-row items-center justify-between px-4 py-3 border-b-[0.5px]"
      style={{ borderColor: appTheme.borderLineColor }}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className="h-10 w-10 rounded-md items-center justify-center overflow-hidden"
          style={{ backgroundColor: appTheme.sidebarIconBackground }}
        >
          {food.image ? (
            <Image
              source={{ uri: food.image }}
              style={{ width: 40, height: 40 }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="fast-food-outline" size={18} color={appTheme.iconColor} />
          )}
        </View>
        <View className="flex-1">
          <Text
            className="text-sm font-medium"
            style={{ color: appTheme.fontMainColor }}
            numberOfLines={1}
          >
            {food.title}
          </Text>
          <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
            {priceLabel(food)}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <CustomSwitch
          value={!food.isOutOfStock}
          onToggle={() =>
            toggleOutOfStock({
              variables: {
                id: food._id,
                restaurant: restaurantId,
                categoryId: category._id,
              },
            })
          }
        />
        <TouchableOpacity
          onPress={() => foodSheetRef.current?.open(category._id, food)}
        >
          <Ionicons name="pencil-outline" size={18} color={appTheme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDeleteFood(food, category._id)}>
          <Ionicons name="trash-outline" size={18} color={appTheme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategory = ({ item: category }: { item: ICategory }) => (
    <View
      className="border rounded-2xl mb-3 overflow-hidden"
      style={{
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.cartContainer,
      }}
    >
      <TouchableOpacity
        onPress={() => toggleExpanded(category._id)}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <View className="flex-row items-center gap-3 flex-1">
          <View
            className="h-10 w-10 rounded-md items-center justify-center overflow-hidden"
            style={{ backgroundColor: appTheme.sidebarIconBackground }}
          >
            {category.image ? (
              <Image
                source={{ uri: category.image }}
                style={{ width: 40, height: 40 }}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="grid-outline" size={18} color={appTheme.iconColor} />
            )}
          </View>
          <Text
            className="text-base font-semibold flex-1"
            style={{ color: appTheme.fontMainColor }}
            numberOfLines={1}
          >
            {category.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => categorySheetRef.current?.open(category)}
          >
            <Ionicons name="pencil-outline" size={18} color={appTheme.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDeleteCategory(category)}>
            <Ionicons name="trash-outline" size={18} color={appTheme.error} />
          </TouchableOpacity>
          <Ionicons
            name={expanded[category._id] ? "chevron-up" : "chevron-down"}
            size={18}
            color={appTheme.fontMainColor}
          />
        </View>
      </TouchableOpacity>

      {expanded[category._id] && (
        <View>
          {category.foods.length === 0 ? (
            <Text
              className="text-xs px-4 pb-2"
              style={{ color: appTheme.fontSecondColor }}
            >
              {t("No food items yet")}
            </Text>
          ) : (
            category.foods.map((food) => renderFoodRow(food, category))
          )}
          <TouchableOpacity
            onPress={() => foodSheetRef.current?.open(category._id)}
            className="flex-row items-center gap-2 px-4 py-3"
          >
            <Ionicons name="add-circle-outline" size={18} color={appTheme.primary} />
            <Text style={{ color: appTheme.primary }}>{t("Add Food Item")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderAddon = ({ item: addon }: { item: IAddon }) => (
    <View
      className="flex-row items-center justify-between px-4 py-3 border-b-[0.5px]"
      style={{ borderColor: appTheme.borderLineColor }}
    >
      <View className="flex-1">
        <Text
          className="text-sm font-medium"
          style={{ color: appTheme.fontMainColor }}
        >
          {addon.title}
        </Text>
        <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
          {addon.options.length} {t("options")}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity onPress={() => addonSheetRef.current?.open(addon)}>
          <Ionicons name="pencil-outline" size={18} color={appTheme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDeleteAddon(addon)}>
          <Ionicons name="trash-outline" size={18} color={appTheme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View
          className="flex-1 w-full self-center px-5 py-4"
          style={{
            backgroundColor: appTheme.themeBackground,
            maxWidth: isDesktop ? 1120 : undefined,
          }}
        >
          <View className="flex-row gap-2 p-1.5 rounded-2xl" style={{ backgroundColor: appTheme.sidebarIconBackground }}>
            <TouchableOpacity
              onPress={() => setActiveTab("menu")}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor:
                  activeTab === "menu"
                    ? appTheme.primary
                    : appTheme.sidebarIconBackground,
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === "menu" ? appTheme.black : appTheme.fontMainColor,
                }}
              >
                {t("Menu")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("addons")}
              className="flex-1 py-3 rounded-xl items-center"
              style={{
                backgroundColor:
                  activeTab === "addons"
                    ? appTheme.primary
                    : appTheme.sidebarIconBackground,
              }}
            >
              <Text
                style={{
                  color:
                    activeTab === "addons"
                      ? appTheme.black
                      : appTheme.fontMainColor,
                }}
              >
                {t("Addons")}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-3 py-5">
            {activeTab === "menu" ? (
              <TextInput
                className="flex-1 h-12 rounded-xl border px-4"
                placeholder={t("Search categories")}
                placeholderTextColor={appTheme.fontSecondColor}
                style={{ color: appTheme.fontSecondColor }}
                value={searchInput}
                onChangeText={setSearchInput}
              />
            ) : (
              <View className="flex-1" />
            )}
            <TouchableOpacity
              onPress={() =>
                activeTab === "menu"
                  ? categorySheetRef.current?.open()
                  : addonSheetRef.current?.open()
              }
              className="h-12 flex-row items-center gap-2 px-5 rounded-xl"
              style={{ backgroundColor: appTheme.primary }}
            >
              <Ionicons name="add" size={18} color={appTheme.black} />
              <Text style={{ color: appTheme.black }}>
                {activeTab === "menu" ? t("Category") : t("Addon")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "menu" ? (
            loading && categories.length === 0 ? (
              <SpinnerComponent />
            ) : categories.length === 0 ? (
              <NoRecordFound msg="No categories yet" />
            ) : (
              <>
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item._id}
                  renderItem={renderCategory}
                  contentContainerStyle={{ paddingBottom: 32 }}
                />
                {totalPages > 1 && (
                  <View className="flex-row items-center justify-center gap-4 py-3">
                    <TouchableOpacity
                      disabled={page <= 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={20}
                        color={
                          page <= 1 ? appTheme.fontSecondColor : appTheme.primary
                        }
                      />
                    </TouchableOpacity>
                    <Text style={{ color: appTheme.fontMainColor }}>
                      {page} / {totalPages}
                    </Text>
                    <TouchableOpacity
                      disabled={page >= totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={
                          page >= totalPages
                            ? appTheme.fontSecondColor
                            : appTheme.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )
          ) : loadingAddons && addons.length === 0 ? (
            <SpinnerComponent />
          ) : addons.length === 0 ? (
            <NoRecordFound msg="No addons yet" />
          ) : (
            <FlatList
              data={addons}
              keyExtractor={(item) => item._id}
              renderItem={renderAddon}
            />
          )}
        </View>

        <CategoryFormSheet
          ref={categorySheetRef}
          restaurantId={restaurantId ?? ""}
          page={page}
          search={search}
        />
        <FoodFormSheet
          ref={foodSheetRef}
          restaurantId={restaurantId ?? ""}
          page={page}
          search={search}
          addons={addons}
        />
        <AddonFormSheet ref={addonSheetRef} restaurantId={restaurantId ?? ""} />

        <ConfirmModal
          visible={!!pendingDelete}
          title={pendingDelete?.title ?? ""}
          message={pendingDelete?.message}
          confirmLabel={t("Delete")}
          destructive
          icon="trash-outline"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            pendingDelete?.onConfirm();
            setPendingDelete(null);
          }}
        />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
