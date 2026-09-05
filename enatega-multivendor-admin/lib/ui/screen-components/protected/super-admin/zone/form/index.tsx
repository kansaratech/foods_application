// Core
import { Form, Formik, FormikHelpers } from 'formik';

// Prime React
import { Sidebar } from 'primereact/sidebar';

// Interface and Types
import {
  IQueryResult,
  IZoneAddFormComponentProps,
} from '@/lib/utils/interfaces';
import { IRiderZonesResponse } from '@/lib/utils/interfaces';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomTextField from '@/lib/ui/useable-components/input-field';
// Utilities and Constants
import { ZoneErrors } from '@/lib/utils/constants';
import { onErrorMessageMatcher } from '@/lib/utils/methods/error';
import { ZoneSchema } from '@/lib/utils/schema';

//Toast
import useToast from '@/lib/hooks/useToast';

//GraphQL
import { CREATE_ZONE, EDIT_ZONE, GET_ZONES } from '@/lib/api/graphql';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { ApolloError, useMutation } from '@apollo/client';
import { IZoneForm } from '@/lib/utils/interfaces/forms/zone.form.interface';
import CustomTextAreaField from '@/lib/ui/useable-components/custom-text-area-field';
import CustomGoogleMapsLocationZoneBounds from '@/lib/ui/useable-components/google-maps/location-bounds-zone';
import { TPolygonPoints } from '@/lib/utils/types';
import { useTranslations } from 'next-intl';
import { GoogleMapsContext } from '@/lib/context/global/google-maps.context';
import { ChangeEvent, useContext } from 'react';

const DESCRIPTION_MAX_LENGTH = 100;

export default function ZoneAddForm({
  onHide,
  zone,
  position = 'right',
  isAddZoneVisible,
}: IZoneAddFormComponentProps) {
  // State
  const initialValues: IZoneForm = {
    _id: zone?._id ?? '',
    title: zone?.title || '',
    description: zone?.description || '',
    coordinates: zone?.location?.coordinates ?? [[[]]],
  };

  // Hooks
  const t = useTranslations();
  const { showToast } = useToast();

  // Context
  const { isLoaded } = useContext(GoogleMapsContext);

  // Query
  const { data } = useQueryGQL(GET_ZONES, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<IRiderZonesResponse | undefined, undefined>;

  // Mutation
  const [createZone, { loading: mutationLoading }] = useMutation(
    zone ? EDIT_ZONE : CREATE_ZONE,
    {
      refetchQueries: 'active',
      awaitRefetchQueries: true,
    }
  );

  // Form Submission
  const handleSubmit = (
    values: IZoneForm,
    { resetForm }: FormikHelpers<IZoneForm>
  ) => {
    if (values.coordinates[0].length < 2) {
      return showToast({
        type: 'error',
        title: 'Zone not selected',
        message: 'Please provide a valid zone',
      });
    }
    if (data) {
      createZone({
        variables: {
          zone: {
            _id: zone ? zone._id : '',
            title: values.title,
            description: values.description,
            coordinates:
              Array.isArray(values.coordinates) &&
              Array.isArray(values.coordinates[0]) &&
              Array.isArray(values.coordinates[0][0]) &&
              values.coordinates[0][0].length > 1
                ? values.coordinates
                : [[[0, 0]]],
          },
        },
        onCompleted: () => {
          showToast({
            type: 'success',
            title: `${zone ? t('Edit') : t('New')} ${t('Zone')}`,
            message: `${t('Zone has been')} ${zone ? t('updated') : t('added')} ${t('successfully')}`,
          });
          resetForm();
          onHide();
        },
        onError: ({ graphQLErrors, networkError }: ApolloError) => {
          const message =
            graphQLErrors[0]?.message ??
            networkError?.message ??
            t('Something went wrong, Please try again');

          showToast({
            type: 'error',
            title: `${zone ? t('Edit') : t('New')} ${t('Zone')}`,
            message,
          });
        },
      });
    }
  };




  return (
    <Sidebar
      visible={isAddZoneVisible}
      position={position}
      onHide={onHide}
      className="w-full dark:border-dark-600 dark:bg-dark-950 dark:text-white"
    >
      <div className="min-h-full w-full bg-slate-50 px-4 py-5 dark:bg-dark-950 sm:px-6 lg:px-10">
        <div className="mx-auto h-full w-full max-w-[1220px]">
          <div className="flex flex-col gap-2">
            <div className="mb-3 flex flex-col">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {zone ? t('Edit') : t('Add')} {t('Zone')}
              </span>
              <span className="mt-1 text-sm text-slate-500">
                {t('Define the service area by searching a location and adjusting its boundary')}
              </span>
            </div>

            <div>
              <Formik
                initialValues={initialValues}
                validationSchema={ZoneSchema}
                onSubmit={handleSubmit}
                enableReinitialize
                validateOnChange={false}
              >
                {({
                  values,
                  errors,
                  handleChange,
                  handleSubmit,
                  setFieldValue,
                }) => {
                  const handleDescriptionChange = (
                    event: ChangeEvent<HTMLTextAreaElement>
                  ) => {
                    const { value } = event.target;
                    if (value.length > DESCRIPTION_MAX_LENGTH) {
                      showToast({
                        type: 'error',
                        title: t('Description'),
                        message: t('Character limit of max length 100'),
                      });
                      setFieldValue(
                        'description',
                        value.slice(0, DESCRIPTION_MAX_LENGTH)
                      );
                      return;
                    }
                    handleChange(event);
                  };

                  return (
                    <Form onSubmit={handleSubmit} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-900">
                      <div className="grid grid-cols-1 gap-4 border-b border-slate-200 p-4 dark:border-dark-600 sm:p-6 md:grid-cols-2">
                        <div>
                          <CustomTextField
                            type="text"
                            name="title"
                            placeholder={t('Title')}
                            maxLength={35}
                            value={values.title}
                            onChange={handleChange}
                            showLabel={true}
                            style={{
                              borderColor: onErrorMessageMatcher(
                                'title',
                                errors?.title,
                                ZoneErrors
                              )
                                ? 'red'
                                : '',
                            }}
                          />
                        </div>
                        <div>
                          <CustomTextAreaField
                            name="description"
                            placeholder={t('Description')}
                            value={values.description}
                            onChange={handleDescriptionChange}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            showLabel={true}
                            style={{
                              borderColor: onErrorMessageMatcher(
                                'description',
                                errors?.description,
                                ZoneErrors
                              )
                                ? 'red'
                                : '',
                            }}
                          />
                        </div>
                      </div>

                      <div className="p-4 sm:p-6">
                        <div className="mb-3">
                          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('Service area')}</h2>
                          <p className="mt-1 text-sm text-slate-500">{t('Drag the polygon points on the map to fine-tune the boundary')}</p>
                        </div>
                        {isLoaded && (
                          <CustomGoogleMapsLocationZoneBounds
                            key={values?._id}
                            _id={values?._id ?? ''}
                            _path={values?.coordinates}
                            onSetZoneCoordinates={(path: TPolygonPoints) =>
                              setFieldValue('coordinates', path)
                            }
                          />
                        )}
                        {!isLoaded && (
                          <div className="grid h-[480px] place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-dark-600 dark:bg-dark-950">
                            {t('Loading map')}
                          </div>
                        )}

                        <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-dark-600">
                          <button type="button" onClick={onHide} className="h-10 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-dark-600 dark:bg-dark-900 dark:text-white">
                            {t('Cancel')}
                          </button>
                          <CustomButton
                            className="h-10 w-fit border border-primary-color bg-primary-color px-8 text-white"
                            label={zone ? t('Update zone') : t('Create zone')}
                            type="submit"
                            loading={mutationLoading}
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
    </Sidebar>
  );
}
