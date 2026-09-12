import { Dispatch, SetStateAction } from "react";
import { IGlobalComponentProps } from "./global.interface";
import { IFood, IOption, IRestaurant } from "./restaurants.interface";
import { IAddon } from "./orders.interface";

export interface IFoodItemDetalComponentProps extends IGlobalComponentProps {
  foodItem: IFood | null;
  addons: IAddon[];
  options: IOption[];
  restaurant?: IRestaurant;
  onClose?: () => void;
  isRecommendedProduct?: boolean | false;
}

export interface Option {
  _id: string;
  title: string;
  price: number;
  isOutOfStock?: boolean;
  // How many units of this option are selected (e.g. 2x Tawa Roti). Only
  // meaningful once an option is picked; absent/1 means a single unit.
  quantity?: number;
}

export interface SectionProps<T extends { _id: string }> {
  title?: string | undefined;
  options: T[];
  name: string;

  singleSelected?: T | null;
  multiSelected?: T[] | null;
  onSingleSelect?: Dispatch<SetStateAction<T | null>>;
  onMultiSelect?: Dispatch<SetStateAction<T[] | null>>;
  multiple?: boolean;
  requiredTag?: string;
  showTag?: boolean;
  // When set, a checked multi-select option gets a +/- stepper (e.g. "2x
  // Tawa Roti") instead of just a checkbox. Ignored for single-select.
  onOptionQuantityChange?: (optionId: string, quantity: number) => void;
}
export interface AddonSectionProps<T extends { _id: string }> {
  title: string;
  addonOptions: T;
  name: string;

  multiSelected: T[] | null;
  onMultiSelect: Dispatch<SetStateAction<T[] | null>>;
  multiple?: boolean;
}
