import { useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, Easing, Image, Platform, Text, View } from "react-native";
import { IMAGES } from "@/lib/assets/images";
import { useApptheme } from "@/lib/context/theme.context";
import { networkActivity } from "@/lib/utils/network-activity";
import { useReducedMotion } from "./motion";

export default function BrandLoader({
  label = "Loading...",
  variant = "page",
}: {
  label?: string;
  variant?: "page" | "panel" | "compact";
}) {
  const { appTheme, currentTheme } = useApptheme();
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const compact = variant === "compact";
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      progress.setValue(0);
    };
  }, [progress, reduced]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Localsell: ${label}`}
      style={{
        flex: variant === "page" ? 1 : undefined,
        minHeight: compact ? undefined : 180,
        padding: compact ? 0 : 24,
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 6 : 12,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          alignItems: "center",
          gap: compact ? 6 : 14,

        }}
      >
        <Image
          source={
            currentTheme === "dark" ? IMAGES.brandLogoInverse : IMAGES.brandLogo
          }
          resizeMode="contain"
          style={{ width: compact ? 112 : 180, height: compact ? 31 : 50 }}
        />
        <View
          style={{
            width: compact ? 72 : 108,
            height: 3,
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: appTheme.lowOpacityPrimaryColor,
          }}
        >
          <Animated.View
            style={{
              width: reduced ? "100%" : "45%",
              height: "100%",
              backgroundColor: appTheme.primary,
              borderRadius: 4,
              transform: [
                {
                  translateX: reduced
                    ? 0
                    : progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-50, 110],
                      }),
                },
              ],
            }}
          />
        </View>
        <Text
          style={{
            fontSize: compact ? 11 : 12,
            color: appTheme.fontSecondColor,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
export function NetworkActivity() {
  const visible = useSyncExternalStore(
    networkActivity.subscribe,
    networkActivity.getSnapshot,
    networkActivity.getServerSnapshot,
  );
  const { appTheme } = useApptheme();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        right: 16,
        bottom: Platform.OS === "web" ? 20 : 90,
        zIndex: 1200,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: appTheme.borderLineColor,
        backgroundColor: appTheme.cartContainer,
        shadowColor: "#0f172a",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <BrandLoader variant="compact" />
    </View>
  );
}
