import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import {
  CREATE_CATEGORY,
  EDIT_CATEGORY,
} from "@/lib/apollo/mutations/menu.mutation";
import { UPLOAD_IMAGE_TO_S3 } from "@/lib/apollo/mutations/upload.mutation";
import { RESTAURANT_CATEGORIES_PAGINATED } from "@/lib/apollo/queries/menu.query";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";
import { ICategory } from "@/lib/utils/interfaces/menu.interface";

export interface CategoryFormSheetHandle {
  open: (category?: ICategory) => void;
}

interface Props {
  restaurantId: string;
  page: number;
  search: string;
}

const CategoryFormSheet = forwardRef<CategoryFormSheetHandle, Props>(
  ({ restaurantId, page, search }, ref) => {
    const { appTheme } = useApptheme();
    const { t } = useTranslation();
    const sheetRef = useRef<ResponsiveFormSheetHandle>(null);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    useImperativeHandle(ref, () => ({
      open: (category?: ICategory) => {
        setEditingId(category?._id ?? null);
        setTitle(category?.title ?? "");
        setImage(category?.image ?? null);
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

    const [createCategory, { loading: creating }] = useMutation(
      CREATE_CATEGORY,
      {
        refetchQueries,
        onCompleted: () => {
          sheetRef.current?.dismiss();
          showMessage({ message: t("Category created"), type: "success" });
        },
        onError: (e) => showMessage({ message: e.message, type: "danger" }),
      },
    );

    const [editCategory, { loading: editing }] = useMutation(EDIT_CATEGORY, {
      refetchQueries,
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Category updated"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const [uploadImage] = useMutation(UPLOAD_IMAGE_TO_S3);

    const handlePickImage = async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showMessage({
          message: t("Permission to access photos is required"),
          type: "danger",
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.6,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      const dataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
      try {
        setUploading(true);
        const { data } = await uploadImage({ variables: { image: dataUrl } });
        if (data?.uploadImageToS3?.imageUrl) {
          setImage(data.uploadImageToS3.imageUrl);
        }
      } catch (e) {
        showMessage({ message: (e as Error).message, type: "danger" });
      } finally {
        setUploading(false);
      }
    };

    const handleSubmit = () => {
      if (!title.trim()) {
        setError(t("Title is required"));
        return;
      }
      const category = {
        _id: editingId ?? undefined,
        title: title.trim(),
        image,
        restaurant: restaurantId,
      };
      if (editingId) {
        editCategory({ variables: { category } });
      } else {
        createCategory({ variables: { category } });
      }
    };

    const loading = creating || editing;

    return (
      <ResponsiveFormSheet ref={sheetRef}>
          <Text
            className="text-lg font-semibold"
            style={{ color: appTheme.fontMainColor }}
          >
            {editingId ? t("Edit Category") : t("Add Category")}
          </Text>

          <TouchableOpacity
            onPress={handlePickImage}
            className="h-24 w-24 rounded-md items-center justify-center overflow-hidden self-center"
            style={{ backgroundColor: appTheme.sidebarIconBackground }}
          >
            {image ? (
              <Image
                source={{ uri: image }}
                style={{ width: 96, height: 96 }}
                resizeMode="cover"
              />
            ) : uploading ? (
              <SpinnerComponent height={20} />
            ) : (
              <Ionicons
                name="camera-outline"
                size={28}
                color={appTheme.iconColor}
              />
            )}
          </TouchableOpacity>

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
              placeholder={t("e.g. Burgers")}
              placeholderTextColor={appTheme.fontSecondColor}
              style={{ color: appTheme.fontSecondColor }}
              onChangeText={(val) => {
                setError("");
                setTitle(val);
              }}
            />
          </View>

          <CustomContinueButton
            title={loading ? t("Please wait") : t("Save")}
            isLoading={loading}
            onPress={handleSubmit}
          />
      </ResponsiveFormSheet>
    );
  },
);

CategoryFormSheet.displayName = "CategoryFormSheet";
export default CategoryFormSheet;
