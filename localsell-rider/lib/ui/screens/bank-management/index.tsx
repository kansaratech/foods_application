import { useApptheme } from "@/lib/context/global/theme.context";
import { SafeAreaView } from "react-native-safe-area-context";
import BankManagementMain from "../../screen-components/home/bank-management/view/main";
const index = () => {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.screenBackground, height: "100%" }}
    >
      <BankManagementMain />
    </SafeAreaView>
  );
};

export default index;
