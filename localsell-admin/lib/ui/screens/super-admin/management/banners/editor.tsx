'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { GET_BANNERS } from '@/lib/api/graphql/queries/banners';
import { IBannersDataResponse } from '@/lib/utils/interfaces/banner.interface';
import BannersAddForm from '@/lib/ui/screen-components/protected/super-admin/banner/add-form';
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import CustomButton from '@/lib/ui/useable-components/button';
import '@/lib/ui/useable-components/management-page/management.css';

export default function BannerEditor({ id }: { id?: string }) {
  const router = useRouter();
  const t = useTranslations();
  const { data, loading, error, refetch } = useQuery<IBannersDataResponse>(
    GET_BANNERS,
    {
      skip: !id,
      fetchPolicy: 'network-only',
    }
  );
  const banner = data?.banners.find((item) => item._id === id) ?? null;
  const back = () => router.push('/management/banners');
  return (
    <div className="management-page">
      <div className="w-full min-w-0">
        <button
          type="button"
          onClick={back}
          className="mb-3 flex items-center gap-2 text-sm text-[var(--text-color-secondary)] hover:underline"
        >
          <i className="pi pi-arrow-left" aria-hidden="true" />
          {t('Banners')}
        </button>
        <ManagementHeading
          title={id ? `${t('Edit')} ${t('Banner')}` : t('Add Banner')}
          description="Create and manage a promotion with its destination, media and publishing schedule."
        />
        {id && loading ? (
          <p role="status" className="p-6">
            Loading banner...
          </p>
        ) : id && error ? (
          <div role="alert" className="p-6">
            <p>Unable to load this banner. Please try again.</p>
            <CustomButton
              type="button"
              label="Retry"
              onClick={() => refetch()}
            />
          </div>
        ) : id && !banner ? (
          <p role="alert" className="p-6">
            This banner could not be found.
          </p>
        ) : (
          <BannersAddForm banner={banner} onHide={back} />
        )}
      </div>
    </div>
  );
}
