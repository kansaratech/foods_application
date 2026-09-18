import { Colors } from "@/lib/utils/constants";
import { IFlashMessageComponentProps } from "@/lib/utils/interfaces/flash-message.interface";
import { showMessage } from "react-native-flash-message";

// Same brand blue as every other banner (header, buttons) — an "Invalid
// credentials" error painted in this color read as chrome, not a warning,
// and its dark-gray text had poor contrast against it. Map each type to a
// distinct, high-contrast color with white text and a matching icon instead.
const TYPE_STYLE = {
  error: { backgroundColor: Colors.light.error, icon: "danger" as const },
  success: { backgroundColor: Colors.light.orderComplete, icon: "success" as const },
  info: { backgroundColor: Colors.light.primary, icon: "info" as const },
};

export default function FlashMessageComponent(
  props: IFlashMessageComponentProps
) {
  const { backgroundColor, icon } = TYPE_STYLE[props.type ?? "error"];

  showMessage({
    message: props.message,
    icon,
    backgroundColor,
    position: "top",
    duration: 3500,
    style: {
      borderRadius: 40,
      marginLeft: 20,
      marginRight: 20,
      marginTop: 30,
      minHeight: 40, // force consistent height
      paddingVertical: 10, // add padding
    },
    titleStyle: {
      color: Colors.light.white,
      fontSize: 14, // force consistent font size
      fontWeight: "600",
      textAlign: "center",
    },
    floating: true, // removes platform-based default margins
  });
}
