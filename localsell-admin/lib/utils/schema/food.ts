import * as Yup from 'yup';
import { IDropdownSelectItem } from '../interfaces';

export const FoodSchema = Yup.object().shape({
  title: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  description: Yup.string()
    .max(200)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .nullable(),
  category: Yup.mixed<IDropdownSelectItem>().required('Required'),
  subCategory: Yup.mixed<IDropdownSelectItem>().nullable().optional(),
  // The multi-image uploader writes to `images`; older records only have the
  // single `image` URL. Require an image in whichever field the record uses.
  image: Yup.string().nullable(),
  images: Yup.array()
    .of(Yup.string())
    .when('image', {
      is: (image: string | null | undefined) => !image,
      then: (schema) => schema.min(1, 'Add at least one image').required('Add at least one image'),
      otherwise: (schema) => schema.nullable().notRequired(),
    }),
});
