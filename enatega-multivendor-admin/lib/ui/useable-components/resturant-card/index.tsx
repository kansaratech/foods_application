// Core
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import Image from '@/lib/ui/useable-components/safe-image';

// Third-party libraries
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ApolloError, useMutation } from '@apollo/client';
import { Avatar } from 'primereact/avatar';

// Icons
import {
  faLocationDot,
  faStore,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

// Interfaces
import { IRestaurantCardProps } from '@/lib/utils/interfaces';

// Methods
import { onUseLocalStorage } from '@/lib/utils/methods';

// GraphQL
import { DELETE_RESTAURANT, HARD_DELETE_RESTAURANT } from '@/lib/api/graphql';

// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantContext } from '@/lib/context/super-admin/restaurant.context';
import { ConfigurationContext } from '@/lib/context/global/configuration.context';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// Components
import CustomInputSwitch from '../custom-input-switch';
import TextComponent from '../text-field';
import CustomLoader from '../custom-progress-indicator';
import { CarSVG } from '@/lib/utils/assets/svgs/Car';
import { FrameSVG } from '@/lib/utils/assets/svgs/Frame';
import { useTranslations } from 'next-intl';

export default function RestaurantCard({ restaurant }: IRestaurantCardProps) {
  // Props
  const {
    _id,
    name,
    image,
    address,
    shopType,
    isActive,
    unique_restaurant_id,
  } = restaurant;

  const configuration = useContext(ConfigurationContext);
  // Hooks
  const t = useTranslations();
  const { CURRENT_SYMBOL } = useConfiguration();
  const { showToast } = useContext(ToastContext);

  if (!configuration) {
    throw new Error(t('Cannot get the value of the Configuration Context'));
  }

  const { deliveryRate, isPaidVersion } = configuration;

  const {
    restaurantByOwnerResponse,
    isRestaurantModifed,
    setRestaurantModifed,
  } = useContext(RestaurantContext);

  // Hooks
  const router = useRouter();

  // API
  const [hardDeleteRestaurant, { loading: isHardDeleting }] = useMutation(
    HARD_DELETE_RESTAURANT,
    {
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Store Delete'),
          message: `${t('Store has been deleted successfully')}.`,
          duration: 2000,
        });
        restaurantByOwnerResponse.refetch();
      },
      onError: ({ networkError, graphQLErrors }: ApolloError) => {
        showToast({
          type: 'error',
          title: t('Store Delete'),
          message:
            graphQLErrors[0]?.message ??
            networkError?.message ??
            t(`Store delete failed`),
          duration: 2500,
        });
      },
    }
  );
  const [deleteRestaurant, { loading }] = useMutation(DELETE_RESTAURANT, {
    onCompleted: (data) => {
      // Use the server's post-toggle value, not the stale prop, so the toast
      // reflects what actually happened.
      const nowActive = data?.deleteRestaurant?.isActive ?? !isActive;
      showToast({
        type: 'success',
        title: t('Store Status'),
        message: `${t('Store has been marked as')} ${nowActive ? t('active') : t('in-active')}`,
        duration: 2000,
      });
      setRestaurantModifed(!isRestaurantModifed);
    },
    onError: ({ networkError, graphQLErrors }: ApolloError) => {
      showToast({
        type: 'error',
        title: t('Store Status'),
        message:
          graphQLErrors[0]?.message ??
          networkError?.message ??
          `${t('Store marked as')} ${isActive ? t('active') : t('in-active')} failed`,
        duration: 2500,
      });
    },
  });

  // Handle checkbox change
  const handleCheckboxChange = async () => {
    try {
      await deleteRestaurant({ variables: { id: _id } });
    } catch {
      // onError in useMutation handles the toast for failed requests
    }
  };

  const handleDelete = async () => {
    if (isPaidVersion) {
      hardDeleteRestaurant({ variables: { id: _id } });
    } else {
      showToast({
        type: 'error',
        title: t('You are using free version'),
        message: t('This Feature is only Available in Paid Version'),
      });
    }
  };

  const handleViewDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onUseLocalStorage('save', 'restaurantId', _id);
    onUseLocalStorage('save', 'shopType', shopType);
    onUseLocalStorage('save', 'routeStack', JSON.stringify(['Admin']));
    router.push('/admin/store/dashboard');
  };

  return (
    <div className="grid items-center rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-[#1c5bc7]/40 hover:shadow-md dark:border-dark-600 dark:bg-dark-950 dark:text-white lg:grid-cols-[1.35fr_1fr_1.25fr_auto]">
      <div className="flex min-w-0 items-center p-4">
        {image ? (
          <Image
            src={image}
            alt={t('Store logo')}
            className="mr-3 h-11 w-11 flex-shrink-0 rounded-lg object-cover"
            width={40}
            height={40}
          />
        ) : (
          <Avatar
            icon={<FontAwesomeIcon icon={faStore} />}
            className="mr-3"
            size="large"
            shape="circle"
          />
        )}
        <div className="min-w-0 flex-grow">
          <TextComponent
            className={` dark:text-white card-h2 truncate`}
            text={name}
          />
          <TextComponent
            className={`card-h3 truncate text-gray-500 dark:text-white`}
            text={unique_restaurant_id}
          />
          <TextComponent
            className={`card-h3 truncate text-gray-500 dark:text-white`}
            text={shopType}
          />
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-x-2 truncate border-t border-slate-100 px-4 py-3 text-sm text-gray-500 dark:border-dark-600 dark:text-white lg:border-l lg:border-t-0">
        <FontAwesomeIcon icon={faLocationDot} />

        <TextComponent
          className={`card-h2 truncate text-gray-500 dark:text-white`}
          text={address}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 dark:border-dark-600 lg:border-l lg:border-t-0">
        {/* Delivery Time */}
        <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
          <FrameSVG width="24" height="24" />
          <span>
            {restaurant?.deliveryTime} {t('min')}
          </span>
        </div>

        {/* Delivery Fee */}
        <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
          <CarSVG width="24" height="24" />
          <span>
            {CURRENT_SYMBOL || '$'} {deliveryRate}
          </span>
        </div>

        {/* Minimum Order */}
        <div className="flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
          <span>{t('Min Order')}</span>
          <span>
            {CURRENT_SYMBOL || '$'}
            {restaurant?.minimumOrder}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-4 dark:border-dark-600 lg:border-l lg:border-t-0">
        <CustomInputSwitch loading={loading} isActive={isActive} onChange={handleCheckboxChange} />
        <button
          type="button"
          onClick={handleViewDetails}
          className="h-9 whitespace-nowrap rounded-md px-3 text-sm font-semibold text-[#1c5bc7] transition hover:bg-[#e8f0fc] focus:outline-none focus:ring-2 focus:ring-[#1c5bc7]/30 dark:text-white"
        >
          {t('View Details')}
        </button>
        {isHardDeleting ? <CustomLoader size="20px" /> : <button type="button" aria-label={t('Delete')} onClick={handleDelete} className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><FontAwesomeIcon icon={faTrash}/></button>}
      </div>
    </div>
  );
}
