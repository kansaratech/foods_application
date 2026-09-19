// import { createBanner, editBanner } from '@/lib/api/graphql/mutation/banners';
import {
  CREATE_BANNER,
  EDIT_BANNER,
  GET_RESTAURANTS_DROPDOWN,
} from '@/lib/api/graphql';
import { GET_BANNERS } from '@/lib/api/graphql/queries/banners';
import { GET_COUPONS } from '@/lib/api/graphql/queries/coupons';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import useToast from '@/lib/hooks/useToast';
// import useToast from '@/lib/hooks/useToast';
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import ImageUploadCard from '@/lib/ui/useable-components/image-upload-card';
import CustomDateInput from '@/lib/ui/useable-components/date-input';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import {
  ACTION_TYPES,
  BannersErrors,
  PLACEMENT_OPTIONS,
  SCREEN_NAMES,
} from '@/lib/utils/constants';
import { IQueryResult, IRestaurantResponse } from '@/lib/utils/interfaces';
import { IBannersResponse } from '@/lib/utils/interfaces/banner.interface';
import { IBannersForm } from '@/lib/utils/interfaces/forms/banners.form.interface';
import { onErrorMessageMatcher } from '@/lib/utils/methods';
import { getLabelByCode } from '@/lib/utils/methods/label-by-code';
import { BannerSchema } from '@/lib/utils/schema/banner';
import { useMutation } from '@apollo/client';
import { Form, Formik, FormikHelpers } from 'formik';
import { useTranslations } from 'next-intl';
import './banner-editor.css';
import { useMemo } from 'react';

const BannersAddForm = ({
  onHide,
  banner,
}: {
  banner: IBannersResponse | null;
  onHide: () => void;
}) => {
  // Queries
  const { data } = useQueryGQL(GET_RESTAURANTS_DROPDOWN, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<
    { restaurants?: Pick<IRestaurantResponse, '_id' | 'name'>[] } | undefined,
    undefined
  >;
  // A banner's coupon code has to be a REAL, enabled coupon — a free-typed
  // code that doesn't exist in the Coupon table just silently never applies
  // at checkout (#118). Sourcing options from the same Coupons screen data
  // makes that impossible instead of relying on the admin typing it exactly right.
  const { data: couponsData } = useQueryGQL(GET_COUPONS, {
    fetchPolicy: 'cache-and-network',
  }) as IQueryResult<
    { coupons?: { _id: string; title: string; enabled?: boolean | null }[] } | undefined,
    undefined
  >;

  // Hooks
  const t = useTranslations();

  const RESTAURANT_NAMES = useMemo(() => {
    return (
      data?.restaurants?.map((v) => ({
        label: v.name,
        code: v._id,
      })) ?? []
    ); // Using nullish coalescing operator
  }, [data]);

  const COUPON_OPTIONS = useMemo(() => {
    return (
      couponsData?.coupons
        ?.filter((c) => c.enabled !== false)
        .map((c) => ({ label: c.title, code: c.title })) ?? []
    );
  }, [couponsData]);

  //State
  const initialValues: IBannersForm = {
    title: banner?.title || '',
    description: banner?.description || '',
    action: banner
      ? {
          label: getLabelByCode(ACTION_TYPES, banner.action),
          code: banner.action,
        }
      : null,
    screen: banner
      ? banner.action === 'Navigate Specific Page'
        ? {
            label: getLabelByCode(SCREEN_NAMES, banner.screen),
            code: banner.screen,
          }
        : banner.action === 'Navigate Specific Restaurant'
          ? {
              label: banner.screen,
              code: banner.screen,
            }
          : null
      : null,
    file: banner?.file || '',
    placement: banner?.placement
      ? {
          label: getLabelByCode(PLACEMENT_OPTIONS, banner.placement),
          code: banner.placement,
        }
      : PLACEMENT_OPTIONS[0],
    priority: banner?.priority ?? 0,
    couponCode: banner?.couponCode
      ? { label: banner.couponCode, code: banner.couponCode }
      : null,
    startDate: banner?.startDate ? banner.startDate.split('T')[0] : '',
    endDate: banner?.endDate ? banner.endDate.split('T')[0] : '',
    isActive: banner?.isActive ?? true,
  };

  // Hooks
  const { showToast } = useToast();

  const mutation = banner ? EDIT_BANNER : CREATE_BANNER;
  const [mutate, { loading: mutationLoading }] = useMutation(mutation, {
    refetchQueries: [{ query: GET_BANNERS }],
  });

  // Form Submission
  const handleSubmit = (
    values: IBannersForm,
    { resetForm }: FormikHelpers<IBannersForm>
  ) => {
    return mutate({
      variables: {
        bannerInput: {
          _id: banner ? banner._id : '',
          title: values.title,
          description: values.description,
          file: values.file,
          action: values.action?.code,
          screen: values.screen?.code,
          placement: values.placement?.code ?? 'HOME',
          priority: Number(values.priority) || 0,
          couponCode: values.couponCode?.code || null,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          isActive: values.isActive,
        },
      },
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Success'),
          message: banner ? t('Banner updated') : t('Banner added'),
          duration: 3000,
        });
        resetForm();
        onHide();
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
    <Formik
      initialValues={initialValues}
      validationSchema={BannerSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnChange={false} // Disable validation on change
      validateOnBlur={false} // Disable validation on blur
    >
      {({ values, errors, handleChange, handleSubmit, setFieldValue }) => {
        return (
          <Form onSubmit={handleSubmit} className="banner-editor">
            <div className="banner-editor-grid">
              <div className="banner-editor-fields">
                <section className="banner-editor-card">
                  <h2>Banner details</h2>
                  <p className="banner-editor-hint">
                    Add the title and description customers will see.
                  </p>
                  <div className="banner-editor-pair">
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
                            BannersErrors
                          )
                            ? 'red'
                            : '',
                        }}
                      />
                    </div>
                    <div>
                      <CustomTextField
                        type="text"
                        name="description"
                        placeholder={t('Description')}
                        maxLength={35}
                        value={values.description}
                        onChange={handleChange}
                        showLabel={true}
                        style={{
                          borderColor: onErrorMessageMatcher(
                            'description',
                            errors?.description,
                            BannersErrors
                          )
                            ? 'red'
                            : '',
                        }}
                      />
                    </div>
                  </div>
                </section>
                <section className="banner-editor-card">
                  <h2>Destination</h2>
                  <p className="banner-editor-hint">
                    Choose where the banner appears and where a tap takes
                    customers.
                  </p>
                  <div className="banner-editor-pair">
                    <div>
                      <CustomDropdownComponent
                        placeholder={t('Actions')}
                        options={ACTION_TYPES}
                        showLabel={true}
                        name="action"
                        filter={false}
                        selectedItem={values.action}
                        setSelectedItem={(name, value) => {
                          setFieldValue(name, value);
                          setFieldValue('screen', null);
                        }}
                        style={{
                          borderColor: onErrorMessageMatcher(
                            'action',
                            errors?.action,
                            BannersErrors
                          )
                            ? 'red'
                            : '',
                        }}
                      />
                    </div>

                    <div>
                      <CustomDropdownComponent
                        placeholder={t('Screen')}
                        options={
                          values.action?.code === 'Navigate Specific Restaurant'
                            ? RESTAURANT_NAMES
                            : values.action?.code === 'Navigate Specific Page'
                              ? SCREEN_NAMES
                              : []
                        }
                        showLabel={true}
                        name="screen"
                        // loading={loading}
                        selectedItem={values.screen}
                        setSelectedItem={setFieldValue}
                        style={{
                          borderColor: onErrorMessageMatcher(
                            'screen',
                            errors?.screen,
                            BannersErrors
                          )
                            ? 'red'
                            : '',
                        }}
                      />
                    </div>

                    <div>
                      <CustomDropdownComponent
                        placeholder={t('Placement')}
                        options={PLACEMENT_OPTIONS}
                        showLabel={true}
                        name="placement"
                        filter={false}
                        selectedItem={values.placement}
                        setSelectedItem={setFieldValue}
                        style={{
                          borderColor: onErrorMessageMatcher(
                            'placement',
                            errors?.placement,
                            BannersErrors
                          )
                            ? 'red'
                            : '',
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>
              <aside className="banner-editor-card banner-editor-media">
                <h2>Banner media</h2>
                <p className="banner-editor-hint">
                  Upload an image or video for your promotion.
                </p>
                <ImageUploadCard
                  label={t('Upload file')}
                  helperText="JPG, PNG, WebP, GIF, MP4 or WebM."
                  required
                  aspect="landscape"
                  value={values.file}
                  acceptedTypes={[
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/webp',
                    'image/gif',
                    'video/mp4',
                    'video/webm',
                  ]}
                  maxSizeBytes={50 * 1024 * 1024}
                  onUploaded={(url) => setFieldValue('file', url)}
                />
                {errors.file && (
                  <p role="alert" className="mt-2 text-xs text-red-500">
                    {errors.file}
                  </p>
                )}
              </aside>
              <section className="banner-editor-card banner-editor-schedule">
                <h2>Publishing &amp; schedule</h2>
                <p className="banner-editor-hint">
                  Control availability and display order. Leave dates empty to
                  run without a schedule.
                </p>
                <div className="banner-editor-pair">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <CustomTextField
                        type="number"
                        name="priority"
                        placeholder={t('Priority')}
                        value={String(values.priority)}
                        onChange={handleChange}
                        showLabel={true}
                      />
                    </div>
                    <CustomInputSwitch
                      label={t('Active')}
                      isActive={values.isActive}
                      className="mb-3 text-sm"
                      onChange={(e) =>
                        setFieldValue('isActive', e.target.checked)
                      }
                    />
                  </div>

                  <div>
                    <CustomDateInput
                      name="startDate"
                      placeholder={t('Start Date')}
                      value={values.startDate}
                      onChange={(value) => setFieldValue('startDate', value)}
                      showLabel={true}
                    />
                  </div>

                  <div>
                    <CustomDateInput
                      name="endDate"
                      minDate={values.startDate}
                      placeholder={t('End Date')}
                      value={values.endDate}
                      onChange={(value) => setFieldValue('endDate', value)}
                      showLabel={true}
                      error={errors.endDate}
                    />
                  </div>

                  <div>
                    <CustomDropdownComponent
                      placeholder={t('Coupon Code')}
                      options={COUPON_OPTIONS}
                      showLabel={true}
                      name="couponCode"
                      selectedItem={values.couponCode}
                      setSelectedItem={setFieldValue}
                      style={{
                        borderColor: onErrorMessageMatcher(
                          'couponCode',
                          errors?.couponCode,
                          BannersErrors
                        )
                          ? 'red'
                          : '',
                      }}
                    />
                    {COUPON_OPTIONS.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('No enabled coupons yet — create one in the Coupons screen first.')}
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <div className="banner-editor-footer">
                {Object.keys(errors).length > 0 && (
                  <p role="alert" className="text-sm text-red-500">
                    Please complete all required fields and check that priority
                    is zero or more and the end date is on or after the start
                    date.
                  </p>
                )}
                <CustomButton
                  type="button"
                  label={t('Cancel')}
                  onClick={onHide}
                  disabled={mutationLoading}
                  className="p-button-outlined"
                />
                <CustomButton
                  className="h-10 w-fit border dark:border-dark-600 border-gray-300 bg-black px-8 text-white"
                  label={banner ? t('Update') : t('Add Banner')}
                  type="submit"
                  loading={mutationLoading}
                />
              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default BannersAddForm;
