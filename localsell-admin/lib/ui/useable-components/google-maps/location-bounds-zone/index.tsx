'use client';

// Core imports
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GoogleMap, Polygon, Polyline } from '@react-google-maps/api';
import parse from 'autosuggest-highlight/parse';
import { throttle } from '@/lib/utils/methods';

// Interfaces
import {
  ILocationPoint,
  IPlaceSelectedOption,
  IZoneCustomGoogleMapsBoundComponentProps,
} from '@/lib/utils/interfaces';

// Utilities
import {
  calculatePolygonCentroid,
  transformPath,
  transformPolygon,
} from '@/lib/utils/methods';

// Third-party libraries
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faMapMarker,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

// Prime React
import { AutoComplete, AutoCompleteSelectEvent } from 'primereact/autocomplete';
import { GoogleMapsContext } from '@/lib/context/global/google-maps.context';
import CustomShape from '../shapes';
import { DEFAULT_CENTER, DEFAULT_POLYGON } from '@/lib/utils/constants';
import { useTranslations } from 'next-intl';
import { darkMapStyle } from '@/lib/utils/map-style/mapStyle';
import { useTheme } from 'next-themes';

const autocompleteService: {
  current: google.maps.places.AutocompleteService | null;
} = { current: null };

const CustomGoogleMapsLocationZoneBounds: React.FC<
  IZoneCustomGoogleMapsBoundComponentProps
> = ({ _path, onSetZoneCoordinates }) => {
  // Hooks
  const t = useTranslations();
  const { theme } = useTheme();


  // Context
  const googleMapsContext = useContext(GoogleMapsContext);

  // States
  const [isMounted, setIsMounted] = useState(false);
  const [deliveryZoneType, setDeliveryZoneType] = useState('polygon');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [path, setPath] = useState<ILocationPoint[]>(DEFAULT_POLYGON);
  const [isDrawing, setIsDrawing] = useState(false);

  // Auto complete
  const [options, setOptions] = useState<IPlaceSelectedOption[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedPlaceObject, setSelectedPlaceObject] =
    useState<IPlaceSelectedOption | null>(null);
  const [search, setSearch] = useState<string>('');
  const [lastSelectedLocation, setLastSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Ref
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);

  const fetch = React.useMemo(
    () =>
      throttle((request, callback) => {
        autocompleteService?.current?.getPlacePredictions(request, callback);
      }, 1500),
    []
  );

  // Helper to create a polygon around a point
  const createPolygonAroundPoint = (
    center: { lat: number; lng: number },
    sizeMeters = 100
  ): ILocationPoint[] => {
    const latOffset = sizeMeters * 0.0000089;
    const lngOffset =
      (sizeMeters * 0.0000089) / Math.cos((center.lat * Math.PI) / 180);
    return [
      { lat: center.lat + latOffset, lng: center.lng - lngOffset },
      { lat: center.lat + latOffset, lng: center.lng + lngOffset },
      { lat: center.lat - latOffset, lng: center.lng + lngOffset },
      { lat: center.lat - latOffset, lng: center.lng - lngOffset },
      { lat: center.lat + latOffset, lng: center.lng - lngOffset },
    ];
  };

  // Handlers
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const focusZone = (zonePath: ILocationPoint[]) => {
    if (!mapRef.current || !zonePath.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    zonePath.forEach((point) => bounds.extend(point));
    if (zonePath.length === 1) {
      mapRef.current.setCenter(zonePath[0]);
      mapRef.current.setZoom(17);
    } else {
      mapRef.current.fitBounds(bounds);
    }
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
            const centerPoint = {
              lat: location?.lat() ?? 0,
              lng: location?.lng() ?? 0,
            };
            setCenter(centerPoint);
            setLastSelectedLocation(centerPoint);

            let newPath: ILocationPoint[];
            if (deliveryZoneType === 'polygon') {
              newPath = createPolygonAroundPoint(centerPoint);
              setPath(newPath);
            } else if (deliveryZoneType === 'point') {
              newPath = [centerPoint];
              setPath(newPath);
            } else {
              newPath = [];
            }

            setInputValue(selectedOption.description);

            setTimeout(() => focusZone(newPath), 200);
          }
        }
      );
      setSelectedPlaceObject(selectedOption);
    }
  };

  const onClickGoogleMaps = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const nextPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    if (deliveryZoneType === 'polygon') {
      if (!isDrawing) return;
      setPath((current) => [...current, nextPoint]);
      return;
    }
    setPath([nextPoint]);
    setCenter(nextPoint);
  };

  const onSetCenterAndPolygon = () => {
    if (
      Array.isArray(_path) &&
      _path.length > 0 &&
      Array.isArray(_path[0]) &&
      _path[0].length > 0 &&
      _path[0][0].length > 0
    ) {
      setPath(transformPolygon(_path[0]));
      setCenter(calculatePolygonCentroid(_path[0]));
    }
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
    }
  }, [setPath, setCenter]);

  const onLoadPolygon = useCallback(
    (polygon: google.maps.Polygon | null) => {
      if (!polygon) {
        return;
      }

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
  }, [deliveryZoneType]);

  // Use Effects
  useEffect(() => {
    if (!isMounted) return;
    onSetZoneCoordinates(path.length ? transformPath(path) : [[[]]]);
  }, [path, isMounted]);

  useEffect(() => {
    if (!autocompleteService.current && window.google) {
      autocompleteService.current =
        new window.google.maps.places.AutocompleteService();
    }
    if (!autocompleteService.current) {
      return;
    }

    if (search === '') {
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
    onSetCenterAndPolygon();
    setIsMounted(true);
  }, []);

  return (
    <div className="zone-map-editor">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-dark-600">
        <div className="h-[420px] w-full object-cover sm:h-[480px]">
          <div className="absolute left-0 right-0 top-0 z-10">
            <div className="flex w-full flex-col justify-center gap-y-1 p-3">
              <div className="relative">
                <AutoComplete
                  id="google-map"
                  disabled={false}
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
                    if (typeof e.value === 'string') handleInputChange(e.value);
                  }}
                  onSelect={onHandlerAutoCompleteSelectionChange}
                  suggestions={options}
                  forceSelection={false}
                  dropdown={true}
                  multiple={false}
                  loadingIcon={null}
                  placeholder={t('Enter your full address')}
                  style={{ width: '100%' }}
                  itemTemplate={(item) => {
                    const matches =
                      item.structured_formatting?.main_text_matched_substrings;
                    let parts = null;
                    if (matches) {
                      parts = parse(
                        item.structured_formatting.main_text,
                        matches.map(
                          (match: { offset: number; length: number }) => [
                            match.offset,
                            match.offset + match.length,
                          ]
                        )
                      );
                    }

                    return (
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <FontAwesomeIcon
                            icon={faMapMarker}
                            className="mr-2"
                          />
                          {parts &&
                            parts.map((part, index) => (
                              <span
                                key={index}
                                style={{
                                  fontWeight: part.highlight ? 700 : 400,
                                  marginRight: '2px',
                                }}
                              >
                                {part.text}
                              </span>
                            ))}
                        </div>
                        <small>
                          {item.structured_formatting?.secondary_text}
                        </small>
                      </div>
                    );
                  }}
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

          <div className="absolute left-4 top-[4.5rem] z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-dark-600 dark:bg-dark-900/95">
            {!isDrawing ? (
              <button
                type="button"
                onClick={() => {
                  setDeliveryZoneType('polygon');
                  setPath([]);
                  setIsDrawing(true);
                }}
                className="h-9 rounded-lg bg-primary-color px-4 text-sm font-semibold text-white"
              >
                {t('Draw new polygon')}
              </button>
            ) : (
              <>
                <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {path.length < 3
                    ? `${t('Click map to add points')} (${path.length}/3)`
                    : `${path.length} ${t('points added')}`}
                </span>
                <button
                  type="button"
                  disabled={!path.length}
                  onClick={() => setPath((current) => current.slice(0, -1))}
                  className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-600 dark:text-white"
                >
                  {t('Undo')}
                </button>
                <button
                  type="button"
                  onClick={() => setPath([])}
                  className="h-9 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600"
                >
                  {t('Clear')}
                </button>
                <button
                  type="button"
                  disabled={path.length < 3}
                  onClick={() => {
                    setIsDrawing(false);
                    focusZone(path);
                  }}
                  className="h-9 rounded-lg bg-primary-color px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('Finish polygon')}
                </button>
              </>
            )}
          </div>

          {googleMapsContext?.isLoaded && (
            <GoogleMap
              key={deliveryZoneType}
              mapContainerStyle={{
                height: '100%',
                width: '100%',
                borderRadius: 10,
                marginBottom: '20px',
              }}
              id="google-map"
              zoom={14}
              center={center}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                 styles: theme === 'dark' ? darkMapStyle : null,
              }}
              onClick={onClickGoogleMaps}
              onLoad={(map) => {
                mapRef.current = map;
              }}
              
              
            >
              {isDrawing && path.length > 1 && (
                <Polyline
                  path={path}
                  options={{ strokeColor: '#2563eb', strokeOpacity: 1, strokeWeight: 3 }}
                />
              )}
              {path.length >= 3 && (
                <Polygon
                  key={'google-map-polygon'}
                  editable={!isDrawing}
                  draggable={!isDrawing}
                  paths={path}
                  options={{
                    strokeColor: '#2563eb',
                    strokeOpacity: 1,
                    strokeWeight: 3,
                    fillColor: '#2563eb',
                    fillOpacity: 0.22,
                  }}
                  onMouseUp={onEdit}
                  onDragEnd={onEdit}
                  onLoad={onLoadPolygon}
                  onUnmount={onUnmount}
                />
              )}
            </GoogleMap>
          )}
        </div>
      </div>

      <CustomShape
        selected={deliveryZoneType}
        hidenNames={['radius']}
        onClick={(val: string) => {
          setIsDrawing(false);
          setDeliveryZoneType(val);
          if (lastSelectedLocation) {
            let newPath: ILocationPoint[];
            if (val === 'polygon') {
              newPath = createPolygonAroundPoint(lastSelectedLocation);
              setPath(newPath);
            } else if (val === 'point') {
              newPath = [lastSelectedLocation];
              setPath(newPath);
            }
            setTimeout(
              () =>
                focusZone(
                  val === 'polygon'
                    ? createPolygonAroundPoint(lastSelectedLocation)
                    : [lastSelectedLocation]
                ),
              200
            );
          } else {
            switch (val) {
              case 'polygon':
                setPath(DEFAULT_POLYGON);
                break;
              case 'point':
                setPath([]);
                break;
              default:
                break;
            }
          }
        }}
      />
    </div>
  );
};

export default CustomGoogleMapsLocationZoneBounds;
