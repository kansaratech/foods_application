"use client";
import AddressesMain from "@/lib/ui/screen-components/protected/profile/addresses/main";

  export default function AddressesScreen() {
    return (
      <div data-profile-section="addresses" className="flex flex-col gap-6">
       <AddressesMain/>
      </div>
    );
  }