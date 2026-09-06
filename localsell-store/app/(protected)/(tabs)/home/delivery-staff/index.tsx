import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { showMessage } from "react-native-flash-message";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useApptheme } from "@/lib/context/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";
import { STORE_DELIVERY_AGENTS } from "@/lib/apollo/queries/delivery.query";
import {
  CREATE_STORE_DELIVERY_AGENT,
  DELETE_STORE_DELIVERY_AGENT,
  UPDATE_STORE_DELIVERY_AGENT,
} from "@/lib/apollo/mutations/delivery.mutation";
import CustomSwitch from "@/lib/ui/useable-components/switch-button";
import SpinnerComponent from "@/lib/ui/useable-components/spinner";
import NoRecordFound from "@/lib/ui/useable-components/no-record-found";
import ConfirmModal from "@/lib/ui/useable-components/confirm-modal";
import { IStoreDeliveryAgent } from "@/lib/utils/interfaces/order.interface";

export default function DeliveryStaffScreen() {
  const { appTheme } = useApptheme();
  const { t } = useTranslation();
  const { userId: storeId } = useUserContext();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState<IStoreDeliveryAgent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<IStoreDeliveryAgent | null>(null);

  const refetchQueries = useMemo(
    () => [{ query: STORE_DELIVERY_AGENTS, variables: { storeId, includeInactive: true } }],
    [storeId],
  );

  const { data, loading } = useQuery(STORE_DELIVERY_AGENTS, {
    variables: { storeId, includeInactive: true },
    skip: !storeId,
    fetchPolicy: "cache-and-network",
  });
  const agents: IStoreDeliveryAgent[] = data?.storeDeliveryAgents ?? [];

  const onError = (e: { message: string }) => showMessage({ message: e.message, type: "danger" });

  const [createAgent, { loading: creating }] = useMutation(CREATE_STORE_DELIVERY_AGENT, { refetchQueries, onError });
  const [updateAgent] = useMutation(UPDATE_STORE_DELIVERY_AGENT, { refetchQueries, onError });
  const [deleteAgent] = useMutation(DELETE_STORE_DELIVERY_AGENT, { refetchQueries, onError });

  const resetForm = () => {
    setName("");
    setPhone("");
    setEditing(null);
  };

  const onSubmit = async () => {
    if (!name.trim()) {
      showMessage({ message: t("Enter a name"), type: "warning" });
      return;
    }
    if (editing) {
      await updateAgent({ variables: { id: editing._id, name: name.trim(), phone: phone.trim() || null } });
      showMessage({ message: t("Delivery person updated"), type: "success" });
    } else {
      await createAgent({ variables: { storeId, name: name.trim(), phone: phone.trim() || null } });
      showMessage({ message: t("Delivery person added"), type: "success" });
    }
    resetForm();
  };

  const startEdit = (agent: IStoreDeliveryAgent) => {
    setEditing(agent);
    setName(agent.name);
    setPhone(agent.phone ?? "");
  };

  const renderAgent = ({ item }: { item: IStoreDeliveryAgent }) => (
    <View
      className="flex-row items-center justify-between px-4 py-3 rounded-2xl border mb-2"
      style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
    >
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold" style={{ color: appTheme.fontMainColor }}>
          {item.name}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: appTheme.fontSecondColor }}>
          {item.phone || t("No phone")}
          {!item.isActive ? ` · ${t("inactive")}` : ""}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <CustomSwitch
          value={item.isActive}
          onToggle={(v) => updateAgent({ variables: { id: item._id, isActive: v } })}
        />
        <TouchableOpacity onPress={() => startEdit(item)}>
          <Ionicons name="pencil-outline" size={18} color={appTheme.iconColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPendingDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={appTheme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ backgroundColor: appTheme.themeBackground }} className="flex-1">
      <View className="flex-1 px-5 pt-5">
        <Text className="text-2xl font-bold" style={{ color: appTheme.fontMainColor }}>
          {t("Delivery Staff")}
        </Text>
        <Text className="text-sm mt-1 mb-5" style={{ color: appTheme.fontSecondColor }}>
          {t("Your own delivery people. Assign one to a delivery order you fulfil yourself.")}
        </Text>

        <View
          className="rounded-2xl border p-4 mb-5"
          style={{ borderColor: appTheme.borderLineColor, backgroundColor: appTheme.cartContainer }}
        >
          <TextInput
            className="h-12 rounded-xl border px-4 mb-3"
            placeholder={t("Name")}
            placeholderTextColor={appTheme.fontSecondColor}
            style={{ color: appTheme.fontMainColor, borderColor: appTheme.borderLineColor }}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            className="h-12 rounded-xl border px-4 mb-3"
            placeholder={t("Phone (optional)")}
            placeholderTextColor={appTheme.fontSecondColor}
            keyboardType="phone-pad"
            style={{ color: appTheme.fontMainColor, borderColor: appTheme.borderLineColor }}
            value={phone}
            onChangeText={setPhone}
          />
          <View className="flex-row gap-3">
            {editing && (
              <TouchableOpacity
                onPress={resetForm}
                className="flex-1 h-12 rounded-xl items-center justify-center border"
                style={{ borderColor: appTheme.borderLineColor }}
              >
                <Text style={{ color: appTheme.fontMainColor }}>{t("Cancel")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              disabled={creating}
              onPress={onSubmit}
              className="flex-1 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: appTheme.primary }}
            >
              <Text className="font-semibold" style={{ color: appTheme.white }}>
                {editing ? t("Save") : t("Add person")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && agents.length === 0 ? (
          <SpinnerComponent />
        ) : agents.length === 0 ? (
          <NoRecordFound msg={t("No delivery staff yet")} />
        ) : (
          <FlatList
            data={agents}
            keyExtractor={(item) => item._id}
            renderItem={renderAgent}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>

      <ConfirmModal
        visible={!!pendingDelete}
        title={t("Remove delivery person")}
        message={t(`Remove "${pendingDelete?.name ?? ""}"?`)}
        confirmLabel={t("Remove")}
        destructive
        icon="trash-outline"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteAgent({ variables: { id: pendingDelete._id } });
          setPendingDelete(null);
        }}
      />
    </SafeAreaView>
  );
}
