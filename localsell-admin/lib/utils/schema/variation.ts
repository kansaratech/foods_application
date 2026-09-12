import * as Yup from 'yup';
import { MAX_PRICE, MIN_PRICE } from '../constants';
import { IDropdownSelectItem } from '../interfaces';

export const VariationSchema = Yup.object({
  variations: Yup.array()
    .of(
      Yup.object().shape({
        _id: Yup.string().nullable(),
        title: Yup.string()
          .max(50)
          .trim()
          .matches(/\S/, 'Name cannot be only spaces')
          .required('Required'),
        price: Yup.number()
          .min(MIN_PRICE, 'Minimum value must be greater than 0')
          .max(MAX_PRICE)
          .required('Required'),
        // Optional — 0/empty means no discount. When set, it's the actual
        // discounted (final) selling price, so it must be lower than price.
        discounted: Yup.number()
          .min(0)
          .test(
            'below-price',
            'Discounted price must be less than the price',
            function (value) {
              if (!value) return true;
              return value < this.parent.price;
            }
          ),
        addons: Yup.array()
          .of(Yup.mixed<IDropdownSelectItem>())
          .required('Required')
          .test(
            'at-least-one-addon',
            'Addons field must have at least 1 items',
            (value) => value && value.length > 0
          ),
        isOutOfStock: Yup.boolean(),
      })
    )
    .min(1)
    .required('Required'),
});
