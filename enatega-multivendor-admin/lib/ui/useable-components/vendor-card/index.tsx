// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Hooks
import { useContext, useState } from 'react';
import { ApolloError, useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';

// Context
import { VendorContext } from '@/lib/context/super-admin/vendor.context';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// Interface
import { IVendorCardProps } from '@/lib/utils/interfaces';

// Methods
import { onUseLocalStorage } from '@/lib/utils/methods';

// Icons
import {
  faEdit,
  faEllipsisVertical,
  faEye,
  faShop,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

// GraphQL
import { DELETE_VENDOR, GET_VENDORS } from '@/lib/api/graphql';

// Components
import Image from '@/lib/ui/useable-components/safe-image';
import CustomDialog from '../delete-dialog';
import CustomPopupMenu from '../popup-menu';
import TextComponent from '../text-field';

// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';

// Utils & Constants
import { SELECTED_VENDOR_EMAIL } from '@/lib/utils/constants';
import { useTranslations } from 'next-intl';

export default function VendorCard({
  _id,
  email,
  uniqueId,
  totalRestaurants,
  name,
  image,
  isLast = false,
}: IVendorCardProps) {
  // Hooks
  const t = useTranslations();

  // Context
  const { vendorId, onSetVendorId, vendorResponse, onResetVendor } =
    useContext(VendorContext);
  const { onSetVendorFormVisible } = useContext(VendorContext);
  const { showToast } = useContext(ToastContext);
  const { ISPAID_VERSION } = useConfiguration();

  // States
  const [isPopupOpen, setPopupOpen] = useState<boolean>(false);
  const [isDeletePopupOpen, setDeletePopupOpen] = useState<boolean>(false);

  const router = useRouter();

  // API
  const [deleteVendor, { loading }] = useMutation(DELETE_VENDOR, {
    refetchQueries: [{ query: GET_VENDORS }],
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Vendor Delete'),
        message: t('Vendor has been deleted successfully'),
      });

      onResetVendor(true); // so after refetching is vendor can be selected.
      vendorResponse.refetch();
    },
    onError: ({ networkError, graphQLErrors }: ApolloError) => {
      showToast({
        type: 'error',
        title: t('Vendor Delete'),
        message:
          graphQLErrors[0]?.message ??
          networkError?.message ??
          t('Vendor Deletion  Failed'),
        duration: 2500,
      });
    },
  });

  // Handlers
  const onVendorCardClicked = (_vendorId: string) => {
    onSetVendorId(_vendorId);
    onUseLocalStorage('save', 'vendorId', _vendorId.toString());
    onUseLocalStorage('save', SELECTED_VENDOR_EMAIL, email);
  };

  const onHandlerEdit = () => {
    onSetVendorFormVisible(true, true);
  };

  // API Hanlders
  const onHandleConfirmDeleteVendor = async () => {
    try {
      if (ISPAID_VERSION) {
        await deleteVendor({ variables: { id: vendorId } });
        setDeletePopupOpen(false);
      } else {
        setDeletePopupOpen(false);
        showToast({
          type: 'error',
          title: t('You are using free version'),
          message: t('This Feature is only Available in Paid Version'),
        });
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: t('Vendor Delete'),
        message: t('Vendor delete failed'),
      });
    }
  };

  const onHandleHideDeleteVendor = () => {
    setDeletePopupOpen(false);
  };

  const onHandlerDelete = () => {
    setDeletePopupOpen(true);
  };

  const onHandlerView = () => {
    if (vendorId) onVendorCardClicked(vendorId);
    const routeStack = ['Admin'];
    onUseLocalStorage('save', 'routeStack', JSON.stringify(routeStack));
    router.push('/admin/vendor/dashboard');
  };

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (!(e.target as HTMLElement).closest('.three-dots')) {
          onVendorCardClicked(_id);
        }
        setPopupOpen(false);
      }}
      className="relative border-b border-slate-100 last:border-b-0 dark:border-dark-600"
    >
      <div
        className={`group flex min-h-[72px] items-center border-l-2 px-4 py-3 transition ${vendorId === _id ? 'border-[#1c5bc7] bg-[#eef4ff] dark:bg-dark-900' : 'border-transparent bg-white hover:bg-slate-50 dark:bg-dark-950 dark:hover:bg-dark-900'} cursor-pointer`}
      >
        <Image
          width={40}
          height={40}
          src={
            image ??
            'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
          }
          alt="User avatar"
          style={{ objectFit: 'fill' }}
          className="mr-3 h-10 w-10 rounded-full border border-slate-200 object-cover"
        />
        <div className="flex flex-1 flex-col gap-y-1">
          <TextComponent
            className="flex flex-1 truncate text-sm font-semibold text-slate-900 dark:text-white"
            text={name ?? t('Vendor')}
          />
          <TextComponent
            className="hidden"
            text={uniqueId ?? ''}
          />
          <TextComponent
            className="truncate text-xs text-slate-500 dark:text-slate-300"
            text={email}
          />

          <div
            className="mt-1 flex w-fit items-center gap-x-1.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-600 dark:border-dark-600 dark:bg-dark-900 dark:text-white"
          >
            <FontAwesomeIcon
              icon={faShop}
              className="text-slate-500"
              size="xs"
            />
            <span
              className="text-xs font-semibold"
            >
              {totalRestaurants}
            </span>
          </div>
        </div>

        <div className="three-dots relative">
          {vendorId === _id && (
            <FontAwesomeIcon
              icon={faEllipsisVertical}
              className="cursor-pointer rounded p-2 text-slate-500 hover:bg-white hover:text-slate-900"
              onClick={(e) => {
                e.stopPropagation();
                setPopupOpen(!isPopupOpen);
              }}
            />
          )}
          {isPopupOpen && (
            <div
              className={`absolute left-2 top-[1.2rem] z-20 ${isLast ? '-mt-36' : 'mt-1'} -translate-x-full`}
            >
              <CustomPopupMenu
                close={() => setPopupOpen(false)}
                items={[
                  {
                    title: t('View'),
                    icon: faEye,
                    fn: onHandlerView,
                    data: vendorId,
                    color: 'text-gray-600 dark:text-white',
                  },
                  {
                    title: t('Edit'),
                    icon: faEdit,
                    fn: onHandlerEdit,
                    data: vendorId,
                    color: 'text-gray-600 dark:text-white',
                  },
                  {
                    title: t('Delete'),
                    icon: faTrash,
                    fn: onHandlerDelete,
                    data: null,
                    color: 'text-red-500 ',
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      <CustomDialog
        loading={loading}
        visible={isDeletePopupOpen}
        onHide={onHandleHideDeleteVendor}
        onConfirm={onHandleConfirmDeleteVendor}
      />
    </div>
  );
}
