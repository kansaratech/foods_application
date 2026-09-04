// Core
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

// Hooks
import { useApptheme } from "@/lib/context/theme.context";

interface ICustomSpinnerProps {
  /** Diameter of the spinner in px. Defaults to 32. */
  size?: number;
  /** Colour of the moving arc. Defaults to the theme's main font colour. */
  color?: string;
}

export default function CustomSpinner({ size = 32, color }: ICustomSpinnerProps) {
  // Hooks
  const { appTheme } = useApptheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spinValue]);

  const arcColor = color ?? appTheme.fontMainColor;

  return (
    <Animated.View
      className="self-center"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: Math.max(2, size / 12),
        borderColor: "transparent",
        borderTopColor: arcColor,
        borderRightColor: arcColor,
        transform: [
          {
            rotate: spinValue.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    />
  );
}
