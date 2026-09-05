// Core
import { FlatList, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

// Interfaces
import { IStoreEarningsDetailProps } from "@/lib/utils/interfaces/earning.interface";
import { IStoreEarnings } from "@/lib/utils/interfaces/rider-earnings.interface";

// Components
import NoRecordFound from "@/lib/ui/useable-components/no-record-found";
import EarningStack from "../../../earnings/view/earnings-stack";

// Apollo

// React Native Flash Message

// Hooks
import { useApptheme } from "@/lib/context/theme.context";

export default function EarningsDetailStacks({
  setModalVisible,
  storeEarnings,
  isLoading,
}: IStoreEarningsDetailProps) {
  // Hooks
  const { appTheme } = useApptheme();
  const tabBarHeight = useBottomTabBarHeight();

  const renderItem = ({
    item: earning,
    index,
  }: {
    item: IStoreEarnings;
    index: number;
  }) => {
    // The API returns one row spanning the whole selected range; its `_id` is
    // the store id, not something to show. Label it with the actual day range.
    const days = (earning.earningsArray ?? [])
      .map((d) => d.date)
      .filter(Boolean)
      .sort();
    const label =
      days.length === 0
        ? "All earnings"
        : days[0] === days[days.length - 1]
          ? days[0]
          : `${days[0]} – ${days[days.length - 1]}`;

    return (
      <EarningStack
        totalDeliveries={earning.earningsArray.length}
        date={label}
        earning={earning.totalEarningsSum}
        _id={earning._id}
        earningsArray={earning.earningsArray}
        totalOrderAmount={earning.totalOrderAmount}
        setModalVisible={setModalVisible}
        isLast={storeEarnings ? storeEarnings?.length - 1 === index : false}
      />
    );
  };

  // Empty Component
  const ListEmptyComponent = () => {
    if (isLoading) return null;
    return <NoRecordFound />;
  };

  return (
    <View
      className="h-full border-t-2"
      style={{
        borderTopColor: appTheme.borderLineColor,
        backgroundColor: appTheme.themeBackground,
      }}
    >
      <FlatList
        data={storeEarnings ?? []}
        renderItem={({ item, index }) => renderItem({ item, index })}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        className="scroll-smooth"
        keyExtractor={(item) => item._id}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: tabBarHeight + 24,
        }}
      />
    </View>
  );
}
