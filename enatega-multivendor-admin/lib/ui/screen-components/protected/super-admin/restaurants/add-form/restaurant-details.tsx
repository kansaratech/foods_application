'use client';

import { useState } from 'react';
// Core
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Form, Formik } from 'formik';
import { useContext, useMemo } from 'react';

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
import { onErrorMessageMatcher } from '@/lib/utils/methods/error';

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
import { RestaurantSchema } from '@/lib/utils/schema/restaurant';
import {
  ApolloCache,
  ApolloError,
  useMutation,
  useQuery,
} from '@apollo/client';
import { useTranslations } from 'next-intl';
import CustomPhoneTextField from '@/lib/ui/useable-components/phone-input-field';
import { useShopTypes } from '@/lib/hooks/useShopType';

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
  shopType: null,
  cuisines: [],
  image:
    'https://t4.ftcdn.net/jpg/04/76/57/27/240_F_476572792_zMwqHpmGal1fzh0tDJ3onkLo88IjgNbL.jpg',
  logo: 'https://res.cloudinary.com/dc6xw0lzg/image/upload/v1735894342/dvi5fjbsgdlrzwip0whg.jpg',
};

export default function RestaurantDetailsForm({
  stepperProps,
}: IRestaurantsAddRestaurantComponentProps) {
  // Hooks
  const t = useTranslations();
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
  const { data: restaurantData } = useQuery(GET_RESTAURANTS);
  const { data: editingProfileData, loading: editingProfileLoading } = useQuery(GET_RESTAURANT_PROFILE, {
    variables: { id: editingRestaurantId ?? '' },
    skip: !isEditingExisting,
    fetchPolicy: 'network-only',
  });
  const editingProfile = editingProfileData?.restaurant;

  // Mutation
  const [createRestaurant] = useMutation(CREATE_RESTAURANT, {
    onError,
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
    onError,
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

  // Once the existing store's profile (and the shop-type/cuisine option
  // lists) are loaded, merge them into the form's starting values. Formik's
  // enableReinitialize picks this up as soon as it resolves.
  const formInitialValues = useMemo<IRestaurantForm>(() => {
    if (!isEditingExisting || !editingProfile) return initialValues;
    const matchedShopType =
      (dropdownList || []).find((o) => o.code === editingProfile.shopTypeId) ?? null;
    const cuisineOptions: IDropdownSelectItem[] = cuisinesDropdown ?? [];
    const matchedCuisines: IDropdownSelectItem[] = [];
    (editingProfile.cuisines ?? []).forEach((name: string) => {
      const match = cuisineOptions.find((c) => c.code === name);
      if (match) matchedCuisines.push(match);
    });
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
      shopType: matchedShopType,
      cuisines: matchedCuisines,
      image: editingProfile.image ?? initialValues.image,
      logo: editingProfile.logo ?? initialValues.logo,
    };
  }, [isEditingExisting, editingProfile, dropdownList, cuisinesDropdown]);

  // Handlers
  const onCreateRestaurant = async (data: IRestaurantForm) => {
    try {
      // check if values.name is present in restaurantData and show error toast
      // — excluding the store's own current row when editing, since it will
      // obviously match its own name.
      const existingRestaurant = restaurantData?.restaurants.find(
        (restaurant: IRestaurantForm & { _id?: string }) =>
          restaurant.name.toLowerCase() === data.name.toLowerCase() &&
          restaurant._id !== editingRestaurantId
      );
      if (existingRestaurant) {
        showToast({
          type: 'error',
          title: `Restaurant Already Exists`,
          message: 'Restaurant with same name already exists',
          duration: 2500,
        });
        return;
      }

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
        message: isEditingExisting ? t('Store update failed') : t('Store Creation Failed'),
        duration: 2500,
      });
    }
  };

  function onError({ graphQLErrors, networkError }: ApolloError) {
    showToast({
      type: 'error',
      title: t('New Store'),
      message:
        graphQLErrors[0]?.message ??
        networkError?.message ??
        t('Store Creation Failed'),
      duration: 2500,
    });
  }
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
              validationSchema={RestaurantSchema}
              onSubmit={async (values) => {
                await onCreateRestaurant(values);
              }}
              validateOnChange={false}
            >
              {({
                touched,
                values,
                errors,
                handleChange,
                handleSubmit,
                isSubmitting,
                setFieldValue,
              }) => {
                return (
                  <Form onSubmit={handleSubmit}>
                    <div className="mb-3 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-12">
                      <div className="md:col-span-6">
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

                      <div className="md:col-span-6">
                        <CustomIconTextField
                          type="email"
                          name="username"
                          placeholder={t('Email')}
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

                      <div className="md:col-span-6">
                        <CustomPasswordTextField
                          placeholder={t('Password')}
                          name="password"
                          maxLength={20}
                          value={values.password}
                          showLabel={true}
                          autoComplete="new-password"
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

                      <div className="md:col-span-6">
                        <CustomPasswordTextField
                          placeholder={t('Confirm Password')}
                          name="confirmPassword"
                          maxLength={20}
                          showLabel={true}
                          autoComplete="new-password"
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

                      <div className="md:col-span-4">
                        <CustomPhoneTextField
                          mask="999-999-9999"
                          name="phoneNumber"
                          showLabel={true}
                          placeholder={t('Phone')}
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
                      </div>

                      <div className="md:col-span-8">
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

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
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

                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
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
                      <div className="mt-2 border-t border-slate-200 pt-5 dark:border-dark-600 md:col-span-3">
                        <CustomNumberField
                          prefix="%"
                          min={0}
                          max={100}
                          placeholder={t('Service Charges')}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          name="salesTax"
                          showLabel={true}
                          value={values.salesTax}
                          onChange={setFieldValue}
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

                      <div className="min-w-0 md:col-span-6">
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
                          onClick={() => {
                            if (
                              values.password &&
                              !strongPasswordRegex.test(values.password)
                            ) {
                              showToast({
                                title: t('Error'),
                                message: t(
                                  'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                                ),
                                type: 'error',
                                duration: 3000,
                              });
                            }
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
