/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useContext, useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import { useMutation } from "@apollo/client";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowCircleLeft,
  faCirclePlus,
  faMapMarker,
  faPlus,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { AutoComplete, AutoCompleteSelectEvent } from "primereact/autocomplete";
import { throttle } from "lodash";
import parse from "autosuggest-highlight/parse";

// SVG
import {
  ApartmentSvg,
  HomeSvg,
  OfficeSvg,
  OtherSvg,
} from "@/lib/utils/assets/svg";

// Components
import CustomLoader from "../custom-progress-indicator";
import CustomDropdownComponent from "../custom-dropdown";

// Context
import { useUserAddress } from "@/lib/context/address/address.context";
import { GoogleMapsContext } from "@/lib/context/global/google-maps.context";
import { useLocationContext } from "@/lib/context/Location/Location.context";

// Hook
import useUser from "@/lib/hooks/useUser";
import useLocation from "@/lib/hooks/useLocation";
import useGeocoding from "@/lib/hooks/useGeocoding";
import useToast from "@/lib/hooks/useToast";
import useSetUserCurrentLocation from "@/lib/hooks/useSetUserCurrentLocation";

// Interface
import {
  IDropdownSelectItem,
  IPlaceSelectedOption,
  IUserAddress,
  IUserAddressComponentProps,
} from "@/lib/utils/interfaces";

// API
import {
  CREATE_ADDRESS,
  EDIT_ADDRESS,
  SELECT_ADDRESS,
} from "@/lib/api/graphql";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import { USER_CURRENT_LOCATION_LS_KEY } from "@/lib/utils/constants";
import AppartmentSvg from "@/lib/utils/assets/svg/apartment";
import { useTranslations } from "next-intl";
import { darkMapStyle } from "@/lib/utils/mapStyles/mapStyle";
import { useTheme } from "@/lib/providers/ThemeProvider";

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

const autocompleteService: {
  current: google.maps.places.AutocompleteService | null;
} = { current: null };

// Pull a 6-digit Indian PIN code out of a formatted address string.
const extractPincode = (address?: string | null) =>
  address?.match(/\b[1-9]\d{5}\b/)?.[0] ?? "";

export default function UserAddressComponent(
  props: IUserAddressComponentProps
) {
  // Props
  const { visible, onHide, editAddress, confirmYourAddress } = props;

  // States
  const [modifiyingId, setModifyingId] = useState("");
  const [[index, direction], setIndex] = useState<[number, number]>([0, 0]);
  const [selectedCity, setSelectedCity] = useState<IDropdownSelectItem | null>(
    null
  );
  const [newDraggedCenter, setNewDraggedCenter] = useState({ lat: 0, lng: 0 });
  const [selectedLocationType, setSelectedLocationType] =
    useState<string>("House");
  const [search, setSearch] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [isDragged, setIsDragged] = useState(false);
  // Structured address fields — pincode is required for exact delivery.
  const [areaLine, setAreaLine] = useState<string>("");
  const [stateName, setStateName] = useState<string>("Rajasthan");
  const [pincode, setPincode] = useState<string>("");
  // set when the user taps "Current location" so we can show the resolved
  // address in the panel instead of closing the dialog straight away.
  const [pickedCurrentLocation, setPickedCurrentLocation] = useState(false);
  const [options, setOptions] = useState<IPlaceSelectedOption[]>([]);
  const [selectedPlaceObject, setSelectedPlaceObject] =
    useState<IPlaceSelectedOption | null>(null);

  // Hook
  const { profile, loadingProfile } = useUser();
  const { theme } = useTheme();
  const { getCurrentLocation } = useLocation();
  const { getAddress } = useGeocoding();
  const { userAddress, setUserAddress } = useUserAddress();
  const { isLocationFetching, onSetUserLocation } = useSetUserCurrentLocation();
  const { showToast } = useToast();

  // Context
  const { isLoaded } = useContext(GoogleMapsContext);
  const { cities } = useLocationContext();

  // API
  const [changeUserSelectedAddress, { loading }] = useMutation(SELECT_ADDRESS);
  const [mutate, { loading: modifyingAddressLoading }] = useMutation(
    editAddress?._id ? EDIT_ADDRESS : CREATE_ADDRESS,
    {
      onCompleted,
      onError,
    }
  );

  // Locatl Storage Constaints
  const hasCurrentLocation = !!onUseLocalStorage(
    "get",
    USER_CURRENT_LOCATION_LS_KEY
  );

  // Memo
  const cities_dropdown = useMemo(() => {
    return cities?.map((city) => {
      return {
        _id: city.id,
        label: city.name,
        code: `{"coords":[${city.longitude || 0}, ${city.latitude || 0}]}`,
      };
    });
  }, [cities]);

  const fetch = React.useMemo(
    () =>
      throttle((request, callback) => {
        autocompleteService?.current?.getPlacePredictions(request, callback);
      }, 1500),
    []
  );

  // Handlers
  const onHandleEditAddressInit = () => {
    if (!editAddress) return;

    setSelectedLocationType(editAddress?.label || "");
    setInputValue(editAddress?.deliveryAddress || "");
    setSelectedCity(
      cities_dropdown?.find((city) => city.label === editAddress?.details) ||
        null
    );
    setPincode(extractPincode(editAddress?.deliveryAddress));
    paginate(1);
  };

  const onHandleSelectAddress = async (address: IUserAddress) => {
    setModifyingId(address._id);
    changeUserSelectedAddress({
      variables: { id: address._id },
      onCompleted: () => {
        const new_address = {
          ...address,
          location: {
            coordinates: [
              +(address.location?.coordinates[0] || "0"),
              +(address.location?.coordinates[1] || "0"),
            ] as [number, number],
          },
        };

        setUserAddress(new_address);
        onUseLocalStorage("delete", USER_CURRENT_LOCATION_LS_KEY);
        setModifyingId("");
        onHide();
      },
    });
  };

  const paginate = (newDirection: number) => {
    const total = COMPONENTS_LIST.length;

    // Calculate the new index and wrap around using modulo
    let newIndex = index + newDirection;

    if (newIndex < 0) {
      newIndex = total - 1; // go to last item if negative overflow
    } else if (newIndex >= total) {
      newIndex = 0; // go to first item if positive overflow
    }

    setIndex([newIndex, newDirection]);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const onHandlerAutoCompleteSelectionChange = (
    event: AutoCompleteSelectEvent
  ) => {
    const selectedOption = event?.value as IPlaceSelectedOption;
    if (selectedOption) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { placeId: selectedOption.place_id },
        (results: google.maps.GeocoderResult[] | null) => {
          if (
            results &&
            results[0] &&
            results[0]?.geometry &&
            results[0]?.geometry.location
          ) {
            const location = results[0]?.geometry?.location;

            setUserAddress({
              _id: "",
              deliveryAddress: selectedOption.description,
              location: {
                coordinates: [location?.lng() ?? 0, location?.lat() ?? 0],
              },
              label: "Home",
            });

            setInputValue(selectedOption.description);
            setIsDragged(true);

            // Auto-fill PIN / state from the place's address components.
            const comps = results[0].address_components || [];
            const pin = comps.find((c) => c.types.includes("postal_code"))
              ?.long_name;
            const region = comps.find((c) =>
              c.types.includes("administrative_area_level_1"),
            )?.long_name;
            if (pin) setPincode(pin);
            else {
              const guess = extractPincode(
                results[0].formatted_address || selectedOption.description,
              );
              if (guess) setPincode(guess);
            }
            if (region) setStateName(region);
          }
        }
      );
      setSelectedPlaceObject(selectedOption);
    }
  };

  const onCenterDraggedHandler = async (e?: google.maps.MapMouseEvent) => {
    const new_center = {
      lat: e?.latLng?.lat() || newDraggedCenter.lat || 0,
      lng: e?.latLng?.lng() || newDraggedCenter.lng || 0,
    };
    if (new_center.lat === 0 && new_center.lng === 0) return;

    const { formattedAddress } = await getAddress(
      new_center.lat,
      new_center.lng
    );

    if (!formattedAddress) {
      showToast({
        type: "error",
        title: "Error",
        message: t("failed_to_fetch_Address"),
      });
      return;
    }

    setInputValue(formattedAddress);
    const foundPin = extractPincode(formattedAddress);
    if (foundPin) setPincode(foundPin);
    //set isDragged to true to enable save_address button
    setIsDragged(true);
    // setIsDragged(true); // to enable save_address button
    // console.log("isDragged set to true", isDragged);
    setUserAddress({
      _id: "",
      deliveryAddress: formattedAddress,
      location: { coordinates: [new_center.lng, new_center.lat] },
      label: t("label_home"),
    });
  };

  const onClickGoogleMaps = (e: google.maps.MapMouseEvent) => {
    setNewDraggedCenter({
      lat: e?.latLng?.lat() ?? 0,
      lng: e?.latLng?.lng() ?? 0,
    });
  };

  const t = useTranslations();

  const LOCATIONT_TYPE = [
    {
      name: "House",
      translatedName: t("loctype1"),
      icon: (color?: string, darkColor?: string) => (
        <HomeSvg
          darkColor={darkColor || "#ffffff"}
          color={color || "#0F172A"}
        />
      ),
    },
    {
      name: "Office",
      translatedName: t("loctype2"),
      icon: (color?: string, darkColor?: string) => (
        <OfficeSvg
          darkColor={darkColor || "#ffffff"}
          color={color || "#0F172A"}
        />
      ),
    },
    {
      name: "Apartment",
      translatedName: t("loctype3"),
      icon: (color?: string, darkColor?: string) => (
        <ApartmentSvg
          darkColor={darkColor || "#ffffff"}
          color={color || "#0F172A"}
        />
      ),
    },
    {
      name: "Other",
      translatedName: t("loctype4"),
      icon: (color?: string, darkColor?: string) => (
        <OtherSvg
          darkColor={darkColor || "#ffffff"}
          color={color || "#0F172A"}
        />
      ),
    },
  ];

  // Define constants
  const ADDRESS_TYPES = {
    OFFICE: "Office",
    HOUSE: "House",
    APARTMENT: "Apartment",
    OTHER: "Other",
  } as const;

  const isPincodeValid = /^[1-9]\d{5}$/.test(pincode.trim());

  const onHandleCreateAddress = () => {
    if (!isPincodeValid) {
      showToast({
        type: "error",
        title: t("missing_pincode_title"),
        message: t("pincode_required_message"),
      });
      return;
    }

    // Compose a single delivery-address line from the structured fields so the
    // courier has the exact spot (schema stores one string + city in details).
    const composed = [
      areaLine.trim(),
      inputValue.trim() || selectedCity?.label,
      selectedCity?.label && !inputValue.includes(String(selectedCity?.label))
        ? selectedCity?.label
        : "",
      stateName.trim(),
      pincode.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    const addressInput = {
      ...(editAddress?._id ? { _id: editAddress?._id } : {}),
      longitude: `${userAddress?.location?.coordinates[0]}`,
      latitude: `${userAddress?.location?.coordinates[1]}`,
      deliveryAddress: composed || userAddress?.deliveryAddress || "",
      details: selectedCity?.label,
      label: selectedLocationType,
    };

    if (editAddress?._id) {
      addressInput["_id"] = editAddress?._id;
    }
    mutate({ variables: { addressInput } });
  };

  // Reset the form panels and close the dialog. Called on save, cancel and
  // after a successful address selection so the modal never gets stuck open.
  const resetAndClose = () => {
    setModifyingId("");
    setIndex([0, 0]);
    setSelectedLocationType("House");
    setInputValue("");
    setSelectedCity(null);
    setIsDragged(false);
    setPickedCurrentLocation(false);
    setAreaLine("");
    setStateName("Rajasthan");
    setPincode("");
    onHide();
  };

  // API Handlers
  function onCompleted(data: any) {
    const addresses: IUserAddress[] =
      (data?.createAddress || data?.editAddress)?.addresses ?? [];
    // the address we just saved: the one flagged selected, else the newest
    // (freshly created addresses are appended to the list)
    const address_response: IUserAddress | undefined =
      addresses.find((a) => a.selected) ?? addresses[addresses.length - 1];

    showToast({
      title: t("Address_Saved_toast_title"),
      type: "success",
      message: t("Your_address_has_been_saved_successfully"),
    });

    if (!address_response?._id) {
      // nothing usable came back — still close so the user isn't trapped
      resetAndClose();
      return;
    }

    const new_address = {
      _id: address_response._id,
      label: selectedLocationType,
      deliveryAddress: address_response.deliveryAddress,
      location: {
        coordinates: [
          +(address_response.location?.coordinates?.[0] || "0"),
          +(address_response.location?.coordinates?.[1] || "0"),
        ] as [number, number],
      },
    };
    setUserAddress(new_address);
    onUseLocalStorage("delete", USER_CURRENT_LOCATION_LS_KEY);

    // Mark it selected in the background; close the modal immediately either way.
    changeUserSelectedAddress({
      variables: { id: address_response._id },
      onCompleted: () => setUserAddress(new_address),
    });
    resetAndClose();
  }

  function onError() {
    showToast({
      title: t("Address_updated_success"),
      type: "error",
      message: t("Address_updated_failed_message"),
    });
  }

  /*
  ################
  Templates
  ################
  */
  const CHOOSE_ADDRESS = (
    <div className="w-full space-y-4 flex flex-col items-center">
      {/* Header */}
      <div className="w-full">
        {confirmYourAddress ? (
          <span className="font-inter font-bold text-[25px] tracking-normal">
            {t("confirm") + " " + t("Address")}
          </span>
        ) : (
          <span className="font-inter font-bold text-[25px] tracking-normal">
            {t("where_to_address_label")}
          </span>
        )}
      </div>

      <button
        className="w-[90%] h-fit bg-primary-color mb-2 text-white py-2 space-x-2 rtl:space-x-reverse  rounded-full text-base lg:text-[14px]"
        disabled={isLocationFetching}
        onClick={() => {
          setPickedCurrentLocation(true);
          getCurrentLocation(onSetUserLocation);
        }}
      >
        <FontAwesomeIcon
          icon={isLocationFetching ? faSpinner : faCirclePlus}
          spin={isLocationFetching}
        />
        <span>{t("LoginForSavedAddresses.currentlocation")}</span>
      </button>

      {pickedCurrentLocation && (
        <div className="w-[90%] rounded-xl border border-primary-color bg-primary-light dark:bg-gray-800 p-3">
          {isLocationFetching ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              {t("LoginForSavedAddresses.currentlocation")}…
            </p>
          ) : userAddress?.deliveryAddress ? (
            <>
              <div className="flex items-start gap-x-2">
                <FontAwesomeIcon icon={faMapMarker} className="mt-1 text-primary-color" />
                <div className="flex flex-col">
                  <span className="font-inter font-medium text-sm text-secondary-color">
                    {t("LoginForSavedAddresses.currentlocation")}
                  </span>
                  <span className="font-inter text-xs text-gray-500 dark:text-gray-300">
                    {userAddress.deliveryAddress}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex gap-x-2">
                <button
                  className="flex-1 h-fit bg-primary-color text-white py-2 rounded-full text-sm"
                  onClick={() => {
                    setPickedCurrentLocation(false);
                    onHide();
                  }}
                >
                  {t("confirm")}
                </button>
                <button
                  className="flex-1 h-fit bg-transparent text-secondary-color border border-primary-color py-2 rounded-full text-sm"
                  onClick={() => {
                    // carry the resolved address into the "add address" form
                    setInputValue(userAddress?.deliveryAddress || "");
                    setPickedCurrentLocation(false);
                    paginate(1);
                  }}
                >
                  {t("Save_address")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("something_went_wrong_please_try_again")}
            </p>
          )}
        </div>
      )}

      <div className="w-full flex flex-col items-center">
        {loadingProfile ? (
          <div className="w-full flex items-center justify-center m-4">
            <CustomLoader />
          </div>
        ) : (
          profile?.addresses.map((address, index) => {
            const isActive = !!address.selected && !hasCurrentLocation;
            const isBusy = modifiyingId === address._id && loading;
            const iconColor = isActive ? "var(--primary-color)" : undefined;
            const iconDarkColor = isActive ? "var(--primary-color)" : "#ffffff";
            return (
              <button
                type="button"
                key={address._id || index}
                onClick={() => {
                  if (!isActive) onHandleSelectAddress(address);
                }}
                aria-pressed={isActive}
                aria-label={t("choose_Address_label") + " " + address.label}
                className={`w-full mb-3 flex items-center justify-between gap-x-2 rounded-xl border p-2 text-left transition-colors ${
                  isActive
                    ? "border-primary-color bg-primary-light dark:bg-gray-800"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="w-full flex items-center gap-x-2">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-full">
                    {address?.label === ADDRESS_TYPES.OFFICE && (
                      <OfficeSvg height={18} darkColor={iconDarkColor} color={iconColor} />
                    )}
                    {address?.label === ADDRESS_TYPES.HOUSE && (
                      <HomeSvg height={18} darkColor={iconDarkColor} color={iconColor} />
                    )}
                    {address?.label === ADDRESS_TYPES.APARTMENT && (
                      <AppartmentSvg height={18} darkColor={iconDarkColor} color={iconColor} />
                    )}
                    {address?.label === ADDRESS_TYPES.OTHER && (
                      <OtherSvg height={18} darkColor={iconDarkColor} color={iconColor} />
                    )}
                  </div>
                  <div className="w-full flex flex-col gap-y-[2px]">
                    <span
                      className={`font-inter font-medium text-sm leading-5 tracking-normal ${isActive ? "text-secondary-color" : "text-gray-500"}`}
                    >
                      {address.label}
                    </span>
                    <span
                      className={`font-inter font-normal text-xs leading-4 tracking-normal ${isActive ? "text-secondary-color" : "text-gray-400"}`}
                    >
                      {address.deliveryAddress}
                    </span>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className={`shrink-0 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isActive
                      ? "border-primary-color"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {isBusy ? (
                    <FontAwesomeIcon icon={faSpinner} spin className="text-[10px] text-primary-color" />
                  ) : isActive ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary-color" />
                  ) : null}
                </span>
              </button>
            );
          })
        )}

        <button
          className="w-[90%] h-fit bg-primary-color text-white py-2 rounded-full text-base lg:text-[14px]"
          onClick={() => paginate(1)}
        >
          <FontAwesomeIcon icon={faPlus} />{" "}
          <span> {t("add_new_address_button")}</span>
        </button>
        <button
          className={` ${confirmYourAddress ? "block" : "hidden"} w-[90%] h-fit bg-primary-color text-white py-2 rounded-full text-base lg:text-[14px] mt-4`}
          onClick={() => onHide()}
        >
          <span> {t("confirm")}</span>
        </button>
      </div>
    </div>
  );

  // Pin position for the add-address map — the marker is "dropped" as soon as a
  // city or a searched area resolves to real coordinates.
  const addPinLng = Number(userAddress?.location?.coordinates?.[0]) || 0;
  const addPinLat = Number(userAddress?.location?.coordinates?.[1]) || 0;
  const addHasPin = addPinLat !== 0 && addPinLng !== 0;

  const ADD_ADDRESS = (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="w-full">
        <span className="font-inter font-semibold text-[18px] tracking-normal">
          {t("Add_new_address")}
        </span>
      </div>
      {/* Google Maps */}
      {isLoaded && (
        <div className="w-full">
          <GoogleMap
            options={{
              styles: theme === "dark" ? darkMapStyle : null,
              disableDefaultUI: true,
            }}
            mapContainerStyle={{
              width: "100%",
              height: "35vh",
            }}
            center={{
              lat: addPinLat || 0,
              lng: addPinLng || 0,
            }}
            zoom={addHasPin ? 15 : 12}
            onClick={onClickGoogleMaps}
          >
            {addHasPin && (
              <Marker
                position={{ lat: addPinLat, lng: addPinLng }}
                draggable
                onDragEnd={onCenterDraggedHandler}
              />
            )}
          </GoogleMap>
          {!addHasPin && (
            <p className="mt-1 text-[11px] text-gray-400">
              {t("select_city_to_drop_pin")}
            </p>
          )}
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-y-2">
        <div className="w-full space-y-2">
          <CustomDropdownComponent
            name="City"
            placeholder={t("select_city_placeholder")}
            selectedItem={selectedCity}
            setSelectedItem={async (key: string, item: IDropdownSelectItem) => {
              setSelectedCity(item);

              const { coords } = JSON.parse(item.code || "");

              const { formattedAddress } = await getAddress(
                coords[1],
                coords[0]
              );

              setInputValue(formattedAddress);
              const foundPin = extractPincode(formattedAddress);
              if (foundPin) setPincode(foundPin);

              setUserAddress({
                _id: "",
                deliveryAddress: formattedAddress,
                location: { coordinates: [coords[0], coords[1]] },
                label: t("label_home"),
              });
            }}
            options={cities_dropdown}
          />

          <AutoComplete
            id="google-map"
            disabled={!selectedCity}
            className={`mr-4 h-11 w-full border border-gray-300 px-2 text-sm focus:shadow-none focus:outline-none`}
            value={inputValue}
            completeMethod={(event) => {
              setSearch(event.query);
            }}
            onChange={(e) => {
              if (typeof e.value === "string") handleInputChange(e.value);
            }}
            onSelect={onHandlerAutoCompleteSelectionChange}
            suggestions={options}
            forceSelection={false}
            dropdown={false}
            multiple={false}
            loadingIcon={undefined}
            placeholder={t("enter_full_Address_placeholder")}
            style={{ width: "100%" }}
            itemTemplate={(item) => {
              const matches =
                item.structured_formatting?.main_text_matched_substrings;
              let parts: { text: string; highlight: boolean }[] | null = null;
              if (matches) {
                parts = parse(
                  item.structured_formatting.main_text,
                  matches.map((match: { offset: number; length: number }) => [
                    match.offset,
                    match.offset + match.length,
                  ])
                );
              }

              return (
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faMapMarker} className="mr-2" />
                    {parts &&
                      parts?.map((part, index) => (
                        <span className="dark:text-white" key={index}>
                          {part.text}
                        </span>
                      ))}
                  </div>
                  <small>{item.structured_formatting?.secondary_text}</small>
                </div>
              );
            }}
          />

          {/* Structured address fields — pincode is required for exact delivery */}
          <input
            type="text"
            value={areaLine}
            onChange={(e) => setAreaLine(e.target.value)}
            placeholder={t("area_locality_placeholder")}
            className="h-11 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-primary-color dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder={t("state_placeholder")}
              className="h-11 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-primary-color dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              placeholder={t("pincode_placeholder")}
              aria-invalid={pincode.length > 0 && !isPincodeValid}
              className={`h-11 w-full rounded border px-3 text-sm outline-none focus:border-primary-color dark:bg-gray-800 dark:text-white ${
                pincode.length > 0 && !isPincodeValid
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
          </div>
          {pincode.length > 0 && !isPincodeValid && (
            <span className="text-xs text-red-500">
              {t("pincode_required_message")}
            </span>
          )}
        </div>

        <div className="w-full">
          <div className="w-full">
            <span className="font-inter font-semibold text-[12px] tracking-normal dark:text-gray-300">
              {t("Location_Type")}
            </span>
          </div>
          <div className="w-full grid grid-cols-2 gap-4">
            {LOCATIONT_TYPE.map((item) => (
              <div
                key={item.name}
                className="p-2 cursor-pointer flex items-center gap-x-2 shadow rounded dark:bg-gray-800"
                onClick={() => setSelectedLocationType(item.name)}
              >
                <div>
                  {item.icon(
                    selectedLocationType === item.name ? "var(--primary-color)" : undefined,
                    selectedLocationType === item.name ? "var(--primary-color)" : undefined
                  )}
                </div>
                <div className="flex flex-col gap-y-[2px]">
                  <span
                    className={`font-inter font-medium text-sm leading-5 tracking-normal ${selectedLocationType === item.name ? "text-secondary-color" : "text-gray-500 dark:text-gray-300"}`}
                  >
                    {item.translatedName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex justify-between gap-x-2">
          <button
            className="w-full h-fit bg-transparent text-gray-900 dark:text-white py-2 border border-black dark:border-gray-600 rounded-full text-base lg:text-[14px]"
            onClick={() => {
              const selectedAddress = profile?.addresses.find(
                (address) => address.selected
              );
              if (selectedAddress) {
                setUserAddress(selectedAddress);
              }
              setSelectedLocationType("House");
              setIndex([0, 0]);
              setInputValue("");
              setSelectedCity(null);
              setIsDragged(false);
              onHide();
            }}
          >
            <span>{t("cancel_address")}</span>
          </button>
          <button
            disabled={(!isDragged && !selectedCity) || !isPincodeValid}
            className={`w-full h-fit  ${(!isDragged && !selectedCity) || !isPincodeValid ? "bg-primary-light dark:bg-gray-700 text-gray-900 dark:text-white" : "bg-primary-color text-white"} py-2 rounded-full text-base lg:text-[14px]`}
            onClick={() => onHandleCreateAddress()}
          >
            {modifyingAddressLoading ? (
              <FontAwesomeIcon
                icon={faSpinner}
                spin={modifyingAddressLoading}
              />
            ) : (
              <span>{t("Save_address")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const EDIT_ADDRESS_UI = (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="w-full">
        <span className="font-inter font-semibold text-[18px] tracking-normal">
          {t("Add_new_address")}
        </span>
      </div>
      {/* Google Maps */}
      {isLoaded && (
        <div className="w-full">
          <GoogleMap
            options={{
              styles: theme === "dark" ? darkMapStyle : null,
              disableDefaultUI: true,
            }}
            mapContainerStyle={{
              width: "100%",
              height: "400px",
            }}
            center={{
              lat: Number(editAddress?.location?.coordinates[1]) || 0,
              lng: Number(editAddress?.location?.coordinates[0]) || 0,
            }}
            zoom={13}
            onCenterChanged={() => {}}
          >
            {editAddress?.location?.coordinates && (
              <Marker
                position={{
                  lat: Number(editAddress?.location?.coordinates[1]) || 0,
                  lng: Number(editAddress?.location?.coordinates[0]) || 0,
                }}
              />
            )}
          </GoogleMap>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-y-2">
        <div className="w-full space-y-2">
          <CustomDropdownComponent
            name={t("City_label")}
            placeholder={t("select_city_placeholder")}
            selectedItem={selectedCity}
            setSelectedItem={async (key: string, item: IDropdownSelectItem) => {
              setSelectedCity(item);

              const { coords } = JSON.parse(item.code || "");

              const { formattedAddress } = await getAddress(
                coords[1],
                coords[0]
              );

              setInputValue(formattedAddress);

              setUserAddress({
                _id: "",
                deliveryAddress: formattedAddress,
                location: { coordinates: [coords[0], coords[1]] },
                label: t("home"),
              });
            }}
            options={cities_dropdown}
          />

          <AutoComplete
            id="google-map"
            disabled={false}
            className={`mr-4 h-11 w-full border border-gray-300 dark:text-white px-2 text-sm focus:shadow-none focus:outline-none`}
            value={inputValue}
            completeMethod={(event) => {
              setSearch(event.query);
            }}
            onChange={(e) => {
              if (typeof e.value === "string") handleInputChange(e.value);
            }}
            onSelect={onHandlerAutoCompleteSelectionChange}
            suggestions={options}
            forceSelection={false}
            dropdown={false}
            multiple={false}
            loadingIcon={undefined}
            placeholder={t("enter_full_Address_placeholder")}
            style={{ width: "100%" }}
            itemTemplate={(item) => {
              const matches =
                item.structured_formatting?.main_text_matched_substrings;
              let parts: { text: string; highlight: boolean }[] | null = null;
              if (matches) {
                parts = parse(
                  item.structured_formatting.main_text,
                  matches.map((match: { offset: number; length: number }) => [
                    match.offset,
                    match.offset + match.length,
                  ])
                );
              }

              return (
                <div className="flex flex-col">
                  <div className="flex items-center dark:text-white">
                    <FontAwesomeIcon icon={faMapMarker} className="mr-2 " />
                    {parts &&
                      parts?.map((part, index) => (
                        <span
                          className="dark:text-white"
                          key={index}
                          style={{
                            fontWeight: part.highlight ? 700 : 400,
                            marginRight: "2px",
                          }}
                        >
                          {part.text}
                        </span>
                      ))}
                  </div>
                  <small className="dark:text-white">
                    {item.structured_formatting?.secondary_text}
                  </small>
                </div>
              );
            }}
          />
        </div>

        <div className="w-full">
          <div className="w-full">
            <span className="font-inter font-semibold text-[12px] tracking-normal">
              {t("Location_Type")}
            </span>
          </div>
          <div className="w-full grid grid-cols-2 gap-4">
            {LOCATIONT_TYPE.map((item) => (
              <div
                key={item.name}
                className="p-2 cursor-pointer flex items-center gap-x-2 shadow rounded dark:bg-gray-800"
                onClick={() => setSelectedLocationType(item.name)}
              >
                <div>
                  {item.icon(
                    selectedLocationType === item.name ? "var(--primary-color)" : undefined,
                    selectedLocationType === item.name ? "var(--primary-color)" : undefined
                  )}
                </div>
                <div className="flex flex-col gap-y-[2px]">
                  <span
                    className={`font-inter font-medium text-sm leading-5 tracking-normal ${selectedLocationType === item.name ? "text-secondary-color" : "text-gray-500 dark:text-gray-300"}`}
                  >
                    {item.translatedName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full flex justify-between gap-x-2">
          <button
            className="w-full  h-fit bg-transparent text-gray-900 dark:text-white py-2 border border-black dark:border-gray-600 rounded-full text-base lg:text-[14px]"
            onClick={() => {
              const selectedAddress = profile?.addresses.find(
                (address) => address.selected
              );
              if (selectedAddress) {
                setUserAddress(selectedAddress);
              }
              setSelectedLocationType("House");
              setIndex([0, 0]);
              setInputValue("");
              setSelectedCity(null);
              setIsDragged(false);
              onHide();
            }}
          >
            <span>{t("cancel_address")}</span>
          </button>
          <button
            className="w-full h-fit bg-primary-color text-white py-2 rounded-full text-base lg:text-[14px]"
            onClick={() => onHandleCreateAddress()}
          >
            {modifyingAddressLoading ? (
              <FontAwesomeIcon
                icon={faSpinner}
                spin={modifyingAddressLoading}
              />
            ) : (
              <span>{t("Save_address")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const COMPONENTS_LIST = [
    CHOOSE_ADDRESS,
    editAddress ? EDIT_ADDRESS_UI : ADD_ADDRESS,
  ];

  // Effects
  useEffect(() => {
    if (
      !autocompleteService.current &&
      window.google &&
      window.google.maps?.places
    ) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }
    if (!autocompleteService.current) {
      return;
    }

    if (search === "") {
      setOptions(selectedPlaceObject ? [selectedPlaceObject] : []);
      return;
    }

    fetch({ input: search }, (results: IPlaceSelectedOption[]) => {
      let newOptions: IPlaceSelectedOption[] = [];
      if (selectedPlaceObject) {
        newOptions = [selectedPlaceObject];
      }
      if (results) {
        newOptions = [...newOptions, ...results];
      }
      setOptions(newOptions);
    });

    return () => {
      autocompleteService.current = null;
    };
  }, [selectedPlaceObject, search, fetch]);

  useEffect(() => {
    onCenterDraggedHandler();
  }, [newDraggedCenter]);

  useEffect(() => {
    onHandleEditAddressInit();
  }, [editAddress]);

  return (
    <Dialog
      visible={visible}
      onHide={() => {
        setIndex([0, 0]);
        setPickedCurrentLocation(false);
        onHide();
      }}
      className={`w-[90%] lg:w-1/3 bg-white m-4  `}
      headerClassName="dark:bg-gray-900 dark:text-white"
      contentClassName="dark:bg-gray-900 dark:text-white"
      header={
        index !== 0 ? (
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => paginate(-1)}
          >
            <FontAwesomeIcon
              icon={faArrowCircleLeft}
              className="dark:text-white"
            />
          </div>
        ) : null
      }
      headerStyle={{ paddingTop: "10px", paddingBottom: "0px" }}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="w-full relative flex justify-between px-4 dark:bg-gray-900 dark:text-white" // changed from absolute to relative
        >
          {COMPONENTS_LIST[index]}
        </motion.div>
      </AnimatePresence>
    </Dialog>
  );
}
