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
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import { IAddon, IOption } from "@/lib/utils/interfaces/menu.interface";

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
    const [quantityMinimum, setQuantityMinimum] = useState("0");
    const [quantityMaximum, setQuantityMaximum] = useState("1");
    const [options, setOptions] = useState<OptionRow[]>([]);
    const [error, setError] = useState("");

    useImperativeHandle(ref, () => ({
      open: (addon?: IAddon) => {
        setEditingId(addon?._id ?? null);
        setTitle(addon?.title ?? "");
        setDescription(addon?.description ?? "");
        setQuantityMinimum(String(addon?.quantityMinimum ?? 0));
        setQuantityMaximum(String(addon?.quantityMaximum ?? 1));
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
      if (options.some((o) => !o.title?.trim())) {
        setError(t("Every option needs a title"));
        return;
      }
      const addonInput = {
        _id: editingId ?? undefined,
        restaurant: restaurantId,
        title: title.trim(),
        description: description.trim() || undefined,
        quantityMinimum: Number(quantityMinimum) || 0,
        quantityMaximum: Number(quantityMaximum) || 1,
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
      <ResponsiveFormSheet ref={sheetRef} snapPoint="75%">
          <Text
            className="text-lg font-semibold"
            style={{ color: appTheme.fontMainColor }}
          >
            {editingId ? t("Edit Addon") : t("Add Addon")}
          </Text>

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

          <View className="flex-row gap-3">
            <View className="flex-1 gap-2">
              <Text
                className="text-sm"
                style={{ color: appTheme.fontMainColor }}
              >
                {t("Min Selectable")}
              </Text>
              <TextInput
                className="rounded-md border-2 border-gray-300 p-3"
                value={quantityMinimum}
                keyboardType="number-pad"
                style={{ color: appTheme.fontSecondColor }}
                onChangeText={setQuantityMinimum}
              />
            </View>
            <View className="flex-1 gap-2">
              <Text
                className="text-sm"
                style={{ color: appTheme.fontMainColor }}
              >
                {t("Max Selectable")}
              </Text>
              <TextInput
                className="rounded-md border-2 border-gray-300 p-3"
                value={quantityMaximum}
                keyboardType="number-pad"
                style={{ color: appTheme.fontSecondColor }}
                onChangeText={setQuantityMaximum}
              />
            </View>
          </View>

          <View className="flex-row justify-between items-center mt-2">
            <Text
              className="text-sm font-semibold"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Options")}
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
                {t("Add Option")}
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
                  {t("Option")}
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
                placeholder={t("Option title")}
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
