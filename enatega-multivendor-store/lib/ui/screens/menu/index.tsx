import { useApptheme } from "@/lib/context/theme.context";
import { SafeAreaView } from "react-native-safe-area-context";
import MenuMain from "../../screen-components/home/menu/view/main";
const index = () => {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <SafeAreaView edges={["bottom", "left", "right"]}
      style={{ backgroundColor: appTheme.themeBackground }}
      className="h-full w-full"
    >
      <MenuMain />
    </SafeAreaView>
  );
};

export default index;
