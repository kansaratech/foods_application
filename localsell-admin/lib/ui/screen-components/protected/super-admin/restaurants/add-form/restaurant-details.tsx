'use client';

import { useState } from 'react';
// Core
import { faCircleInfo, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Tooltip } from 'primereact/tooltip';
import { Form, Formik } from 'formik';
import { useContext, useEffect, useMemo } from 'react';

// Interface and Types
import {
  ICreateRestaurant,
  ICreateRestaurantResponse,
  IDropdownSelectItem,
  IQueryResult,
  IRestaurantsResponseGraphQL,
} from '@/lib/utils/interfaces';

// Component
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomMultiSelectComponent from '@/lib/ui/useable-components/custom-multi-select';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomIconTextField from '@/lib/ui/useable-components/input-icon-field';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import ShopTypesForm from '@/lib/ui/screen-components/protected/super-admin/shop-types/form';
import CuisineForm from '@/lib/ui/screen-components/protected/super-admin/cuisines/form';

// Constants
import { RestaurantErrors } from '@/lib/utils/constants';

// Interface
import { IRestaurantForm } from '@/lib/utils/interfaces';
import { IEditState, IShopType } from '@/lib/utils/interfaces';

// Methods
import { onErrorMessageMatcher, getGraphQLErrorMessage } from '@/lib/utils/methods/error';

// Schemas
import {
  CREATE_RESTAURANT,
  EDIT_RESTAURANT,
  GET_CUISINES,
  GET_RESTAURANT_PROFILE,
  GET_RESTAURANTS,
} from '@/lib/api/graphql';
import { RestaurantsContext } from '@/lib/context/super-admin/restaurants.context';
import { ToastContext } from '@/lib/context/global/toast.context';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import ImageUploadCard from '@/lib/ui/useable-components/image-upload-card';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import {
  ICuisine,
  IGetCuisinesData,
} from '@/lib/utils/interfaces/cuisine.interface';
import { IRestaurantsAddRestaurantComponentProps } from '@/lib/utils/interfaces/restaurants.interface';
import { toTextCase } from '@/lib/utils/methods';
import { makeRestaurantSchema } from '@/lib/utils/schema/restaurant';
import {
  ApolloCache,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useTranslations } from 'next-intl';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
import { useShopTypes } from '@/lib/hooks/useShopType';
import { useConfiguration } from '@/lib/hooks/useConfiguration';

// A store's GST status defaults to the owning vendor's KYC declaration
// (server-side, when left as "Use vendor's default") — set explicitly here
// only for a multi-store vendor whose stores hold different GSTINs, e.g. one
// per state. See pricing.service.ts on the API for how this drives tax.
const GST_STORE_OPTIONS: IDropdownSelectItem[] = [
  { code: '', label: "Use vendor's default" },
  { code: 'UNREGISTERED', label: 'Not GST registered' },
  { code: 'REGULAR', label: 'GST Regular' },
  { code: 'COMPOSITION', label: 'GST Composition scheme' },
];

const initialValues: IRestaurantForm = {
  name: '',
  username: '',
  password: '',
  phoneNumber: '',
  confirmPassword: '',
  address: '',
  deliveryTime: 1,
  minOrder: 1,
  salesTax: 0.0,
  gstRegistrationType: GST_STORE_OPTIONS[0],
  gstin: '',
  // Null = platform default (Configuration.defaultCommissionRate) shown as
  // the field's placeholder; set explicitly here to override for this store.
  commissionRate: null,
  shopType: null,
  cuisines: [],
  image:
    'https://t4.ftcdn.net/jpg/04/76/57/27/240_F_476572792_zMwqHpmGal1fzh0tDJ3onkLo88IjgNbL.jpg',
  // No placeholder here (unlike `image` above) — `logo` is `required()` in
  // RestaurantSchema, and a truthy default silently satisfied that check
  // without a real upload ever happening (#69). Matches the vendor-side form.
  logo: '',
};

export default function RestaurantDetailsForm({
  stepperProps,
}: IRestaurantsAddRestaurantComponentProps) {
  // Hooks
  const t = useTranslations();
  const { DEFAULT_COMMISSION_RATE } = useConfiguration();
  const [isAddShopTypeVisible, setIsAddShopTypeVisible] = useState(false);
  const [isEditShopType, setIsEditShopType] = useState<IEditState<IShopType>>({
    bool: false,
    data: {
      __typename: '',
      _id: '',
      name: '',
      isActive: true,
      image: '',
    },
  });
  const [isAddCuisineVisible, setIsAddCuisineVisible] = useState(false);
  const [isEditCuisine, setIsEditCuisine] = useState<IEditState<ICuisine>>({
    bool: false,
    data: {
      _id: '',
      description: '',
      image: '',
      name: '',
      shopType: '',
      __typename: '',
    },
  });

  // Props
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => {},
    type: '',
    order: -1,
  };
  // Context
  const { showToast } = useContext(ToastContext);
  const { restaurantsContextData, onSetRestaurantsContextData } =
    useContext(RestaurantsContext);

  // A store id already sitting in context before this step even submits
  // means we're editing an existing store (either opened via "Edit", or the
  // admin hit Back after already creating one earlier in this session) —
  // not creating a new one.
  const editingRestaurantId = restaurantsContextData?.restaurant?._id?.code;
  const isEditingExisting = !!editingRestaurantId;

  // API
  const { data: editingProfileData, loading: editingProfileLoading } = useQuery(GET_RESTAURANT_PROFILE, {
    variables: { id: editingRestaurantId ?? '' },
    skip: !isEditingExisting,
    fetchPolicy: 'network-only',
  });
  const editingProfile = editingProfileData?.restaurant;

  // Mutation
  const [createRestaurant] = useMutation(CREATE_RESTAURANT, {
    onCompleted: ({
      createRestaurant,
    }: {
      createRestaurant?: ICreateRestaurant;
    }) => {
      showToast({
        type: 'success',
        title: t('New Store'),
        message: t(`Store has been added successfully`),
        duration: 3000,
      });

      onSetRestaurantsContextData({
        ...restaurantsContextData,
        restaurant: {
          ...restaurantsContextData?.restaurant,
          _id: {
            label: createRestaurant?.username ?? '',
            code: createRestaurant?._id ?? '',
          },
        },
      });

      onStepChange(order + 1);
    },
    update: update,
  });

  const [editRestaurant] = useMutation(EDIT_RESTAURANT, {
    onCompleted: () => {
      showToast({
        type: 'success',
        title: t('Store'),
        message: t('Store details updated successfully'),
        duration: 3000,
      });
      onStepChange(order + 1);
    },
  });

  const cuisineResponse = useQueryGQL(GET_CUISINES, {
    debounceMs: 300,
  }) as IQueryResult<IGetCuisinesData | undefined, undefined>;
  cuisineResponse.data?.cuisines;

  const { dropdownList, loading } = useShopTypes({
    invoke_now: true,
    transform_to_dropdown_list: true,
  });

  // Memoized Constants
  const cuisinesDropdown = useMemo(
    () =>
      cuisineResponse.data?.cuisines?.map((cuisin: ICuisine) => {
        return { label: toTextCase(cuisin.name, 'title'), code: cuisin.name };
      }),
    [cuisineResponse.data?.cuisines]
  );

  // Resolves the existing store's shopType/cuisines against the live option
  // lists exactly once per store being edited — deliberately NOT on every
  // dropdownList/cuisinesDropdown reference change. Those lists refetch
  // whenever the inline "+ Add Shop Category" / "+ Add Product Type" modals
  // (below) create a new option, and since this form's Formik uses
  // enableReinitialize, letting formInitialValues recompute on every such
  // refetch would silently wipe out whatever the admin had just selected —
  // exactly the "I picked a product type, saved, and it's gone" bug.
  const [resolvedEditDefaults, setResolvedEditDefaults] = useState<{
    profileId: string;
    shopType: IDropdownSelectItem | null;
    cuisines: IDropdownSelectItem[];
  } | null>(null);

  useEffect(() => {
    if (!isEditingExisting || !editingProfile) return;
    if (loading || cuisineResponse.loading) return; // wait for both option lists to finish loading at least once
    if (resolvedEditDefaults?.profileId === editingProfile._id) return; // already resolved for this store

    const matchedShopType = (dropdownList || []).find((o) => o.code === editingProfile.shopTypeId) ?? null;
    const cuisineOptions: IDropdownSelectItem[] = cuisinesDropdown ?? [];
    const matchedCuisines: IDropdownSelectItem[] = [];
    (editingProfile.cuisines ?? []).forEach((name: string) => {
      const match = cuisineOptions.find((c) => c.code === name);
      if (match) matchedCuisines.push(match);
    });
    setResolvedEditDefaults({ profileId: editingProfile._id, shopType: matchedShopType, cuisines: matchedCuisines });
  }, [isEditingExisting, editingProfile, loading, cuisineResponse.loading, dropdownList, cuisinesDropdown, resolvedEditDefaults]);

  const formInitialValues = useMemo<IRestaurantForm>(() => {
    if (!isEditingExisting || !editingProfile) return initialValues;
    const resolved = resolvedEditDefaults?.profileId === editingProfile._id ? resolvedEditDefaults : null;
    return {
      name: editingProfile.name ?? '',
      username: editingProfile.username ?? '',
      password: '',
      confirmPassword: '',
      phoneNumber: editingProfile.phone ?? '',
      address: editingProfile.address ?? '',
      deliveryTime: editingProfile.deliveryTime ?? 1,
      minOrder: editingProfile.minimumOrder ?? 1,
      salesTax: editingProfile.tax ?? 0,
      gstRegistrationType:
        GST_STORE_OPTIONS.find((o) => o.code === editingProfile.gstRegistrationType) ?? GST_STORE_OPTIONS[0],
      gstin: editingProfile.gstin ?? '',
      commissionRate: editingProfile.commissionRate ?? null,
      shopType: resolved?.shopType ?? null,
      cuisines: resolved?.cuisines ?? [],
      image: editingProfile.image ?? initialValues.image,
      logo: editingProfile.logo ?? initialValues.logo,
    };
  }, [isEditingExisting, editingProfile, resolvedEditDefaults]);

  // Handlers
  const onCreateRestaurant = async (data: IRestaurantForm) => {
    try {
      // A vendor may legitimately run several branches under the same name
      // (e.g. "Jamu Himachal Dhaba" — Sector 4, Sector 9, ...) — store slugs
      // already get a unique suffix, so two stores sharing a name never
      // collide anywhere it'd actually matter. No uniqueness check here.

      if (isEditingExisting) {
        await editRestaurant({
          variables: {
            restaurantInput: {
              _id: editingRestaurantId,
              name: data.name,
              address: data.address,
              phone: data.phoneNumber,
              image: data.image,
              logo: data.logo,
              deliveryTime: data.deliveryTime,
              minimumOrder: data.minOrder,
              username: data.username,
              // Blank means "leave it as is" — the API only hashes/updates
              // the password when one is actually provided.
              ...(data.password ? { password: data.password } : {}),
              shopType: data.shopType?.code,
              salesTax: data.salesTax,
              gstRegistrationType: data.gstRegistrationType?.code || undefined,
              gstin: data.gstRegistrationType?.code ? data.gstin : undefined,
              commissionRate: data.commissionRate ?? undefined,
              cuisines: data.cuisines.map(
                (cuisin: IDropdownSelectItem) => cuisin.code
              ),
            },
          },
        });
        return;
      }

      const vendorId = restaurantsContextData?.vendor?._id?.code;
      if (!vendorId) {
        showToast({
          type: 'error',
          title: t('Create Store'),
          message: t('Store Creation Failed - Please select a vendor'),
          duration: 2500,
        });
        return;
      }

      await createRestaurant({
        variables: {
          owner: vendorId,
          restaurant: {
            name: data.name,
            address: data.address,
            phone: data.phoneNumber,
            image: data.image,
            logo: data.logo,
            deliveryTime: data.deliveryTime,
            minimumOrder: data.minOrder,
            username: data.username,
            password: data.password,
            shopType: data.shopType?.code,
            salesTax: data.salesTax,
            gstRegistrationType: data.gstRegistrationType?.code || undefined,
            gstin: data.gstRegistrationType?.code ? data.gstin : undefined,
            commissionRate: data.commissionRate ?? undefined,
            cuisines: data.cuisines.map(
              (cuisin: IDropdownSelectItem) => cuisin.code
            ),
          },
        },
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: isEditingExisting ? t('Store') : t('New Store'),
        message:
          getGraphQLErrorMessage(error as Error) ??
          (isEditingExisting ? t('Store update failed') : t('Store Creation Failed')),
        duration: 2500,
      });
    }
  };

  function update(
    cache: ApolloCache<unknown>,
    data: ICreateRestaurantResponse
  ): void {
    if (!data) return;

    const restaurantId = restaurantsContextData?.restaurant?._id?.code;

    const cachedData: IRestaurantsResponseGraphQL | null = cache.readQuery({
      query: GET_RESTAURANTS,
    });

    const cachedRestaurants = cachedData?.restaurants?.data ?? [];

    cache.writeQuery({
      query: GET_RESTAURANTS,
      variables: { id: restaurantId },
      data: {
        restaurants: [...(cachedRestaurants ?? []), createRestaurant],
      },
    });
  }

  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

  if (isEditingExisting && editingProfileLoading) {
    return (
      <div className="grid h-40 place-items-center">
        <CustomLoader size="28px" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950">
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          {/* <div className="flex flex-col mb-2">
            <span className="text-lg">Add Restaurant</span>
          </div>
 */}
          <div>
            <Formik
              initialValues={formInitialValues}
              enableReinitialize
              validationSchema={makeRestaurantSchema(!isEditingExisting)}
              onSubmit={async (values) => {
                await onCreateRestaurant(values);
              }}
              validateOnChange={true}
            >
              {({
                touched,
                values,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                setFieldValue,
                validateForm,
                setTouched,
              }) => {
                // `logo`/`image` are required (the logo card even shows a
                // "*") but their upload widgets never set Formik's touched
                // state on their own and neither field ever rendered an
                // inline error — so a store missing one could silently fail
                // this validation with zero visible feedback, or (worse)
                // read as "saved fine" if the click otherwise looked like it
                // did something (Issue 106). Validate explicitly on click so
                // a toast + the fields' own errors always show.
                const onSaveClick = async () => {
                  const formErrors = await validateForm();
                  if (Object.keys(formErrors).length === 0) return;
                  setTouched(
                    Object.keys(formErrors).reduce(
                      (acc, key) => ({ ...acc, [key]: true }),
                      {} as Record<string, boolean>,
                    ),
                  );
                  if (formErrors.logo || formErrors.image) {
                    showToast({
                      title: t('Missing information'),
                      message: t(
                        'Please upload both a store logo and a cover image before saving.',
                      ),
                      type: 'error',
                      duration: 3000,
                    });
                  }
                };
                return (
                  <Form onSubmit={handleSubmit}>
                    <Tooltip target=".field-info-icon" />
                    <div className="mb-3 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-12">
                      <div className="md:col-span-6">
                        <CustomTextField
                          type="text"
                          name="name"
                          placeholder={`${t('Name')} *`}
                          maxLength={35}
                          value={values.name}
                          onChange={handleChange}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'name',
                              errors?.name,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div className="md:col-span-6">
                        <CustomIconTextField
                          type="email"
                          name="username"
                          placeholder={`${t('Email')} *`}
                          maxLength={35}
                          showLabel={true}
                          autoComplete="off"
                          iconProperties={{
                            icon: faEnvelope,
                            position: 'right',
                            style: { marginTop: '1px' },
                          }}
                          value={values.username}
                          onChange={handleChange}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'username',
                              errors?.username,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      {/* Password is only set here on first create. Editing an
                          existing store's password is a separate, deliberate
                          action (store card -> key icon -> Update Password)
                          rather than a field buried in this form, so an admin
                          can't accidentally overwrite a store's login while
                          just touching an unrelated basic-detail field. */}
                      {!isEditingExisting && (
                        <>
                          <div className="md:col-span-6">
                            <CustomPasswordTextField
                              placeholder={`${t('Password')} *`}
                              aria-required={true}
                              name="password"
                              maxLength={20}
                              value={values.password}
                              showLabel={true}
                              autoComplete="new-password"
                              onChange={handleChange}
                              error={touched.password ? errors.password : undefined}
                            />
                          </div>

                          <div className="md:col-span-6">
                            <CustomPasswordTextField
                              placeholder={`${t('Confirm Password')} *`}
                              aria-required={true}
                              name="confirmPassword"
                              maxLength={20}
                              showLabel={true}
                              autoComplete="new-password"
                              value={values.confirmPassword ?? ''}
                              onChange={handleChange}
                              feedback={false}
                              error={touched.confirmPassword ? errors.confirmPassword : undefined}
                            />
                          </div>
                        </>
                      )}

                      <div className="md:col-span-4">
                        <CustomPhoneTextField
                          mask="999-999-9999"
                          name="phoneNumber"
                          showLabel={true}
                          placeholder={`${t('Phone')} *`}
                          defaultCountry="in"
                          onChange={(e) => {
                            setFieldValue('phoneNumber', e);
                          }}
                          value={values.phoneNumber}
                          type="text"
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'phoneNumber',
                              errors?.phoneNumber,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                        {errors.phoneNumber && touched.phoneNumber && (
                          <small className="ml-1 p-error">
                            {errors.phoneNumber}
                          </small>
                        )}
                      </div>

                      <div className="md:col-span-8">
                        <CustomTextField
                          placeholder={`${t('Address')} *`}
                          name="address"
                          type="text"
                          maxLength={100}
                          showLabel={true}
                          value={values.address ?? ''}
                          onChange={handleChange}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'address',
                              errors?.address,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                        {errors.address && touched.address && (
                          <small className="ml-1 p-error">
                            {errors.address}
                          </small>
                        )}
                      </div>

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <CustomNumberField
                          suffix="m"
                          min={1}
                          max={500}
                          placeholder={`${t('Delivery Time')} *`}
                          name="deliveryTime"
                          showLabel={true}
                          value={values.deliveryTime}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'deliveryTime',
                              errors?.deliveryTime,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <CustomNumberField
                          min={1}
                          max={99999}
                          placeholder={`${t('Min Order')} *`}
                          name="minOrder"
                          showLabel={true}
                          value={values.minOrder}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'minOrder',
                              errors?.minOrder,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>
                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <label htmlFor="salesTax" className="text-sm font-medium text-content dark:text-white">
                            {t('Default GST Rate (Regular stores only)')}
                          </label>
                          <FontAwesomeIcon
                            icon={faCircleInfo}
                            className="field-info-icon cursor-help text-xs text-slate-400"
                            data-pr-tooltip={t("restaurant_default_gst_help")}
                            data-pr-position="top"
                          />
                        </div>
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={30}
                          placeholder={t('Default GST Rate (Regular stores only)')}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          name="salesTax"
                          showLabel={false}
                          value={values.salesTax}
                          onChange={setFieldValue}
                          // Always editable: a store set up UNREGISTERED/
                          // COMPOSITION must be able to set its rate in
                          // anticipation of switching to REGULAR once its
                          // GSTIN comes through — see issue #5, the "stuck
                          // store" scenario. It's simply unused unless
                          // gstRegistrationType is REGULAR.
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'salesTax',
                              errors?.salesTax,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <label htmlFor="commissionRate" className="text-sm font-medium text-content dark:text-white">
                            {`${t('Commission Rate')} (${t('default')} ${DEFAULT_COMMISSION_RATE}%)`}
                          </label>
                          <FontAwesomeIcon
                            icon={faCircleInfo}
                            className="field-info-icon cursor-help text-xs text-slate-400"
                            data-pr-tooltip={t('restaurant_commission_rate_help')}
                            data-pr-position="top"
                          />
                        </div>
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={30}
                          placeholder={`${t('Commission Rate')} (${t('default')} ${DEFAULT_COMMISSION_RATE}%)`}
                          minFractionDigits={0}
                          maxFractionDigits={2}
                          name="commissionRate"
                          showLabel={false}
                          value={values.commissionRate ?? undefined}
                          onChange={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'commissionRate',
                              errors?.commissionRate,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      {/* Store-level GST registration override is hidden for now — a
                          store's GST status defaults to the owning vendor's KYC
                          declaration (see makeRestaurantSchema / the resolver), which
                          covers the common case. gstRegistrationType/gstin stay in the
                          form's initial values and submit payload untouched (still
                          "" / GST_STORE_OPTIONS[0] = "use vendor's default") so an
                          existing store that already has a per-store override keeps
                          it; there's just no control here to set one. */}

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <CustomDropdownComponent
                          name="shopType"
                          placeholder={`${t('Shop Category')} *`}
                          selectedItem={values.shopType}
                          setSelectedItem={setFieldValue}
                          loading={loading}
                          options={dropdownList || []}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'shopType',
                              errors?.shopType,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          extraFooterButton={{
                            title: t('Add Shop Category'),
                            onChange: () => setIsAddShopTypeVisible(true),
                          }}
                        />
                      </div>

                      <div className="mt-2 min-w-0 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-9">
                        <CustomMultiSelectComponent
                          name="cuisines"
                          placeholder={`${t('Cuisines')} *`}
                          options={cuisinesDropdown ?? []}
                          selectedItems={values.cuisines}
                          setSelectedItems={setFieldValue}
                          showLabel={true}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'cuisines',
                              errors?.cuisines as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          extraFooterButton={{
                            title: t('Add Cuisine'),
                            onChange: () => setIsAddCuisineVisible(true),
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 bg-slate-50/60 p-4 dark:border-dark-600 dark:bg-dark-900 md:col-span-12 md:grid-cols-2">
                        <ImageUploadCard
                          label={t('Store logo')}
                          helperText={t('JPG, PNG or WebP, up to 2MB — 1:1 ratio recommended')}
                          required
                          aspect="square"
                          value={values.logo}
                          onUploaded={(url) => setFieldValue('logo', url)}
                        />
                        <ImageUploadCard
                          label={t('Cover image')}
                          helperText={t('JPG, PNG or WebP, up to 2MB — 16:9 ratio recommended')}
                          aspect="landscape"
                          value={values.image}
                          onUploaded={(url) => setFieldValue('image', url)}
                        />
                      </div>
                      {(errors.logo || errors.image) && (
                        <div className="flex flex-col gap-1 md:col-span-12">
                          {errors.logo && (
                            <small className="p-error">{errors.logo as string}</small>
                          )}
                          {errors.image && (
                            <small className="p-error">{errors.image as string}</small>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex justify-between border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-12">
                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:hover:bg-dark-600 dark:border-dark-600 bg-white text-slate-700 dark:bg-dark-950 dark:text-white px-8"
                          label={t('Back')}
                          type="button"
                          onClick={() => onStepChange(order - 1)}
                        />

                        <CustomButton
                          className="h-10 w-fit border border-gray-300 dark:hover:bg-dark-600 dark:border-dark-600 bg-primary-color px-8 text-white"
                          label={t('Save & Next')}
                          type="submit"
                          loading={isSubmitting}
                          onClick={(e) => {
                            if (
                              values.password &&
                              !strongPasswordRegex.test(values.password)
                            ) {
                              e.preventDefault();
                              showToast({
                                title: t('Error'),
                                message: t(
                                  'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                                ),
                                type: 'error',
                                duration: 3000,
                              });
                              return;
                            }
                            if (
                              values.password &&
                              values.password !== values.confirmPassword
                            ) {
                              e.preventDefault();
                              showToast({
                                title: t('Error'),
                                message: t('Passwords must match'),
                                type: 'error',
                                duration: 3000,
                              });
                              return;
                            }
                            void onSaveClick();
                          }}
                        />
                      </div>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </div>

          <ShopTypesForm
            visible={isAddShopTypeVisible}
            setVisible={setIsAddShopTypeVisible}
            isEditing={isEditShopType}
            setIsEditing={setIsEditShopType}
          />

          <CuisineForm
            visible={isAddCuisineVisible}
            setVisible={setIsAddCuisineVisible}
            isEditing={isEditCuisine}
            setIsEditing={setIsEditCuisine}
          />
        </div>
      </div>
    </div>
  );
}
