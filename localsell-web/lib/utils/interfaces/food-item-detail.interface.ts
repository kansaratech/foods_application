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
  // Lets a single-select (radio) section be cleared by clicking the already-
  // selected option again. Only meaningful when the section is optional -
  // a required single-select (e.g. variation) must always keep a selection.
  allowDeselect?: boolean;
  // Caps how many distinct options a multi-select group can have checked at
  // once (addon.quantityMaximum, when > 1) — without this, "pick up to N"
  // groups let a customer check any number, only to have the order rejected
  // server-side at placeOrder time (Issue 116).
  maxSelections?: number | null;
}
export interface AddonSectionProps<T extends { _id: string }> {
  title: string;
  addonOptions: T;
  name: string;

  multiSelected: T[] | null;
  onMultiSelect: Dispatch<SetStateAction<T[] | null>>;
  multiple?: boolean;
}
