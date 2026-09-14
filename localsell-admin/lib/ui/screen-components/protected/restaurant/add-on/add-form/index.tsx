'use client';

// Core
import { FieldArray, Form, Formik, FormikErrors } from 'formik';
import { useContext, useMemo } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

// Prime React
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';
import { Fieldset } from 'primereact/fieldset';

// Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAdd, faTimes } from '@fortawesome/free-solid-svg-icons';

// Interface and Types
import { IAddonForm, IInlineChoiceForm } from '@/lib/utils/interfaces/forms';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomMultiSelectComponent from '@/lib/ui/useable-components/custom-multi-select';
import CustomTextAreaField from '@/lib/ui/useable-components/custom-text-area-field';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import CustomNumberField from '@/lib/ui/useable-components/number-input-field';
import CustomInputSwitch from '@/lib/ui/useable-components/custom-input-switch';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';

// Utilities and Constants
import { AddonsErrors } from '@/lib/utils/constants';

// Toast
import useToast from '@/lib/hooks/useToast';

// GraphQL
import {
  CREATE_ADDONS,
  EDIT_ADDON,
  GET_ADDONS_BY_RESTAURANT_ID,
  GET_OPTIONS_BY_RESTAURANT_ID,
} from '@/lib/api/graphql';
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { useConfiguration } from '@/lib/hooks/useConfiguration';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import {
  IAddonAddFormComponentProps,
  IDropdownSelectItem,
  IOptions,
  IOptionsByRestaurantResponse,
  IQueryResult,
} from '@/lib/utils/interfaces';
import { onErrorMessageMatcher, toTextCase } from '@/lib/utils/methods';
import { AddonSchema } from '@/lib/utils/schema';

let choiceKeySeq = 0;

const emptyChoice = (): IInlineChoiceForm & { key: string } => ({
  key: `new-${choiceKeySeq++}`,
  title: '',
  price: 0,
});

const initialFormValuesTemplate: IAddonForm = {
  title: '',
  description: '',
  isRequired: false,
  quantityMinimum: 0,
  quantityMaximum: 1,
  newOptions: [],
  options: [],
};

// Keeps quantityMinimum/quantityMaximum consistent with the "Customer must
// choose" toggle — mirrors normalizeAddonRules in food.resolvers.ts, so the
// vendor works in plain "required?" + "up to how many?" terms instead of
// having to reason about raw min/max numbers themselves.
function deriveSelectionRules(isRequired: boolean, quantityMaximum: number) {
  const safeMax = Math.max(1, quantityMaximum || 1);
  return {
    quantityMinimum: isRequired ? Math.min(safeMax, 1) : 0,
    quantityMaximum: safeMax,
  };
}

function selectionSummary(
  isRequired: boolean,
  min: number,
  max: number
): string {
  if (isRequired) {
    return min === max
      ? `Required — customer picks exactly ${min}`
      : `Required — customer picks ${min} to ${max}`;
  }
  return max <= 1
    ? 'Optional — customer can pick one'
    : `Optional — customer can pick up to ${max}`;
}

export default function AddonAddForm({
  onHide,
  addon,
  position = 'right',
  isAddAddonVisible,
}: IAddonAddFormComponentProps) {
  // Hooks
  const t = useTranslations();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { CURRENT_SYMBOL } = useConfiguration();

  // Context
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId || '';

  const initialValues: IAddonForm = useMemo(() => {
    if (!addon) return { ...initialFormValuesTemplate };
    return {
      _id: addon._id,
      title: addon.title,
      description: addon.description ?? '',
      isRequired: addon.isRequired ?? addon.quantityMinimum >= 1,
      quantityMinimum: addon.quantityMinimum,
      quantityMaximum: addon.quantityMaximum,
      // Editing shows every existing choice as an editable inline row — same
      // approach localsell-store's addon-form-sheet already uses. Saving
      // resubmits the full list, so edits/removals here just work.
      newOptions: (addon.options ?? []).map((o) => ({
        _id: o._id,
        title: o.title,
        price: o.price,
        description: o.description,
      })),
      options: [],
    };
  }, [addon]);

  // Query — the restaurant's saved-choices library, for "reuse a saved choice".
  const { data, loading } = useQueryGQL(
    GET_OPTIONS_BY_RESTAURANT_ID,
    { id: restaurantId },
    { fetchPolicy: 'cache-and-network', enabled: !!restaurantId }
  ) as IQueryResult<IOptionsByRestaurantResponse | undefined, undefined>;

  const optionsById = useMemo(() => {
    const map = new Map<string, IOptions>();
    (data?.restaurant?.options ?? []).forEach((o) => map.set(o._id, o));
    return map;
  }, [data?.restaurant?.options]);

  const optionsDropdown: IDropdownSelectItem[] = useMemo(
    () =>
      (data?.restaurant?.options ?? []).map((o) => ({
        label: `${toTextCase(o.title, 'title')} · ${CURRENT_SYMBOL}${o.price}`,
        code: o._id,
      })),
    [data?.restaurant?.options, CURRENT_SYMBOL]
  );

  // Mutation
  const [saveAddon, { loading: mutationLoading }] = useMutation(
    addon ? EDIT_ADDON : CREATE_ADDONS,
    {
      refetchQueries: [
        { query: GET_ADDONS_BY_RESTAURANT_ID, variables: { id: restaurantId } },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Customisation Group'),
          message: `${t('The customisation group has been')} ${addon ? t('updated') : t('added')}.`,
        });
        onHide();
      },
      onError: (error) => {
        let message = '';
        try {
          message = error.graphQLErrors[0]?.message;
        } catch (err) {
          message = t('Something went wrong');
        }
        showToast({ type: 'error', title: t('Customisation Group'), message });
      },
    }
  );

  // Form Submission — always the flat shape (title + inline `options`), which
  // createAddon/editAddon already support without any "option pool" grouping.
  // Reused pool picks are resolved to their current title/price here and
  // merged in alongside the freshly-typed choices into one `options` array.
  const handleSubmit = (values: IAddonForm) => {
    const created = values.newOptions
      .filter((o) => o.title?.trim())
      .map((o) => ({
        title: o.title.trim(),
        description: o.description || undefined,
        price: o.price ?? 0,
      }));
    const reused = (values.options ?? [])
      .map((item) => (item.code ? optionsById.get(item.code) : undefined))
      .filter((o): o is IOptions => !!o)
      .map((o) => ({
        title: o.title,
        description: o.description,
        price: o.price,
      }));

    saveAddon({
      variables: {
        addonInput: {
          _id: values._id,
          restaurant: restaurantId,
          title: values.title.trim(),
          description: values.description?.trim() || undefined,
          isRequired: values.isRequired,
          quantityMinimum: values.quantityMinimum,
          quantityMaximum: values.quantityMaximum,
          options: [...created, ...reused],
        },
      },
    });
  };

  return (
    <FormDialog
      title={
        <>
          {' '}
          {addon
            ? t('Edit Customisation Group')
            : t('New Customisation Group')}{' '}
        </>
      }
      visible={isAddAddonVisible}
      position={position}
      onHide={onHide}
      className=""
    >
      <div className="flex h-full w-full items-center justify-start">
        <div className="h-full w-full">
          <div className="mb-4 flex flex-col gap-1">
            <span className="text-xs text-slate-500 dark:text-gray-400">
              {t(
                'e.g. "Choose your toppings" or "Spice level" — a group of choices customers pick from on this item'
              )}
            </span>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={AddonSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              setFieldValue,
              handleSubmit: formikSubmit,
            }) => {
              const _errors = errors as FormikErrors<IAddonForm>;
              const newOptionsError =
                typeof _errors.newOptions === 'string'
                  ? _errors.newOptions
                  : undefined;

              return (
                <Form onSubmit={formikSubmit}>
                  <div className="flex flex-col gap-4">
                    <CustomTextField
                      type="text"
                      name="title"
                      placeholder={`${t('Group name')} *`}
                      maxLength={50}
                      value={values.title}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      showLabel
                      style={{
                        borderColor:
                          touched.title &&
                          onErrorMessageMatcher(
                            'title',
                            _errors.title,
                            AddonsErrors
                          )
                            ? 'red'
                            : '',
                      }}
                    />
                    {touched.title && _errors.title && (
                      <small className="p-error -mt-3">{_errors.title}</small>
                    )}

                    <CustomTextAreaField
                      name="description"
                      placeholder={t('Description (optional)')}
                      value={values.description}
                      onChange={handleChange}
                      showLabel
                      maxLength={50}
                    />

                    {/* Selection rules */}
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 dark:border-dark-600 dark:bg-dark-900">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {t('Customer must choose from this group')}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">
                            {t(
                              'Switch on for a mandatory pick, e.g. spice level or size of a side'
                            )}
                          </p>
                        </div>
                        <CustomInputSwitch
                          isActive={values.isRequired}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const rules = deriveSelectionRules(
                              checked,
                              values.quantityMaximum
                            );
                            setFieldValue('isRequired', checked);
                            setFieldValue(
                              'quantityMinimum',
                              rules.quantityMinimum
                            );
                            setFieldValue(
                              'quantityMaximum',
                              rules.quantityMaximum
                            );
                          }}
                        />
                      </div>

                      <div
                        className={`mt-3 grid gap-3 ${values.isRequired ? 'grid-cols-2' : 'grid-cols-1'}`}
                      >
                        {values.isRequired && (
                          <CustomNumberField
                            name="quantityMinimum"
                            min={1}
                            max={values.quantityMaximum}
                            placeholder={t('At least')}
                            showLabel
                            value={values.quantityMinimum}
                            onChangeFieldValue={(name, val) => {
                              const min = Math.max(1, Number(val) || 1);
                              setFieldValue('quantityMinimum', min);
                              if (min > values.quantityMaximum)
                                setFieldValue('quantityMaximum', min);
                            }}
                          />
                        )}
                        <CustomNumberField
                          name="quantityMaximum"
                          min={values.isRequired ? values.quantityMinimum : 1}
                          max={99}
                          placeholder={
                            values.isRequired
                              ? t('At most')
                              : t('Let customer pick up to')
                          }
                          showLabel
                          value={values.quantityMaximum}
                          onChangeFieldValue={(name, val) => {
                            const max = Math.max(1, Number(val) || 1);
                            setFieldValue('quantityMaximum', max);
                            if (
                              values.isRequired &&
                              values.quantityMinimum > max
                            ) {
                              setFieldValue('quantityMinimum', max);
                            }
                          }}
                        />
                      </div>

                      <p className="mt-2 text-xs italic text-slate-500 dark:text-gray-400">
                        {t('Customers will see')}:{' '}
                        {selectionSummary(
                          values.isRequired,
                          values.quantityMinimum,
                          values.quantityMaximum
                        )}
                      </p>
                    </div>

                    {/* Choices */}
                    <div className="rounded-xl border border-gray-200 bg-slate-50/60 p-4 dark:border-dark-600 dark:bg-dark-900">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {t('Choices')}
                        </p>
                        {newOptionsError && (
                          <small className="p-error">{newOptionsError}</small>
                        )}
                      </div>

                      <FieldArray name="newOptions">
                        {({ remove, push }) => (
                          <div className="flex flex-col gap-2">
                            {values.newOptions.map((choice, index) => (
                              <div
                                key={`choice-${index}`}
                                className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-dark-600 dark:bg-dark-950"
                              >
                                <div className="flex-1">
                                  <CustomTextField
                                    type="text"
                                    name={`newOptions[${index}].title`}
                                    placeholder={t('e.g. Extra Cheese')}
                                    maxLength={35}
                                    value={choice.title}
                                    onChange={(e) =>
                                      setFieldValue(
                                        `newOptions[${index}].title`,
                                        e.target.value
                                      )
                                    }
                                    showLabel={false}
                                  />
                                </div>
                                <div className="w-28">
                                  <CustomNumberField
                                    name={`newOptions[${index}].price`}
                                    prefix={CURRENT_SYMBOL}
                                    min={0}
                                    max={99999}
                                    minFractionDigits={0}
                                    maxFractionDigits={2}
                                    placeholder={t('Price')}
                                    showLabel={false}
                                    value={choice.price}
                                    onChangeFieldValue={setFieldValue}
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="mt-2 flex-shrink-0"
                                  onClick={() => remove(index)}
                                  aria-label={t('Remove choice')}
                                >
                                  <FontAwesomeIcon
                                    icon={faTimes}
                                    color="#FF6347"
                                  />
                                </button>
                              </div>
                            ))}
                            <TextIconClickable
                              className="w-full rounded border border-dashed border-black bg-transparent text-black dark:border-dark-600 dark:text-white"
                              icon={faAdd}
                              iconStyles={{
                                color: theme === 'dark' ? 'white' : 'black',
                              }}
                              title={t('Add a choice')}
                              onClick={() => push(emptyChoice())}
                            />
                          </div>
                        )}
                      </FieldArray>

                      <Fieldset
                        legend={t('Reuse a saved choice')}
                        toggleable
                        collapsed
                        className="mt-3 dark:bg-dark-950 dark:text-white"
                      >
                        <CustomMultiSelectComponent
                          name="options"
                          placeholder={t('Pick from your saved choices')}
                          options={optionsDropdown}
                          selectedItems={values.options ?? []}
                          setSelectedItems={setFieldValue}
                          showLabel={false}
                          isLoading={loading}
                        />
                      </Fieldset>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <CustomButton
                      className="h-10 w-fit border border-gray-300 bg-black px-8 text-white dark:border-dark-600"
                      label={addon ? t('Update') : t('Add')}
                      type="submit"
                      loading={mutationLoading}
                    />
                  </div>
                </Form>
              );
            }}
          </Formik>
        </div>
      </div>
    </FormDialog>
  );
}
