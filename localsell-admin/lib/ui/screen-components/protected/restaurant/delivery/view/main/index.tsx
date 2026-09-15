// Core
import { Form, Formik } from 'formik';
import React, { useContext } from 'react';

// Custom Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import UpdateRestaurantLocationBounds from '@/lib/ui/useable-components/google-maps/location-bounds-profile-restaurants';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { ProfileContext } from '@/lib/context/restaurant/profile.context';

// Utilities & Types
import { RestaurantDeliveryErrors } from '@/lib/utils/constants';
import { IDropdownSelectItem, IRestaurantDeliveryForm } from '@/lib/utils/interfaces';
import { onErrorMessageMatcher, getGraphQLErrorMessage } from '@/lib/utils/methods';
import { DeliverySchema } from '@/lib/utils/schema/delivery';

// A store can charge delivery as a flat lump sum ("fixed") or a per-km rate
// multiplied by distance ("per_km", the historical/default behavior) — see
// computeDeliveryFee in localsell-api/src/services/pricing.service.ts.
const DELIVERY_FEE_TYPE_OPTIONS: IDropdownSelectItem[] = [
  { code: 'per_km', label: "Per Km" },
  { code: 'fixed', label: 'Fixed (flat amount)' },
];

// GraphQL
import { useMutation } from '@apollo/client';
import { UPDATE_RESTAURANT_DELIVERY } from '@/lib/api/graphql';
import { GoogleMapsContext } from '@/lib/context/global/google-maps.context';

const DeliveryMain = () => {
  const { isLoaded } = useContext(GoogleMapsContext);
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const { restaurantId } = restaurantLayoutContextData;
  const { restaurantProfileResponse, loading } = useContext(ProfileContext);
  const { showToast } = useContext(ToastContext);

  const deliveryInfo = restaurantProfileResponse.data?.restaurant.deliveryInfo;
  const initialValues: IRestaurantDeliveryForm & { deliveryFeeType: IDropdownSelectItem } = {
    minDeliveryFee: null,
    deliveryDistance: null,
    deliveryFee: null,
    ...deliveryInfo,
    deliveryFeeType:
      DELIVERY_FEE_TYPE_OPTIONS.find((o) => o.code === deliveryInfo?.deliveryFeeType) ??
      DELIVERY_FEE_TYPE_OPTIONS[0],
  };

  // API
  // Mutation
  const [createRestaurant] = useMutation(UPDATE_RESTAURANT_DELIVERY, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: 'Store Delivery Info',
        message: `Store delivery info has been updated successfully`,
        duration: 3000,
      });
    },
  });

  // Handlers
  const onCreateDelivery = async (
    data: IRestaurantDeliveryForm & { deliveryFeeType?: IDropdownSelectItem }
  ) => {
    try {
      await createRestaurant({
        variables: {
          id: restaurantId,
          minDeliveryFee: data.minDeliveryFee,
          deliveryDistance: data.deliveryDistance,
          deliveryFeeType: data.deliveryFeeType?.code || 'per_km',
          deliveryFee: data.deliveryFee,
        },
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: `Failed to add Store delivery info`,
        message: getGraphQLErrorMessage(error as Error) ?? `Store Create Failed`,
        duration: 2500,
      });
    }
  };

  return (
    <div className="mt-7 max-h-[calc(100vh-152px)] overflow-auto rounded border px-8 py-8">
      <Formik
        initialValues={initialValues}
        validationSchema={DeliverySchema}
        onSubmit={async (values) => {
          await onCreateDelivery(values);
        }}
        validateOnChange
        enableReinitialize
      >
        {({ values, errors, handleSubmit, isSubmitting, setFieldValue }) => {
          return (
            <Form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-2 gap-y-5">
                <CustomNumberField
                  min={1}
                  max={99999}
                  minFractionDigits={0}
                  maxFractionDigits={2}
                  placeholder="Min Delivery Fee"
                  name="minDeliveryFee"
                  showLabel={true}
                  useGrouping={false}
                  value={values.minDeliveryFee}
                  onChange={setFieldValue}
                  isLoading={loading}
                  style={{
                    borderColor: onErrorMessageMatcher(
                      'minDeliveryFee',
                      errors?.minDeliveryFee,
                      RestaurantDeliveryErrors
                    )
                      ? 'red'
                      : '',
                  }}
                />

                <CustomNumberField
                  min={1}
                  max={99999}
                  placeholder="Delivery Distance (In Km's)"
                  name="deliveryDistance"
                  showLabel={true}
                  value={values.deliveryDistance}
                  onChange={setFieldValue}
                  useGrouping={false}
                  minFractionDigits={0}
                  maxFractionDigits={2}
                  isLoading={loading}
                  style={{
                    borderColor: onErrorMessageMatcher(
                      'deliveryDistance',
                      errors?.deliveryDistance,
                      RestaurantDeliveryErrors
                    )
                      ? 'red'
                      : '',
                  }}
                />

                <CustomDropdownComponent
                  name="deliveryFeeType"
                  placeholder="Delivery Fee Type"
                  selectedItem={values.deliveryFeeType}
                  setSelectedItem={setFieldValue}
                  options={DELIVERY_FEE_TYPE_OPTIONS}
                  showLabel={true}
                />

                <CustomNumberField
                  min={1}
                  max={99999}
                  placeholder={
                    values.deliveryFeeType?.code === 'fixed'
                      ? 'Delivery Fee (flat amount per order)'
                      : "Delivery Fee (per Km's) when delivery distance exceed"
                  }
                  name="deliveryFee"
                  showLabel={true}
                  value={values.deliveryFee}
                  onChange={setFieldValue}
                  minFractionDigits={0}
                  maxFractionDigits={2}
                  useGrouping={false}
                  isLoading={loading}
                  style={{
                    borderColor: onErrorMessageMatcher(
                      'deliveryFee',
                      errors?.deliveryFee,
                      RestaurantDeliveryErrors
                    )
                      ? 'red'
                      : '',
                  }}
                />

                {isLoaded && (
                  <div className="col-span-2 flex flex-col gap-2 pt-1">
                    <label className="text-sm font-[500]">
                      Location Preview
                    </label>
                    <UpdateRestaurantLocationBounds
                      height={'400px'}
                      hideControls={true}
                    />
                  </div>
                )}

                <div className="col-span-2 flex justify-end self-end">
                  <CustomButton
                    className="h-10 w-fit border-gray-300 bg-black  px-8 text-white"
                    label="Update"
                    type="submit"
                    loading={isSubmitting}
                  />
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
};

export default DeliveryMain;
