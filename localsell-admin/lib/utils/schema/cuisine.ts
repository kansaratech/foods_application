import * as Yup from 'yup';

export const CuisineFormSchema = Yup.object().shape({
  name: Yup.string()
    .max(30, 'you_have_reached_the_maximum_limit')
    .trim()
    .matches(/\S/, 'name_cannot_be_only_spaces')
    .required('name_is_required'),
  description: Yup.string()
    // Was capped at 40 chars but told the user "limit of 1500 characters" (#54).
    .max(200, 'you_have_reached_the_maximum_limit')
    .trim()
    .matches(/\S/, 'description_cannot_be_only_spaces')
    .required('description_is_required'),
  shopType: Yup.object({
    label: Yup.string().required('Required'),
    code: Yup.string().required('Required'),
  }).required('Please choose one'),
  image: Yup.string().url().required("Image is Required"),
});
