import React, { useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";
import { Circle, Line, Svg } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useApptheme } from "@/lib/context/theme.context";

interface TimerProps {
  deadline: number | null;
}

const CountdownTimer: React.FC<TimerProps> = ({ deadline }) => {
  const { appTheme, currentTheme } = useApptheme();
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null) return;
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [deadline]);

  const overdue = deadline !== null && now >= deadline;
  const seconds =
    deadline === null ? 0 : Math.ceil(Math.abs(deadline - now) / 1000);
  const hours = Math.floor(seconds / 3600);
  const value = [hours, Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const color = overdue
    ? currentTheme === "dark"
      ? "#fbbf24"
      : "#92400e"
    : appTheme.primary;
  const label =
    deadline === null
      ? t("Preparation time unavailable")
      : overdue
        ? t("Preparation overdue")
        : t("Time Left");
  const angle = deadline === null ? 0 : (Math.floor(now / 1000) % 60) * 6;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 14,
        backgroundColor:
          currentTheme === "dark" ? "#1f2937" : overdue ? "#fffbeb" : "#eff6ff",
        borderWidth: 1,
        borderColor:
          currentTheme === "dark" ? "#374151" : overdue ? "#fde68a" : "#dbeafe",
      }}
    >
      <Svg width={44} height={44} viewBox="0 0 44 44" accessible={false}>
        <Circle
          cx={22}
          cy={22}
          r={20}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
        <Line
          x1={22}
          y1={22}
          x2={22}
          y2={11}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          transform={`rotate(${angle / 12 + 90} 22 22)`}
        />
        <Line
          x1={22}
          y1={24}
          x2={22}
          y2={6}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          transform={`rotate(${angle} 22 22)`}
        />
        <Circle cx={22} cy={22} r={2.5} fill={color} />
      </Svg>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: currentTheme === "dark" ? "#cbd5e1" : color,
            fontSize: 12,
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        <Text
          accessibilityLabel={`${label}: ${deadline === null ? "--:--:--" : value}`}
          style={{
            color: currentTheme === "dark" ? "#f8fafc" : color,
            fontSize: 24,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
            letterSpacing: 1,
          }}
        >
          {deadline === null ? "--:--:--" : value}
        </Text>
      </View>
    </View>
  );
};
export default CountdownTimer;
