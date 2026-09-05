// Core
import React, { useContext, useRef } from 'react';

// PrimeReact Components
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';

// Context
import { ProfileContext } from '@/lib/context/restaurant/profile.context';

// Custom Components
import UpdateRestaurantDetails from './update-profile-detail';
import UpdateRestaurantLocation from './update-restaurant-location';
import UpdateTiming from './update-timing';

import { useTranslations } from 'next-intl';
import UpdateBusinessDetails from './update-bussiness-details';
import StepperHeader from '@/lib/ui/useable-components/stepper-header';

const UpdateRestaurantsProfileForm = () => {
  // Hooks
  const t = useTranslations();

  // Refs
  const stepperRef = useRef(null);

  // Contexts
  const {
    setIsUpdateProfileVisible,
    activeIndex,
    onActiveStepChange,
  } = useContext(ProfileContext);

  // Handlers
  const onHandleStepChange = (order: number) => {
    onActiveStepChange(order);
  };

  const onSidebarHideHandler = () => {
    onActiveStepChange(0);
    setIsUpdateProfileVisible(false);
  };

  const steps = [
    { key: 'details', label: t('Update Details') },
    { key: 'business', label: t('Business details') },
    { key: 'location', label: t('Location') },
    { key: 'timing', label: t('Timing') },
  ];

  return (
    <div className="store-profile-update h-full min-h-0 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-dark-950 sm:px-6 lg:px-10">
      <style jsx global>{`
        .store-profile-update .p-stepper-nav { display: none; }
      `}</style>
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-slate-500">{t('Profile')} / {t('Update Profile')}</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('Update store profile')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('Review and update your store information')}</p>
          </div>
          <button
            type="button"
            aria-label={t('Close')}
            onClick={onSidebarHideHandler}
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-xl text-slate-500 hover:bg-slate-100 dark:border-dark-600 dark:bg-dark-900"
          >
            &times;
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-950">
          <div className="border-b border-slate-100 px-4 pt-4 dark:border-dark-600 sm:px-6">
            <StepperHeader steps={steps} current={activeIndex} />
          </div>
          <div ref={stepperRef} className="p-4 sm:p-6 lg:p-8">
            <Stepper linear headerPosition="bottom" activeStep={activeIndex}>
          <StepperPanel header={t('Update Details')}>
            <UpdateRestaurantDetails
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
              }}
            />
          </StepperPanel>
          <StepperPanel header={t('Update Business Details')}>
            <UpdateBusinessDetails
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
                isLastStep: true,
              }}
            />
          </StepperPanel>
          <StepperPanel header={t('Update Location')}>
            <UpdateRestaurantLocation
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
                isLastStep: true,
              }}
            />
          </StepperPanel>
          <StepperPanel header={t('Update Timing')}>
            <UpdateTiming
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
                isLastStep: true,
              }}
            />
          </StepperPanel>
            </Stepper>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateRestaurantsProfileForm;
