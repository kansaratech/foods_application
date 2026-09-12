import CustomTextField from '@/lib/ui/useable-components/input-field';
import { ICouponTableHeaderProps } from '@/lib/utils/interfaces/coupons.interface';
import { Dropdown } from 'primereact/dropdown';
import { useTranslations } from 'next-intl';

export default function CouponTableHeader({ globalFilterValue, onGlobalFilterChange, selectedActions, setSelectedActions }: ICouponTableHeaderProps) {
  const t = useTranslations();
  return (
    <div className="coupon-toolbar">
      <label className="coupon-search">
        <span>{t('Search')}</span>
        <CustomTextField type="text" name="couponSearch" showLabel={false}
          value={globalFilterValue} onChange={onGlobalFilterChange} placeholder={t('Keyword Search')} />
      </label>
      <label className="coupon-filter">
        <span>{t('Status')}</span>
        <Dropdown inputId="coupon-status-filter" value={selectedActions.length === 1 ? selectedActions[0] : ''}
          options={[{ label: t('All'), value: '' }, { label: t('Enabled'), value: 'true' }, { label: t('Disabled'), value: 'false' }]}
          onChange={(e) => setSelectedActions(e.value ? [e.value] : [])} panelClassName="coupon-filter-panel" />
      </label>
    </div>
  );
}
