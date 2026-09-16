// Utils
import { useApptheme } from "@/lib/context/theme.context";
import { CustomContinueButton } from "@/lib/ui/useable-components";
import { Colors } from "@/lib/utils/constants";

// Interfaces
import {
  IEarningDetailsMainProps,
  IEarningsDateFilterProps,
} from "@/lib/utils/interfaces/rider-earnings.interface";

// Icons
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Core
import { Text, TouchableOpacity, View } from "react-native";

// React Native Calendars
import { DateData } from "react-native-calendars";
import Calendar from "@/lib/ui/useable-components/calendar";
import { MarkedDates } from "react-native-calendars/src/types";

export default function EarningDetailsDateFilter({
  dateFilter,
  setDateFilter,
  handleFilterSubmit,
  isFiltering,
  isDateFilterVisible,
  setIsDateFilterVisible,
  refetchDeafult,
}: IEarningDetailsMainProps & IEarningsDateFilterProps) {
  // Hooks
  const { t } = useTranslation();
  const { appTheme } = useApptheme();

  // Handlers
  const handleDayPress = (day: DateData) => {
    const { dateString } = day;

    // If the user clicks on the already selected start date, reset selection
    if (dateFilter.startDate === dateString && !dateFilter.endDate) {
      setDateFilter({ startDate: "", endDate: "" });
      return;
    }

    // If no startDate or both startDate and endDate exist, reset the selection
    if (!dateFilter.startDate || (dateFilter.startDate && dateFilter.endDate)) {
      setDateFilter({ startDate: dateString, endDate: "" });
    } else {
      // If startDate exists but no endDate, set endDate only if it's after startDate
      if (new Date(dateString) >= new Date(dateFilter.startDate)) {
        setDateFilter((prev) => ({ ...prev, endDate: dateString }));
      } else {
        // Swap if the user selects an earlier date for the endDate
        setDateFilter({ startDate: dateString, endDate: "" });
      }
    }
  };

  // Date-only strings stay in local calendar days across timezone/DST changes.
  const getMarkedDates = () => {
    const markedDates: MarkedDates = {};
    if (!dateFilter.startDate) return markedDates;
    const end = dateFilter.endDate || dateFilter.startDate;
    const cursor = new Date(`${dateFilter.startDate}T00:00:00`);
    const lastDay = new Date(`${end}T00:00:00`);
    while (cursor <= lastDay) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      if (key > end) break;
      markedDates[key] = {
        startingDay: key === dateFilter.startDate,
        endingDay: key === end,
        color: appTheme.primary,
        textColor: appTheme.white,
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    return markedDates;
  };

  const datesBeGetter = getMarkedDates();
  return (
    <View className="p-4">
      <View className="flex flex-row items-center justify-between w-full px-2">
        <TouchableOpacity
          onPress={() => setIsDateFilterVisible((prev) => !prev)}
          className="flex flex-row gap-2 items-center"
        >
          <View className="flex flex-row items-center gap-2">
            <Ionicons name="filter" color={Colors.light.primary} size={25} />
            <Text style={{ color: appTheme.fontMainColor }}>
              {t("Date Filter")}
            </Text>
          </View>
        </TouchableOpacity>
        {(dateFilter.startDate || dateFilter.endDate) && (
          <TouchableOpacity
            onPress={() => {
              setDateFilter({ endDate: "", startDate: "" });
              refetchDeafult({
                startDate: "",
                endDate: "",
              });
            }}
          >
            <View className="flex flex-row items-center gap-2">
              <Ionicons name="remove-sharp" color={"red"} size={25} />
              <Text style={{ color: appTheme.fontSecondColor }}>
                {t("Clear Filters")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      {isDateFilterVisible && (
        <View>
          <Calendar
            markingType="period"
            current={dateFilter.startDate || undefined}
            onDayPress={(day: DateData) => handleDayPress(day)}
            markedDates={{
              ...datesBeGetter,
            }}
          />
          <CustomContinueButton
            onPress={() => handleFilterSubmit()}
            title={isFiltering ? t("Please Wait") : t("Apply Filter")}
            disabled={isFiltering}
          />
        </View>
      )}
    </View>
  );
}
