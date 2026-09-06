'use client';
import { UPDATE_DELIVERY_OPTIONS } from '@/lib/api/graphql/mutations/deliveryOptions';
import { GET_RESTAURANT_DELIVERY_OPTIONS } from '@/lib/api/graphql';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import useToast from '@/lib/hooks/useToast';
import Toggle from '@/lib/ui/useable-components/toggle';
import { useMutation, useQuery } from '@apollo/client';
import { Formik, Form } from 'formik';
import { useTranslations } from 'next-intl';
import { useContext } from 'react';
import * as Yup from 'yup';

const ToggleSchema = Yup.object().shape({
  pickup: Yup.boolean().required(),
  delivery: Yup.boolean().required(),
  deliveryProvider: Yup.string().oneOf(['PLATFORM', 'SELF', 'BOTH']).required(),
});

interface IDeliveryOptions {
  pickup: boolean;
  delivery: boolean;
  deliveryProvider: 'PLATFORM' | 'SELF' | 'BOTH';
}

const PROVIDER_OPTIONS: { value: IDeliveryOptions['deliveryProvider']; label: string }[] = [
  { value: 'PLATFORM', label: 'LocalSell delivery fleet' },
  { value: 'SELF', label: "Store's own delivery people" },
  { value: 'BOTH', label: 'Both — store chooses per order' },
];

const DeliveryOptions = () => {
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId || '';

  const t = useTranslations();
  const { showToast } = useToast();

  const { data, loading, refetch } = useQuery(GET_RESTAURANT_DELIVERY_OPTIONS, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });

  const initialValues: IDeliveryOptions = {
    pickup: data?.restaurant?.pickup ?? true,
    delivery: data?.restaurant?.delivery ?? true,
    deliveryProvider: (data?.restaurant?.deliveryProvider as IDeliveryOptions['deliveryProvider']) ?? 'PLATFORM',
  };

  const [mutate, { loading: mutationLoading }] = useMutation(UPDATE_DELIVERY_OPTIONS);

  const handleSubmit = (values: IDeliveryOptions) => {
    if (JSON.stringify(values) === JSON.stringify(initialValues)) {
      return showToast({ type: 'info', title: 'No Changes', message: 'You have not made any changes to save.', duration: 3000 });
    }
    if (!values.pickup && !values.delivery) {
      return showToast({
        type: 'warn',
        title: 'Warning',
        message: 'At least one service option (Pickup or Delivery) must be enabled.',
        duration: 3000,
      });
    }

    mutate({
      variables: { restId: restaurantId, ...values },
      onCompleted: () => {
        refetch({ id: restaurantId });
        showToast({ type: 'success', title: t('Success'), message: t('Service options updated.'), duration: 3000 });
      },
      onError: (error) => {
        let message = '';
        try {
          message = error.graphQLErrors[0]?.message;
        } catch {
          message = t('ActionFailedTryAgain');
        }
        showToast({ type: 'error', title: t('Error'), message, duration: 3000 });
      },
    });
  };

  return (
    <div className="mt-7 h-fit rounded border px-8 py-8 dark:border-dark-600">
      <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white">Service Options</h2>
      {loading && !data ? (
        <div className="flex items-center justify-center p-10">Loading...</div>
      ) : (
        <Formik initialValues={initialValues} validationSchema={ToggleSchema} onSubmit={handleSubmit} enableReinitialize>
          {({ values, setFieldValue }) => (
            <Form className="flex flex-col gap-6">
              <div className="flex items-center justify-between rounded-md border p-3 dark:border-dark-600">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Pickup</label>
                <Toggle checked={values.pickup} onClick={() => setFieldValue('pickup', !values.pickup)} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3 dark:border-dark-600">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Delivery</label>
                <Toggle checked={values.delivery} onClick={() => setFieldValue('delivery', !values.delivery)} />
              </div>

              {values.delivery && (
                <div className="rounded-md border p-3 dark:border-dark-600">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Who delivers?</label>
                  <div className="flex flex-col gap-2">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                        <input
                          type="radio"
                          name="deliveryProvider"
                          checked={values.deliveryProvider === opt.value}
                          onChange={() => setFieldValue('deliveryProvider', opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={mutationLoading}
                className="h-11 w-full rounded-md bg-black text-sm font-semibold text-white hover:bg-gray-900"
              >
                {mutationLoading ? 'Processing...' : 'Save'}
              </button>
            </Form>
          )}
        </Formik>
      )}
    </div>
  );
};

export default DeliveryOptions;
