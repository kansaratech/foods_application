'use client';
import ActionButton from '@/lib/ui/useable-components/button/action-button';
// GraphQL
import { CREATE_COUPON, EDIT_COUPON } from '@/lib/api/graphql';

// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';

// Components
import CustomDateInput from '@/lib/ui/useable-components/date-input';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';

// Interfaces
import { IAddCouponProps } from '@/lib/utils/interfaces/coupons.interface';

// Schema
import { CouponFormSchema } from '@/lib/utils/schema/coupon';

// Formik
import { Form, Formik } from 'formik';

// Prime react
import { ProgressSpinner } from '@/lib/ui/useable-components/brand-loader';
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';

// Hooks
import { useMutation } from '@apollo/client';
import { ChangeEvent, useContext } from 'react';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import { onErrorMessageMatcher } from '@/lib/utils/methods';
import { CouponErrors } from '@/lib/utils/constants';
import { useTranslations } from 'next-intl';

export default function CouponForm({
  setVisible,
  isEditing,
  visible,
  setIsEditing,
}: IAddCouponProps) {
  // Hooks
  const { showToast } = useContext(ToastContext);
  const t = useTranslations();

  // Initial values
  const initialValues = {
    _id: isEditing.bool ? isEditing?.data?._id : '',
    title: isEditing.bool ? isEditing?.data?.title : '',
    discount: isEditing.bool ? isEditing?.data?.discount : 0,
    enabled: isEditing.bool ? isEditing?.data?.enabled : true,
    lifeTimeActive: isEditing.bool ? isEditing?.data?.lifeTimeActive : false,
    firstOrderOnly: isEditing.bool
      ? (isEditing?.data?.firstOrderOnly ?? false)
      : false,
    startDate:
      isEditing.bool && isEditing?.data?.startDate
        ? (() => {
            const date = new Date(isEditing.data.startDate);
            return !isNaN(date.getTime())
              ? date.toISOString().split('T')[0]
              : '';
          })()
        : '',
    endDate:
      isEditing.bool && isEditing?.data?.endDate
        ? (() => {
            const date = new Date(isEditing.data.endDate);
            return !isNaN(date.getTime())
              ? date.toISOString().split('T')[0]
              : '';
          })()
        : '',
  };

  // Mutations
  const [CreateCoupon, { loading: createCouponLoading }] = useMutation(
    CREATE_COUPON,
    {
      refetchQueries: 'active',
      awaitRefetchQueries: true,
      onCompleted: () => {
        showToast({
          title: `${isEditing.bool ? t('Edit') : t('New')} ${t('Coupon')}`,
          type: 'success',
          message: t('Coupon has been added successfully'),
          duration: 2000,
        });
        setIsEditing({
          bool: false,
          data: {
            __typename: '',
            _id: '',
            discount: 0,
            enabled: false,
            title: '',
            lifeTimeActive: false,
            firstOrderOnly: false,
            startDate: '',
            endDate: '',
          },
        });
      },
      onError: (err) => {
        showToast({
          title: `${isEditing.bool ? t('Edit') : t('New')} ${t('Coupon')}`,
          type: 'error',
          message:
            err.message ||
            `${t('Coupon')} ${isEditing.bool ? t('Edition') : t('Creation')} ${t('Failed')}`,
          duration: 2000,
        });
        setIsEditing({
          bool: false,
          data: {
            __typename: '',
            _id: '',
            discount: 0,
            enabled: false,
            title: '',
            lifeTimeActive: false,
            firstOrderOnly: false,
            startDate: '',
            endDate: '',
          },
        });
      },
    }
  );
  const [editCoupon, { loading: editCouponLoading }] = useMutation(
    EDIT_COUPON,
    {
      refetchQueries: 'active',
      awaitRefetchQueries: true,
      onCompleted: () => {
        showToast({
          title: `${isEditing.bool ? t('Edit') : t('New')} ${t('Coupon')}`,
          type: 'success',
          message: `${t('Coupon has been')} ${isEditing.bool ? t('Edited') : t('Added')}  ${t('Successfully')}`,
          duration: 2000,
        });
        setIsEditing({
          bool: false,
          data: {
            __typename: '',
            _id: '',
            discount: 0,
            enabled: false,
            title: '',
            lifeTimeActive: false,
            firstOrderOnly: false,
            startDate: '',
            endDate: '',
          },
        });
      },
      onError: (err) => {
        showToast({
          title: `${isEditing.bool ? t('Edit') : t('New')} ${t('Coupon')}`,
          type: 'error',
          message:
            err.message ||
            `${t('Coupon')} ${isEditing.bool ? t('Edition') : t('Creation')} ${t('Failed')}`,
          duration: 2000,
        });
        setIsEditing({
          bool: false,
          data: {
            __typename: '',
            _id: '',
            discount: 0,
            enabled: false,
            title: '',
            lifeTimeActive: false,
            firstOrderOnly: false,
            startDate: '',
            endDate: '',
          },
        });
      },
    }
  );

  return (
    <FormDialog
      title={`${isEditing.bool ? t('Edit') : t('Add')} ${t('Coupon')}`}
      visible={visible}
      onHide={() => {
        setVisible(false);
        setIsEditing({
          bool: false,
          data: {
            __typename: '',
            _id: '',
            discount: 0,
            enabled: true,
            title: '',
            lifeTimeActive: false,
            firstOrderOnly: false,
            startDate: '',
            endDate: '',
          },
        });
      }}
      position="right"
      className=""
    >
      <Formik
        initialValues={initialValues}
        validationSchema={CouponFormSchema}
        onSubmit={async (values, { setSubmitting }) => {
          setSubmitting(true);
          let formData;
          if (!isEditing.bool) {
            formData = {
              title: values.title,
              discount: values.discount,
              enabled: values.enabled,
              lifeTimeActive: values.lifeTimeActive,
              firstOrderOnly: values.firstOrderOnly,
              startDate: values.startDate,
              endDate: values.endDate,
            };
          } else {
            formData = {
              _id: values._id,
              title: values.title,
              discount: values.discount,
              enabled: values.enabled,
              lifeTimeActive: values.lifeTimeActive,
              firstOrderOnly: values.firstOrderOnly,
              startDate: values.startDate,
              endDate: values.endDate,
            };
          }

          if (!isEditing.bool) {
            await CreateCoupon({
              variables: {
                couponInput: formData,
              },
            });
          } else {
            await editCoupon({
              variables: {
                couponInput: formData,
              },
            });
          }
          setIsEditing({
            bool: false,
            data: {
              __typename: '',
              _id: '',
              discount: 0,
              enabled: true,
              title: '',
              lifeTimeActive: false,
              firstOrderOnly: false,
              startDate: '',
              endDate: '',
            },
          });
          setVisible(false);

          setSubmitting(false);
        }}
        validateOnChange={true}
      >
        {({ errors, handleSubmit, values, isSubmitting, setFieldValue }) => {
          return (
            <Form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="flex items-center justify-end gap-x-1">
                  {values.enabled ? t('Enabled') : t('Disabled')}
                  <CustomInputSwitch
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFieldValue('enabled', e.target.checked)
                    }
                    isActive={values.enabled}
                    className={values.enabled ? 'p-inputswitch-checked' : ''}
                  />
                </div>
                <CustomTextField
                  value={values.title}
                  name="title"
                  showLabel={true}
                  placeholder={t('Title')}
                  type="text"
                  onChange={(e) => setFieldValue('title', e.target.value)}
                  style={{
                    borderColor: onErrorMessageMatcher(
                      'title',
                      errors?.title,
                      CouponErrors
                    )
                      ? 'red'
                      : '',
                  }}
                />

                <CustomNumberField
                  value={values.discount}
                  name="discount"
                  minFractionDigits={0}
                  maxFractionDigits={2}
                  showLabel={true}
                  suffix="%"
                  placeholder={t('Discount')}
                  onChange={setFieldValue}
                  min={0}
                  max={100}
                  style={{
                    borderColor: onErrorMessageMatcher(
                      'discount',
                      errors?.discount,
                      CouponErrors
                    )
                      ? 'red'
                      : '',
                  }}
                />

                <CustomInputSwitch
                  label={t('Lifetime Active')}
                  isActive={values.lifeTimeActive}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFieldValue('lifeTimeActive', e.target.checked)
                  }
                />

                <CustomInputSwitch
                  label={t('First Order Only')}
                  isActive={values.firstOrderOnly}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFieldValue('firstOrderOnly', e.target.checked)
                  }
                />

                {!values.lifeTimeActive && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CustomDateInput
                      name="startDate"
                      value={values.startDate}
                      showLabel
                      placeholder={t('Start Date')}
                      onChange={(value) => setFieldValue('startDate', value)}
                      error={errors.startDate}
                    />
                    <CustomDateInput
                      name="endDate"
                      value={values.endDate}
                      showLabel
                      placeholder={t('End Date')}
                      onChange={(value) => setFieldValue('endDate', value)}
                      error={errors.endDate}
                      minDate={values.startDate}
                    />
                  </div>
                )}

                <ActionButton
                  variant="primary"
                  className="float-end h-10 w-fit rounded-md border dark:border-dark-600 border-gray-300 bg-black px-8 text-white"
                  disabled={
                    isSubmitting || editCouponLoading || createCouponLoading
                  }
                  type="submit"
                >
                  {isSubmitting || editCouponLoading || createCouponLoading ? (
                    <ProgressSpinner
                      className="m-0 h-6 w-6 items-center self-center p-0"
                      strokeWidth="5"
                      style={{ fill: 'white', accentColor: 'white' }}
                      color="white"
                    />
                  ) : isEditing.bool ? (
                    t('Update')
                  ) : (
                    t('Add')
                  )}
                </ActionButton>
              </div>
            </Form>
          );
        }}
      </Formik>
    </FormDialog>
  );
}
