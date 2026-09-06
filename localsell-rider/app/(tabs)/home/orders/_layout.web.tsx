import { Tabs } from "expo-router";
export default function OrdersLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
    />
  );
}
