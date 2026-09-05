// Core
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import FormHeader from "../form-header";

// Flash Message
import { showMessage } from "react-native-flash-message";

// Icons
import { UploadIcon } from "@/lib/assets/svg";
import { Ionicons } from "@expo/vector-icons";

// Components
import { CustomContinueButton } from "@/lib/ui/useable-components";

// Expo
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

// Skeleton
import { MotiView } from "moti";
import { Skeleton } from "moti/skeleton";

// Hooks
import { useUserContext } from "@/lib/context/global/user.context";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";

// GraphQL
import { UPLOAD_IMAGE_TO_S3, UPSERT_RIDER_DOCUMENT } from "@/lib/apollo/mutations/rider.mutation";
import { RIDER_DOCUMENTS } from "@/lib/apollo/queries/rider.query";

// Interfaces
import { useApptheme } from "@/lib/context/global/theme.context";
import { TRiderProfileBottomBarBit } from "@/lib/utils/types/rider";

export type TRiderDocumentKind = "LICENSE" | "IDENTITY" | "BANK";

const KIND_TITLES: Record<TRiderDocumentKind, string> = {
  LICENSE: "Driving Licence",
  IDENTITY: "Identity Proof",
  BANK: "Bank Details",
};

interface IRiderDocumentRecord {
  _id: string;
  kind: string;
  number: string | null;
  fileUrl: string | null;
  holderName: string | null;
  ifsc: string | null;
  bankName: string | null;
  status: string;
}

export default function RiderDocumentForm({
  kind,
  setIsFormOpened,
}: {
  kind: TRiderDocumentKind;
  setIsFormOpened: Dispatch<SetStateAction<TRiderProfileBottomBarBit>>;
}) {
  // Hooks
  const { t } = useTranslation();
  const { userId } = useUserContext();
  const { appTheme } = useApptheme();

  // States
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    holderName: "",
    fileUrl: "",
    ifsc: "",
    bankName: "",
  });
  const [error, setError] = useState<{ field: string | null; message: string | null }>({
    field: null,
    message: null,
  });

  // Query — pre-fill with whatever was submitted before (any change re-queues it as PENDING).
  const { data } = useQuery(RIDER_DOCUMENTS, {
    variables: { riderId: userId },
    skip: !userId,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const existing = (data?.riderDocuments as IRiderDocumentRecord[] | undefined)?.find(
      (d) => d.kind === kind,
    );
    if (existing) {
      setFormData({
        number: existing.number ?? "",
        holderName: existing.holderName ?? "",
        fileUrl: existing.fileUrl ?? "",
        ifsc: existing.ifsc ?? "",
        bankName: existing.bankName ?? "",
      });
    }
  }, [data, kind]);

  // Mutations
  const [uploadImageToS3] = useMutation(UPLOAD_IMAGE_TO_S3);
  const [upsertRiderDocument] = useMutation(UPSERT_RIDER_DOCUMENT, {
    refetchQueries: [{ query: RIDER_DOCUMENTS, variables: { riderId: userId } }],
    onError: () => {
      setIsSubmitting(false);
      showMessage({ message: t("Failed to save document"), type: "danger" });
    },
    onCompleted: () => {
      setIsSubmitting(false);
      showMessage({ message: t("Document submitted for review"), type: "success" });
      setIsFormOpened(null);
    },
  });

  const pickImage = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { data: uploadData, errors } = await uploadImageToS3({
          variables: { image: `data:image/jpeg;base64,${base64}` },
        });
        if (errors && errors.length > 0) {
          throw new Error(errors[0].message || t("Failed to upload image"));
        }
        if (uploadData?.uploadImageToS3?.imageUrl) {
          setFormData((prev) => ({ ...prev, fileUrl: uploadData.uploadImageToS3.imageUrl }));
        } else {
          throw new Error(t("Failed to upload image"));
        }
      }
    } catch {
      setError({ field: "fileUrl", message: t("Failed to upload image") });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.number) {
      setError({ field: "number", message: t("Please enter the document number") });
      return;
    }
    if (kind === "BANK" && !formData.ifsc) {
      setError({ field: "ifsc", message: t("Please enter the IFSC code") });
      return;
    }
    if (!formData.fileUrl) {
      setError({ field: "fileUrl", message: t("Please upload a photo of the document") });
      return;
    }
    setError({ field: null, message: null });
    setIsSubmitting(true);
    await upsertRiderDocument({
      variables: {
        riderId: userId,
        kind,
        number: formData.number,
        fileUrl: formData.fileUrl,
        holderName: formData.holderName || undefined,
        ifsc: kind === "BANK" ? formData.ifsc : undefined,
        bankName: kind === "BANK" ? formData.bankName : undefined,
      },
    });
  };

  return (
    <View className="w-full items-center justify-center">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex flex-col justify-between w-full p-3 h-[95%] my-auto mt-0 -z-1">
          <FormHeader title={KIND_TITLES[kind]} />
          <View>
            <View className="flex flex-col w-full my-2">
              <Text style={{ color: appTheme.fontMainColor }}>
                {kind === "BANK" ? t("Account Number") : t("Document Number")}
              </Text>
              <TextInput
                value={formData.number}
                onChangeText={(v) => handleInputChange("number", v)}
                className={`w-full rounded-md border ${error.field === "number" ? "border-red-600" : "border-gray-300"} p-3 my-2`}
                style={{ color: appTheme.fontMainColor }}
              />
              {error.field === "number" && (
                <Text className="text-red-600">{error.message}</Text>
              )}
            </View>

            <View className="flex flex-col w-full my-2">
              <Text style={{ color: appTheme.fontMainColor }}>
                {kind === "BANK" ? t("Account Holder Name") : t("Name on Document")}
              </Text>
              <TextInput
                value={formData.holderName}
                onChangeText={(v) => handleInputChange("holderName", v)}
                className="w-full rounded-md border border-gray-300 p-3 my-2"
                style={{ color: appTheme.fontMainColor }}
              />
            </View>

            {kind === "BANK" && (
              <>
                <View className="flex flex-col w-full my-2">
                  <Text style={{ color: appTheme.fontMainColor }}>{t("IFSC Code")}</Text>
                  <TextInput
                    value={formData.ifsc}
                    autoCapitalize="characters"
                    onChangeText={(v) => handleInputChange("ifsc", v)}
                    className={`w-full rounded-md border ${error.field === "ifsc" ? "border-red-600" : "border-gray-300"} p-3 my-2`}
                    style={{ color: appTheme.fontMainColor }}
                  />
                  {error.field === "ifsc" && (
                    <Text className="text-red-600">{error.message}</Text>
                  )}
                </View>
                <View className="flex flex-col w-full my-2">
                  <Text style={{ color: appTheme.fontMainColor }}>{t("Bank Name")}</Text>
                  <TextInput
                    value={formData.bankName}
                    onChangeText={(v) => handleInputChange("bankName", v)}
                    className="w-full rounded-md border border-gray-300 p-3 my-2"
                    style={{ color: appTheme.fontMainColor }}
                  />
                </View>
              </>
            )}

            <View className="flex flex-col w-full my-2">
              <Text style={{ color: appTheme.fontMainColor }}>
                {t("Upload Photo")}
              </Text>
              {!formData.fileUrl ? (
                <TouchableOpacity
                  className={`w-full rounded-md border border-dashed ${error.field === "fileUrl" ? "border-red-600" : "border-gray-300"} p-3 h-28 items-center justify-center`}
                  onPress={pickImage}
                >
                  {isUploading ? (
                    <MotiView>
                      <Skeleton width={90} height={20} colorMode="light" />
                    </MotiView>
                  ) : (
                    <UploadIcon />
                  )}
                </TouchableOpacity>
              ) : (
                <View className="flex flex-row justify-between border border-gray-300 rounded-md p-4 my-2">
                  <View className="flex flex-row gap-2">
                    <Ionicons name="image" size={20} color="#3F51B5" />
                    <Text className="text-[#3F51B5]">{t("Photo uploaded")}</Text>
                  </View>
                  <TouchableOpacity onPress={pickImage}>
                    <Text className="text-[#0EA5E9]">{t("Replace")}</Text>
                  </TouchableOpacity>
                </View>
              )}
              {error.field === "fileUrl" && (
                <Text className="text-red-600">{error.message}</Text>
              )}
            </View>

            <CustomContinueButton
              style={{ marginTop: 20 }}
              title={isSubmitting ? t("Please wait") : t("Submit for review")}
              onPress={handleSubmit}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}
