// Core
import { FieldArray, Form, Formik } from 'formik';

// Prime React
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';
import { Fieldset } from 'primereact/fieldset';

// Interface, Types & Schema
import { ICategoryForm } from '@/lib/utils/interfaces/forms';
import {
  ICategoryAddFormComponentProps,
  ISubCategory,
  ISubCategoryByParentIdResponse,
} from '@/lib/utils/interfaces';
import { CategorySchema } from '@/lib/utils/schema';

// Components
import CustomButton from '@/lib/ui/useable-components/button';
import CustomTextField from '@/lib/ui/useable-components/input-field';
import TextIconClickable from '@/lib/ui/useable-components/text-icon-clickable';
import CustomUploadImageComponent from '@/lib/ui/useable-components/upload/upload-image';

// Utilities and Constants
import { CategoryErrors } from '@/lib/utils/constants';
import {
  onErrorMessageMatcher,
  getGraphQLErrorMessage,
} from '@/lib/utils/methods/error';

//Toast
import useToast from '@/lib/hooks/useToast';

//GraphQL
import {
  CREATE_CATEGORY,
  EDIT_CATEGORY,
  GET_CATEGORY_BY_RESTAURANT_ID,
} from '@/lib/api/graphql';
import {
  CREATE_SUB_CATEGORIES,
  DELETE_SUB_CATEGORY,
} from '@/lib/api/graphql/mutations/sub-category';

// Contexts
import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';

// Icons
import { faAdd, faTrash } from '@fortawesome/free-solid-svg-icons';

// Hooks
import { useMutation, useQuery } from '@apollo/client';
import { useContext, useEffect } from 'react';
import { GET_SUBCATEGORIES_BY_PARENT_ID } from '@/lib/api/graphql/queries/sub-categories';
import CustomLoader from '@/lib/ui/useable-components/custom-progress-indicator';
import { useTranslations } from 'next-intl';
import { onUseLocalStorage } from '@/lib/utils/methods';

export default function CategoryAddForm({
  onHide,
  category,
  position = 'right',
  isAddCategoryVisible,
  onCategoryAdded,
}: ICategoryAddFormComponentProps & { onCategoryAdded?: () => void }) {
  // Hooks
  const t = useTranslations();
  // Queries
  const {
    data: subCategories,
    loading: subCategoriesLoading,
    refetch: refetchSubCatrgories,
  } = useQuery<ISubCategoryByParentIdResponse>(GET_SUBCATEGORIES_BY_PARENT_ID, {
    variables: {
      parentCategoryId: category?._id,
    },
    skip: !category?._id,
  });
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId || '';

  const shopType = onUseLocalStorage('get', 'shopType');

  // Fetch all categories for duplicate check
  const {
    data: allCategoriesData,
    // loading: allCategoriesLoading,
  } = useQuery(GET_CATEGORY_BY_RESTAURANT_ID, {
    variables: { id: restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-first',
  });

  // StateS
  const initialValues: ICategoryForm = {
    _id: '',
    title: '',
    subCategories:
      subCategories?.subCategoriesByParentId.length && !subCategoriesLoading
        ? subCategories?.subCategoriesByParentId
        : [{ _id: '', title: '', parentCategoryId: '' }],
    image: '',
    ...category,
  };

  // Hooks
  const { showToast } = useToast();

  // Context

  // const shopType = restaurantLayoutContextData?.shopType || '';
  // console.log("🚀 ~ shopType:", shopType)

  // Mutations
  const [deleteSubCategory, { loading: deleteSubCategoryLoading }] =
    useMutation(DELETE_SUB_CATEGORY, {
      refetchQueries: category?._id
        ? [
            {
              query: GET_SUBCATEGORIES_BY_PARENT_ID,
              variables: {
                parentCategoryId: category._id,
              },
            },
          ]
        : [],
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('Delete Sub-Category'),
          message: t('Deleted the sub-category successfully'),
        });
      },
      onError: (error) => {
        showToast({
          type: 'error',
          title: t('Delete Sub-Category'),
          message:
            error.message ||
            error.clientErrors[0].message ||
            error.networkError?.message ||
            t('Failed to delete the sub-category, please try again later'),
        });
      },
    });
  const [createCategory, { loading: mutationLoading }] = useMutation(
    category ? EDIT_CATEGORY : CREATE_CATEGORY,
    {
      refetchQueries: 'active',
      awaitRefetchQueries: true,
      onCompleted: () => {
        showToast({
          type: 'success',
          title: t('New Category'),
          message: `${t('Category has been')} ${category ? t('edited') : t('added')} ${t('successfully')}.`,
          duration: 3000,
        });
        // Call the callback to notify parent to refetch categories
        if (onCategoryAdded) onCategoryAdded();
        onHide();
      },
    }
  );

  // Sub-categories aren't part of CategoryInput (the API rejects the field
  // outright — see food.ts's typeDefs), and creating one needs the parent
  // category's id, which only exists after createCategory resolves. So they
  // go through this separate mutation as a follow-up, not bundled into the
  // category payload below.
  const [createSubCategories] = useMutation(CREATE_SUB_CATEGORIES, {
    refetchQueries: 'active',
    awaitRefetchQueries: true,
  });

  // Form Submission
  const handleSubmit = async (values: ICategoryForm) => {
    // Duplicate name check (case-insensitive, ignore self if editing)
    const allCategories = allCategoriesData?.restaurant?.categories || [];
    const isDuplicate = allCategories.some(
      (cat: ICategoryForm) =>
        cat.title.trim().toLowerCase() === values.title.trim().toLowerCase() &&
        (!category || cat._id !== category._id)
    );
    if (isDuplicate) {
      showToast({
        type: 'error',
        title: t('Duplicate Category'),
        message: t('A category with this name already exists.'),
        duration: 3000,
      });
      return;
    }
    try {
      const { data } = await createCategory({
        variables: {
          category: {
            restaurant: restaurantId,
            _id: category ? category?._id : '',
            title: values.title,
            image: shopType == 'grocery' ? (values?.image ?? '') : '',
          },
        },
      });

      // Only when creating fresh (editing manages sub-categories via their
      // own add/delete controls elsewhere) and only the rows the admin
      // actually titled — createSubCategories needs the id this category
      // was just given, which the response's categories list carries.
      if (!category && shopType == 'grocery') {
        const newCategoryId = data?.createCategory?.categories?.find(
          (c: { _id: string; title: string }) => c.title === values.title.trim()
        )?._id;
        const titledSubCategories = values.subCategories
          .filter((sc) => sc.title?.trim())
          .map((sc) => ({
            title: sc.title.trim(),
            parentCategoryId: newCategoryId,
          }));
        if (newCategoryId && titledSubCategories.length) {
          await createSubCategories({
            variables: { subCategories: titledSubCategories },
          });
        }
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: `${category ? t('Edit') : t('Create')} Category`,
        message:
          getGraphQLErrorMessage(error as Error) ??
          t('Failed to create Category, please try again later'),
      });
    }
  };
  useEffect(() => {
    if (isAddCategoryVisible && category?._id) {
      refetchSubCatrgories();
    }
  }, [category?._id, isAddCategoryVisible, refetchSubCatrgories]);
  if (subCategoriesLoading) return <CustomLoader />;
  if (!subCategoriesLoading)
    return (
      <FormDialog
        title={
          <>
            {' '}
            {category ? t('Edit') : t('Add')} {t('Category')}{' '}
          </>
        }
        visible={isAddCategoryVisible}
        position={position}
        onHide={onHide}
        className=""
      >
        <div className="flex h-full w-full items-center justify-start">
          <div className="h-full w-full">
            <div className="flex flex-col gap-2">
              <div>
                <Formik
                  initialValues={initialValues}
                  validationSchema={CategorySchema}
                  onSubmit={handleSubmit}
                  enableReinitialize
                >
                  {({
                    values,
                    errors,
                    handleChange,
                    handleSubmit,
                    setFieldValue,
                  }) => {
                    return (
                      <Form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                          <div>
                            <CustomTextField
                              type="text"
                              name="title"
                              placeholder={t('Title')}
                              maxLength={30}
                              value={values.title}
                              onChange={handleChange}
                              showLabel={true}
                              style={{
                                borderColor: onErrorMessageMatcher(
                                  'title',
                                  errors?.title,
                                  CategoryErrors
                                )
                                  ? 'red'
                                  : '',
                              }}
                            />
                          </div>

                          {shopType == 'grocery' && (
                            <div>
                              <CustomUploadImageComponent
                                name="image"
                                title={t('Upload Image')}
                                onSetImageUrl={setFieldValue}
                                existingImageUrl={values.image}
                                showExistingImage={category ? true : false}
                                style={{
                                  borderColor: onErrorMessageMatcher(
                                    'image',
                                    errors?.image as string,
                                    CategoryErrors
                                  )
                                    ? 'red'
                                    : '',
                                }}
                                maxFileSize={0}
                                maxFileWidth={1980}
                                maxFileHeight={1080}
                                fileTypes={[]}
                              />
                            </div>
                          )}
                          {/* Sub Categories  */}
                          {shopType == 'grocery' && (
                            <FieldArray name="subCategories">
                              {({ remove, push }) => (
                                <div>
                                  {values?.subCategories?.map(
                                    (value: ISubCategory, index) => {
                                      if (values._id) {
                                        setTimeout(
                                          () =>
                                            setFieldValue(
                                              `subCategorites[${index}].parentCategoryId`,
                                              values._id
                                            ),
                                          300
                                        );
                                      }
                                      return (
                                        <div
                                          key={index}
                                          className=" rounded-lg shadow-sm"
                                        >
                                          <Fieldset
                                            legend={`${t('Sub-Category')} #${index + 1} ${value.title ? `(${value.title})` : ''}`}
                                            toggleable
                                            className="my-1"
                                          >
                                            {/* Sub-Category Field and Remove Button */}
                                            <div className="flex-col justify-center items-center">
                                              <TextIconClickable
                                                icon={
                                                  deleteSubCategoryLoading
                                                    ? 'spinner'
                                                    : faTrash
                                                }
                                                iconStyles={{ color: 'red' }}
                                                className={`text-red-500 hover:text-red-700 transition-colors justify-self-end ${deleteSubCategoryLoading ? 'animate-spin' : ''}`}
                                                title=""
                                                onClick={async () => {
                                                  if (value._id) {
                                                    remove(index);
                                                    await deleteSubCategory({
                                                      variables: {
                                                        deleteSubCategoryId2:
                                                          value._id,
                                                      },
                                                    });
                                                  }
                                                }}
                                              />
                                              <CustomTextField
                                                name={`subCategories[${index}].title`}
                                                value={value.title}
                                                maxLength={15}
                                                onChange={handleChange}
                                                placeholder="Title"
                                                showLabel={true}
                                                type="text"
                                              />
                                            </div>
                                          </Fieldset>
                                          {/* Add More Button */}
                                          {index ===
                                            values.subCategories.length - 1 &&
                                            !category && (
                                              <div className="mt-4">
                                                <TextIconClickable
                                                  icon={faAdd}
                                                  title={t('Add More')}
                                                  onClick={() =>
                                                    push({
                                                      title: '',
                                                      parentCategoryId: '',
                                                    })
                                                  }
                                                  className="w-full flex justify-center items-center py-2 border border-dashed border-gray-400 rounded-md text-gray-600 hover:text-black  hover:border-black transition-all"
                                                />
                                              </div>
                                            )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                            </FieldArray>
                          )}

                          <div className="mt-4 flex justify-end">
                            <CustomButton
                              className="h-10 w-fit border-gray-300 border dark:border-dark-600 bg-black px-8 text-white"
                              label={category ? t('Update') : t('Add')}
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
      </FormDialog>
    );
}
