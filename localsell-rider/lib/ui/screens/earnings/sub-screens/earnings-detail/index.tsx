import EarningDetailsMain from "@/lib/ui/screen-components/earning-details/view";
import { IDateFilter } from "@/lib/utils/interfaces/rider-earnings.interface";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApptheme } from "@/lib/context/global/theme.context";

export default function EarningsDetailScreen() {
  const [dateFilter, setDateFilter] = useState<IDateFilter>({
    startDate: "",
    endDate: "",
  });
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground, flex: 1 }}
    >
      <EarningDetailsMain
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />
    </SafeAreaView>
  );
}
