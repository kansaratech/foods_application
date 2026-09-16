import * as Yup from 'yup';
import { IDropdownSelectItem } from '../interfaces';
import { MAX_PRICE, MIN_PRICE } from '../constants';

// One customisation group per form (mirrors localsell-store's addon-form-sheet) —
// creating several groups in one save added complexity Swiggy/Zomato's own
// vendor flow doesn't have; save this one, then "Add" again for the next.
export const AddonSchema = Yup.object().shape({
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
  isRequired: Yup.boolean().required(),
  // Derived from isRequired before validation runs (see deriveSelectionRules
  // in add-on/add-form) — still validated as real numbers so a bad manual
  // edit can't slip through.
  quantityMinimum: Yup.number()
    .min(MIN_PRICE, 'Minimum value must be greater than -1')
    .max(MAX_PRICE)
    .required('Required'),
  quantityMaximum: Yup.number()
    .min(Yup.ref('quantityMinimum'), 'Maximum must be greater than minimum.')
    .max(99999)
    .required('Required'),

  // Choices reused from the restaurant's saved-choices library (secondary path).
  options: Yup.array().of(Yup.mixed<IDropdownSelectItem>()),
  // Brand-new choices typed inline (the primary path) — needs at least one
  // choice overall, new or reused, so the test checks the sibling `options`
  // field too rather than requiring newOptions specifically to be non-empty.
  newOptions: Yup.array()
    .of(
      Yup.object().shape({
        _id: Yup.string().nullable(),
        title: Yup.string()
          .trim()
          .matches(/\S/, 'Name cannot be only spaces')
          .required('Required'),
        price: Yup.number().moreThan(0, 'Price must be greater than 0').required('Required'),
        description: Yup.string().optional(),
      })
    )
    .test(
      'at-least-one-choice',
      'Add at least one choice, or reuse a saved one',
      function atLeastOneChoice(value) {
        const reused = (this.parent as { options?: unknown[] })?.options;
        return (value?.length ?? 0) + (reused?.length ?? 0) > 0;
      }
    ),
});
