//Components
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import { INotificationHeaderProps } from '@/lib/utils/interfaces/notification.interface';

// Icons
import { faAdd } from '@fortawesome/free-solid-svg-icons';
import { useTranslations } from 'next-intl';

export default function NotificationHeader({
  handleButtonClick,
}: INotificationHeaderProps) {
  // Hooks
  const t = useTranslations();

  return (
    <ManagementHeading
      title={t('Notification')}
      description={t('Create notifications and review your communication history.')}
    >
      <TextIconClickable
        icon={faAdd}
        iconStyles={{ color: 'white' }}
        onClick={handleButtonClick}
        title={t('Send Notification')}
        className="rounded border-gray-300 border dark:border-dark-600 bg-black text-white sm:w-auto"
      />
    </ManagementHeading>
  );
}
