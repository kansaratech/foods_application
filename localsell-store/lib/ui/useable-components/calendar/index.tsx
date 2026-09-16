import { ComponentProps } from "react";
import { Calendar as NativeCalendar } from "react-native-calendars";
import { useApptheme } from "@/lib/context/theme.context";
import { View } from "react-native";

export default function Calendar(props: ComponentProps<typeof NativeCalendar>) {
  const { appTheme, currentTheme } = useApptheme();
  return (
    <View
      style={{
        width: "100%",
        maxWidth: 352,
        alignSelf: "center",
        borderWidth: 1,
        borderColor: appTheme.borderLineColor,
        borderRadius: 12,
        padding: 12,
        marginVertical: 16,
        backgroundColor: appTheme.cartContainer,
      }}
    >
      <NativeCalendar
        {...props}
        key={currentTheme}
        theme={{
          calendarBackground: appTheme.cartContainer,
          backgroundColor: appTheme.cartContainer,
          monthTextColor: appTheme.fontMainColor,
          dayTextColor: appTheme.fontMainColor,
          textSectionTitleColor: appTheme.fontSecondColor,
          textDisabledColor: appTheme.fontSecondColor,
          todayTextColor: appTheme.primary,
          arrowColor: appTheme.primary,
          selectedDayBackgroundColor: appTheme.primary,
          selectedDayTextColor: appTheme.white,
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
          textMonthFontWeight: "600",
        }}
      />
    </View>
  );
}
