import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import {
  CREATE_FOOD,
  CREATE_SUB_CATEGORIES,
  EDIT_FOOD,
} from "@/lib/apollo/mutations/menu.mutation";
import { UPLOAD_IMAGE_TO_S3 } from "@/lib/apollo/mutations/upload.mutation";
import {
  RESTAURANT_CATEGORIES_PAGINATED,
  SUBCATEGORIES_BY_PARENT_ID,
} from "@/lib/apollo/queries/menu.query";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import {
  IAddon,
  IFood,
  ISubCategory,
  IVariation,
} from "@/lib/utils/interfaces/menu.interface";

export interface FoodFormSheetHandle {
  open: (categoryId: string, food?: IFood) => void;
}

// Short price-range hint for an addon chip, e.g. " · +₹10-40" — so a vendor
// can see roughly what a customisation group costs without opening it.
function addonPriceHint(addon: IAddon): string {
  const prices = (addon.options ?? []).map((o) => o.price).filter((p) => p > 0);
  if (!prices.length) return "";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? ` · +₹${min}` : ` · +₹${min}-${max}`;
}

interface Props {
  restaurantId: string;
  page: number;
  search: string;
  addons: IAddon[];
  onCreateAddon?: () => void;
}

let variationKeySeq = 0;

interface VariationRow extends Partial<IVariation> {
  key: string;
}

const FoodFormSheet = forwardRef<FoodFormSheetHandle, Props>(
  ({ restaurantId, page, search, addons, onCreateAddon }, ref) => {
    const { appTheme } = useApptheme();
    const { t } = useTranslation();
    const { dataProfile } = useUserContext();
    const sheetRef = useRef<ResponsiveFormSheetHandle>(null);
    const { width } = useWindowDimensions();
    // A side-by-side layout with an always-visible price panel only fits a
    // desktop-width browser — narrower windows (including the web build
    // opened on a phone) keep the single-column sheet with the tap-to-open
    // price dialog instead. Native app screens are never this wide.
    const isWideLayout = Platform.OS === "web" && width >= 860;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [gstRatePercent, setGstRatePercent] = useState("");
    const [subCategoryId, setSubCategoryId] = useState("");
    const [showNewSubCategory, setShowNewSubCategory] = useState(false);
    const [newSubCategoryTitle, setNewSubCategoryTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [variations, setVariations] = useState<VariationRow[]>([]);
    // On narrow screens, existing variations start collapsed (see
    // toggleVariationCollapse) so a food with 10+ of them opens as a
    // scannable list instead of a wall of fully-expanded cards; a variation
    // added in this session stays expanded. On wide screens this is an
    // accordion instead — exactly one variation open at a time, matching
    // whichever one the always-visible price panel is describing.
    const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>(
      {},
    );
    // Which variation the wide-layout price panel currently describes. Kept
    // as an id rather than derived state so it survives re-renders; if it
    // ever points at a since-removed variation, every read falls back to
    // variations[0] (see activeVariation below) instead of going stale.
    const [activeVariationKey, setActiveVariationKey] = useState<string | null>(
      null,
    );
    const [priceInfoKey, setPriceInfoKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [addonQuery, setAddonQuery] = useState<Record<string, string>>({});

    const { data: subCategoriesData, refetch: refetchSubCategories } = useQuery(
      SUBCATEGORIES_BY_PARENT_ID,
      {
        variables: { parentCategoryId: categoryId },
        skip: !categoryId,
        fetchPolicy: "cache-and-network",
      },
    ) as {
      data?: { subCategoriesByParentId: ISubCategory[] };
      refetch: (vars: {
        parentCategoryId: string;
      }) => Promise<{ data: { subCategoriesByParentId: ISubCategory[] } }>;
    };
    const [createSubCategoriesMutation, { loading: creatingSubCategory }] =
      useMutation(CREATE_SUB_CATEGORIES);

    useImperativeHandle(ref, () => ({
      open: (targetCategoryId: string, food?: IFood) => {
        setCategoryId(targetCategoryId);
        setEditingId(food?._id ?? null);
        setTitle(food?.title ?? "");
        setDescription(food?.description ?? "");
        setImages(
          food?.images?.length ? food.images : food?.image ? [food.image] : [],
        );
        setIsActive(food?.isActive ?? true);
        setGstRatePercent(
          food?.gstRatePercent != null ? String(food.gstRatePercent) : "",
        );
        setSubCategoryId(food?.subCategory ?? "");
        setShowNewSubCategory(false);
        setNewSubCategoryTitle("");
        const initialVariations = food?.variations?.length
          ? food.variations.map((v) => ({
              ...v,
              key: `existing-${v._id}`,
            }))
          : [
              {
                key: `new-${variationKeySeq++}`,
                title: "Regular",
                price: 0,
                addons: [],
              },
            ];
        setVariations(initialVariations);
        setActiveVariationKey(initialVariations[0]?.key ?? null);
        setCollapsedKeys(
          isWideLayout
            ? Object.fromEntries(
                initialVariations.map((v, i): [string, boolean] => [
                  v.key,
                  i !== 0,
                ]),
              )
            : food?.variations?.length
              ? Object.fromEntries(
                  initialVariations.map((v): [string, boolean] => [
                    v.key,
                    true,
                  ]),
                )
              : {},
        );
        setPriceInfoKey(null);
        setError("");
        sheetRef.current?.present();
      },
    }));

    const refetchQueries = [
      {
        query: RESTAURANT_CATEGORIES_PAGINATED,
        variables: { restaurantId, page, limit: 10, search },
      },
    ];

    const [createFood, { loading: creating }] = useMutation(CREATE_FOOD, {
      refetchQueries,
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Food item created"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const [editFood, { loading: editing }] = useMutation(EDIT_FOOD, {
      refetchQueries,
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Food item updated"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const [uploadImage] = useMutation(UPLOAD_IMAGE_TO_S3);
    const MAX_IMAGES = 5;

    const handlePickImages = async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage({
          message: t("Permission to access photos is required"),
          type: "danger",
        });
        return;
      }
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        showMessage({
          message: t(`You can add up to ${MAX_IMAGES} images`),
          type: "warning",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.6,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
      if (result.canceled || !result.assets?.length) return;

      try {
        setUploading(true);
        const uploaded: string[] = [];
        for (const asset of result.assets) {
          if (!asset.base64) continue;
          const dataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
          const { data } = await uploadImage({ variables: { image: dataUrl } });
          if (data?.uploadImageToS3?.imageUrl) {
            uploaded.push(data.uploadImageToS3.imageUrl);
          }
        }
        setImages((prev) => [...prev, ...uploaded]);
      } catch (e) {
        showMessage({ message: (e as Error).message, type: "danger" });
      } finally {
        setUploading(false);
      }
    };

    const removeImage = (index: number) => {
      setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const addVariationRow = () => {
      const newKey = `new-${variationKeySeq++}`;
      setVariations((prev) => [
        ...prev,
        { key: newKey, title: "", price: 0, addons: [] },
      ]);
      if (isWideLayout) {
        setActiveVariationKey(newKey);
        setCollapsedKeys((prev) => {
          const next: Record<string, boolean> = {};
          Object.keys(prev).forEach((k) => {
            next[k] = true;
          });
          next[newKey] = false;
          return next;
        });
      }
    };

    const removeVariationRow = (key: string) => {
      setVariations((prev) => prev.filter((v) => v.key !== key));
    };

    const updateVariationField = (
      key: string,
      field: "title" | "price" | "discounted",
      value: string,
    ) => {
      setVariations((prev) =>
        prev.map((v) =>
          v.key === key
            ? {
                ...v,
                [field]: field === "title" ? value : Number(value) || 0,
              }
            : v,
        ),
      );
    };

    const toggleVariationCollapse = (key: string) => {
      if (isWideLayout) {
        // Accordion: tapping a row always opens it (never down to "none
        // open") since the price panel needs an active variation to show.
        setActiveVariationKey(key);
        setCollapsedKeys(() => {
          const next: Record<string, boolean> = {};
          variations.forEach((v) => {
            next[v.key] = v.key !== key;
          });
          return next;
        });
      } else {
        setCollapsedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
      }
    };

    const handleCreateSubCategory = async () => {
      const titleTrimmed = newSubCategoryTitle.trim();
      if (!titleTrimmed || !categoryId) return;
      try {
        await createSubCategoriesMutation({
          variables: {
            subCategories: [
              { title: titleTrimmed, parentCategoryId: categoryId },
            ],
          },
        });
        const { data } = await refetchSubCategories({
          parentCategoryId: categoryId,
        });
        const created = data?.subCategoriesByParentId?.find(
          (sc) => sc.title === titleTrimmed,
        );
        if (created) setSubCategoryId(created._id);
        setNewSubCategoryTitle("");
        setShowNewSubCategory(false);
      } catch (e) {
        showMessage({ message: (e as Error).message, type: "danger" });
      }
    };

    const toggleVariationAddon = (key: string, addonId: string) => {
      setVariations((prev) =>
        prev.map((v) => {
          if (v.key !== key) return v;
          const current = v.addons ?? [];
          const next = current.includes(addonId)
            ? current.filter((id) => id !== addonId)
            : [...current, addonId];
          return { ...v, addons: next };
        }),
      );
    };

    const handleSubmit = () => {
      if (!title.trim()) {
        setError(t("Title is required"));
        return;
      }
      if (!variations.length) {
        setError(t("At least one variation is required"));
        return;
      }
      if (variations.some((v) => !v.title?.trim())) {
        setError(t("Every variation needs a title"));
        return;
      }
      const foodInput = {
        _id: editingId ?? undefined,
        restaurant: restaurantId,
        category: categoryId,
        subCategory: subCategoryId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        images,
        isActive,
        gstRatePercent: gstRatePercent.trim() ? Number(gstRatePercent) : null,
        variations: variations.map((v) => ({
          _id: v._id,
          title: (v.title ?? "").trim(),
          price: v.price ?? 0,
          discounted: v.discounted ?? undefined,
          isOutOfStock: v.isOutOfStock ?? false,
          addons: v.addons ?? [],
        })),
      };
      if (editingId) {
        editFood({ variables: { foodInput } });
      } else {
        createFood({ variables: { foodInput } });
      }
    };

    const loading = creating || editing;

    // Falls back to the first variation if activeVariationKey points at one
    // that's since been removed, instead of needing removeVariationRow to
    // keep it in sync.
    const activeVariation =
      variations.find((v) => v.key === activeVariationKey) ?? variations[0];

    // This item's own GST rate if the vendor set one, else the store's
    // default (Restaurant.tax) — mirrors buildOrderItems in the API
    // (food.gstRatePercent ?? defaultGstRate) so this preview always matches
    // what actually gets charged.
    const effectiveGstRate = gstRatePercent.trim()
      ? Number(gstRatePercent) || 0
      : (dataProfile?.tax ?? 0);

    const buildPriceBreakdown = (variation: VariationRow) => {
      const priceValue = variation.price ?? 0;
      const commissionRateValue = Number(dataProfile?.commissionRate) || 20;
      const commissionAmount =
        Math.round(priceValue * (commissionRateValue / 100) * 100) / 100;
      const netAmount = Math.round((priceValue - commissionAmount) * 100) / 100;
      const gstType = dataProfile?.gstRegistrationType;
      const gstAmount =
        gstType === "REGULAR"
          ? Math.round(priceValue * (effectiveGstRate / 100) * 100) / 100
          : 0;
      const customerPays = Math.round((priceValue + gstAmount) * 100) / 100;
      return {
        priceValue,
        commissionRateValue,
        commissionAmount,
        netAmount,
        gstType,
        gstAmount,
        customerPays,
      };
    };

    const renderPriceBreakdownContent = (variation: VariationRow) => {
      const {
        priceValue,
        commissionRateValue,
        commissionAmount,
        netAmount,
        gstType,
        gstAmount,
        customerPays,
      } = buildPriceBreakdown(variation);
      const money = (amount: number) => `\u20b9${amount.toFixed(2)}`;
      const row = (label: string, amount: string, strong = false) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              flex: 1,
              color: appTheme.fontMainColor,
              fontSize: 13,
              lineHeight: 20,
              fontWeight: strong ? "600" : "400",
            }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 0,
              color: appTheme.fontMainColor,
              fontSize: 13,
              lineHeight: 20,
              fontWeight: strong ? "700" : "500",
            }}
          >
            {amount}
          </Text>
        </View>
      );
      return (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: appTheme.fontSecondColor,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {t("CUSTOMER TOTAL")}
            </Text>
            {row(t("Item price"), money(priceValue))}
            {gstType === "REGULAR" &&
              row(`${t("GST")} (${effectiveGstRate}%)`, `+${money(gstAmount)}`)}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: appTheme.borderLineColor,
                paddingTop: 10,
              }}
            >
              {row(t("Customer pays"), money(customerPays), true)}
            </View>
          </View>
          <View style={{ gap: 10 }}>
            <Text
              style={{
                color: appTheme.fontSecondColor,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
              }}
            >
              {t("YOUR EARNINGS")}
            </Text>
            {row(t("Item price"), money(priceValue))}
            {row(
              `${t("Platform fee")} (${commissionRateValue}%)`,
              `\u2212${money(commissionAmount)}`,
            )}
            <Text
              style={{
                color: appTheme.fontSecondColor,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              {commissionRateValue}% {"\u00d7"} {money(priceValue)} ={" "}
              {money(commissionAmount)}
            </Text>
            <View
              style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: "#DCFCE7",
                gap: 6,
              }}
            >
              <Text
                style={{ color: "#166534", fontSize: 13, fontWeight: "600" }}
              >
                {t("You receive")}
              </Text>
              <Text
                style={{ color: "#166534", fontSize: 28, fontWeight: "700" }}
              >
                {money(netAmount)}
              </Text>
              <Text style={{ color: "#166534", fontSize: 12 }}>
                {money(priceValue)} {"\u2212"} {money(commissionAmount)}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: appTheme.fontSecondColor,
              fontSize: 12,
              lineHeight: 19,
            }}
          >
            {gstType === "REGULAR"
              ? t(
                  "GST is added to the customer's bill. Your payout is the item price minus the platform fee; GST is not deducted again.",
                )
              : t(
                  "No GST is added. Your payout is the item price minus the platform fee.",
                )}
          </Text>
          <Text
            style={{
              color: appTheme.fontSecondColor,
              fontSize: 12,
              lineHeight: 19,
            }}
          >
            {t(
              "Preview for one item at the selling price, before discounts, add-ons or delivery charges.",
            )}
          </Text>
        </View>
      );
    };

    return (
      <ResponsiveFormSheet
        ref={sheetRef}
        snapPoint="90%"
        maxWidth={isWideLayout ? 1080 : 480}
        header={
          isWideLayout ? (
            <View className="flex-row justify-between items-start">
              <View className="flex-1" style={{ paddingRight: 16 }}>
                <Text
                  className="text-xl font-semibold"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {editingId ? t("Edit Food Item") : t("Add Food Item")}
                </Text>
                <Text
                  className="text-sm mt-1"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  {editingId
                    ? t(
                        "Update the details, variations and pricing for this item.",
                      )
                    : t(
                        "Add the details, variations and pricing for this item.",
                      )}
                </Text>
              </View>
              <TouchableOpacity onPress={() => sheetRef.current?.dismiss()}>
                <Ionicons
                  name="close"
                  size={22}
                  color={appTheme.fontSecondColor}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              className="text-lg font-semibold"
              style={{ color: appTheme.fontMainColor }}
            >
              {editingId ? t("Edit Food Item") : t("Add Food Item")}
            </Text>
          )
        }
        sidebar={
          isWideLayout && (
            <View style={{ flex: 1 }}>
              <View
                className="rounded-xl p-4 gap-5"
                style={{
                  backgroundColor: appTheme.themeBackground,
                  borderWidth: 1,
                  borderColor: appTheme.borderLineColor,
                }}
              >
                <View>
                  <Text
                    className="text-base font-semibold"
                    style={{ color: appTheme.primary }}
                  >
                    {t("Price summary")}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: appTheme.fontSecondColor }}
                  >
                    {t("Breakdown for")}{" "}
                    {activeVariation?.title?.trim() || t("Untitled")} (₹
                    {activeVariation?.price ?? 0})
                  </Text>
                </View>
                {activeVariation &&
                  renderPriceBreakdownContent(activeVariation)}
              </View>
            </View>
          )
        }
        footer={
          <View style={{ gap: 8 }}>
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: appTheme.error }}>
                {error}
              </Text>
            )}
            {isWideLayout ? (
              <View className="flex-row justify-end items-center gap-3">
                <TouchableOpacity
                  onPress={() => sheetRef.current?.dismiss()}
                  accessibilityRole="button"
                  style={{
                    height: 48,
                    minWidth: 104,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: appTheme.borderLineColor,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: appTheme.fontMainColor }}>
                    {t("Cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={loading || uploading}
                  onPress={handleSubmit}
                  style={{
                    height: 48,
                    minWidth: 164,
                    paddingHorizontal: 24,
                    borderRadius: 10,
                    backgroundColor: appTheme.primary,
                    opacity: loading || uploading ? 0.6 : 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: appTheme.white,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {loading
                      ? t("Please wait")
                      : editingId
                        ? t("Save changes")
                        : t("Add Food Item")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CustomContinueButton
                title={loading ? t("Please wait") : t("Save")}
                isLoading={loading}
                onPress={handleSubmit}
                disabled={uploading}
              />
            )}
          </View>
        }
      >
        <View style={{ gap: 20 }}>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: appTheme.fontMainColor,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {t("Item details")}
            </Text>
            <Text style={{ color: appTheme.fontSecondColor, fontSize: 13 }}>
              {t("Add photos and a description to help customers choose.")}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {images.map((uri, index) => (
              <View
                key={`${uri}-${index}`}
                className="h-24 w-24 rounded-md overflow-hidden"
              >
                <Image
                  source={{ uri }}
                  style={{ width: 96, height: 96 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  className="absolute top-1 right-1 h-5 w-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: appTheme.error }}
                >
                  <Ionicons name="close" size={14} color={appTheme.white} />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < MAX_IMAGES && (
              <TouchableOpacity
                onPress={handlePickImages}
                className="h-24 w-24 rounded-xl items-center justify-center overflow-hidden gap-2"
                accessibilityRole="button"
                accessibilityLabel={t("Add photos")}
                disabled={uploading}
                style={{ backgroundColor: appTheme.sidebarIconBackground }}
              >
                {uploading ? (
                  <SpinnerComponent height={20} />
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={28}
                      color={appTheme.primary}
                    />
                    <Text
                      style={{
                        color: appTheme.primary,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {t("Add photos")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
              {t("Title")}
            </Text>
            <TextInput
              className={`rounded-md border p-3 ${error ? "border-red-600 border-2" : "border-gray-300"}`}
              value={title}
              placeholder={t("e.g. Cheeseburger")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontMainColor }}
              onChangeText={(val) => {
                setError("");
                setTitle(val);
              }}
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
              {t("Description")}
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 p-3"
              value={description}
              placeholder={t("Optional")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontMainColor }}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              numberOfLines={3}
            />
          </View>

          <View className="gap-2">
            <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
              {t("Sub-Category (optional)")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(subCategoriesData?.subCategoriesByParentId ?? []).map((sc) => {
                const selected = subCategoryId === sc._id;
                return (
                  <TouchableOpacity
                    key={sc._id}
                    onPress={() => setSubCategoryId(selected ? "" : sc._id)}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor: selected
                        ? appTheme.primary
                        : appTheme.themeBackground,
                      borderWidth: 1,
                      borderColor: selected
                        ? appTheme.primary
                        : appTheme.borderLineColor,
                    }}
                  >
                    <Text
                      className="text-xs"
                      style={{
                        color: selected
                          ? appTheme.white
                          : appTheme.fontMainColor,
                      }}
                    >
                      {sc.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                onPress={() => setShowNewSubCategory((prev) => !prev)}
                className="flex-row items-center gap-1 rounded-full px-3 py-1.5"
                style={{
                  borderWidth: 1,
                  borderColor: appTheme.borderLineColor,
                }}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={14}
                  color={appTheme.primary}
                />
                <Text className="text-xs" style={{ color: appTheme.primary }}>
                  {t("New sub-category")}
                </Text>
              </TouchableOpacity>
            </View>
            {showNewSubCategory && (
              <View className="flex-row gap-2 items-center">
                <TextInput
                  className="rounded-lg border border-gray-300 p-2 flex-1"
                  value={newSubCategoryTitle}
                  placeholder={t("e.g. Veg, Non-Veg")}
                  placeholderTextColor={appTheme.fontSecondColor}
                  style={{ color: appTheme.fontMainColor }}
                  onChangeText={setNewSubCategoryTitle}
                />
                <TouchableOpacity
                  disabled={!newSubCategoryTitle.trim() || creatingSubCategory}
                  onPress={handleCreateSubCategory}
                  className="rounded-md px-3 py-2"
                  style={{
                    backgroundColor: appTheme.primary,
                    opacity: !newSubCategoryTitle.trim() ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: appTheme.white }}>{t("Add")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="gap-2">
            <Text className="text-sm" style={{ color: appTheme.fontMainColor }}>
              {t("GST Rate Override (%)")}
            </Text>
            <TextInput
              className="rounded-lg border border-gray-300 p-3"
              value={gstRatePercent}
              placeholder={t("Leave blank to use the store's default rate")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontMainColor }}
              onChangeText={setGstRatePercent}
              keyboardType="decimal-pad"
            />
          </View>

          <View
            className="flex-row justify-between items-center rounded-xl p-4"
            style={{ backgroundColor: appTheme.sidebarIconBackground }}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{ color: appTheme.fontMainColor, fontWeight: "600" }}
              >
                {t("Item availability")}
              </Text>
              <Text style={{ color: appTheme.fontSecondColor, fontSize: 12 }}>
                {isActive
                  ? t("Visible to customers on your menu")
                  : t("Hidden from your menu")}
              </Text>
            </View>
            <CustomSwitch value={isActive} onToggle={setIsActive} />
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Variations")}
            </Text>
            <TouchableOpacity
              onPress={addVariationRow}
              className="flex-row items-center gap-1"
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={appTheme.primary}
              />
              <Text style={{ color: appTheme.primary }}>
                {t("Add Variation")}
              </Text>
            </TouchableOpacity>
          </View>

          {variations.map((variation, index) => {
            const isCollapsed = !!collapsedKeys[variation.key];
            return (
              <View
                key={variation.key}
                className="rounded-xl border p-4 gap-3"
                style={{
                  borderColor: !isCollapsed
                    ? appTheme.primary
                    : appTheme.borderLineColor,
                }}
              >
                <TouchableOpacity
                  className="flex-row justify-between items-center"
                  activeOpacity={0.7}
                  onPress={() => toggleVariationCollapse(variation.key)}
                >
                  <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                    <Ionicons
                      name={isCollapsed ? "chevron-forward" : "chevron-down"}
                      size={14}
                      color={appTheme.fontSecondColor}
                    />
                    <Text
                      className="text-xs font-semibold flex-1"
                      style={{ color: appTheme.fontSecondColor }}
                      numberOfLines={1}
                    >
                      {index + 1}. {variation.title?.trim() || t("Untitled")}
                      {" · ₹"}
                      {variation.price ?? 0}
                    </Text>
                  </View>
                  {variations.length > 1 && (
                    <TouchableOpacity
                      hitSlop={8}
                      onPress={() => removeVariationRow(variation.key)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={appTheme.error}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {!isCollapsed && (
                  <>
                    <View className="gap-1">
                      <Text
                        className="text-xs"
                        style={{ color: appTheme.fontSecondColor }}
                      >
                        {t("Variation name")}
                      </Text>
                      <TextInput
                        className="rounded-lg border border-gray-300 p-2"
                        value={variation.title}
                        placeholder={t("e.g. Regular, Large")}
                        placeholderTextColor={appTheme.fontSecondColor}
                        style={{ color: appTheme.fontMainColor }}
                        onChangeText={(val) =>
                          updateVariationField(variation.key, "title", val)
                        }
                      />
                    </View>
                    <View className="flex-row gap-2 items-end">
                      <View className="flex-1 gap-1">
                        <Text
                          className="text-xs"
                          style={{ color: appTheme.fontSecondColor }}
                        >
                          {t("Selling price")}
                        </Text>
                        <View className="flex-row items-center rounded-lg border border-gray-300 px-2">
                          <Text style={{ color: appTheme.fontSecondColor }}>
                            ₹
                          </Text>
                          <TextInput
                            className="flex-1 p-2"
                            value={String(variation.price ?? 0)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={appTheme.fontSecondColor}
                            style={{ color: appTheme.fontMainColor }}
                            onChangeText={(val) =>
                              updateVariationField(variation.key, "price", val)
                            }
                          />
                        </View>
                      </View>
                      {!isWideLayout && (
                        <TouchableOpacity
                          hitSlop={8}
                          style={{ marginBottom: 10 }}
                          onPress={() => setPriceInfoKey(variation.key)}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={22}
                            color={appTheme.primary}
                          />
                        </TouchableOpacity>
                      )}
                      <View className="flex-1 gap-1">
                        <Text
                          className="text-xs"
                          style={{ color: appTheme.fontSecondColor }}
                        >
                          {t("Discounted price (optional)")}
                        </Text>
                        <View className="flex-row items-center rounded-lg border border-gray-300 px-2">
                          <Text style={{ color: appTheme.fontSecondColor }}>
                            ₹
                          </Text>
                          <TextInput
                            className="flex-1 p-2"
                            value={
                              variation.discounted != null
                                ? String(variation.discounted)
                                : ""
                            }
                            keyboardType="decimal-pad"
                            placeholder={t("Eg. 129")}
                            placeholderTextColor={appTheme.fontSecondColor}
                            style={{ color: appTheme.fontMainColor }}
                            onChangeText={(val) =>
                              updateVariationField(
                                variation.key,
                                "discounted",
                                val,
                              )
                            }
                          />
                        </View>
                      </View>
                    </View>

                    {addons.length > 0 && (
                      <View
                        className="gap-2 rounded-xl p-2"
                        style={{
                          backgroundColor: appTheme.sidebarIconBackground,
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: appTheme.fontSecondColor }}
                          >
                            {t("Customisation Groups")}
                            {(() => {
                              const count = (variation.addons ?? []).length;
                              return count > 0
                                ? ` · ${count} ${t("selected")}`
                                : "";
                            })()}
                          </Text>
                          {onCreateAddon && (
                            <TouchableOpacity
                              onPress={onCreateAddon}
                              className="flex-row items-center gap-1"
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={16}
                                color={appTheme.primary}
                              />
                              <Text
                                className="text-xs"
                                style={{ color: appTheme.primary }}
                              >
                                {t("New group")}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {addons.length > 6 && (
                          <TextInput
                            className="rounded-md border p-1.5 text-xs"
                            style={{
                              borderColor: appTheme.borderLineColor,
                              color: appTheme.fontMainColor,
                            }}
                            value={addonQuery[variation.key] ?? ""}
                            placeholder={t("Search addons")}
                            placeholderTextColor={appTheme.fontSecondColor}
                            onChangeText={(val) =>
                              setAddonQuery((prev) => ({
                                ...prev,
                                [variation.key]: val,
                              }))
                            }
                          />
                        )}
                        {(() => {
                          const query = (addonQuery[variation.key] ?? "")
                            .trim()
                            .toLowerCase();
                          const filtered = query
                            ? addons.filter((a) =>
                                a.title.toLowerCase().includes(query),
                              )
                            : addons;
                          if (filtered.length === 0) {
                            return (
                              <Text
                                className="text-xs py-1"
                                style={{ color: appTheme.fontSecondColor }}
                              >
                                {t("No addons match your search")}
                              </Text>
                            );
                          }
                          return (
                            <ScrollView
                              style={{ maxHeight: 168 }}
                              nestedScrollEnabled
                              showsVerticalScrollIndicator
                            >
                              <View className="flex-row flex-wrap gap-2 pb-1">
                                {filtered.map((addon) => {
                                  const selected = (
                                    variation.addons ?? []
                                  ).includes(addon._id);
                                  return (
                                    <TouchableOpacity
                                      key={addon._id}
                                      onPress={() =>
                                        toggleVariationAddon(
                                          variation.key,
                                          addon._id,
                                        )
                                      }
                                      className="rounded-full px-3 py-1.5"
                                      style={{
                                        backgroundColor: selected
                                          ? appTheme.primary
                                          : appTheme.themeBackground,
                                        borderWidth: 1,
                                        borderColor: selected
                                          ? appTheme.primary
                                          : appTheme.borderLineColor,
                                      }}
                                    >
                                      <Text
                                        className="text-xs"
                                        style={{
                                          color: selected
                                            ? appTheme.white
                                            : appTheme.fontMainColor,
                                          fontWeight: selected ? "600" : "400",
                                        }}
                                      >
                                        {addon.title}
                                        {addon.options?.length
                                          ? ` (${addon.options.length}${addonPriceHint(addon)})`
                                          : ""}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </ScrollView>
                          );
                        })()}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>

        <Modal
          transparent
          visible={!!priceInfoKey}
          animationType="fade"
          onRequestClose={() => setPriceInfoKey(null)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              padding: 24,
            }}
            activeOpacity={1}
            onPress={() => setPriceInfoKey(null)}
          >
            {(() => {
              const priceInfoVariation = variations.find(
                (v) => v.key === priceInfoKey,
              );
              if (!priceInfoVariation) return null;
              return (
                <View
                  style={{
                    backgroundColor: appTheme.headerBackground,
                    borderRadius: 12,
                    padding: 16,
                    gap: 8,
                  }}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: appTheme.fontMainColor }}
                  >
                    {t("Price breakdown")}
                  </Text>
                  {renderPriceBreakdownContent(priceInfoVariation)}
                  <TouchableOpacity
                    onPress={() => setPriceInfoKey(null)}
                    className="items-end mt-1"
                  >
                    <Text style={{ color: appTheme.primary }}>
                      {t("Close")}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
          </TouchableOpacity>
        </Modal>
      </ResponsiveFormSheet>
    );
  },
);

FoodFormSheet.displayName = "FoodFormSheet";
export default FoodFormSheet;
