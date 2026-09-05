// Core
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useRouter } from 'next/navigation';

// Components
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

// Constants
import HeaderText from '@/lib/ui/useable-components/header-text';
import { useTranslations } from 'next-intl';

export default function VendorHeader() {
  // Hooks
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="hidden w-full flex-shrink-0 border-b bg-slate-50 px-5 py-4 dark:border-dark-600 dark:bg-dark-950 dark:text-white sm:block">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <HeaderText text={`${t('Vendors')} & ${t('Stores')}`} />
          <p className="mt-1 text-sm text-slate-500">Manage vendor accounts and their store locations</p>
        </div>

        <TextIconClickable
          className="rounded-lg border border-[#1c5bc7] bg-[#1c5bc7] px-4 text-white shadow-sm sm:w-auto dark:border-dark-600"
          icon={faAdd}
          iconStyles={{ color: 'white' }}
          title={t('Add Vendor')}
          onClick={() => {
            router.push('/general/vendors/add');
          }}
        />
        {/* <VendorCustomTab
          options={options}
          selectedTab={selectedVendorFilter}
          setSelectedTab={setSelectedVendorFilter}
          className="w-full sm:w-auto"
        /> */}
      </div>
    </div>
  );
}
