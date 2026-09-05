'use client';

// Core imports
import {
  ApolloCache,
  ApolloError,
  useMutation,
  useQuery,
} from '@apollo/client';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { throttle } from '@/lib/utils/methods';

// API and GraphQL
import {
  GET_CONFIGURATION,
  GET_RESTAURANT_DELIVERY_ZONE_INFO,
  GET_RESTAURANT_PROFILE,
  GET_ZONES,
  UPDATE_DELIVERY_BOUNDS_AND_LOCATION,
} from '@/lib/api/graphql';

// Map-centre fallback for a store that has no pin yet. Overridden by the
// Configuration `defaultLatitude/Longitude` when set. (Was hard-coded to the
// centre of Australia, which made every new store start on the wrong continent.)
const FALLBACK_CENTER = { lat: 25.534, lng: 73.899 };

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';

// Interfaces
import {
  ICustomGoogleMapsLocationBoundsComponentProps,
  ILocationPoint,
  IPlaceSelectedOption,
  IRestaurantDeliveryZoneInfo,
  IRestaurantProfile,
  IRestaurantProfileResponse,
  IUpdateRestaurantDeliveryZoneVariables,
  IZoneResponse,
  IZonesResponse,
} from '@/lib/utils/interfaces';

// Utilities
import { transformPath, transformPolygon } from '@/lib/utils/methods';

// Third-party libraries
import {
  faChevronDown,
  faMapMarker,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Circle, GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import { AutoComplete, AutoCompleteSelectEvent } from 'primereact/autocomplete';

// Components
import CustomButton from '../../button';
import CustomRadiusInputField from '../../custom-radius-input';
import calculateZoom from '@/lib/utils/methods/zoom-calculator';
import { useTranslations } from 'next-intl';
import { darkMapStyle } from '@/lib/utils/map-style/mapStyle';
import { useTheme } from 'next-themes';
import { placeAutocomplete, placeDetail, reverseGeocode } from '@/lib/api/google-maps';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

const CustomGoogleMapsLocationBounds: React.FC<
  ICustomGoogleMapsLocationBoundsComponentProps
> = ({ onStepChange, hideControls, height }) => {
  // Context
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const { restaurantId } = restaurantLayoutContextData;
  const { showToast } = useContext(ToastContext);

  // States
  const [zoom, setZoom] = useState(14);
  const [UpdateLocationAddress, setUpdateLocationAddress] = useState('');
  // A radius (km) from the store pin is the single delivery-area concept the
  // platform enforces (serviceability + order placement read `deliveryDistance`).
  const [deliveryZoneType, setDeliveryZoneType] = useState('radius');
  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [marker, setMarker] = useState(FALLBACK_CENTER);
  const [path, setPath] = useState<ILocationPoint[]>([]);
  const [distance, setDistance] = useState(5);
  const [hasStorePin, setHasStorePin] = useState(false);
  // Hooks
  const t = useTranslations();
  const { theme } = useTheme();
  const { SERVER_URL } = useConfiguration();

  // States
  const [options, setOptions] = useState<IPlaceSelectedOption[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedPlaceObject, setSelectedPlaceObject] =
    useState<IPlaceSelectedOption | null>(null);
  const [search, setSearch] = useState<string>('');
  const [zones, setZones] = useState<IZoneResponse[]>([]);

  // Ref
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // API
  const { loading: isFetchingRestaurantProfile } = useQuery(
    GET_RESTAURANT_PROFILE,
    {
      variables: { id: restaurantId ?? '' },
      fetchPolicy: 'network-only',
      skip: !restaurantId,
      onCompleted: onRestaurantProfileFetchCompleted,
      onError: onErrorFetchRestaurantProfile,
    }
  );
  const { loading: isFetchingRestaurantDeliveryZoneInfo } = useQuery(
    GET_RESTAURANT_DELIVERY_ZONE_INFO,
    {
      variables: { id: restaurantId ?? '' },
      fetchPolicy: 'network-only',
      skip: !restaurantId,
      onCompleted: onRestaurantZoneInfoFetchCompleted,
      onError: onErrorFetchRestaurantZoneInfo,
    }
  );
  const [updateRestaurantDeliveryZone, { loading: isSubmitting }] = useMutation(
    UPDATE_DELIVERY_BOUNDS_AND_LOCATION,
    {
      update: (cache, { data }) => {
        if (data) {
          updateCache(cache, { data } as IRestaurantProfileResponse);
        }
      },

      onCompleted: onRestaurantZoneUpdateCompleted,
      onError: onErrorLocationZoneUpdate,
    }
  );
  useQuery<IZonesResponse>(GET_ZONES, {
    onCompleted: (data) => {
      if (data) {
        setZones(data.zones);
      }
    },
  });
  useQuery(GET_CONFIGURATION, {
    onCompleted: (data) => {
      const lat = data?.configuration?.defaultLatitude;
      const lng = data?.configuration?.defaultLongitude;
      // Only re-centre on the marketplace default while the store still has no
      // pin of its own — never yank the map away from a real saved location.
      if (!hasStorePin && lat != null && lng != null) {
        setCenter({ lat, lng });
        setMarker({ lat, lng });
      }
    },
  });

  // Memos
  const radiusInMeter = useMemo(() => {
    return distance * 1000;
  }, [distance]);
  // Address type-ahead through the API `/maps` proxy (Google key server-side).
  const runAutocomplete = React.useMemo(
    () =>
      throttle(async (input: string) => {
        try {
          const preds = await placeAutocomplete({ serverUrl: SERVER_URL ?? '', input });
          setOptions(
            preds.map((p) => ({ description: p.description, place_id: p.placeId }) as IPlaceSelectedOption),
          );
        } catch {
          setOptions([]);
        }
      }, 400),
    [SERVER_URL]
  );

  // API Handlers
  function updateCache(
    cache: ApolloCache<unknown>,
    { data }: IRestaurantProfileResponse
  ) {
    const cachedData: IRestaurantProfileResponse | null = cache.readQuery({
      query: GET_RESTAURANT_PROFILE,
      variables: { id: restaurantId ?? '' },
    });
    cache.writeQuery({
      query: GET_RESTAURANT_PROFILE,
      variables: { id: restaurantId ?? '' },
      data: {
        restaurant: {
          ...cachedData?.data?.restaurant,
          ...data?.restaurant,
        },
      },
    });
  }
  // Profile Error
  function onErrorFetchRestaurantProfile({
    graphQLErrors,
    networkError,
  }: ApolloError) {
    showToast({
      type: 'error',
      title: t('Store Profile'),
      message:
        graphQLErrors[0].message ??
        networkError?.message ??
        t('Store Profile Fetch Failed'),
      duration: 2500,
    });
  }
  // Restaurant Profile Complete
  function onRestaurantProfileFetchCompleted({
    restaurant,
  }: {
    restaurant: IRestaurantProfile;
  }) {
    const isLocationZero =
      +restaurant?.location?.coordinates[0] === 0 &&
      +restaurant?.location?.coordinates[1] === 0;
    if (!restaurant || isLocationZero) return;

    setHasStorePin(true);
    setCenter({
      lat: +restaurant?.location?.coordinates[1],
      lng: +restaurant?.location?.coordinates[0],
    });
    setMarker({
      lat: +restaurant?.location?.coordinates[1],
      lng: +restaurant?.location?.coordinates[0],
    });
    setPath(
      restaurant?.deliveryBounds
        ? transformPolygon(restaurant?.deliveryBounds?.coordinates[0])
        : path
    );
  }
  // Restaurant Zone Info Error
  function onErrorFetchRestaurantZoneInfo({
    graphQLErrors,
    networkError,
  }: ApolloError) {
    showToast({
      type: 'error',
      title: t('Store Location & Zone'),
      message:
        graphQLErrors[0].message ??
        networkError?.message ??
        t('Store Location & Zone fetch failed'),
      duration: 2500,
    });
  }
  // Restaurant Zone Info Complete
  function onRestaurantZoneInfoFetchCompleted({
    getRestaurantDeliveryZoneInfo,
  }: {
    getRestaurantDeliveryZoneInfo: IRestaurantDeliveryZoneInfo;
  }) {
    const {
      deliveryBounds: polygonBounds,
      circleBounds,
      location,
      boundType,
    } = getRestaurantDeliveryZoneInfo;

    const coordinates = {
      lng: location.coordinates[0],
      lat: location.coordinates[1],
    };

    const isLocationZero =
      +location?.coordinates[0] === 0 && +location?.coordinates[1] === 0;

    if (!isLocationZero) {
      setHasStorePin(true);
      setCenter(coordinates);
      setMarker(coordinates);
    }

    if (boundType) setDeliveryZoneType(boundType);
    if (circleBounds?.radius) setDistance(circleBounds?.radius);

    setPath(
      polygonBounds?.coordinates[0].map((coordinate: number[]) => {
        return { lat: coordinate[1], lng: coordinate[0] };
      }) || []
    );
  }
  // Zone Update Error
  function onErrorLocationZoneUpdate({
    graphQLErrors,
    networkError,
  }: ApolloError) {
    showToast({
      type: 'error',
      title: t('Store Location & Zone'),
      message:
        graphQLErrors[0].message ??
        networkError?.message ??
        t('Store Location & Zone update failed'),
      duration: 2500,
    });
  }
  // Zone Update Complete
  function onRestaurantZoneUpdateCompleted({
    restaurant,
  }: {
    restaurant: IRestaurantProfile;
  }) {
    if (restaurant) {
      setCenter({
        lat: +restaurant?.location?.coordinates[1],
        lng: +restaurant?.location?.coordinates[0],
      });
      setMarker({
        lat: +restaurant?.location?.coordinates[1],
        lng: +restaurant?.location?.coordinates[0],
      });
      setPath(
        restaurant?.deliveryBounds
          ? transformPolygon(restaurant?.deliveryBounds?.coordinates[0])
          : path
      );
    }

    showToast({
      type: 'success',
      title: t('Zone Update'),
      message: `${t('Store Zone has been updated successfully')}.`,
    });

    if (onStepChange) onStepChange(2);
    // onSetRestaurantsContextData({} as IRestaurantsContextPropData);
    // onSetRestaurantFormVisible(false);
  }

  // Other Handlers
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };
  const onHandlerAutoCompleteSelectionChange = async (
    event: AutoCompleteSelectEvent
  ) => {
    const selectedOption = event?.value as IPlaceSelectedOption;
    if (!selectedOption?.place_id) return;
    try {
      const d = await placeDetail({ serverUrl: SERVER_URL ?? '', placeId: selectedOption.place_id });
      const address = d.formattedAddress || selectedOption.description;
      setUpdateLocationAddress(address);
      setCenter({ lat: d.latitude, lng: d.longitude });
      setMarker({ lat: d.latitude, lng: d.longitude });
      setInputValue(address);
      setSelectedPlaceObject(selectedOption);
    } catch (err) {
      showToast({
        type: 'error',
        title: t('Search Address'),
        message: (err as Error).message,
        duration: 2500,
      });
    }
  };
  const onClickGoogleMaps = (e: google.maps.MapMouseEvent) => {
    setPath([
      ...path,
      { lat: e?.latLng?.lat() ?? 0, lng: e?.latLng?.lng() ?? 0 },
    ]);
  };
  const getPolygonPathFromCircle = (center: ILocationPoint, radius: number) => {
    try {
      const points = 4;
      const angleStep = (2 * Math.PI) / points;
      const path = [];

      for (let i = 0; i < points; i++) {
        const angle = i * angleStep;
        const lat = center.lat + (radius / 111300) * Math.cos(angle);
        const lng =
          center.lng +
          (radius / (111300 * Math.cos(center.lat * (Math.PI / 180)))) *
            Math.sin(angle);
        path.push({ lat, lng });
      }

      return path;
    } catch (error) {
      return [];
    }
  };
  function getPolygonPath(
    center: ILocationPoint,
    radius: number,
    numPoints: number = 4
  ) {
    try {
      const path = [];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 2 * Math.PI) / numPoints;
        const lat = center.lat + (radius / 111320) * Math.cos(angle);
        const lng =
          center.lng +
          (radius / (111320 * Math.cos((center.lat * Math.PI) / 180))) *
            Math.sin(angle);
        path.push([lng, lat]);
      }

      path.push(path[0]);
      return [path];
    } catch (error) {
      return [];
    }
  }
  const handleDistanceChange = (val: number) => {
    const newDistance = val || 0;
    setDistance(newDistance);
  };
  const onEdit = useCallback(() => {
    if (polygonRef.current) {
      const nextPath = polygonRef?.current
        .getPath()
        .getArray()
        .map((latLng) => {
          return { lat: latLng.lat(), lng: latLng.lng() };
        });

      setPath(nextPath);

      // Calculate new center based on polygon vertices
      const newCenter = nextPath.reduce(
        (acc, point) => ({
          lat: acc.lat + point.lat / nextPath.length,
          lng: acc.lng + point.lng / nextPath.length,
        }),
        { lat: 0, lng: 0 }
      );

      setCenter(newCenter);
      setMarker(newCenter);
    }
  }, [setPath, setCenter, setMarker]);
  const onLoadPolygon = useCallback(
    (polygon: google.maps.Polygon) => {
      if (!polygon) return;

      polygonRef.current = polygon;
      const path = polygon?.getPath();
      listenersRef?.current?.push(
        path?.addListener('set_at', onEdit),
        path?.addListener('insert_at', onEdit),
        path?.addListener('remove_at', onEdit)
      );
    },
    [onEdit]
  );
  const onUnmount = useCallback(() => {
    listenersRef?.current?.forEach((lis) => lis?.remove());
    polygonRef.current = null;
  }, []);
  const removeMarker = () => {
    setMarker({ lat: 0, lng: 0 });
  };
  const onDragEnd = async (mapMouseEvent: google.maps.MapMouseEvent) => {
    const newLatLng = {
      lat: mapMouseEvent?.latLng?.lat() ?? 0,
      lng: mapMouseEvent?.latLng?.lng() ?? 0,
    };

    setMarker(newLatLng);
    setCenter(newLatLng);

    // Update polygon when marker is dragged
    if (deliveryZoneType === 'polygon') {
      const newPath = getPolygonPathFromCircle(newLatLng, radiusInMeter ?? 1);
      setPath(newPath);
    }

    // Fill the address from the new pin so it's not saved empty.
    try {
      const geo = await reverseGeocode({
        serverUrl: SERVER_URL ?? '',
        latitude: newLatLng.lat,
        longitude: newLatLng.lng,
      });
      if (geo.formattedAddress) {
        setUpdateLocationAddress(geo.formattedAddress);
        setInputValue(geo.formattedAddress);
      }
    } catch {
      /* keep whatever address was there */
    }
  };
  // Submit Handler
  const onLocationSubmitHandler = () => {
    try {
      if (!restaurantId) {
        showToast({
          type: 'error',
          title: t('Location & Zone'),
          message: t('No restaurnat is selected'),
        });

        return;
      }

      const location = {
        latitude: marker?.lat ?? 0,
        longitude: marker?.lng ?? 0,
      };

      let bounds = transformPath(path);
      if (deliveryZoneType === 'radius') {
        bounds = getPolygonPath(center, radiusInMeter);
      }

      let variables: IUpdateRestaurantDeliveryZoneVariables = {
        id: restaurantId ?? '',
        location,
        boundType: deliveryZoneType,
        address: UpdateLocationAddress,
        bounds: [[[]]],
      };

      variables = {
        ...variables,
        bounds,
        circleBounds: {
          radius: distance, // Convert kilometers to meters
        },
      };

      updateRestaurantDeliveryZone({ variables: variables });
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Location & Zone'),
        message: t('Location & Zone update failed'),
      });
    }
  };

  // Use Effects
  useEffect(() => {
    if (search.trim().length < 3) {
      setOptions(selectedPlaceObject ? [selectedPlaceObject] : []);
      return;
    }
    runAutocomplete(search);
  }, [search, selectedPlaceObject, runAutocomplete]);

  useEffect(() => {
    const zoomVal = calculateZoom(distance);
    setZoom(zoomVal);
  }, [distance, zoom]);

  return (
    <div>
      <div className="relative overflow-hidden">
        <div
          style={{ height: height }}
          className="h-[600px] w-full object-cover"
        >
          {!hideControls && (
            <div className="absolute left-0 right-0 top-0 z-10">
              <div
                className={`flex w-full flex-col justify-center gap-y-1 p-2`}
              >
                <div className="relative">
                  <AutoComplete
                    id="google-map"
                    disabled={
                      isFetchingRestaurantDeliveryZoneInfo ||
                      isFetchingRestaurantProfile
                    }
                    className={`p h-11 w-full border border-gray-300 px-2 text-sm focus:shadow-none focus:outline-none`}
                    value={inputValue}
                    dropdownIcon={
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        style={{ fontSize: '1rem', color: 'gray' }}
                      />
                    }
                    completeMethod={(event) => {
                      setSearch(event.query);
                    }}
                    onChange={(e) => {
                      if (typeof e.value === 'string')
                        handleInputChange(e.value);
                    }}
                    onSelect={onHandlerAutoCompleteSelectionChange}
                    suggestions={options}
                    forceSelection={false}
                    dropdown={true}
                    multiple={false}
                    loadingIcon={null}
                    placeholder={t('Search Address')}
                    style={{ width: '100%' }}
                    itemTemplate={(item) => (
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faMapMarker} className="mr-2 text-gray-400" />
                        <span>{item?.description}</span>
                      </div>
                    )}
                  />
                  <div className="absolute right-8 top-0 flex h-full items-center pr-2">
                    {inputValue && (
                      <FontAwesomeIcon
                        icon={faTimes}
                        className="mr-2 cursor-pointer text-gray-400"
                        onClick={() => {
                          setInputValue('');
                          setSearch('');
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <GoogleMap
            mapContainerStyle={{
              height: '100%',
              width: '100%',
              borderRadius: 10,
              marginBottom: '20px',
            }}
            id="google-map"
            zoom={zoom}
            center={center}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: !hideControls,
              fullscreenControl: !hideControls,
              draggable: !hideControls,
              styles: theme === 'dark' ? darkMapStyle : null,
            }}
            onClick={
              deliveryZoneType === 'point' ? onClickGoogleMaps : undefined
            }
          >
            {zones.map(
              (zone) =>
                zone.location && (
                  // Zone boundary polygon
                  <Polygon
                    key={zone._id}
                    onClick={
                      deliveryZoneType === 'point'
                        ? onClickGoogleMaps
                        : undefined
                    }
                    paths={zone.location.coordinates[0].map(
                      (coords: number[]) => ({ lat: coords[1], lng: coords[0] })
                    )}
                    options={{
                      strokeColor: 'blue',
                      strokeOpacity: 0.8,
                      strokeWeight: 2,
                      fillColor: 'lightblue',
                      fillOpacity: 0.3,
                    }}
                  />
                )
            )}

            {/* Delivery zone boundary. */}
            <Polygon
              editable={!hideControls}
              draggable={!hideControls}
              visible={
                deliveryZoneType === 'polygon' || deliveryZoneType === 'point'
              }
              paths={path}
              options={{
                strokeColor: 'black',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#000000',
                fillOpacity: 0.35,
              }}
              onMouseUp={onEdit}
              onDragEnd={onEdit}
              onLoad={onLoadPolygon}
              onUnmount={onUnmount}
            />

            <Circle
              center={center}
              radius={radiusInMeter}
              visible={deliveryZoneType === 'radius'}
              options={{
                fillColor: 'black',
                fillOpacity: 0.2,
                strokeColor: 'black',
                strokeOpacity: 1,
                strokeWeight: 2,
              }}
            />

            {marker && (
              <Marker
                position={marker}
                draggable={!hideControls}
                onRightClick={removeMarker}
                onDragEnd={onDragEnd}
              />
            )}
          </GoogleMap>
        </div>
      </div>

      {!hideControls && (
        <>
          {/* Delivery radius (km) from the store pin — the area the platform
              actually enforces. Drag the marker to move the pin. */}
          <div className="mt-2 w-[10rem]">
            <CustomRadiusInputField
              type="number"
              name="radius"
              placeholder={t('Delivery radius (km)')}
              maxLength={35}
              min={0}
              value={distance}
              onChange={handleDistanceChange}
              showLabel={true}
              loading={false}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <CustomButton
              className="h-10 w-fit dark:border-dark-600 border border-gray-300 bg-black px-8 text-white"
              label={t('Save')}
              type="button"
              loading={isSubmitting}
              onClick={onLocationSubmitHandler}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default CustomGoogleMapsLocationBounds;
