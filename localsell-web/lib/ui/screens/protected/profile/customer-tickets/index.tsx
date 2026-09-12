"use client";
import CustomerTicketsMain from "@/lib/ui/screen-components/protected/profile/customer-tickets";
export default function CustomerTicketsScreen() {
  return (
    <div data-profile-section="customer-tickets" className="flex flex-col gap-6">
      <CustomerTicketsMain />
    </div>
  );
}