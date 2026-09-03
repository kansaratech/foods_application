// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Hooks
import { useApptheme } from "@/lib/context/global/theme.context";

// Components
import CashMain from "../../screen-components/home/cash/view/main";

const CashScreen = () => {
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView
      edges={["bottom", "right", "left"]}
      className="w-full h-full"
      style={{ backgroundColor: appTheme.screenBackground }}
    >
      <CashMain />
    </SafeAreaView>
  );
};

export default CashScreen;
