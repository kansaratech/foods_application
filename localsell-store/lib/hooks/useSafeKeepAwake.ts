import { useEffect } from "react";
import { Platform } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

// expo-keep-awake's web implementation calls the WakeLock API without
// handling rejections (e.g. `activate` throws when the page isn't visible,
// `deactivate` throws if `activate` never resolved in time), which surfaces
// as an uncaught error. Keeping the screen awake is a native-only concept
// anyway, so this is a no-op on web.
export default function useSafeKeepAwake(tag?: string) {
  useEffect(() => {
    if (Platform.OS === "web") return;

    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [tag]);
}
