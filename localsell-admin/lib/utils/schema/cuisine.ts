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
  // Yup's built-in .url() rejects bare-hostname URLs like http://localhost:4000/...
  // (it requires a dotted domain), which blocks every image upload in local dev even
  // though the URL is perfectly valid. restaurant.ts's logo/image fields sidestep the
  // same trap with this same lenient check — mirrored here for consistency.
  image: Yup.string().matches(/^http/, 'Invalid image URL').required('Image is Required'),
});
