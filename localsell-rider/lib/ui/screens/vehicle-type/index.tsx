import WorkspacePage from "@/lib/ui/layouts/workspace-page";
import { useApptheme } from "@/lib/context/global/theme.context";
import { View } from "react-native";
import VehicleTypeMainScreen from "../../screen-components/vehicle-type/main";

export default function VehicleTypeScreen() {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Vehicle details"
      description="Choose the vehicle you use for deliveries."
      compact
    >
      <View
        className="flex-1"
        style={{ backgroundColor: appTheme.screenBackground }}
      >
        <VehicleTypeMainScreen />
      </View>
    </WorkspacePage>
  );
}
