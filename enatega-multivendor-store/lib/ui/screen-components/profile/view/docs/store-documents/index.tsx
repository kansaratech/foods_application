import { useRef } from "react";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";

import { useUserContext } from "@/lib/context/global/user.context";
import { useApptheme } from "@/lib/context/theme.context";
import { STORE_DOCUMENTS } from "@/lib/apollo/queries/store.query";
import StoreDocumentFormSheet, {
  IStoreDocumentRecord,
  StoreDocumentFormSheetHandle,
  TStoreDocumentKind,
} from "../../../forms/store-document-form-sheet";

const ROWS: { kind: TStoreDocumentKind; label: string }[] = [
  { kind: "FSSAI", label: "FSSAI Licence" },
  { kind: "GST", label: "GST Registration" },
  { kind: "PAN", label: "PAN Card" },
  { kind: "BANK", label: "Bank Details" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  VERIFIED: { bg: "#DCFCE7", text: "#15803D", label: "Verified" },
  PENDING: { bg: "#FEF3C7", text: "#92400E", label: "Under review" },
  REJECTED: { bg: "#FEE2E2", text: "#991B1B", label: "Rejected — resubmit" },
};

export default function StoreDocsSection() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId: restaurantId } = useUserContext();
  const sheetRef = useRef<StoreDocumentFormSheetHandle>(null);

  const { data } = useQuery(STORE_DOCUMENTS, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: "cache-and-network",
  });

  const documents = (data?.storeDocuments ?? []) as IStoreDocumentRecord[];

  const cardStyle = {
    backgroundColor: appTheme.cartContainer,
    borderColor: appTheme.borderLineColor,
  };

  return (
    <View className="rounded-3xl border p-6 mb-5" style={cardStyle}>
      <Text className="text-lg font-bold mb-1" style={{ color: appTheme.fontMainColor }}>
        {t("Verification Documents")}
      </Text>
      <Text className="text-sm mb-4" style={{ color: appTheme.fontSecondColor }}>
        {t("Submit these so an admin can verify your store — trading isn't blocked while they're pending")}
      </Text>

      {ROWS.map((row, index) => {
        const existing = documents.find((d) => d.kind === row.kind);
        const statusStyle = existing ? STATUS_STYLE[existing.status] : null;
        return (
          <View
            key={row.kind}
            className="flex-row items-center justify-between py-4"
            style={{
              borderBottomWidth: index === ROWS.length - 1 ? 0 : 1,
              borderBottomColor: appTheme.borderLineColor,
            }}
          >
            <View className="flex-1">
              <Text className="font-semibold" style={{ color: appTheme.fontMainColor }}>
                {t(row.label)}
              </Text>
              <View
                className="self-start flex-row items-center rounded-full px-3 py-1 mt-2"
                style={{ backgroundColor: statusStyle ? statusStyle.bg : "#FEE2E2" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: statusStyle ? statusStyle.text : "#B91C1C" }}
                >
                  {statusStyle ? t(statusStyle.label) : t("Missing")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => sheetRef.current?.open(row.kind, existing)}
              className="rounded-xl px-4 py-2"
              style={{ backgroundColor: appTheme.primary }}
            >
              <Text className="font-semibold text-white">
                {existing ? t("Update") : t("Add")}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <StoreDocumentFormSheet ref={sheetRef} restaurantId={restaurantId ?? ""} />
    </View>
  );
}
