// Interfaces
import { IActionMenuProps } from '@/lib/utils/interfaces';
import { ICoupon } from '@/lib/utils/interfaces/coupons.interface';

// Components
import CustomInputSwitch from '../../custom-input-switch';
import ActionMenu from '../../action-menu';

// Hooks
import { useContext, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';

//GraphQL
import { EDIT_COUPON } from '@/lib/api/graphql';

// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';
import { useTranslations } from 'next-intl';

export const COUPONS_TABLE_COLUMNS = ({
  menuItems,
}: {
  menuItems: IActionMenuProps<ICoupon>['items'];
}) => {
  // Hooks
  const { showToast } = useContext(ToastContext);
  // Hooks
  const t = useTranslations();

  // States
  const [editCouponLoading, setEditCouponLoading] = useState({
    _id: '',
    bool: false,
  });

  // Mutations
  const [editCoupon, { loading }] = useMutation(EDIT_COUPON, {
    refetchQueries: 'active',
    awaitRefetchQueries: true,
    onCompleted: () => {
      showToast({
        title: t('Edit Coupon'),
        type: 'success',
        message: t('Coupon Status has been edited successfully'),
        duration: 2500,
      });
      setEditCouponLoading({
        _id: '',
        bool: false,
      });
    },
    onError: (err) => {
      showToast({
        title: t('Edit Coupon'),
        type: 'error',
        message:
          err.message ||
          err?.cause?.message ||
          t('Something went wrong, please try again'),
        duration: 2500,
      });
      setEditCouponLoading({
        bool: false,
        _id: '',
      });
    },
  });

  // Handlers
  async function handleEnableField(rowData: ICoupon) {
    setEditCouponLoading({
      bool: true,
      _id: rowData._id,
    });
    const updatedCoupon = {
      _id: rowData?._id,
      title: rowData?.title,
      discount: rowData?.discount,
      enabled: !rowData?.enabled,
      lifeTimeActive: rowData?.lifeTimeActive,
      startDate: rowData?.startDate,
      endDate: rowData?.endDate,
    };
    await editCoupon({
      variables: {
        couponInput: updatedCoupon,
      },
    });
  }

  // Columns
  const coupon_columns = useMemo(
    () => [
      {
        headerName: t('Name'),
        propertyName: '__typename',
      },
      {
        headerName: t('Code'),
        propertyName: 'title',
      },
      {
        headerName: t('Discount'),
        propertyName: 'discount',
        body: (rowData: ICoupon) => {
          return <span>{rowData.discount}%</span>;
        },
      },
      {
        headerName: t('lifetime_active'),
        propertyName: 'lifeTimeActive',
        body: (rowData: ICoupon) => {
          return <span>{rowData.lifeTimeActive ? t('Yes') : t('No')}</span>;
        },
      },
      {
        headerName: t('Start Date'),
        propertyName: 'startDate',
        body: (rowData: ICoupon) => {
          if (rowData.lifeTimeActive) return <span>{t('Lifetime')}</span>;
          return (
            <span>
              {rowData.startDate
                ? new Date(rowData.startDate).toLocaleDateString()
                : '-'}{' '}
            </span>
          );
        },
      },
      {
        headerName: t('End Date'),
        propertyName: 'endDate',
        body: (rowData: ICoupon) => {
          if (rowData.lifeTimeActive) return <span>{t('Lifetime')}</span>;
          return (
            <span>
              {rowData.endDate
                ? new Date(rowData.endDate).toLocaleDateString()
                : '-'}
            </span>
          );
        },
      },
      {
        headerName: t('Status'),
        propertyName: 'enabled',
        body: (rowData: ICoupon) => {
          const now = Date.now();
          let label = t('Live');
          let cls = 'bg-green-100 text-green-700';
          if (!rowData.enabled) {
            label = t('Disabled');
            cls = 'bg-gray-100 text-gray-600';
          } else if (!rowData.lifeTimeActive) {
            if (rowData.startDate && now < new Date(rowData.startDate).getTime()) {
              label = t('Scheduled');
              cls = 'bg-amber-100 text-amber-700';
            } else if (rowData.endDate && now > new Date(rowData.endDate).getTime()) {
              label = t('Expired');
              cls = 'bg-red-100 text-red-700';
            }
          }
          return (
            <div className="flex w-full cursor-pointer items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex w-20 items-start">
                  <CustomInputSwitch
                    isActive={rowData.enabled}
                    className={
                      rowData?.enabled
                        ? 'p-inputswitch-checked absolute'
                        : 'absolute'
                    }
                    onChange={() => handleEnableField(rowData)}
                    loading={rowData._id === editCouponLoading._id && loading}
                  />
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>
                  {label}
                </span>
              </div>
              <ActionMenu data={rowData} items={menuItems} />
            </div>
          );
        },
      },
    ],
    [loading, editCouponLoading.bool, menuItems]
  );
  return coupon_columns;
};
