import { useTranslations } from 'next-intl';

import CustomTextField from '@/lib/ui/useable-components/input-field';

interface IWaitlistHeaderProps {
  search: string;
  onSearch: (value: string) => void;
  total: number;
}

const WaitlistHeader = ({ search, onSearch, total }: IWaitlistHeaderProps) => {
  const t = useTranslations();

  return (
    <div className="management-toolbar">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{t('Waitlist')} entries</span>
          <span className="text-sm text-gray-500">{total}</span>
        </div>
        <CustomTextField
          type="text"
          name="waitlistSearch"
          maxLength={50}
          className="w-full sm:w-64"
          showLabel={false}
          placeholder={t('Search area, email or phone')}
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onSearch(e.target.value)
          }
        />
      </div>
    </div>
  );
};

export default WaitlistHeader;
