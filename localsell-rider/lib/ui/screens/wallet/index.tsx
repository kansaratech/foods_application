import WorkspacePage from "@/lib/ui/layouts/workspace-page";
import { useApptheme } from "@/lib/context/global/theme.context";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WalletMain from "../../screen-components/wallet/view/main";
import React, { useCallback, useState } from "react";
import { RIDER_TRANSACTIONS_HISTORY } from "@/lib/apollo/queries";
import { useQuery } from "@apollo/client";
export default function WalletScreen() {
  // Hooks
  const { appTheme } = useApptheme();
  const [refreshing, setRefreshing] = useState(false);

  const { refetch } = useQuery(RIDER_TRANSACTIONS_HISTORY);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <WorkspacePage
      title="Wallet"
      description="Manage your balance, withdrawal requests and transactions."
    >
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: appTheme.screenBackground }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            backgroundColor: appTheme.screenBackground,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="w-full items-center">
            <WalletMain />
          </View>
        </ScrollView>
      </SafeAreaView>
    </WorkspacePage>
  );
}
