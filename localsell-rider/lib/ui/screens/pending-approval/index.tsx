// Core
import { useContext, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Redirect } from "expo-router";

// Icon
import { FontAwesome6 } from "@expo/vector-icons";

// Context
import { AuthContext } from "@/lib/context/global/auth.context";
import { useApptheme } from "@/lib/context/global/theme.context";
import { useUserContext } from "@/lib/context/global/user.context";

const PendingApprovalScreen = () => {
  const { t } = useTranslation();
  const { appTheme } = useApptheme();
  const { logout } = useContext(AuthContext);
  const { dataProfile, refetchProfile } = useUserContext();

  const approval = dataProfile?.approvalStatus;
  const rejected = approval === "REJECTED";

  // Re-check approval every 15s so the rider moves on automatically the moment
  // an admin approves them — no need to restart the app.
  useEffect(() => {
    if (approval === "APPROVED") return;
    const id = setInterval(() => {
      void refetchProfile();
    }, 15000);
    return () => clearInterval(id);
  }, [approval, refetchProfile]);

  if (approval === "APPROVED") {
    return <Redirect href="/(tabs)/home/orders" />;
  }

  return (
    <SafeAreaView
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <FontAwesome6
        name={rejected ? "circle-xmark" : "clock"}
        size={36}
        color={rejected ? "#ef4444" : appTheme.primary}
      />
      <Text
        className="mt-5 text-center text-xl font-semibold"
        style={{ color: appTheme.fontMainColor }}
      >
        {rejected
          ? t("Your application was not approved")
          : t("Your account is under review")}
      </Text>
      <Text
        className="mt-2 text-center text-sm"
        style={{ color: appTheme.fontSecondColor }}
      >
        {rejected
          ? t(
              "Your rider application has been rejected. Please contact support if you think this is a mistake."
            )
          : t(
              "Thanks for registering. An admin needs to approve your account before you can go online and accept deliveries. This usually doesn't take long — check back soon."
            )}
      </Text>

      {!rejected && (
        <TouchableOpacity onPress={() => refetchProfile()} className="mt-6">
          <Text
            className="text-center text-sm font-semibold"
            style={{ color: appTheme.primary }}
          >
            {t("Check again")}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => logout()} className="mt-6">
        <Text className="text-center text-sm" style={{ color: appTheme.primary }}>
          {t("Log out")}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PendingApprovalScreen;
