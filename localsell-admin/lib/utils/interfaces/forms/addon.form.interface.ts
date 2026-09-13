import { IDropdownSelectItem } from '../global.interface';

// A brand-new priced choice typed inline (title + price), submitted via the
// flat `options: [OptionInput!]` shape the API's createAddon/editAddon already
// accept — no separate "option pool" round-trip needed for a new choice.
export interface IInlineChoiceForm {
  _id?: string;
  title: string;
  price: number;
  description?: string;
}

export interface IAddonForm {
  _id?: string;
  title: string;
  description: string;
  // "Customer must choose?" — drives quantityMinimum/quantityMaximum the same
  // way normalizeAddonRules does server-side (food.resolvers.ts).
  isRequired: boolean;
  quantityMinimum: number;
  quantityMaximum: number;
  // Brand-new choices typed inline in this form (primary path).
  newOptions: IInlineChoiceForm[];
  // Existing choices picked from the restaurant's saved-choices library
  // (secondary "reuse" path, still backed by the option pool).
  options: IDropdownSelectItem[] | null;
}

export interface IAddonsErrors {
  _id?: string[];
  title: string[];
  description: string[];
  quantityMinimum: string[];
  quantityMaximum: string[];
  options: string[];
  newOptions: string[];
}
