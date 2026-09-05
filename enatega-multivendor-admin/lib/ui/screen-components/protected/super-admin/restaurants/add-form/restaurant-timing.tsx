'use client';
// Core
import { ErrorMessage, Form, Formik, FormikErrors } from 'formik';

// Hooks
import { useContext } from 'react';
import { useTranslations } from 'next-intl';

// Interface and Types
import { TWeekDays } from '@/lib/utils/types/days';
import {
  IRestaurantsContextPropData,
  IRestaurantsRestaurantTimingComponentProps,
} from '@/lib/utils/interfaces';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomTimeInput from '@/lib/ui/useable-components/time-input';
import Toggle from '@/lib/ui/useable-components/toggle';
import {
  ITimeSlot,
  ITimeSlotResponseGQL,
  ITimingForm,
  ITimingResponseGQL,
} from '@/lib/utils/interfaces/timing.interface';

// Context
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';

// Utilities and Constants
import { TIMING_INITIAL_VALUE } from '@/lib/utils/constants';
import { TimingSchema } from '@/lib/utils/schema/timing';

// Toast
import useToast from '@/lib/hooks/useToast';

// GraphQL
import { GET_RESTAURANT_PROFILE } from '@/lib/api/graphql';
import { UPDATE_TIMINGS } from '@/lib/api/graphql/mutations/timing';
import { useMutation, useQuery } from '@apollo/client';

const RestaurantTiming = ({
  stepperProps,
}: IRestaurantsRestaurantTimingComponentProps) => {
  const { onStepChange } = stepperProps ?? {
    onStepChange: () => {},
  };

  // Hooks
  const t = useTranslations();

  // Context
  const {
    restaurantsContextData,
    onSetRestaurantsContextData,
    onRestaurantsFormVisible,
  } = useContext(RestaurantsContext);
  const restaurantId = restaurantsContextData?.restaurant?._id?.code || '';

  // Hooks
  const { showToast } = useToast();

  const { data, loading } = useQuery(GET_RESTAURANT_PROFILE, {
    variables: { id: restaurantId },
  });

  //for conversion from ["HH","MM"] to 'HH:MM' format
  const openingTimes: ITimingForm[] =
    data?.restaurant?.openingTimes?.map((opening: ITimingResponseGQL) => {
      const times = opening?.times?.map((timing: ITimeSlotResponseGQL) => {
        const formatTime = (time: string[]) =>
          `${time[0].padStart(2, '0')}:${time[1].padStart(2, '0')}`;

        return {
          startTime: formatTime(timing.startTime),
          endTime: formatTime(timing.endTime),
        };
      });

      return {
        day: opening.day as TWeekDays,
        times,
      };
    }) ?? [];

  // Always render the complete week. Previously, a response containing only
  // Monday replaced the whole form, which made the other six days disappear.
  const initialValues: ITimingForm[] = TIMING_INITIAL_VALUE.map(({ day }) => {
    const savedDay = openingTimes.find((opening) => opening.day === day);
    return savedDay ?? { day, times: [] };
  });

  const [mutate, { loading: mutationLoading }] = useMutation(UPDATE_TIMINGS);

  // Form Submission
  const handleSubmit = (values: ITimingForm[]) => {
    //conversion from 'HH:MM' to ["HH","MM"]
    const formattedData = [...values]?.map((v) => {
      const tempTime = [...v.times];
      const formattedTime = tempTime?.map((time) => {
        return {
          startTime: time.startTime?.split(':'),
          endTime: time.endTime?.split(':'),
        };
      });
      return {
        ...v,
        times: formattedTime,
      };
    });

    mutate({
      variables: {
        id: restaurantId,
        openingTimes: formattedData,
      },
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Add Timings'),
          message: t('Timings have been added successfully'),
          duration: 3000,
        });

        onStepChange(0);
        onSetRestaurantsContextData({} as IRestaurantsContextPropData);
        onRestaurantsFormVisible(false);
      },
      onError: (error) => {
        let message = '';
        try {
          message = error.graphQLErrors[0]?.message;
        } catch (err) {
          message = t('ActionFailedTryAgain');
        }
        showToast({
          type: 'error',
          title: t('Error'),
          message,
          duration: 3000,
        });
      },
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded dark:bg-dark-950 dark:text-white">
      <div className="mb-3 flex flex-col">
        <span className="text-lg font-semibold text-slate-900 dark:text-white">{t('Store Timing')}</span>
        <span className="mt-1 text-sm text-slate-500">{t('Set opening hours for each day of the week')}</span>
      </div> 
      <Formik
        initialValues={initialValues}
        validationSchema={TimingSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, setFieldValue }) => (
          <Form className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{t('Weekly schedule')}</p>
                <p className="text-xs text-slate-500">{t('Copy Monday hours to quickly fill the complete week')}</p>
              </div>
              <button
                type="button"
                disabled={!values[0]?.times?.length}
                onClick={() => {
                  const mondayTimes = values[0].times.map((slot) => ({ ...slot }));
                  values.forEach((_, index) => {
                    if (index > 0) setFieldValue(`${index}.times`, mondayTimes.map((slot) => ({ ...slot })));
                  });
                }}
                className="h-9 rounded-lg border border-primary-color bg-white px-4 text-sm font-semibold text-primary-color disabled:cursor-not-allowed disabled:opacity-40 dark:bg-dark-900"
              >
                {t('Copy Monday to all')}
              </button>
            </div>
            {values?.map((value, dayIndex) => {
              return (
                <div key={dayIndex} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-900 md:grid-cols-[120px_minmax(0,1fr)_110px]">
                  {/* left side */}
                  <div className="flex items-center gap-3 self-start pt-2">
                    <Toggle
                      onClick={() => {
                        const newTimes =
                          value?.times?.length > 0
                            ? []
                            : [
                                {
                                  startTime: '00:00',
                                  endTime: '23:59',
                                },
                              ];
                        setFieldValue(`${dayIndex}.times`, newTimes);
                      }}
                      checked={value?.times?.length > 0}
                    />
                    <span className="w-10 text-sm font-semibold text-slate-700 dark:text-slate-200">{value.day}</span>
                  </div>

                  {/* center */}
                  {value?.times?.length > 0 ? (
                    <div className="flex min-w-0 flex-col gap-3">
                      {value?.times?.map((time: ITimeSlot, timeIndex) => {
                        return (
                          <div
                            key={timeIndex}
                            className="flex flex-wrap items-start gap-3"
                          >
                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                              <div className="max-w-4min-w-44 relative flex w-full min-w-44 flex-col">
                                <CustomTimeInput
                                  name={`${dayIndex}.times[${timeIndex}].startTime`}
                                  showLabel={false}
                                  value={time.startTime}
                                  onChange={(value: string) => {
                                    setFieldValue(
                                      `${dayIndex}.times[${timeIndex}].startTime`,
                                      value
                                    );
                                  }}
                                  isLoading={loading}
                                  placeholder={t('Start Time')}
                                  style={{
                                    borderColor:
                                      (
                                        errors?.[dayIndex]?.times?.[
                                          timeIndex
                                        ] as FormikErrors<ITimeSlot>
                                      )?.startTime &&
                                      touched?.[dayIndex]?.times?.[timeIndex]
                                        ?.startTime
                                        ? 'red'
                                        : '',
                                  }}
                                />
                                <ErrorMessage
                                  name={`${dayIndex}.times[${timeIndex}].startTime`}
                                >
                                  {(msg) => (
                                    <div className="absolute bottom-[-15px] ml-1 text-[10px] text-red-500">
                                      {msg}
                                    </div>
                                  )}
                                </ErrorMessage>
                              </div>

                              <span className="self-center text-xs text-slate-400">to</span>

                              <div className="max-w-4min-w-44 relative flex w-full min-w-44 flex-col">
                                <CustomTimeInput
                                  name={`${dayIndex}.times[${timeIndex}].endTime`}
                                  showLabel={false}
                                  value={time.endTime}
                                  onChange={(value: string) => {
                                    setFieldValue(
                                      `${dayIndex}.times[${timeIndex}].endTime`,
                                      value
                                    );
                                  }}
                                  isLoading={loading}
                                  placeholder={t('End Time')}
                                  style={{
                                    borderColor:
                                      (
                                        errors?.[dayIndex]?.times?.[
                                          timeIndex
                                        ] as FormikErrors<ITimeSlot>
                                      )?.endTime &&
                                      touched?.[dayIndex]?.times?.[timeIndex]
                                        ?.endTime
                                        ? 'red'
                                        : '',
                                  }}
                                />
                                <ErrorMessage
                                  name={`${dayIndex}.times[${timeIndex}].endTime`}
                                >
                                  {(msg) => (
                                    <div className="absolute bottom-[-15px] text-[10px] text-red-500">
                                      {msg}
                                    </div>
                                  )}
                                </ErrorMessage>
                              </div>
                            </div>

                            {/* right side */}
                            {timeIndex > 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const prev = [...values[dayIndex].times];
                                  prev.splice(timeIndex, 1);
                                  setFieldValue(`${dayIndex}.times`, prev);
                                }}
                                className="mt-2 flex h-6 w-6 select-none items-center justify-center rounded-full border border-red-500 text-red-500 hover:cursor-pointer hover:bg-red-400 hover:text-white"
                              >
                                -
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  const prev = [...values[dayIndex].times];
                                  prev.push({ startTime: null, endTime: null });
                                  setFieldValue(`${dayIndex}.times`, prev);
                                }}
                                type="button"
                                className="mt-2 flex h-6 w-6 select-none items-center justify-center rounded-full border border-primary-color text-primary-color hover:cursor-pointer hover:bg-secondary-color hover:text-white"
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-10 flex-1 items-center justify-start">
                      <span className="select-none rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-dark-950">
                        {t('Closed all Day')}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!value.times.length}
                    onClick={() => {
                      const copiedTimes = value.times.map((slot) => ({ ...slot }));
                      values.forEach((_, index) => {
                        if (index !== dayIndex) setFieldValue(`${index}.times`, copiedTimes.map((slot) => ({ ...slot })));
                      });
                    }}
                    className="h-9 self-start rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-dark-600 dark:text-slate-300 dark:hover:bg-dark-950"
                  >
                    {t('Copy to all')}
                  </button>
                </div>
              );
            })}

            <div className="mt-3 flex justify-end border-t border-slate-200 pt-5 dark:border-dark-600">
              <CustomButton
              className="flex h-11 rounded-md border border-primary-color bg-primary-color px-10 text-white"
              label={t('Save')}
              rounded={false}
              disabled={loading}
              type="submit"
              loading={mutationLoading}
            />
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default RestaurantTiming;
