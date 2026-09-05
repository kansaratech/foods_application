// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Components
import { useApptheme } from "@/lib/context/theme.context";
import WorkScheduleMain from "../../screen-components/work-schedule/view/main";

export default function WorkScheduleScreen() {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      className="flex-1 h-full w-full"
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <WorkScheduleMain />
    </SafeAreaView>
  );
}
