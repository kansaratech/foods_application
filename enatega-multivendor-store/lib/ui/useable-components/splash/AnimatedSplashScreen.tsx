import * as SplashScreen from "expo-splash-screen";
import { ReactNode, useEffect, useState } from "react";
import { Platform, View } from "react-native";
import AnimatedSplash from "./AnimatedSplash";

// Keep the native OS splash up until our theme-aware JS splash has painted, so
// there is no black/white flash at the native -> JS handoff.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function AnimatedSplashScreen({
  children,
}: {
  children: ReactNode;
}) {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Web renders the app immediately - the animated splash is a native launch
  // treatment only.
  if (Platform.OS === "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {!splashDone && (
        <AnimatedSplash ready onFinish={() => setSplashDone(true)} />
      )}
    </View>
  );
}
