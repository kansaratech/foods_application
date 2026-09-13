import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IFoodErrors {
  title: string[];
  description: string[];
  image: string[];
  category: string[];
  subCategory: string[];
}

export interface IFoodDetailsForm {
  _id: string | null;
  title: string;
  description: string;
  image: string;
  images: string[];
  category: IDropdownSelectItem | null;
  subCategory: IDropdownSelectItem | null;
  pairedFoods: IDropdownSelectItem[];
  // Blank inherits the store's default GST rate (Restaurant.tax) — set only to
  // override for this specific item, e.g. a grocery/pharmacy good taxed at a
  // different slab than the store's default.
  gstRatePercent: number | null;
}
