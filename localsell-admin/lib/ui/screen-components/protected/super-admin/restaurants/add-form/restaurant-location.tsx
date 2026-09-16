'use client';

// Core
import { Form, Formik } from 'formik';
import { useContext, useState } from 'react';

// Interface and Types
import {
  IRestaurantsRestaurantLocationComponentProps,
  IVendorForm,
} from '@/lib/utils/interfaces';

// Icons
import CustomGoogleMapsLocationBounds from '@/lib/ui/useable-components/google-maps/location-bounds-restaurants';
import { GoogleMapsContext } from '@/lib/context/global/google-maps.context';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import { useTranslations } from 'next-intl';

const initialValues: IVendorForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RestaurantLocation({
  stepperProps,
}: IRestaurantsRestaurantLocationComponentProps) {
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => {},
    order: 1,
  };
  const t = useTranslations();

  // Contexts
  const { isLoaded } = useContext(GoogleMapsContext);

  // States
  const [formInitialValues] = useState<IVendorForm>({
    ...initialValues,
  });

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950" >
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          <div>
            <Formik
              initialValues={formInitialValues}
              validationSchema={null}
              enableReinitialize={true}
              onSubmit={() => {}}
              validateOnChange={false}
            >
              {({ handleSubmit }) => {
                return (
                  <Form onSubmit={handleSubmit}>
                    <div className="mb-2 space-y-3">
                      {isLoaded && (
                        <CustomGoogleMapsLocationBounds
                          onStepChange={onStepChange}
                        />
                      )}
                      <div className="mt-2 flex justify-start border-t border-slate-200 pt-5 dark:border-dark-600">
                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:hover:bg-dark-600 dark:border-dark-600 bg-white text-slate-700 dark:bg-dark-950 dark:text-white px-8"
                          label={t('Back')}
                          type="button"
                          onClick={() => onStepChange(order - 1)}
                        />
                      </div>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
}
