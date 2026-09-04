import { useApptheme } from "@/lib/context/theme.context";
import { Text, TouchableOpacity, View } from "react-native";
import { TouchableOpacityProps } from "react-native-gesture-handler";
import CustomSpinner from "../custom-spinner";

export default function CustomContinueButton({
  title,
  isLoading,
  loadingTitle,
  ...props
}: {
  title: string;
  isLoading?: boolean;
  loadingTitle?: string;
} & TouchableOpacityProps) {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <TouchableOpacity
      {...props}
      disabled={props.disabled || isLoading}
      className="h-14 w-full rounded-2xl items-center justify-center mt-2"
      style={{
        backgroundColor: appTheme.primary,
        opacity: props.disabled || isLoading ? 0.75 : 1,
      }}
    >
      {isLoading ? (
        <View className="flex-row items-center justify-center gap-3">
          <CustomSpinner size={20} color={appTheme.white} />
          <Text
            className="text-base font-bold"
            style={{ color: appTheme.white }}
          >
            {loadingTitle ?? `${title}…`}
          </Text>
        </View>
      ) : (
        <Text className="text-base font-bold" style={{ color: appTheme.white }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
