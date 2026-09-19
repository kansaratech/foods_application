// Core
import { useContext, useMemo } from 'react';
import { Form, Formik } from 'formik';
import { ApolloCache, useMutation } from '@apollo/client';
import { useState } from 'react';
// Icons
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { IEditState, IShopType } from '@/lib/utils/interfaces';

// Interfaces and Types
import {
  IAddRestaurantComponentProps,
  ICreateRestaurant,
  ICreateRestaurantResponse,
  IDropdownSelectItem,
  IQueryResult,
  IRestaurantsByOwnerResponseGraphQL,
  IRestaurantForm,
} from '@/lib/utils/interfaces';
import {
  ICuisine,
  IGetCuisinesData,
} from '@/lib/utils/interfaces/cuisine.interface';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomDropdownComponent from '@/lib/ui/useable-components/custom-dropdown';
import CustomMultiSelectComponent from '@/lib/ui/useable-components/custom-multi-select';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomIconTextField from '@/lib/ui/useable-components/input-icon-field';
import CustomPasswordTextField from '@/lib/ui/useable-components/password-input-field';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import CustomUploadImageComponent from '@/lib/ui/useable-components/upload/upload-image';
import ShopTypesForm from '@/lib/ui/screen-components/protected/super-admin/shop-types/form';
import CuisineForm from '@/lib/ui/screen-components/protected/super-admin/cuisines/form';
// Constants and Utils
import {
  MAX_LANSDCAPE_FILE_SIZE,
  MAX_SQUARE_FILE_SIZE,
  RestaurantErrors,
} from '@/lib/utils/constants';
import { onErrorMessageMatcher, getGraphQLErrorMessage } from '@/lib/utils/methods/error';
import { toTextCase } from '@/lib/utils/methods';
import { useShopTypes } from '@/lib/hooks/useShopType';

// Schemas and GraphQL
import { makeRestaurantSchema } from '@/lib/utils/schema/restaurant';
import {
  CREATE_RESTAURANT,
  GET_CUISINES,
  GET_RESTAURANTS_BY_OWNER,
} from '@/lib/api/graphql';

// Contexts
import { ToastContext } from '@/lib/context/global/toast.context';
import { VendorLayoutRestaurantContext } from '@/lib/context/vendor/restaurant.context';

// Hooks
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { useTranslations } from 'next-intl';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
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
  confirmPassword: '',
  phoneNumber: '',
  address: '',
  deliveryTime: 1,
  minOrder: 1,
  salesTax: 0.0,
  gstRegistrationType: GST_STORE_OPTIONS[0],
  gstin: '',
  // Vendors don't set their own commission rate — it's the platform default,
  // shown read-only above (see the "Platform commission" banner in this form).
  commissionRate: null,
  shopType: null,
  cuisines: [],
  image:
    'https://t4.ftcdn.net/jpg/04/76/57/27/240_F_476572792_zMwqHpmGal1fzh0tDJ3onkLo88IjgNbL.jpg',
  // No placeholder here (unlike `image` above) — `logo` is `required()` in
  // RestaurantSchema, and a truthy default silently satisfied that check
  // without the vendor ever uploading a real logo (#69).
  logo: '',
};

export default function RestaurantDetails({
  stepperProps,
}: IAddRestaurantComponentProps) {
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => {},
    type: '',
    order: -1,
  };

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

  // Context
  const { showToast } = useContext(ToastContext);
  const { vendorId, onSetRestaurantContextData } = useContext(
    VendorLayoutRestaurantContext
  );

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

      onSetRestaurantContextData({
        id: createRestaurant?._id ?? '',
      });

      onStepChange(order + 1);
    },
    update: update,
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

  // Handlers
  const onCreateRestaurant = async (data: IRestaurantForm) => {
    try {
      if (!vendorId) {
        showToast({
          type: 'error',
          title: `${vendorId ? t('Edit') : t('Create')} ${t('Vendor')}`,
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
            phone: data.phoneNumber,
            address: data.address,
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
            cuisines: data.cuisines.map(
              (cuisin: IDropdownSelectItem) => cuisin.code
            ),
          },
        },
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: `${vendorId ? t('Edit') : t('Create')} ${t('Vendor')}`,
        message: getGraphQLErrorMessage(error as Error) ?? t('Store Creation Failed'),
        duration: 2500,
      });
    }
  };

  function update(
    cache: ApolloCache<unknown>,
    data: ICreateRestaurantResponse
  ): void {
    if (!data) return;

    const cachedData: IRestaurantsByOwnerResponseGraphQL | null =
      cache.readQuery({
        query: GET_RESTAURANTS_BY_OWNER,
        variables: { id: vendorId },
      });

    const cachedRestaurants = cachedData?.restaurantByOwner?.restaurants ?? [];

    cache.writeQuery({
      query: GET_RESTAURANTS_BY_OWNER,
      variables: { id: vendorId },
      data: {
        restaurantByOwner: {
          ...cachedData?.restaurantByOwner,
          restaurants: [...(cachedRestaurants ?? []), createRestaurant],
        },
      },
    });
  }

  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950">
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          <div className="mb-2 flex flex-col">
            <span className="text-lg">{t('Add Store')}</span>
          </div>

          <div>
            <Formik
              initialValues={initialValues}
              validationSchema={makeRestaurantSchema(true)}
              onSubmit={async (values) => {
                await onCreateRestaurant(values);
              }}
              validateOnChange={true}
            >
              {({
                values,
                touched,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                setFieldValue,
                validateForm,
                setTouched,
              }) => {
                // `logo`/`image` are required but their upload widgets never
                // set Formik's touched state on their own and neither field
                // ever rendered an inline error — so a store missing one
                // could save (or silently fail) with zero visible feedback
                // (Issue 106). Validate explicitly on click so a toast + the
                // fields' own errors always show.
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
                    <div className="mb-2 space-y-3">
                      <div>
                        <CustomTextField
                          type="text"
                          name="name"
                          placeholder={t('Name')}
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

                      <div>
                        <CustomIconTextField
                          type="email"
                          name="username"
                          placeholder={t('Email')}
                          maxLength={35}
                          showLabel={true}
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

                      <div>
                        <CustomPasswordTextField
                          placeholder={`${t('Password')} *`}
                          aria-required={true}
                          error={touched.password ? errors.password : undefined}
                          name="password"
                          maxLength={20}
                          value={values.password}
                          showLabel={true}
                          onChange={handleChange}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'password',
                              errors?.password,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>

                      <div>
                        <CustomPasswordTextField
                          placeholder={`${t('Confirm Password')} *`}
                          aria-required={true}
                          error={touched.confirmPassword ? errors.confirmPassword : undefined}
                          name="confirmPassword"
                          maxLength={20}
                          showLabel={true}
                          value={values.confirmPassword ?? ''}
                          onChange={handleChange}
                          feedback={false}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'confirmPassword',
                              errors?.confirmPassword,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                        />
                      </div>
                      <div>
                        <label className="mb-[4px] text-[14px] font-medium text-content">
                          {t('Phone')}
                        </label>
                        <CustomPhoneTextField
                          mask="999-999-9999"
                          name="phoneNumber"
                          showLabel={true}
                          // placeholder="Phone Number"
                          onChange={(e) => {
                            // console.log("phone number format ==> ", e, code);
                            setFieldValue('phoneNumber', e);
                            // setCountryCode(code);
                          }}
                          value={values.phoneNumber}
                          // value={values.phoneNumber?.toString().match(/\(\+(\d+)\)\s(.+)/)?.[2]}
                          type="text"
                          className="rounded-[6px] border-surface-border"
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
                      </div>

                      <div>
                        <CustomTextField
                          placeholder={t('Address')}
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

                      <div>
                        <CustomNumberField
                          suffix="m"
                          min={1}
                          max={500}
                          placeholder={t('Delivery Time')}
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

                      <div>
                        <CustomNumberField
                          min={1}
                          max={99999}
                          placeholder={t('Min Order')}
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

                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-dark-600 dark:bg-dark-900">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {t('Platform commission')}: {DEFAULT_COMMISSION_RATE}%
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                          {t('Localsell charges this % of each order as commission. Set by Localsell, not editable here.')}
                        </p>
                      </div>

                      <div>
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={30}
                          placeholder={t('Default GST Rate (Regular stores only)')}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          name="salesTax"
                          showLabel={true}
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

                      <div>
                        <CustomDropdownComponent
                          name="gstRegistrationType"
                          placeholder={t('GST Registration')}
                          selectedItem={values.gstRegistrationType}
                          setSelectedItem={setFieldValue}
                          options={GST_STORE_OPTIONS}
                          showLabel={true}
                        />
                      </div>

                      {(values.gstRegistrationType?.code === 'REGULAR' ||
                        values.gstRegistrationType?.code === 'COMPOSITION') && (
                        <div>
                          <CustomTextField
                            type="text"
                            name="gstin"
                            placeholder={`${t('GSTIN')} *`}
                            maxLength={15}
                            value={values.gstin}
                            onChange={(e) =>
                              setFieldValue('gstin', e.target.value.toUpperCase())
                            }
                            showLabel={true}
                            style={{
                              borderColor: onErrorMessageMatcher(
                                'gstin',
                                errors?.gstin,
                                RestaurantErrors
                              )
                                ? 'red'
                                : '',
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <CustomDropdownComponent
                          name="shopType"
                          placeholder={t('Shop Category')}
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

                      <div>
                        <CustomMultiSelectComponent
                          name="cuisines"
                          placeholder={t('Cuisines')}
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
                      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 dark:border-dark-600 p-4">
                        <CustomUploadImageComponent
                          key="logo"
                          name="logo"
                          title={t('Upload Profile Image')}
                          onSetImageUrl={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'logo',
                              errors?.logo as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          fileTypes={['image/webp', 'image/jpg', 'image/jpeg']}
                          maxFileHeight={1080}
                          maxFileWidth={1080}
                          maxFileSize={MAX_SQUARE_FILE_SIZE}
                          orientation="SQUARE"
                          existingImageUrl={values.logo}
                          showExistingImage={true}
                        />
                        <CustomUploadImageComponent
                          key={'image'}
                          name="image"
                          title={t('Upload Image')}
                          onSetImageUrl={setFieldValue}
                          style={{
                            borderColor: onErrorMessageMatcher(
                              'image',
                              errors?.image as string,
                              RestaurantErrors
                            )
                              ? 'red'
                              : '',
                          }}
                          fileTypes={['image/webp', 'image/jpg', 'image/jpeg']}
                          maxFileHeight={841}
                          maxFileWidth={1980}
                          maxFileSize={MAX_LANSDCAPE_FILE_SIZE}
                          orientation="LANDSCAPE"
                          existingImageUrl={values.image}
                          showExistingImage={true}
                        />
                      </div>

                      {(errors.logo || errors.image) && (
                        <div className="flex flex-col gap-1">
                          {errors.logo && (
                            <small className="p-error">{errors.logo as string}</small>
                          )}
                          {errors.image && (
                            <small className="p-error">{errors.image as string}</small>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex justify-end items-center">
                        {errors.address && touched.address && (
                          <small className="p-error mr-4">
                            {errors.address}
                          </small>
                        )}
                        <CustomButton
                          className="h-10 w-fit border dark:border-dark-600 border-gray-300 bg-black px-8 text-white"
                          label={t('Add')}
                          type="submit"
                          loading={isSubmitting}
                          onClick={() => {
                            if (
                              values.password &&
                              !strongPasswordRegex.test(values.password)
                            ) {
                              showToast({
                                type: 'error',
                                duration: 3000,
                                title: 'Weak Password',
                                message:
                                  'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
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
