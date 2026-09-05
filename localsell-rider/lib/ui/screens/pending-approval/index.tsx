// Core
import { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

// Icon
import { FontAwesome6 } from "@expo/vector-icons";

// Context
import { AuthContext } from "@/lib/context/global/auth.context";
import { useApptheme } from "@/lib/context/global/theme.context";

const PendingApprovalScreen = () => {
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { logout } = useContext(AuthContext);

  return (
    <SafeAreaView
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <FontAwesome6 name="clock" size={36} color={appTheme.primary} />
      <Text
        className="mt-5 text-center text-xl font-semibold"
        style={{ color: appTheme.fontMainColor }}
      >
        {t("Your account is under review")}
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: appTheme.fontSecondColor }}
      >
        {t(
          "Thanks for registering. An admin needs to approve your account before you can go online and accept deliveries. This usually doesn't take long — check back soon."
        )}
      </Text>

      <TouchableOpacity onPress={() => logout()} className="mt-8">
        <Text className="text-center text-sm" style={{ color: appTheme.primary }}>
          {t("Log out")}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PendingApprovalScreen;
