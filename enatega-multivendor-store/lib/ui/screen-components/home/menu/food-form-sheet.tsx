import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import { CREATE_FOOD, EDIT_FOOD } from "@/lib/apollo/mutations/menu.mutation";
import { UPLOAD_IMAGE_TO_S3 } from "@/lib/apollo/mutations/upload.mutation";
import { RESTAURANT_CATEGORIES_PAGINATED } from "@/lib/apollo/queries/menu.query";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import {
  IAddon,
  IFood,
  IVariation,
} from "@/lib/utils/interfaces/menu.interface";

export interface FoodFormSheetHandle {
  open: (categoryId: string, food?: IFood) => void;
}

interface Props {
  restaurantId: string;
  page: number;
  search: string;
  addons: IAddon[];
}

let variationKeySeq = 0;

interface VariationRow extends Partial<IVariation> {
  key: string;
}

const FoodFormSheet = forwardRef<FoodFormSheetHandle, Props>(
  ({ restaurantId, page, search, addons }, ref) => {
    const { appTheme } = useApptheme();
    const { t } = useTranslation();
    const sheetRef = useRef<ResponsiveFormSheetHandle>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState<string>("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [variations, setVariations] = useState<VariationRow[]>([]);
    const [error, setError] = useState("");

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
        setVariations(
          food?.variations?.length
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
              ],
        );
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
      setVariations((prev) => [
        ...prev,
        { key: `new-${variationKeySeq++}`, title: "", price: 0, addons: [] },
      ]);
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
        title: title.trim(),
        description: description.trim() || undefined,
        images,
        isActive,
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

    return (
      <ResponsiveFormSheet ref={sheetRef} snapPoint="90%">
          <Text
            className="text-lg font-semibold"
            style={{ color: appTheme.fontMainColor }}
          >
            {editingId ? t("Edit Food Item") : t("Add Food Item")}
          </Text>

          <View className="flex-row flex-wrap gap-2 justify-center">
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
                className="h-24 w-24 rounded-md items-center justify-center overflow-hidden"
                style={{ backgroundColor: appTheme.sidebarIconBackground }}
              >
                {uploading ? (
                  <SpinnerComponent height={20} />
                ) : (
                  <Ionicons
                    name="camera-outline"
                    size={28}
                    color={appTheme.iconColor}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>

          <View className="gap-2">
            <Text
              className="text-sm"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Title")}
            </Text>
            <TextInput
              className={`rounded-md border p-3 ${error ? "border-red-600 border-2" : "border-2 border-gray-300"}`}
              value={title}
              placeholder={t("e.g. Cheeseburger")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontSecondColor }}
              onChangeText={(val) => {
                setError("");
                setTitle(val);
              }}
            />
          </View>

          <View className="gap-2">
            <Text
              className="text-sm"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Description")}
            </Text>
            <TextInput
              className="rounded-md border-2 border-gray-300 p-3"
              value={description}
              placeholder={t("Optional")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontSecondColor }}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View className="flex-row justify-between items-center">
            <Text style={{ color: appTheme.fontMainColor }}>{t("Active")}</Text>
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

          {variations.map((variation) => (
            <View
              key={variation.key}
              className="rounded-md border-2 border-gray-200 p-3 gap-2"
            >
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  {t("Variation")}
                </Text>
                {variations.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeVariationRow(variation.key)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={appTheme.error}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                className="rounded-md border-2 border-gray-300 p-2"
                value={variation.title}
                placeholder={t("e.g. Regular, Large")}
                placeholderTextColor={appTheme.fontSecondColor}
                style={{ color: appTheme.fontSecondColor }}
                onChangeText={(val) =>
                  updateVariationField(variation.key, "title", val)
                }
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="rounded-md border-2 border-gray-300 p-2 flex-1"
                  value={String(variation.price ?? 0)}
                  keyboardType="decimal-pad"
                  placeholder={t("Price")}
                  placeholderTextColor={appTheme.fontSecondColor}
                  style={{ color: appTheme.fontSecondColor }}
                  onChangeText={(val) =>
                    updateVariationField(variation.key, "price", val)
                  }
                />
                <TextInput
                  className="rounded-md border-2 border-gray-300 p-2 flex-1"
                  value={
                    variation.discounted != null
                      ? String(variation.discounted)
                      : ""
                  }
                  keyboardType="decimal-pad"
                  placeholder={t("Discounted price (optional)")}
                  placeholderTextColor={appTheme.fontSecondColor}
                  style={{ color: appTheme.fontSecondColor }}
                  onChangeText={(val) =>
                    updateVariationField(variation.key, "discounted", val)
                  }
                />
              </View>

              {addons.length > 0 && (
                <View className="gap-1">
                  <Text
                    className="text-xs"
                    style={{ color: appTheme.fontSecondColor }}
                  >
                    {t("Addons")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {addons.map((addon) => {
                      const selected = (variation.addons ?? []).includes(
                        addon._id,
                      );
                      return (
                        <TouchableOpacity
                          key={addon._id}
                          onPress={() =>
                            toggleVariationAddon(variation.key, addon._id)
                          }
                          className="rounded-full px-3 py-1"
                          style={{
                            backgroundColor: selected
                              ? appTheme.primary
                              : appTheme.sidebarIconBackground,
                          }}
                        >
                          <Text
                            className="text-xs"
                            style={{
                              color: selected
                                ? appTheme.black
                                : appTheme.fontSecondColor,
                            }}
                          >
                            {addon.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          ))}

          <CustomContinueButton
            title={loading ? t("Please wait") : t("Save")}
            isLoading={loading}
            onPress={handleSubmit}
          />
      </ResponsiveFormSheet>
    );
  },
);

FoodFormSheet.displayName = "FoodFormSheet";
export default FoodFormSheet;
