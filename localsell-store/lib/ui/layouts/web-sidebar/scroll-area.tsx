import { ReactNode } from "react";
import { ScrollView, StyleProp, ViewStyle } from "react-native";

/**
 * Native fallback for the web `scroll-area.web.tsx`. The web sidebar only ever
 * renders on desktop web, so this is effectively unused — it exists so the
 * module (and its `perfect-scrollbar` import) never reaches the native bundle.
 */
export default function ScrollArea({
  children,
  contentStyle,
}: {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  deps?: unknown[];
}) {
  return <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>;
}
