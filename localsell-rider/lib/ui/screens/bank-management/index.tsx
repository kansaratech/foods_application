import WorkspacePage from "@/lib/ui/layouts/workspace-page";
import { useApptheme } from "@/lib/context/global/theme.context";
import { SafeAreaView } from "react-native-safe-area-context";
import BankManagementMain from "../../screen-components/home/bank-management/view/main";
const index = () => {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <WorkspacePage
      title="Bank account"
      description="Keep your payout account details up to date."
      compact
    >
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={{ backgroundColor: appTheme.screenBackground, height: "100%" }}
      >
        <BankManagementMain />
      </SafeAreaView>
    </WorkspacePage>
  );
};

export default index;
