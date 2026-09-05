// Core
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FieldArray, Form, Formik, FormikErrors, FormikProps } from 'formik';
import { Fieldset } from 'primereact/fieldset';
import React, { useContext, useMemo, useState } from 'react';

// Context
import { FoodsContext } from '@/lib/context/restaurant/foods.context';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';

// Interface and Types
import {
  IAddon,
  IAddonByRestaurantResponse,
  IDropdownSelectItem,
  IFoodNew,
  IFoodVariationsAddRestaurantComponentProps,
  IQueryResult,
  IVariationForm,
} from '@/lib/utils/interfaces';

// Constants and Methods
import { MAX_PRICE, MIN_PRICE, VariationErrors } from '@/lib/utils/constants';
import { onErrorMessageMatcher } from '@/lib/utils/methods';
import { VariationSchema } from '@/lib/utils/schema';

// Components
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import CustomMultiSelectComponent from '@/lib/ui/useable-components/custom-multi-select';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import AddonAddForm from '../../../add-on/add-form';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import CustomButton from '@/lib/ui/useable-components/button';

// Context
import { ToastContext } from '@/lib/context/global/toast.context';

// API
import {
  CREATE_FOOD,
  EDIT_FOOD,
  GET_ADDONS_BY_RESTAURANT_ID,
  GET_FOODS_BY_RESTAURANT_ID,
} from '@/lib/api/graphql';

// Icons
import { faAdd, faTimes } from '@fortawesome/free-solid-svg-icons';

// Apollo
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

const initialFormValuesTemplate: IVariationForm = {
  title: '',
  price: 0,
  discounted: 0,
  addons: [],
  isOutOfStock: false,
};

export default function VariationAddForm({
  stepperProps,
}: IFoodVariationsAddRestaurantComponentProps) {
  // Props
  const { onStepChange, order } = stepperProps ?? {
    onStepChange: () => { },
    type: '',
    order: -1,
  };
  // Hooks
  const t = useTranslations();
  const { theme } = useTheme();

  // State
  const [isAddAddonVisible, setIsAddAddonVisible] = useState(false);
  const [addon, setAddon] = useState<IAddon | null>(null);
  const [attrGroups, setAttrGroups] = useState([
    { name: '', values: '' },
    { name: '', values: '' },
  ]);

  // Context
  const { showToast } = useContext(ToastContext);
  const { onSetFoodContextData, foodContextData, onClearFoodData } =
    useContext(FoodsContext);
  const {
    restaurantLayoutContextData: { restaurantId },
    option,
    setOption
  } = useContext(RestaurantLayoutContext);

  // Constants
  const initialValues = {
    variations:
      foodContextData?.isEditing ||
        (foodContextData?.food?.variations ?? [])?.length > 0
        ? (foodContextData?.food?.variations ?? [])
        : [
          {
            ...initialFormValuesTemplate,
          },
        ],
  };

  // Query
  const { data, loading } = useQueryGQL(
    GET_ADDONS_BY_RESTAURANT_ID,
    { id: restaurantId },
    {
      fetchPolicy: 'cache-and-network',
      enabled: !!restaurantId,
      onCompleted: onFetchAddonsByRestaurantCompleted,
      onError: onErrorFetchAddonsByRestaurant,
    }
  ) as IQueryResult<IAddonByRestaurantResponse | undefined, undefined>;

  const [createFood] = useMutation(
    foodContextData?.isEditing ? EDIT_FOOD : CREATE_FOOD,
    {
      refetchQueries: [
        {
          query: GET_FOODS_BY_RESTAURANT_ID,
          variables: { id: restaurantId },
        },
      ],
      onCompleted: () => {
        showToast({
          type: 'success',
          title: `${foodContextData?.isEditing ? t('Edit') : t('New')} ${t('Food')}`,
          message: `${t('Food has been')} ${foodContextData?.isEditing ? t('edited') : t('added')} ${t('successfully')}.`,
        });

        onClearFoodData();
      },
      onError: (error) => {
        let message = '';
        try {
          message = error.graphQLErrors[0]?.message;
        } catch (err) {
          message = t('Something went wrong');
        }
        showToast({
          type: 'error',
          title: t('New Food'),
          message,
        });
      },
    }
  );

  // Memoized Data
  const addonsDropdown = useMemo(
    () =>
      data?.restaurant?.addons.map((addon: IAddon) => {
        return { label: addon.title, code: addon._id };
      }),
    [data?.restaurant?.addons]
  );

  // API Handlers
  function onFetchAddonsByRestaurantCompleted() { }
  function onErrorFetchAddonsByRestaurant() {
    showToast({
      type: 'error',
      title: t('Addons Fetch'),
      message: t('Addons fetch failed'),
      duration: 2500,
    });
  }

  // Handlers
  const onHandleSubmit = async ({
    variations,
  }: {
    variations: IVariationForm[];
  }) => {
    try {
      const _variations = variations.map(
        ({ discounted, ...item }: IVariationForm) => {
          delete item.__typename;
          return {
            ...item,
            discounted: discounted,
            addons: item?.addons?.map((item: IDropdownSelectItem) => item.code),
          };
        }
      );
      const foodInput = {
        _id: foodContextData?.food?._id ?? '',
        restaurant: restaurantId,
        ...foodContextData?.food?.data,
        category: foodContextData?.food?.data.category?.code,
        subCategory: foodContextData?.food?.data.subCategory?.code,
        variations: _variations,
      };
      delete foodInput.__typename;
      await createFood({
        variables: {
          foodInput: foodInput,
        },
      });
      onSetFoodContextData({
        food: {
          data: {} as IFoodNew,
          _id: '',
          variations: [] as IVariationForm[],
        },
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: `${foodContextData?.isEditing ? t('Edit') : t('New')} ${t('Food')}`,
        message: `${t('Food')} ${foodContextData?.isEditing ? t('edit') : t('creation')} ${t('failed')}`,
        duration: 2500,
      });
    }
  };
  // Cross-product of every attribute group's comma-separated values, e.g.
  // Size: Small,Medium,Large + Crust: Thin,Thick → 6 titles ("Small - Thin", …).
  // Skips titles that already exist so re-running the generator is safe.
  const buildVariantMatrix = (
    groups: { name: string; values: string }[],
    existingTitles: Set<string>
  ): string[] => {
    const cleanGroups = groups
      .map((g) => g.values.split(',').map((v) => v.trim()).filter(Boolean))
      .filter((values) => values.length > 0);
    if (cleanGroups.length === 0) return [];
    let combos: string[][] = [[]];
    cleanGroups.forEach((groupValues) => {
      const next: string[][] = [];
      combos.forEach((combo) => {
        groupValues.forEach((v) => next.push([...combo, v]));
      });
      combos = next;
    });
    return combos
      .map((combo) => combo.join(' - '))
      .filter((title) => !existingTitles.has(title));
  };

  const onBackClickHandler = ({
    variations,
  }: {
    variations: IVariationForm[];
  }) => {
    onSetFoodContextData({
      food: {
        _id: foodContextData?.food?._id ?? '',
        data: foodContextData?.food?.data ?? ({} as IFoodNew),
        variations: variations,
      },
    });
    onStepChange(order - 1);
  };

  return (
    <div className="flex h-full w-full items-center justify-start dark:text-white dark:bg-dark-950 ">
      <div className="h-full w-full">
        <div className="flex flex-col gap-2">
          <div className="mb-2 flex flex-col">
            <span className="text-lg">{t('Add Variation')}</span>
          </div>

          <div className="mb-2">
            <Formik
              initialValues={initialValues}
              validationSchema={VariationSchema}
              onSubmit={onHandleSubmit}
              enableReinitialize
            >
              {({
                values,
                errors,
                isSubmitting,
                setFieldValue,
                handleSubmit,
              }: FormikProps<{ variations: IVariationForm[] }>) => {
                const _errors: FormikErrors<IVariationForm>[] =
                  (errors?.variations as FormikErrors<IVariationForm>[]) ?? [];
                return (
                  <Form onSubmit={handleSubmit}>
                    <div>
                      <FieldArray name="variations">
                        {({ remove, push }) => (
                          <div>
                            <Fieldset
                              legend={t('Generate variations (Size × Crust, etc.)')}
                              toggleable
                              collapsed
                              className="mb-3 dark:text-white dark:bg-dark-950"
                            >
                              <div className="flex flex-col gap-2">
                                {attrGroups.map((group, gi) => (
                                  <div key={gi} className="grid grid-cols-12 gap-2">
                                    <div className="col-span-4">
                                      <CustomTextField
                                        type="text"
                                        name={`attr-name-${gi}`}
                                        placeholder={t('Attribute (e.g. Size)')}
                                        showLabel={false}
                                        value={group.name}
                                        onChange={(e) =>
                                          setAttrGroups((prev) =>
                                            prev.map((g, i) =>
                                              i === gi ? { ...g, name: e.target.value } : g
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="col-span-8">
                                      <CustomTextField
                                        type="text"
                                        name={`attr-values-${gi}`}
                                        placeholder={t('Comma-separated values (e.g. Small,Medium,Large)')}
                                        showLabel={false}
                                        value={group.values}
                                        onChange={(e) =>
                                          setAttrGroups((prev) =>
                                            prev.map((g, i) =>
                                              i === gi ? { ...g, values: e.target.value } : g
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-between gap-2">
                                  <TextIconClickable
                                    className="w-fit rounded border dark:border-dark-600 border-black bg-transparent text-black dark:text-white"
                                    icon={faAdd}
                                    iconStyles={{ color: theme === 'dark' ? 'white' : 'black' }}
                                    title={t('Add attribute')}
                                    onClick={() =>
                                      setAttrGroups((prev) => [...prev, { name: '', values: '' }])
                                    }
                                  />
                                  <CustomButton
                                    className="h-10 w-fit border dark:border-dark-600 border-gray-300 bg-black px-6 text-sm text-white"
                                    label={t('Generate variations')}
                                    type="button"
                                    onClick={() => {
                                      const existingTitles = new Set(
                                        values.variations.map((v) => v.title)
                                      );
                                      const newTitles = buildVariantMatrix(
                                        attrGroups,
                                        existingTitles
                                      );
                                      if (newTitles.length === 0) {
                                        showToast({
                                          type: 'error',
                                          title: t('Variations'),
                                          message: t(
                                            'No new combinations to add — check the attribute values, or they already exist'
                                          ),
                                          duration: 2800,
                                        });
                                        return;
                                      }
                                      newTitles.forEach((title) =>
                                        push({ ...initialFormValuesTemplate, title })
                                      );
                                      showToast({
                                        type: 'success',
                                        title: t('Variations'),
                                        message: `${newTitles.length} ${t('variations added')}`,
                                        duration: 2000,
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            </Fieldset>
                            {values.variations.length > 0 &&
                              values.variations.map(
                                (value: IVariationForm, index: number) => {
                                  return (
                                    <div
                                      className="mb-2"
                                      key={`variations-${index}`}
                                    >
                                      <div className="relative">
                                        {(foodContextData?.isEditing ||
                                          !!index) && (
                                            <button
                                              className="absolute -right-1 top-2"
                                              onClick={() => remove(index)}
                                              type="button"
                                            >
                                              <FontAwesomeIcon
                                                icon={faTimes}
                                                size="lg"
                                                color="#FF6347"
                                              />
                                            </button>
                                          )}
                                        <Fieldset
                                          legend={`${t('Variation')} ${index + 1} ${value.title ? `(${value.title})` : ''}`}
                                          toggleable
                                          className='dark:text-white dark:bg-dark-950'
                                        >
                                          <div className="grid grid-cols-12 gap-4">
                                            <div className="col-span-12 sm:col-span-12">
                                              <CustomTextField
                                                type="text"
                                                name={`variations[${index}].title`}
                                                placeholder={t('Title')}
                                                maxLength={35}
                                                value={value.title}
                                                onChange={(e) =>
                                                  setFieldValue(
                                                    `variations[${index}].title`,
                                                    e.target.value
                                                  )
                                                }
                                                showLabel={true}
                                                style={{
                                                  borderColor:
                                                    onErrorMessageMatcher(
                                                      'title',
                                                      _errors[index]?.title,
                                                      VariationErrors
                                                    )
                                                      ? 'red'
                                                      : '',
                                                }}
                                              />
                                            </div>

                                            <div className="relative col-span-6 sm:col-span-6">
                                              <CustomNumberField
                                                name={`variations[${index}].price`}
                                                min={MIN_PRICE}
                                                max={MAX_PRICE}
                                                minFractionDigits={0}
                                                maxFractionDigits={2}
                                                placeholder={t('Price')}
                                                showLabel={true}
                                                value={value.price}
                                                onChangeFieldValue={
                                                  setFieldValue
                                                }
                                                style={{
                                                  borderColor:
                                                    onErrorMessageMatcher(
                                                      'price',
                                                      _errors[index]?.price,
                                                      VariationErrors
                                                    )
                                                      ? 'red'
                                                      : '',
                                                }}
                                              />
                                              {value.discounted > 0 && (
                                                <div className="absolute bottom-[-15px] left-[2px] font-semibold text-[10px] flex gap-2">
                                                  <p>
                                                    {t('Actual Price')}&nbsp;:
                                                    &nbsp;
                                                    <span className="line-through">
                                                      {value.price +
                                                        value.discounted}
                                                    </span>
                                                  </p>
                                                  ,
                                                  <p>
                                                    {t('Discounted Price')}
                                                    &nbsp;: &nbsp;
                                                    <span>{value.price}</span>
                                                  </p>
                                                </div>
                                              )}
                                            </div>

                                            <div className="col-span-6 sm:col-span-6">
                                              <CustomNumberField
                                                name={`variations[${index}].discounted`}
                                                min={0}
                                                placeholder={t(
                                                  'Discount Price'
                                                )}
                                                showLabel={true}
                                                value={value.discounted}
                                                onChangeFieldValue={
                                                  setFieldValue
                                                }
                                                style={{
                                                  borderColor:
                                                    onErrorMessageMatcher(
                                                      'discounted',
                                                      _errors[index]
                                                        ?.discounted,
                                                      VariationErrors
                                                    )
                                                      ? 'red'
                                                      : '',
                                                }}
                                              />
                                            </div>

                                            <div className="col-span-12 sm:col-span-12">
                                              <CustomMultiSelectComponent
                                                name={`variations[${index}].addons`}
                                                placeholder={t('Addons')}
                                                options={addonsDropdown ?? []}
                                                selectedItems={
                                                  value.addons ?? [
                                                    { code: '', label: '' },
                                                  ]
                                                }
                                                setSelectedItems={setFieldValue}
                                                showLabel={true}
                                                extraFooterButton={{
                                                  title: t('Add New Addon'),
                                                  onChange: () =>
                                                    setIsAddAddonVisible(true),
                                                }}
                                                isLoading={loading}
                                                style={{
                                                  borderColor:
                                                    onErrorMessageMatcher(
                                                      'addons',
                                                      _errors[index]
                                                        ?.addons as string,
                                                      VariationErrors
                                                    )
                                                      ? 'red'
                                                      : '',
                                                }}
                                              />

                                              <div className="col-span-12 mt-4 flex justify-end sm:col-span-12">
                                                <CustomInputSwitch
                                                  label={t('Out of Stock')}
                                                  loading={false}
                                                  isActive={value.isOutOfStock}
                                                  onChange={() => {
                                                    setFieldValue(
                                                      `variations[${index}].isOutOfStock`,
                                                      !value.isOutOfStock
                                                    );
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </Fieldset>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            <div className="mt-4 flex justify-end">
                              <TextIconClickable
                                className="w-full rounded border dark:border-dark-600 border-black bg-transparent text-black dark:text-white"
                                icon={faAdd}
                                iconStyles={{ color: theme === "dark" ? "white" : "black" }}
                                title={t('Add New Variation')}
                                onClick={() => push(initialFormValuesTemplate)}
                              />
                            </div>
                          </div>
                        )}
                      </FieldArray>

                      <div className="mt-4 flex justify-between">
                        <CustomButton
                          className="h-10 w-fit border dark:border-dark-600 border-gray-300 bg-black px-8 text-white"
                          label={t('Back')}
                          type="button"
                          onClick={() => {
                            onBackClickHandler(values);
                          }}
                        />
                        <CustomButton
                          className="h-10 w-fit border dark:border-dark-600 border-gray-300 bg-black  px-8 text-white"
                          label={
                            foodContextData?.isEditing ? t('Update') : t('Add')
                          }
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
        </div>
      </div>
      <div>
        <AddonAddForm
          className='z-[999]'
          isAddOptionsVisible={isAddAddonVisible}
          setIsAddOptionsVisible={setIsAddAddonVisible}
          option={option}
          setOption={setOption}
          addon={addon}
          onHide={() => {
            setIsAddAddonVisible(false);
            setAddon(null);
          }}
          isAddAddonVisible={isAddAddonVisible}
        />
      </div>
    </div>
  );
}
