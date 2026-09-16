import * as Yup from 'yup';
import { MAX_PRICE, MIN_PRICE } from '../constants';

export const OptionSchema = Yup.object({
  options: Yup.array()
    .of(
      Yup.object().shape({
        _id: Yup.string().nullable(),
        title: Yup.string()
          .max(50)
          .trim()
          .matches(/\S/, 'Name cannot be only spaces')
          .required('Required'),
        description: Yup.string()
          .max(50)
          .trim()
          .matches(/\S/, 'Name cannot be only spaces')
          .optional(),
        price: Yup.number()
          .moreThan(MIN_PRICE, 'Price must be greater than 0')
          .max(MAX_PRICE)
          .required('Required'),
      })
    )
    .min(1)
    .required('Required'),
});
