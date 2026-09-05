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
}
