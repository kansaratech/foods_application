// Core
import Image from '@/lib/ui/useable-components/safe-image';
// Custom Components
import ActionMenu from '@/lib/ui/useable-components/action-menu';
// Interfaces and Types
import { IActionMenuProps } from '@/lib/utils/interfaces/action-menu.interface';
import { IBannersResponse } from '@/lib/utils/interfaces/banner.interface';
import { useTranslations } from 'next-intl';
// Interfaces and Types
export const BANNERS_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<IBannersResponse>['items'];
}) => {
  // Hooks
  const t = useTranslations();
  return [
    {
      headerName: t('Image'),
      propertyName: 'image',
      body: (product: IBannersResponse) => {
        const fileUrl = product.file?.toLowerCase() || '';
        const isVideo = fileUrl.includes('.mp4') || fileUrl.includes('.webm') || fileUrl.includes('video');
        
        if (isVideo) {
          return (
            <video
              autoPlay
              loop
              muted
              playsInline
              src={product.file}
              width={40}
              height={40}
              className="rounded object-cover"
            />
          );
        } else {
          return (
            <Image
              width={40}
              height={40}
              alt="Banner"
              className="rounded object-cover"
              src={
                product.file
                  ? product.file
                  : 'https://images.unsplash.com/photo-1595418917831-ef942bd9f9ec?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
              }
            />
          );
        }
      },
    },
    { headerName: t('Title'), propertyName: 'title' },
    { headerName: t('Screen Name'), propertyName: 'screen' },
    {
      headerName: t('Placement'),
      propertyName: 'placement',
      body: (b: IBannersResponse) => b.placement || 'HOME',
    },
    {
      headerName: t('Priority'),
      propertyName: 'priority',
      body: (b: IBannersResponse) => b.priority ?? 0,
    },
    {
      headerName: t('Window'),
      propertyName: 'startDate',
      body: (b: IBannersResponse) => {
        if (!b.startDate && !b.endDate) return t('Always on');
        const fmt = (d: string | null) =>
          d ? new Date(d).toLocaleDateString() : '—';
        return `${fmt(b.startDate)} – ${fmt(b.endDate)}`;
      },
    },
    {
      headerName: t('Status'),
      propertyName: 'isActive',
      body: (b: IBannersResponse) => {
        const now = Date.now();
        let label = t('Live');
        let cls = 'bg-green-100 text-green-700';
        if (!b.isActive) {
          label = t('Disabled');
          cls = 'bg-gray-100 text-gray-600';
        } else if (b.startDate && now < new Date(b.startDate).getTime()) {
          label = t('Scheduled');
          cls = 'bg-amber-100 text-amber-700';
        } else if (b.endDate && now > new Date(b.endDate).getTime()) {
          label = t('Expired');
          cls = 'bg-red-100 text-red-700';
        }
        return (
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
            {label}
          </span>
        );
      },
    },
    { headerName: t('Actions'), propertyName: 'action' },
    {
      propertyName: 'actions',
      body: (banner: IBannersResponse) => (
        <ActionMenu items={menuItems} data={banner} />
      ),
    },
  ];
};
