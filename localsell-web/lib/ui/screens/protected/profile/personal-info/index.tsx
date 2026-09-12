"use client";

import { FavouriteProducts, PersonalInfoMain } from "@/lib/ui/screen-components/protected/profile";

  export default function PersonalInfoScreen() {
    return (
      <div data-profile-section="personal-info" className="flex flex-col gap-6">
        {/* Main Profile */}
       <PersonalInfoMain/>
       {/* Favourites Items  */}
       <FavouriteProducts/>
      </div>
    );
  }
  