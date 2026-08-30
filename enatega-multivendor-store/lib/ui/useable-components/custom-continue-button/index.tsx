import { useApptheme } from "@/lib/context/theme.context";
import { Text, TouchableOpacity } from "react-native";
import { TouchableOpacityProps } from "react-native-gesture-handler";
import CustomSpinner from "../custom-spinner";

export default function CustomContinueButton({
  title,
  isLoading,
  ...props
}: { title: string; isLoading?: boolean } & TouchableOpacityProps) {
  // Hooks
  const { appTheme } = useApptheme();
  return (
    <TouchableOpacity
      {...props}
      className="h-14 w-full rounded-2xl items-center justify-center mt-2"
      style={{
        backgroundColor: appTheme.primary,
        opacity: props.disabled || isLoading ? 0.6 : 1,
      }}
    >
      {isLoading ? (
        <CustomSpinner />
      ) : (
        <Text className="text-base font-bold" style={{ color: appTheme.white }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
