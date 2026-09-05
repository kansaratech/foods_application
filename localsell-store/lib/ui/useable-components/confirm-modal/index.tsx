import { Platform, Text, TouchableOpacity, View } from "react-native";
import ReactNativeModal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";

import { useApptheme } from "@/lib/context/theme.context";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog. Replaces `Alert.alert([...])`, which is a no-op on
 * react-native-web, and gives a branded look instead of the browser's native
 * `window.confirm`.
 */
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { appTheme } = useApptheme();
  const isWeb = Platform.OS === "web";
  const accent = destructive ? appTheme.textErrorColor : appTheme.primary;

  return (
    <ReactNativeModal
      isVisible={visible}
      onBackdropPress={onCancel}
      onBackButtonPress={onCancel}
      useNativeDriver
      animationIn={isWeb ? "fadeIn" : "zoomIn"}
      animationOut={isWeb ? "fadeOut" : "zoomOut"}
      backdropOpacity={0.45}
      style={{ margin: 0, alignItems: "center", justifyContent: "center" }}
    >
      <View
        style={{
          backgroundColor: appTheme.themeBackground,
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        }}
        className="w-[90%] max-w-[380px] rounded-3xl p-6"
      >
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl self-start mb-4"
          style={{ backgroundColor: appTheme.lowOpacityPrimaryColor }}
        >
          <Ionicons
            name={icon ?? (destructive ? "warning-outline" : "help-circle-outline")}
            size={24}
            color={accent}
          />
        </View>

        <Text
          className="text-xl font-bold"
          style={{ color: appTheme.fontMainColor }}
        >
          {title}
        </Text>

        {!!message && (
          <Text
            className="text-sm leading-6 mt-2"
            style={{ color: appTheme.fontSecondColor }}
          >
            {message}
          </Text>
        )}

        <View className="flex-row justify-end gap-3 mt-6">
          <TouchableOpacity
            onPress={onCancel}
            disabled={loading}
            className="h-11 px-5 items-center justify-center rounded-full border"
            style={{ borderColor: appTheme.borderLineColor }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: appTheme.fontMainColor }}
            >
              {cancelLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            disabled={loading}
            className="h-11 px-5 items-center justify-center rounded-full"
            style={{ backgroundColor: accent, opacity: loading ? 0.7 : 1 }}
          >
            <Text className="text-sm font-semibold text-white">
              {loading ? "Please wait…" : confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ReactNativeModal>
  );
}
