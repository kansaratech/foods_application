import { IDateFilterCustomTabProps } from '@/lib/utils/interfaces';
import { useTranslations } from 'next-intl';
import SegmentedControl from '../custom-tab/segmented-control';
export default function DateFilterCustomTab(props: IDateFilterCustomTabProps) {
  const t = useTranslations();
  return (
    <SegmentedControl
      {...props}
      label="Date period"
      renderLabel={(value) => t(value)}
    />
  );
}
