'use client';

// Core imports
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// API and GraphQL
import { GET_RESTAURANT_PROFILE, GET_VENDORS } from '@/lib/api/graphql';
import { useQuery } from '@apollo/client';

// Hooks
import { useQueryGQL } from '@/lib/hooks/useQueryQL';

// Context
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';

// Interfaces
import {
  IQueryResult,
  IRestaurantsContextPropData,
  IVendorReponse,
  IVendorResponseGraphQL,
} from '@/lib/utils/interfaces';

// PrimeReact components
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';

// Local components
import RestaurantDetailsForm from './restaurant-details';
import RestaurantLocation from './restaurant-location';
import VendorDetails from './vendor-details';
import RestaurantTiming from './restaurant-timing';
import StepperHeader from '@/lib/ui/useable-components/stepper-header';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

// This used to be a full-viewport `<Sidebar>` overlay (no app sidebar/topbar
// visible while adding a store). It's now the content of a real page —
// `/general/stores/create` — reached identically whether you start from the
// Stores list ("Add Store" there) or from a specific vendor's stores tab
// (?vendorId=<id> pre-selects and locks step 1 below).
export default function RestaurantsForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedVendorId = searchParams.get('vendorId');
  const editRestaurantId = searchParams.get('id');
  const isEditMode = !!editRestaurantId;

  const stepperRef = useRef(null);
  const hasAppliedLock = useRef(false);

  // Context
  const { activeIndex, onActiveStepChange, restaurantsContextData, onSetRestaurantsContextData } =
    useContext(RestaurantsContext);

  // API
  const vendorResponse = useQueryGQL(
    GET_VENDORS,
    { fetchPolicy: 'cache-and-network' },
    { debounceMs: 300 }
  ) as IQueryResult<IVendorResponseGraphQL | undefined, undefined>;

  const { data: restaurantProfileData } = useQuery(GET_RESTAURANT_PROFILE, {
    variables: { id: editRestaurantId ?? '' },
    skip: !editRestaurantId,
    fetchPolicy: 'network-only',
  });
  const restaurantProfile = restaurantProfileData?.restaurant;

  // Memoized Data
  const vendorsDropdown = useMemo(
    () =>
      vendorResponse?.data?.vendors?.map((vendorItem: IVendorReponse) => {
        return { label: vendorItem.email, code: vendorItem._id };
      }),
    [vendorResponse?.data?.vendors]
  );

  // Editing an existing store locks its owner in exactly the same way a
  // ?vendorId= does — the store's own owner can't be reassigned here.
  const resolvedVendorId = isEditMode ? restaurantProfile?.owner?._id : lockedVendorId;
  const lockedVendor = useMemo(
    () => vendorResponse?.data?.vendors?.find((v) => v._id === resolvedVendorId),
    [vendorResponse?.data?.vendors, resolvedVendorId]
  );
  const isLocked = isEditMode || !!lockedVendorId;

  // Pre-fill context and skip straight past the "pick a vendor" step: either
  // a vendor came in via ?vendorId= (opened from that vendor's own stores
  // tab), or an existing store's ?id= was given (opened via "Edit").
  useEffect(() => {
    if (hasAppliedLock.current) return;
    if (isEditMode) {
      if (!restaurantProfile) return; // still fetching
      hasAppliedLock.current = true;
      onSetRestaurantsContextData({
        vendor: restaurantProfile.owner
          ? { _id: { label: restaurantProfile.owner.email, code: restaurantProfile.owner._id } }
          : { _id: null },
        restaurant: { _id: { label: restaurantProfile.username ?? restaurantProfile.name, code: restaurantProfile._id } },
      } as IRestaurantsContextPropData);
      onActiveStepChange(1);
      return;
    }
    if (!lockedVendorId || !lockedVendor) return; // no lock requested, or vendors still loading
    hasAppliedLock.current = true;
    onSetRestaurantsContextData({
      ...restaurantsContextData,
      vendor: { _id: { label: lockedVendor.email, code: lockedVendor._id } },
    } as IRestaurantsContextPropData);
    onActiveStepChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, restaurantProfile, lockedVendorId, lockedVendor]);

  // RestaurantsContext lives above this route and survives client-side
  // navigation within /general/stores/*. Without this, opening the wizard
  // fresh from the Stores list — no vendorId or id in the URL — could still
  // show whatever vendor/store was left selected from an earlier visit in
  // the same tab.
  const didResetForFreshEntry = useRef(false);
  useEffect(() => {
    if (isLocked || didResetForFreshEntry.current) return;
    didResetForFreshEntry.current = true;
    onSetRestaurantsContextData({ vendor: { _id: null }, restaurant: { _id: null } } as IRestaurantsContextPropData);
    onActiveStepChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked]);

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const dirty = activeIndex > (isLocked ? 1 : 0);

  const exitWizard = () => router.push(resolvedVendorId ? '/general/vendors' : '/general/stores');

  // Handlers
  const onHandleStepChange = (order: number) => {
    // order 0 is reached two ways: "Back" from the first visible step, or
    // the final step finishing and looping around. Neither has anywhere
    // useful left to go but out of the wizard.
    if (order <= 0) {
      exitWizard();
      return;
    }
    onActiveStepChange(order);
  };

  const steps = isLocked
    ? [
        { key: 'basic', label: t('Basic details') },
        { key: 'location', label: t('Location & delivery') },
        { key: 'timing', label: t('Timings & review') },
      ]
    : [
        { key: 'vendor', label: t('Vendor') },
        { key: 'basic', label: t('Basic details') },
        { key: 'location', label: t('Location & delivery') },
        { key: 'timing', label: t('Timings & review') },
      ];
  const currentStepVisual = isLocked ? Math.max(0, activeIndex - 1) : activeIndex;

  return (
    <div className="store-registration-form h-full min-h-0 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-dark-950 sm:px-6 lg:px-10">
      {/* PrimeReact's own Stepper still drives panel switching (activeStep),
          but its built-in nav header is hidden in favor of the shared
          StepperHeader below so this wizard looks consistent with vendor
          registration. */}
      <style jsx global>{`
        .store-registration-form .p-stepper-nav {
          display: none;
        }
      `}</style>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <nav className="mb-1 text-sm text-slate-500" aria-label="Breadcrumb">
            {lockedVendor
              ? `${t('Vendors')} / ${lockedVendor.name || lockedVendor.email} / ${isEditMode ? t('Edit store') : t('Add store')}`
              : `${t('Stores')} / ${isEditMode ? t('Edit store') : t('Add store')}`}
          </nav>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditMode ? t('Edit store') : t('Register new store')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEditMode
              ? `${t('Update the store details for')} ${restaurantProfile?.name ?? ''}`
              : lockedVendor
                ? `${t('Add a store location for')} ${lockedVendor.name || lockedVendor.email}`
                : t('Select an existing vendor and add a new store location.')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('Close')}
          onClick={() => (dirty ? setShowDiscardConfirm(true) : exitWizard())}
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-900"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      {lockedVendor && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-dark-600 dark:bg-dark-900">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[#e8f0fc] font-bold text-[#1c5bc7]">
            {(lockedVendor.name || lockedVendor.email || 'V')
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{lockedVendor.name || t('Vendor')}</p>
            <p className="truncate text-xs text-slate-500">{lockedVendor.email}</p>
          </div>
          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">{t('Active')}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950">
        <div className="border-b border-slate-100 px-4 pt-4 dark:border-dark-600 sm:px-6">
          <StepperHeader steps={steps} current={currentStepVisual} />
        </div>

        <div ref={stepperRef} className="p-4 sm:p-6 md:p-8">
          <Stepper linear headerPosition="bottom" activeStep={activeIndex}>
            <StepperPanel header="Vendor">
              <VendorDetails
                vendorsDropdown={vendorsDropdown ?? []}
                stepperProps={{ onStepChange: onHandleStepChange, order: activeIndex }}
              />
            </StepperPanel>
            <StepperPanel header="Basic details">
              <RestaurantDetailsForm stepperProps={{ onStepChange: onHandleStepChange, order: activeIndex }} />
            </StepperPanel>
            <StepperPanel header="Location & delivery">
              <RestaurantLocation
                stepperProps={{ onStepChange: onHandleStepChange, order: activeIndex, isLastStep: false }}
              />
            </StepperPanel>
            <StepperPanel header="Timings & review">
              <RestaurantTiming
                stepperProps={{ onStepChange: onHandleStepChange, order: activeIndex, isLastStep: true }}
              />
            </StepperPanel>
          </Stepper>
        </div>
      </div>

      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg dark:bg-dark-900">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('Discard changes?')}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t('Anything not saved yet will be lost. Are you sure you want to leave?')}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="h-9 rounded-md border border-gray-300 px-4 text-sm text-slate-700 dark:border-dark-600 dark:text-white"
              >
                {t('Keep editing')}
              </button>
              <button
                type="button"
                onClick={exitWizard}
                className="h-9 rounded-md bg-red-500 px-4 text-sm font-medium text-white"
              >
                {t('Discard')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
