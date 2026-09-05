// Hooks
import { useUserContext } from "@/lib/context/global/user.context";
import { useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";

// Types & Interfaces
import { TRiderProfileBottomBarBit } from "@/lib/utils/types/rider";
import { Dispatch, SetStateAction } from "react";

// GraphQL
import { RIDER_DOCUMENTS } from "@/lib/apollo/queries/rider.query";

// Core
import { useApptheme } from "@/lib/context/global/theme.context";
import { Text, TouchableOpacity, View } from "react-native";
import { TRiderDocumentKind } from "../../../forms/rider-document";

const ROWS: { kind: TRiderDocumentKind; formKey: TRiderProfileBottomBarBit; label: string }[] = [
  { kind: "LICENSE", formKey: "RIDER_DOC_LICENSE", label: "Driving Licence" },
  { kind: "IDENTITY", formKey: "RIDER_DOC_IDENTITY", label: "Identity Proof" },
  { kind: "BANK", formKey: "RIDER_DOC_BANK", label: "Bank Details" },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  VERIFIED: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Verified" },
  PENDING: { bg: "bg-[#FEF3C7]", text: "text-[#92400E]", label: "Under review" },
  REJECTED: { bg: "bg-[#FEE2E2]", text: "text-[#991B1B]", label: "Rejected — resubmit" },
};

export default function RiderDocsSection({
  setIsFormOpened,
}: {
  setIsFormOpened: Dispatch<SetStateAction<TRiderProfileBottomBarBit>>;
}) {
  // Hooks
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId } = useUserContext();

  const { data } = useQuery(RIDER_DOCUMENTS, {
    variables: { riderId: userId },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const documents = (data?.riderDocuments ?? []) as { kind: string; status: string }[];

  return (
    <View
      className="flex flex-col w-full items-center"
      style={{ backgroundColor: appTheme.screenBackground }}
    >
      {ROWS.map((row) => {
        const existing = documents.find((d) => d.kind === row.kind);
        const statusStyle = existing ? STATUS_STYLE[existing.status] : null;
        return (
          <View
            key={row.kind}
            className="flex flex-col gap-3 items-start justify-center px-5 w-full border-b-2 border-b-gray-200 py-3"
          >
            <View className="flex flex-row w-full justify-between">
              <Text className="font-bold" style={{ color: appTheme.mainTextColor }}>
                {t(row.label)}
              </Text>
              <TouchableOpacity onPress={() => setIsFormOpened(row.formKey)}>
                <Text className="font-semibold text-[#0EA5E9]">
                  {existing ? t("Update") : t("Add")}
                </Text>
              </TouchableOpacity>
            </View>
            <View
              className={`${statusStyle ? statusStyle.bg : "bg-[#FEE2E2]"} py-1.5 px-2 border rounded-3xl border-[#E0F2FE]`}
            >
              <Text className={`${statusStyle ? statusStyle.text : "text-[#991B1B]"} font-semibold`}>
                {statusStyle ? t(statusStyle.label) : t("Missing Data")}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
