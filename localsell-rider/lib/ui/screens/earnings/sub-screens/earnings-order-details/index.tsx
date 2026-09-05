import EarningsOrderDetailsMain from "@/lib/ui/screen-components/earning-order-details/view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EarningsOrderDetailsScreen() {
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="bg-white">
      <EarningsOrderDetailsMain />
    </SafeAreaView>
  );
}
