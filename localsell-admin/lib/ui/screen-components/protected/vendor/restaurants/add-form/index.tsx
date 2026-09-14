'use client';

// Core imports
import { useContext, useRef } from 'react';

// Interfaces
import {
  IRestaurantContextData,
  IRestaurantsAddFormComponentProps,
} from '@/lib/utils/interfaces';

// PrimeReact components
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';
import { Stepper } from 'primereact/stepper';
import { StepperPanel } from 'primereact/stepperpanel';

// Context
import { VendorLayoutRestaurantContext } from '@/lib/context/vendor/restaurant.context';

// Local components
import RestaurantDetails from './restaurant-details';
import RestaurantLocation from './restaurant-location';
import RestaurantTiming from './restaurant-timing';
import { useTranslations } from 'next-intl';

const VendorRestaurantsForm = ({
  position = 'right',
}: IRestaurantsAddFormComponentProps) => {
  // Hooks
  const t = useTranslations();

  // Ref
  const stepperRef = useRef(null);

  // Context
  const {
    isRestaurantFormVisible,
    onSetRestaurantFormVisible,
    activeIndex,
    onActiveStepChange,
    onSetRestaurantContextData,
  } = useContext(VendorLayoutRestaurantContext);

  // Handlers
  const onHandleStepChange = (order: number) => {
    onActiveStepChange(order);
  };
  const onSidebarHideHandler = () => {
    // Clean Context State
    onActiveStepChange(0);
    onSetRestaurantFormVisible(false);
    onSetRestaurantContextData({} as IRestaurantContextData);
  };

  return (
    <FormDialog
      title={t('Store')}
      size="xl"
      visible={isRestaurantFormVisible}
      position={position}
      onHide={onSidebarHideHandler}
      className=""
    >
      <div ref={stepperRef}>
        <Stepper linear headerPosition="bottom" activeStep={activeIndex}>
          <StepperPanel header={t('Add Details')}>
            <RestaurantDetails
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
              }}
            />
          </StepperPanel>
          <StepperPanel header={t('Location')}>
            <RestaurantLocation
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
              }}
            />
          </StepperPanel>
          <StepperPanel header={t('Timing')}>
            <RestaurantTiming
              stepperProps={{
                onStepChange: onHandleStepChange,
                order: activeIndex,
              }}
            />
          </StepperPanel>
        </Stepper>
      </div>
    </FormDialog>
  );
};

export default VendorRestaurantsForm;
