"use client";
import { useParams } from "next/navigation";
import OrderTrackingScreen from "@/lib/ui/screens/protected/order/tracking";
export default function Page() {
  const { id } = useParams();
  return <OrderTrackingScreen orderId={id as string} view="confirmation" />;
}
