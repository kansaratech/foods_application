import { useState } from "react";

// Hooks
import useGeocoding from "./useGeocoding";
import useToast from "./useToast";

// Context
import { useUserAddress } from "../context/address/address.context";

// Types
import { LocationNameSpace } from "../utils/types/location";
import { onUseLocalStorage } from "../utils/methods/local-storage";
import { USER_CURRENT_LOCATION_LS_KEY } from "../utils/constants";

export default function useSetUserCurrentLocation() {
  // States
  const [isLocationFetching, setIsLocationFetching] = useState(false);

  const { showToast } = useToast();
  const { getAddress } = useGeocoding();
  const { setUserAddress } = useUserAddress();

  const onSetUserLocation: LocationNameSpace.LocationCallback = async (
    error,
    current_location,
  ) => {
    setIsLocationFetching(true);
    try {
      // Browser refused / couldn't provide a position — surface the real reason.
      if (error) {
        showToast({
          type: "error",
          title: "Current location",
          message:
            typeof error === "string"
              ? error
              : "Couldn't get your current location. Please search for your address instead.",
        });
        return;
      }

      if (!current_location) {
        showToast({
          type: "error",
          title: "Current location",
          message:
            "Couldn't get your current location. Please search for your address instead.",
        });
        return;
      }

      // Reverse-geocode for a readable label; coordinates are still usable if
      // that lookup fails.
      let address = current_location.deliveryAddress || "";
      try {
        const { formattedAddress } = await getAddress(
          current_location.latitude,
          current_location.longitude,
        );
        if (formattedAddress) address = formattedAddress;
      } catch {
        /* keep whatever label we already have */
      }
      if (!address) {
        address = `${current_location.latitude.toFixed(
          4,
        )}, ${current_location.longitude.toFixed(4)}`;
      }

      const resolved = {
        label: "Home",
        _id: "",
        deliveryAddress: address,
        location: {
          coordinates: [
            current_location.longitude,
            current_location.latitude,
          ] as [number, number],
        },
      };

      onUseLocalStorage(
        "save",
        USER_CURRENT_LOCATION_LS_KEY,
        JSON.stringify(resolved),
      );
      setUserAddress(resolved);
    } catch (fetchError) {
      console.error("Error resolving current location", fetchError);
      showToast({
        type: "error",
        title: "Current location",
        message:
          "Something went wrong getting your location. Please search for your address instead.",
      });
    } finally {
      setIsLocationFetching(false);
    }
  };

  return { onSetUserLocation, isLocationFetching };
}
