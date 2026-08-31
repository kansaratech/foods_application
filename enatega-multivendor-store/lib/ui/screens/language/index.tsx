// Core
import { SafeAreaView } from "react-native-safe-area-context";

// Componnets
import { useApptheme } from "@/lib/context/theme.context";
import LanguageMain from "../../screen-components/home/language/view/main";

const index = () => {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground }}
      className="h-full w-full"
    >
      <LanguageMain />
    </SafeAreaView>
  );
};

export default index;
