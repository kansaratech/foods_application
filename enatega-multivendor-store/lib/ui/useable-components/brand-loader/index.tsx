// Core
import { Image, Text, View } from "react-native";

// Constants
import { Colors } from "@/lib/utils/constants";

// Assets
import { IMAGES } from "@/lib/assets/images";

// UI
import CustomSpinner from "../custom-spinner";

interface IBrandLoaderProps {
  /** Optional status line shown under the spinner. */
  label?: string;
}

/**
 * Full-screen branded loading state. Used while the app boots (token / i18n)
 * and as a fallback whenever a screen has nothing to show yet, so the user
 * never stares at a blank white page during an API call.
 */
export default function BrandLoader({ label }: IBrandLoaderProps) {
  return (
    <View
      className="flex-1 items-center justify-center gap-6"
      style={{ backgroundColor: Colors.light.screenBackground }}
    >
      <Image
        source={IMAGES.icon}
        style={{ width: 72, height: 72 }}
        resizeMode="contain"
      />
      <CustomSpinner size={28} color={Colors.light.primary} />
      {!!label && (
        <Text
          className="text-sm font-medium"
          style={{ color: Colors.light.fontSecondColor }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
