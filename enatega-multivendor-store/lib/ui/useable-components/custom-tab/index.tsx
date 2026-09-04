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
        {options.map((option) => {
          const isSelected = selectedTab === option;
          const count =
            option === "Delivery Orders"
              ? deliveryCount
              : option === "Pick up Orders"
                ? pickupCount
                : undefined;
          const showBadge = count !== undefined && Number(count) > 0;

          return (
            <TouchableOpacity
              key={String(option)}
              onPress={() => setSelectedTab(option)}
              className="h-full px-4 w-1/2 flex-row gap-2 items-center justify-center rounded-xl"
              style={{
                backgroundColor: isSelected ? appTheme.primary : "transparent",
              }}
            >
              <Text
                className="font-semibold"
                style={{
                  color: isSelected ? appTheme.white : appTheme.fontSecondColor,
                }}
              >
                {t(option)}
              </Text>
              {showBadge && (
                <View
                  style={{
                    backgroundColor: isSelected ? appTheme.white : appTheme.error,
                    borderRadius: 100,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 5,
                    alignItems: "center",
                    justifyContent: "center",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{
                      textAlign: "center",
                      color: isSelected ? appTheme.primary : appTheme.white,
                    }}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default CustomTab;
