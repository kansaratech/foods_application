// Core
import { useContext, useEffect, useMemo, useState } from 'react';

// UI Components
import { RestaurantContext } from '@/lib/context/super-admin/restaurant.context';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import RestaurantCard from '@/lib/ui/useable-components/resturant-card';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import VendorCard from '@/lib/ui/useable-components/vendor-card';

// Context
import { VendorContext } from '@/lib/context/super-admin/vendor.context';

// Interface
import { IVendorMainComponentProps } from '@/lib/utils/interfaces';

// Constants
import { SELECTED_VENDOR_EMAIL } from '@/lib/utils/constants';

// Icons
import CustomRestaurantCardSkeleton from '@/lib/ui/useable-components/custom-skeletons/restaurant.card.skeleton';
import CustomVendorSkeleton from '@/lib/ui/useable-components/custom-skeletons/vendor.skeleton';
import HeaderText from '@/lib/ui/useable-components/header-text';
import { onUseLocalStorage } from '@/lib/utils/methods';
import { faAdd, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Chip } from 'primereact/chip';
import NoData from '@/lib/ui/useable-components/no-data';
import { useTranslations } from 'next-intl';

export default function VendorMain({ activeTab }: IVendorMainComponentProps) {
  // Hooks
  const t = useTranslations();
  const [vendorPage, setVendorPage] = useState(1);
  const [storePage, setStorePage] = useState(1);
  const vendorPageSize = 7;
  const storePageSize = 6;

  // Context
  const {
    onSetVendorFormVisible,
    globalFilter,
    onSetGlobalFilter,
    filtered,
    vendorResponse,
    vendorId,
  } = useContext(VendorContext);

  const {
    onSetRestaurantFormVisible,
    restaurantByOwnerResponse,

    restaurantContextData,
    onSetRestaurantContextData,
  } = useContext(RestaurantContext);

  const vendors = (filtered && filtered.length > 0) || globalFilter ? filtered : vendorResponse?.data?.vendors;


  const restaurants = restaurantContextData.globalFilter
    ? restaurantContextData?.filtered
    : restaurantByOwnerResponse?.data?.restaurantByOwner?.restaurants;

  const vendorTotal = vendors?.length ?? 0;
  const selectedVendor = vendors?.find((vendor) => vendor._id === vendorId);
  const vendorPages = Math.max(1, Math.ceil(vendorTotal / vendorPageSize));
  const visibleVendors = useMemo(
    () => vendors?.slice((vendorPage - 1) * vendorPageSize, vendorPage * vendorPageSize) ?? [],
    [vendors, vendorPage],
  );
  const storeTotal = restaurants?.length ?? 0;
  const storePages = Math.max(1, Math.ceil(storeTotal / storePageSize));
  const visibleStores = useMemo(
    () => restaurants?.slice((storePage - 1) * storePageSize, storePage * storePageSize) ?? [],
    [restaurants, storePage],
  );

  useEffect(() => setVendorPage(1), [globalFilter]);
  useEffect(() => setStorePage(1), [restaurantContextData.globalFilter, restaurantByOwnerResponse?.data]);

  return (
    <div className="flex min-h-0 flex-grow flex-col gap-4 overflow-hidden bg-slate-50 p-3 sm:flex-row dark:bg-dark-950">
      <div
        className={`z-10 flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950 sm:w-[360px] ${
          activeTab === 'vendors' ? '' : 'hidden sm:block'
        }`}
      >
        {/* Mobile-only header for Vendors section */}
        <div className="mt-3  border-b dark:border-dark-600 p-3 sm:hidden">
          <div className="mb-4 flex items-center justify-between">
            <HeaderText text={t('Vendors')} />
            <TextIconClickable
              className="rounded border-gray-300 bg-black dark:bg-dark-950 dark:border-dark-600 text-white sm:w-auto"
              icon={faAdd}
              iconStyles={{ color: 'white' }}
              title={t('Add Vendor')}
              onClick={() => onSetVendorFormVisible(true)}
            />
          </div>
          <div className="flex flex-col space-y-4">
            <CustomTextField
              type="text"
              name={'vendorFilter'}
              maxLength={35}
              placeholder={t('Search Vendors')}
              showLabel={false}
              value={globalFilter}
              onChange={(e) => onSetGlobalFilter(e.target.value)}
            />

            {/* <CustomTab
              options={options}
              selectedTab={selectedVendorFilter}
              setSelectedTab={setSelectedVendorFilter}
            /> */}
          </div>
        </div>

        {/* Vendors content */}
        <div className="space-y-3 border-b border-slate-100 px-4 py-3 dark:border-dark-600">
          <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{t('Vendors')} ({vendorTotal})</p><p className="mt-0.5 text-xs text-slate-500">Select a vendor to manage its stores</p></div>
          <CustomTextField type="text" name="vendorDesktopFilter" maxLength={35} placeholder={t('Search Vendors')} showLabel={false} value={globalFilter ?? ''} onChange={(e) => onSetGlobalFilter(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {vendorResponse?.loading ? (
            new Array(10)
              .fill(0)
              .map((_, i: number) => <CustomVendorSkeleton key={i} />)
          ) : (vendors?.length ?? 0) > 0 ? (
            visibleVendors.map((vendor, index) => (
              <VendorCard
                key={vendor._id}
                _id={vendor._id}
                email={vendor.email}
                name={vendor?.name}
                image={vendor?.image}
                userType={vendor.userType}
                totalRestaurants={vendor?.restaurants?.length ?? 0}
                uniqueId={vendor.unique_id}
                isLast={visibleVendors.length - 1 === index && index !== 0}
              />
            ))
          ) : (
            <NoData />
          )}
        </div>
        {vendorTotal > 0 && <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs dark:border-dark-600"><span className="text-slate-500">{(vendorPage-1)*vendorPageSize+1}–{Math.min(vendorPage*vendorPageSize,vendorTotal)} of {vendorTotal}</span><div className="flex items-center gap-1"><button type="button" aria-label="Previous vendor page" disabled={vendorPage===1} onClick={()=>setVendorPage(p=>p-1)} className="grid h-8 w-8 place-items-center rounded border disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft}/></button><span className="min-w-8 text-center font-semibold">{vendorPage} / {vendorPages}</span><button type="button" aria-label="Next vendor page" disabled={vendorPage===vendorPages} onClick={()=>setVendorPage(p=>p+1)} className="grid h-8 w-8 place-items-center rounded border disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight}/></button></div></div>}
      </div>

      <div
        className={`min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white px-4 shadow-sm dark:border-dark-600 dark:bg-dark-950 ${
          activeTab === 'restaurants' ? '' : 'hidden sm:block'
        } ${activeTab === 'restaurants' ? 'flex' : 'sm:flex'}`}
      >
        {/* Header for Restaurants section */}
        <div className="border-b pb-3 pt-3 dark:border-dark-600">
          {selectedVendor && <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-dark-900"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e8f0fc] text-lg font-bold text-[#1c5bc7]">{(selectedVendor.name || selectedVendor.email || 'V').split(' ').map((part) => part[0]).slice(0,2).join('').toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-base font-semibold text-slate-900 dark:text-white">{selectedVendor.name || t('Vendor')}</p><p className="truncate text-xs text-slate-500">{selectedVendor.email}</p></div><span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600">Active</span></div>}
          <div className="mb-4 flex items-center justify-between">
            <div className="hidden sm:block">
              <HeaderText text={`${t('Stores')} (${storeTotal})`} />
            </div>
            <div className="flex flex-col sm:hidden">
              <HeaderText text={`${t('Stores')} (${storeTotal})`} />

              <Chip
                label={`${(onUseLocalStorage('get', SELECTED_VENDOR_EMAIL) ?? '').slice(0, 20)}`}
                className="w-full"
              />
            </div>
            <TextIconClickable
              className="rounded border-gray-300 border dark:border-dark-600  bg-black text-white sm:w-auto"
              icon={faAdd}
              iconStyles={{ color: 'white' }}
              title={t('Add Store')}
              onClick={() => onSetRestaurantFormVisible(true)}
            />
          </div>
          <div className="flex flex-col items-start space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0 md:items-center">
            <div className="w-full sm:w-60">
              <CustomTextField
                type="text"
                name="restaurantFilter"
                maxLength={35}
                placeholder={t('Search Stores')}
                showLabel={false}
                value={restaurantContextData.globalFilter}
                onChange={(e) =>
                  onSetRestaurantContextData({
                    globalFilter: e.target.value,
                  })
                }
              />
            </div>
            {/* <CustomTab
              options={options}
              selectedTab={selectedRestaurantFilter}
              setSelectedTab={setSelectedResturantFilter}
            /> */}
          </div>
        </div>

        {restaurantByOwnerResponse?.loading ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto pb-6 pt-3">
            {new Array(10).fill(0).map((_, i: number) => (
              <CustomRestaurantCardSkeleton key={i} />
            ))}
          </div>
        ) : (restaurants?.length ?? 0) != 0 ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto pb-6 pt-3">
            {visibleStores.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        ) : (
          <NoData />
        )}
        {storeTotal > 0 && <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-2 py-3 text-xs dark:border-dark-600 dark:bg-dark-950"><span className="text-slate-500">Showing {(storePage-1)*storePageSize+1}–{Math.min(storePage*storePageSize,storeTotal)} of {storeTotal} stores</span><div className="flex items-center gap-2"><button type="button" aria-label="Previous store page" disabled={storePage===1} onClick={()=>setStorePage(p=>p-1)} className="rounded border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-30">Previous</button><span className="min-w-12 text-center font-semibold">{storePage} / {storePages}</span><button type="button" aria-label="Next store page" disabled={storePage===storePages} onClick={()=>setStorePage(p=>p+1)} className="rounded border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-30">Next</button></div></div>}
      </div>
    </div>
  );
}
