'use client';

// React imports

// Component imports
import HeaderText from '@/lib/ui/useable-components/header-text';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

// Icon imports
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function RestaurantsScreenHeader() {
  // Hooks
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="sticky top-0 z-10 w-full flex-shrink-0 bg-white dark:bg-dark-950 p-3 shadow-sm">
      <div className="flex w-full justify-between">
        <HeaderText text={t('Stores')} />
        <TextIconClickable
          className="rounded border border-gray-300 dark:border-dark-600 bg-black text-white sm:w-auto"
          icon={faAdd}
          iconStyles={{ color: 'white' }}
          title={t('Add Store')}
          onClick={() => router.push('/general/stores/create')}
        />
      </div>
    </div>
  );
}
