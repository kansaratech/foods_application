import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoSecureStore from "expo-secure-store";
import { Platform } from "react-native";

// expo-secure-store has no web implementation (its native module is `{}`
// there), so every call throws. Fall back to AsyncStorage on web while
// keeping the same API shape as expo-secure-store for native platforms.
const isWeb = Platform.OS === "web";

export const getItemAsync = (key: string): Promise<string | null> =>
  isWeb ? AsyncStorage.getItem(key) : ExpoSecureStore.getItemAsync(key);

export const setItemAsync = (key: string, value: string): Promise<void> =>
  isWeb
    ? AsyncStorage.setItem(key, value)
    : ExpoSecureStore.setItemAsync(key, value);

export const deleteItemAsync = (key: string): Promise<void> =>
  isWeb ? AsyncStorage.removeItem(key) : ExpoSecureStore.deleteItemAsync(key);
