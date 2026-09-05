import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { showMessage } from "react-native-flash-message";

import { useApptheme } from "@/lib/context/theme.context";
import {
  UPSERT_STORE_DOCUMENT,
} from "@/lib/apollo/mutations/store.mutation";
import { UPLOAD_IMAGE_TO_S3 } from "@/lib/apollo/mutations/upload.mutation";
import { STORE_DOCUMENTS } from "@/lib/apollo/queries/store.query";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import ResponsiveFormSheet, {
  ResponsiveFormSheetHandle,
} from "@/lib/ui/useable-components/responsive-form-sheet";

export type TStoreDocumentKind = "FSSAI" | "GST" | "PAN" | "BANK";

const KIND_TITLES: Record<TStoreDocumentKind, string> = {
  FSSAI: "FSSAI Licence",
  GST: "GST Registration",
  PAN: "PAN Card",
  BANK: "Bank Details",
};

export interface IStoreDocumentRecord {
  _id: string;
  kind: string;
  number: string | null;
  fileUrl: string | null;
  holderName: string | null;
  ifsc: string | null;
  bankName: string | null;
  expiryDate: string | null;
  status: string;
}

export interface StoreDocumentFormSheetHandle {
  open: (kind: TStoreDocumentKind, existing?: IStoreDocumentRecord) => void;
}

interface Props {
  restaurantId: string;
}

const StoreDocumentFormSheet = forwardRef<StoreDocumentFormSheetHandle, Props>(
  ({ restaurantId }, ref) => {
    const { appTheme } = useApptheme();
    const { t } = useTranslation();
    const sheetRef = useRef<ResponsiveFormSheetHandle>(null);

    const [kind, setKind] = useState<TStoreDocumentKind>("FSSAI");
    const [number, setNumber] = useState("");
    const [holderName, setHolderName] = useState("");
    const [fileUrl, setFileUrl] = useState("");
    const [ifsc, setIfsc] = useState("");
    const [bankName, setBankName] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    useImperativeHandle(ref, () => ({
      open: (targetKind: TStoreDocumentKind, existing?: IStoreDocumentRecord) => {
        setKind(targetKind);
        setNumber(existing?.number ?? "");
        setHolderName(existing?.holderName ?? "");
        setFileUrl(existing?.fileUrl ?? "");
        setIfsc(existing?.ifsc ?? "");
        setBankName(existing?.bankName ?? "");
        setExpiryDate(existing?.expiryDate ?? "");
        setError("");
        sheetRef.current?.present();
      },
    }));

    const [uploadImage] = useMutation(UPLOAD_IMAGE_TO_S3);

    const [upsertDocument, { loading: saving }] = useMutation(UPSERT_STORE_DOCUMENT, {
      refetchQueries: [{ query: STORE_DOCUMENTS, variables: { restaurantId } }],
      onCompleted: () => {
        sheetRef.current?.dismiss();
        showMessage({ message: t("Document submitted for review"), type: "success" });
      },
      onError: (e) => showMessage({ message: e.message, type: "danger" }),
    });

    const handlePickImage = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) return;
      try {
        setUploading(true);
        const dataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
        const { data } = await uploadImage({ variables: { image: dataUrl } });
        if (data?.uploadImageToS3?.imageUrl) {
          setFileUrl(data.uploadImageToS3.imageUrl);
        }
      } catch (e) {
        showMessage({ message: (e as Error).message, type: "danger" });
      } finally {
        setUploading(false);
      }
    };

    const handleSubmit = () => {
      if (!number.trim()) {
        setError(t("Please enter the document number"));
        return;
      }
      if (kind === "BANK" && !ifsc.trim()) {
        setError(t("Please enter the IFSC code"));
        return;
      }
      if (
        expiryDate.trim() &&
        !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())
      ) {
        setError(t("Expiry date must be in YYYY-MM-DD format"));
        return;
      }
      if (!fileUrl) {
        setError(t("Please upload a photo of the document"));
        return;
      }
      setError("");
      upsertDocument({
        variables: {
          restaurantId,
          kind,
          number: number.trim(),
          fileUrl,
          holderName: holderName.trim() || undefined,
          ifsc: kind === "BANK" ? ifsc.trim() : undefined,
          bankName: kind === "BANK" ? bankName.trim() : undefined,
          expiryDate: kind === "FSSAI" ? expiryDate.trim() || undefined : undefined,
        },
      });
    };

    return (
      <ResponsiveFormSheet ref={sheetRef} snapPoint="85%">
        <View className="gap-y-4 px-1 pb-6">
          <Text
            className="text-lg font-bold"
            style={{ color: appTheme.fontMainColor }}
          >
            {t(KIND_TITLES[kind])}
          </Text>

          <View>
            <Text
              className="text-sm font-semibold mb-2"
              style={{ color: appTheme.fontMainColor }}
            >
              {kind === "BANK" ? t("Account Number") : t("Document Number")}
            </Text>
            <TextInput
              value={number}
              onChangeText={setNumber}
              className="h-12 rounded-xl border px-4 text-base"
              style={{
                color: appTheme.fontMainColor,
                borderColor: appTheme.borderLineColor,
                backgroundColor: appTheme.themeBackground,
              }}
            />
          </View>

          <View>
            <Text
              className="text-sm font-semibold mb-2"
              style={{ color: appTheme.fontMainColor }}
            >
              {kind === "BANK" ? t("Account Holder Name") : t("Name on Document")}
            </Text>
            <TextInput
              value={holderName}
              onChangeText={setHolderName}
              className="h-12 rounded-xl border px-4 text-base"
              style={{
                color: appTheme.fontMainColor,
                borderColor: appTheme.borderLineColor,
                backgroundColor: appTheme.themeBackground,
              }}
            />
          </View>

          {kind === "BANK" && (
            <>
              <View>
                <Text
                  className="text-sm font-semibold mb-2"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t("IFSC Code")}
                </Text>
                <TextInput
                  value={ifsc}
                  autoCapitalize="characters"
                  onChangeText={setIfsc}
                  className="h-12 rounded-xl border px-4 text-base"
                  style={{
                    color: appTheme.fontMainColor,
                    borderColor: appTheme.borderLineColor,
                    backgroundColor: appTheme.themeBackground,
                  }}
                />
              </View>
              <View>
                <Text
                  className="text-sm font-semibold mb-2"
                  style={{ color: appTheme.fontMainColor }}
                >
                  {t("Bank Name")}
                </Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  className="h-12 rounded-xl border px-4 text-base"
                  style={{
                    color: appTheme.fontMainColor,
                    borderColor: appTheme.borderLineColor,
                    backgroundColor: appTheme.themeBackground,
                  }}
                />
              </View>
            </>
          )}

          {kind === "FSSAI" && (
            <View>
              <Text
                className="text-sm font-semibold mb-2"
                style={{ color: appTheme.fontMainColor }}
              >
                {t("Expiry Date (YYYY-MM-DD, optional)")}
              </Text>
              <TextInput
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="2027-03-31"
                placeholderTextColor={appTheme.fontSecondColor}
                className="h-12 rounded-xl border px-4 text-base"
                style={{
                  color: appTheme.fontMainColor,
                  borderColor: appTheme.borderLineColor,
                  backgroundColor: appTheme.themeBackground,
                }}
              />
            </View>
          )}

          <View>
            <Text
              className="text-sm font-semibold mb-2"
              style={{ color: appTheme.fontMainColor }}
            >
              {t("Upload Photo")}
            </Text>
            {!fileUrl ? (
              <TouchableOpacity
                onPress={handlePickImage}
                className="h-28 items-center justify-center rounded-xl border border-dashed"
                style={{ borderColor: appTheme.borderLineColor }}
              >
                {uploading ? (
                  <SpinnerComponent />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={26} color={appTheme.primary} />
                )}
              </TouchableOpacity>
            ) : (
              <View
                className="flex-row items-center justify-between rounded-xl border p-4"
                style={{ borderColor: appTheme.borderLineColor }}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="image" size={20} color={appTheme.primary} />
                  <Text style={{ color: appTheme.fontMainColor }}>{t("Photo uploaded")}</Text>
                </View>
                <TouchableOpacity onPress={handlePickImage}>
                  <Text style={{ color: appTheme.primary }}>{t("Replace")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!!error && <Text style={{ color: appTheme.textErrorColor }}>{error}</Text>}

          <CustomContinueButton
            title={saving ? t("Please wait") : t("Submit for review")}
            disabled={saving}
            isLoading={saving}
            onPress={handleSubmit}
          />
        </View>
      </ResponsiveFormSheet>
    );
  },
);

StoreDocumentFormSheet.displayName = "StoreDocumentFormSheet";

export default StoreDocumentFormSheet;
