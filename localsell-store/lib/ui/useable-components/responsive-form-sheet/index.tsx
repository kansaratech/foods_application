import {
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { useApptheme } from "@/lib/context/theme.context";

export interface ResponsiveFormSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  children: ReactNode;
  snapPoint?: `${number}%`;
  maxWidth?: number;
  header?: ReactNode;
  footer?: ReactNode;
  sidebar?: ReactNode;
}

// Native (iOS/Android) keeps the familiar bottom sheet. On web, the same
// content renders as a centered dialog instead - a full-width sheet sliding
// up from the bottom of a desktop browser window reads as mobile chrome, not
// a web app. Both branches expose the same present()/dismiss() handle so
// call sites don't need any platform-specific code.
const ResponsiveFormSheet = forwardRef<ResponsiveFormSheetHandle, Props>(
  (
    { children, snapPoint = "90%", maxWidth = 480, header, footer, sidebar },
    ref,
  ) => {
    const { appTheme } = useApptheme();
    const [webVisible, setWebVisible] = useState(false);
    const sheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => {
        if (Platform.OS === "web") setWebVisible(true);
        else sheetRef.current?.present();
      },
      dismiss: () => {
        if (Platform.OS === "web") setWebVisible(false);
        else sheetRef.current?.dismiss();
      },
    }));

    if (Platform.OS === "web") {
      return (
        <Modal
          visible={webVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setWebVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onPress={() => setWebVisible(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: appTheme.themeBackground,
                width: "100%",
                maxWidth,
                maxHeight: "85%",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              {header && (
                <View
                  style={{
                    padding: 24,
                    borderBottomWidth: 1,
                    borderColor: appTheme.borderLineColor,
                  }}
                >
                  {header}
                </View>
              )}
              <View
                style={{ flexDirection: "row", flexShrink: 1, minHeight: 0 }}
              >
                <ScrollView
                  style={{ flex: 1, minWidth: 0 }}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ padding: 24, gap: 20 }}
                >
                  {children}
                </ScrollView>
                {sidebar && (
                  <ScrollView
                    style={{
                      width: 320,
                      flexGrow: 0,
                      borderLeftWidth: 1,
                      borderColor: appTheme.borderLineColor,
                    }}
                    contentContainerStyle={{ padding: 20 }}
                  >
                    {sidebar}
                  </ScrollView>
                )}
              </View>
              {footer && (
                <View
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderTopWidth: 1,
                    borderColor: appTheme.borderLineColor,
                  }}
                >
                  {footer}
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      );
    }

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={[snapPoint]}
        style={{ backgroundColor: appTheme.themeBackground }}
        handleComponent={() => (
          <View
            style={{
              backgroundColor: appTheme.themeBackground,
              alignItems: "center",
              justifyContent: "center",
              borderTopWidth: 1,
              borderTopColor: appTheme.fontMainColor,
              paddingVertical: 8,
            }}
          >
            <Ionicons color={appTheme.fontMainColor} name="remove" size={30} />
          </View>
        )}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: 16,
            gap: 12,
            backgroundColor: appTheme.themeBackground,
          }}
        >
          {header}
          {children}
          {footer}
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

ResponsiveFormSheet.displayName = "ResponsiveFormSheet";
export default ResponsiveFormSheet;
