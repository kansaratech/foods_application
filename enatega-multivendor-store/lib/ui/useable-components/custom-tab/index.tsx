import { Text, TouchableOpacity, View } from "react-native";

import { useApptheme } from "@/lib/context/theme.context";
import { ICustomTabProps } from "@/lib/utils/interfaces";
import { useTranslation } from "react-i18next";

const CustomTab = ({
  options,
  selectedTab,
  setSelectedTab,
  deliveryCount,
  pickupCount,
}: ICustomTabProps) => {
  // Hooks
  const { appTheme } = useApptheme();
  const { t } = useTranslation();

  return (
    <View
      className="sticky top-0 z-10 w-full py-3 lg:max-w-xl lg:self-center"
      style={{ backgroundColor: appTheme.themeBackground }}
    >
      <View
        className="h-14 w-full flex-row p-1.5 justify-center items-center rounded-2xl"
        style={{ backgroundColor: appTheme.sidebarIconBackground }}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={String(option)}
            onPress={() => setSelectedTab(option)}
            className="h-full px-4 w-1/2 flex-row gap-2 items-center justify-center rounded-xl"
            style={{
              backgroundColor:
                selectedTab === option
                  ? appTheme.primary
                  : "transparent",
            }}
          >
            <Text
              style={{
                color:
                  selectedTab === option
                    ? appTheme.fontMainColor
                    : appTheme.fontSecondColor,
              }}
            >
              {t(option)}
            </Text>
            {option === "Delivery Orders" && (
              <View
                style={{
                  backgroundColor: appTheme.error,
                  borderRadius: 100,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                    marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: appTheme.white,
                    alignSelf: "center",
                  }}
                >
                  {deliveryCount}
                </Text>
              </View>
            )}
            {option === "Pick up Orders" && (
              <View
                style={{
                  backgroundColor: appTheme.error,
                  borderRadius: 100,
                  width: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                    marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: appTheme.white,
                    alignSelf: "center",
                  }}
                >
                  {pickupCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default CustomTab;
