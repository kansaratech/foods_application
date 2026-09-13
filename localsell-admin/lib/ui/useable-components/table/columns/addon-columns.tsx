import { IActionMenuProps, IAddon } from '@/lib/utils/interfaces';
import ActionMenu from '../../action-menu';
import { useTranslations } from 'next-intl';

export const ADDON_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<IAddon>['items'];
}) => {
  // Hooks
  const t = useTranslations();
  return [
    { headerName: t('Group name'), propertyName: 'title' },
    { headerName: t('Description'), propertyName: 'description' },
    {
      headerName: t('Choices'),
      propertyName: 'options',
      body: (addon: IAddon) => addon.options?.length ?? 0,
    },
    {
      headerName: t('Selection'),
      propertyName: 'isRequired',
      body: (addon: IAddon) => {
        const required = addon.isRequired ?? addon.quantityMinimum >= 1;
        return (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              required
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {required
              ? `${t('Required')} · ${addon.quantityMinimum}-${addon.quantityMaximum}`
              : `${t('Optional')} · ${t('up to')} ${addon.quantityMaximum}`}
          </span>
        );
      },
    },
    {
      propertyName: 'actions',
      body: (option: IAddon) => (
        <ActionMenu items={menuItems} data={option} onToggle={() => {}} />
      ),
    },
  ];
};
