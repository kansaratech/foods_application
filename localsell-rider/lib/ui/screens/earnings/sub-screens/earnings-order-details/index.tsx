import EarningsOrderDetailsMain from "@/lib/ui/screen-components/earning-order-details/view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApptheme } from "@/lib/context/global/theme.context";

export default function EarningsOrderDetailsScreen() {
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground, flex: 1 }}
    >
      <EarningsOrderDetailsMain />
    </SafeAreaView>
  );
}
