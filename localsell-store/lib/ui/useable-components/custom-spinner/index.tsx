import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";
import { useApptheme } from "@/lib/context/theme.context";
import { IMAGES } from "@/lib/assets/images";
import { useReducedMotion } from "../brand-loader/motion";
export default function CustomSpinner({
  size = 28,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const { appTheme } = useApptheme();
  const reduced = useReducedMotion();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
      spin.setValue(0);
    };
  }, [reduced, spin]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="LocalSell loading"
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: "transparent",
          borderTopColor: color ?? appTheme.primary,
          borderRightColor: color ?? appTheme.primary,
          transform: [
            {
              rotate: spin.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        }}
      />
      <Image
        source={IMAGES.loaderIcon}
        resizeMode="contain"
        style={{
          width: size * 0.7,
          height: size * 0.7,
          backgroundColor: "white",
          borderRadius: size,
        }}
      />
    </View>
  );
}
