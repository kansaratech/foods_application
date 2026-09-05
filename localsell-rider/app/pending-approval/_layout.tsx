// Expo
import { Stack } from "expo-router";

export default function PendingApprovalLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
