import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import { CREATE_ADDON, EDIT_ADDON } from "@/lib/apollo/mutations/menu.mutation";
import { RESTAURANT_ADDONS } from "@/lib/apollo/queries/menu.query";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import { IAddon, IOption } from "@/lib/utils/interfaces/menu.interface";

// Keeps quantityMinimum/quantityMaximum consistent with the "Customer must
// choose" toggle — mirrors normalizeAddonRules in the API's food.resolvers.ts,
// so the vendor works in plain "required?" + "up to how many?" terms instead
// of raw min/max numbers.
function deriveSelectionRules(isRequired: boolean, quantityMaximum: number) {
  const safeMax = Math.max(1, quantityMaximum || 1);
  return {
    quantityMinimum: isRequired ? Math.min(safeMax, 1) : 0,
    quantityMaximum: safeMax,
  };
}

function selectionSummary(isRequired: boolean, min: number, max: number): string {
  if (isRequired) {
    return min === max
      ? `Required — customer picks exactly ${min}`
      : `Required — customer picks ${min} to ${max}`;
  }
  return max <= 1 ? "Optional — customer can pick one" : `Optional — customer can pick up to ${max}`;
}

export interface AddonFormSheetHandle {
  open: (addon?: IAddon) => void;
}

interface Props {
  restaurantId: string;
}

let optionKeySeq = 0;

interface OptionRow extends Partial<IOption> {
  key: string;
}

const AddonFormSheet = forwardRef<AddonFormSheetHandle, Props>(
  ({ restaurantId }, ref) => {
    const { appTheme } = useApptheme();
    const { t } = useTranslation();
    const sheetRef = useRef<ResponsiveFormSheetHandle>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [quantityMinimum, setQuantityMinimum] = useState(0);
    const [quantityMaximum, setQuantityMaximum] = useState(1);
    // Separate raw text mirrors of the two fields above, so the input can sit
    // empty while the vendor is mid-edit instead of the numeric clamp
    // snapping it back to "1" on every keystroke (which made the field
    // un-clearable — new digits kept appending to the stuck "1").
    const [minText, setMinText] = useState("0");
    const [maxText, setMaxText] = useState("1");
    const [options, setOptions] = useState<OptionRow[]>([]);
    const [error, setError] = useState("");

    useImperativeHandle(ref, () => ({
      open: (addon?: IAddon) => {
        setEditingId(addon?._id ?? null);
        setTitle(addon?.title ?? "");
        setDescription(addon?.description ?? "");
        setIsRequired(addon?.isRequired ?? (addon?.quantityMinimum ?? 0) >= 1);
        setQuantityMinimum(addon?.quantityMinimum ?? 0);
        setQuantityMaximum(addon?.quantityMaximum ?? 1);
        setMinText(String(addon?.quantityMinimum ?? 0));
        setMaxText(String(addon?.quantityMaximum ?? 1));
        setOptions(
          (addon?.options ?? []).map((o) => ({
            ...o,
            key: `existing-${o._id}`,
          })),
        );
        setError("");
        sheetRef.current?.present();
      },
    }));

    const [createAddon, { loading: creating }] = useMutation(CREATE_ADDON, {
      refetchQueries: [
        { query: RESTAURANT_ADDONS, variables: { id: restaurantId } },
      ],
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Addon created"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const [editAddon, { loading: editing }] = useMutation(EDIT_ADDON, {
      refetchQueries: [
        { query: RESTAURANT_ADDONS, variables: { id: restaurantId } },
      ],
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Addon updated"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const addOptionRow = () => {
      setOptions((prev) => [
        ...prev,
        { key: `new-${optionKeySeq++}`, title: "", description: "", price: 0 },
      ]);
    };

    const updateOptionRow = (
      key: string,
      field: "title" | "description" | "price",
      value: string,
    ) => {
      setOptions((prev) =>
        prev.map((o) =>
          o.key === key
            ? { ...o, [field]: field === "price" ? Number(value) || 0 : value }
            : o,
        ),
      );
    };

    const removeOptionRow = (key: string) => {
      setOptions((prev) => prev.filter((o) => o.key !== key));
    };

    const handleSubmit = () => {
      if (!title.trim()) {
        setError(t("Title is required"));
        return;
      }
      if (isRequired && quantityMinimum > quantityMaximum) {
        setError(t("\"At least\" cannot be greater than \"At most\""));
        return;
      }
      if (options.some((o) => !o.title?.trim())) {
        setError(t("Every option needs a title"));
        return;
      }
      if (options.some((o) => !((o.price ?? 0) > 0))) {
        setError(t("Every option needs a price greater than 0"));
        return;
      }
      const addonInput = {
        _id: editingId ?? undefined,
        restaurant: restaurantId,
        title: title.trim(),
        description: description.trim() || undefined,
        isRequired,
        quantityMinimum,
        quantityMaximum,
        options: options.map((o) => ({
          _id: o._id,
          title: (o.title ?? "").trim(),
          description: o.description?.trim() || undefined,
          price: o.price ?? 0,
        })),
      };
      if (editingId) {
        editAddon({ variables: { addonInput } });
      } else {
        createAddon({ variables: { addonInput } });
      }
    };

    const loading = creating || editing;

    return (
      <ResponsiveFormSheet
        ref={sheetRef}
        snapPoint="75%"
        header={
          <View className="flex-row justify-between items-start">
            <View className="flex-1 gap-1" style={{ paddingRight: 16 }}>
              <Text
                className="text-lg font-semibold"
                style={{ color: appTheme.fontMainColor }}
              >
                {editingId ? t("Edit Customisation Group") : t("New Customisation Group")}
              </Text>
              <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
                {t('e.g. "Choose your toppings" or "Spice level" — a group of choices customers pick from')}
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
        }
      >
          <View className="gap-2">
            <Text
              className="text-sm"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Group name")}
            </Text>
            <TextInput
              className={`rounded-md border p-3 ${error ? "border-red-600 border-2" : "border-2 border-gray-300"}`}
              value={title}
              placeholder={t("e.g. Extra Toppings")}
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
            />
          </View>

          <View
            className="gap-3 rounded-xl p-3"
            style={{ backgroundColor: appTheme.sidebarIconBackground }}
          >
            <View className="flex-row justify-between items-center gap-3">
              <View className="flex-1 gap-0.5">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t("Customer must choose from this group")}
                </Text>
                <Text className="text-xs" style={{ color: appTheme.fontSecondColor }}>
                  {t("Switch on for a mandatory pick, e.g. spice level")}
                </Text>
              </View>
              <CustomSwitch
                value={isRequired}
                onToggle={(checked: boolean) => {
                  const rules = deriveSelectionRules(checked, quantityMaximum);
                  setIsRequired(checked);
                  setQuantityMinimum(rules.quantityMinimum);
                  setQuantityMaximum(rules.quantityMaximum);
                  setMinText(String(rules.quantityMinimum));
                  setMaxText(String(rules.quantityMaximum));
                }}
              />
            </View>

            <View className="flex-row gap-3">
              {isRequired && (
                <View className="flex-1 gap-2">
                  <Text
                    className="text-sm"
                    style={{ color: appTheme.fontMainColor }}
                  >
                    {t("At least")}
                  </Text>
                  <TextInput
                    className="rounded-md border-2 border-gray-300 p-3"
                    value={minText}
                    keyboardType="number-pad"
                    style={{ color: appTheme.fontSecondColor }}
                    onChangeText={(val) => {
                      setMinText(val);
                      if (val.trim() === "") return;
                      const parsed = Number(val);
                      if (Number.isFinite(parsed)) setQuantityMinimum(parsed);
                    }}
                    onBlur={() => {
                      const min = Math.max(1, Number(minText) || 1);
                      setQuantityMinimum(min);
                      setMinText(String(min));
                    }}
                  />
                </View>
              )}
              <View className="flex-1 gap-2">
                <Text
                  className="text-sm"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {isRequired ? t("At most") : t("Let customer pick up to")}
                </Text>
                <TextInput
                  className="rounded-md border-2 border-gray-300 p-3"
                  value={maxText}
                  keyboardType="number-pad"
                  style={{ color: appTheme.fontSecondColor }}
                  onChangeText={(val) => {
                    setMaxText(val);
                    if (val.trim() === "") return;
                    const parsed = Number(val);
                    if (Number.isFinite(parsed)) setQuantityMaximum(parsed);
                  }}
                  onBlur={() => {
                    const max = Math.max(1, Number(maxText) || 1);
                    setQuantityMaximum(max);
                    setMaxText(String(max));
                  }}
                />
              </View>
            </View>

            <Text className="text-xs italic" style={{ color: appTheme.fontSecondColor }}>
              {t("Customers will see")}: {selectionSummary(isRequired, quantityMinimum, quantityMaximum)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Choices")}
            </Text>
            <TouchableOpacity
              onPress={addOptionRow}
              className="flex-row items-center gap-1"
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={appTheme.primary}
              />
              <Text style={{ color: appTheme.primary }}>
                {t("Add a choice")}
              </Text>
            </TouchableOpacity>
          </View>

          {options.map((option) => (
            <View
              key={option.key}
              className="rounded-md border-2 border-gray-200 p-3 gap-2"
            >
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: appTheme.fontSecondColor }}
                >
                  {t("Choice")}
                </Text>
                <TouchableOpacity onPress={() => removeOptionRow(option.key)}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={appTheme.error}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                className="rounded-md border-2 border-gray-300 p-2"
                value={option.title}
                placeholder={t("e.g. Extra Cheese")}
                placeholderTextColor={appTheme.fontSecondColor}
                style={{ color: appTheme.fontSecondColor }}
                onChangeText={(val) => updateOptionRow(option.key, "title", val)}
              />
              <TextInput
                className="rounded-md border-2 border-gray-300 p-2"
                value={String(option.price ?? 0)}
                keyboardType="decimal-pad"
                placeholder={t("Price")}
                placeholderTextColor={appTheme.fontSecondColor}
                style={{ color: appTheme.fontSecondColor }}
                onChangeText={(val) => updateOptionRow(option.key, "price", val)}
              />
            </View>
          ))}

          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{ color: appTheme.error }}
            >
              {error}
            </Text>
          )}

          <CustomContinueButton
            title={loading ? t("Please wait") : t("Save")}
            isLoading={loading}
            onPress={handleSubmit}
          />
      </ResponsiveFormSheet>
    );
  },
);

AddonFormSheet.displayName = "AddonFormSheet";
export default AddonFormSheet;
