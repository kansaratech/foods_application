import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IRestaurantFormErrors {
  name: string[];
  username: string[];
  password: string[];
  confirmPassword: string[];
  address: string[];
  deliveryTime: string[];
  minOrder: string[];
  salesTax: string[];
  gstin: string[];
  commissionRate: string[];
  shopType: string[];
  cuisines: string[];
  image: string[];
  logo: string[];
  phoneNumber: string[];
}

export interface IRestaurantForm {
  name: string;
  username: string;
  password: string;
  phoneNumber?:string;
  confirmPassword: string;
  address: string;
  deliveryTime: number;
  minOrder: number;
  salesTax: number;
  // Null = inherit the owning vendor's declared GST status (the default);
  // set explicitly here for a multi-store vendor whose stores hold different
  // GSTINs (e.g. one per state).
  gstRegistrationType: IDropdownSelectItem | null;
  gstin: string;
  // Null = platform default (Configuration.defaultCommissionRate). Only the
  // super-admin store form exposes this as editable; the vendor's own store
  // form shows the platform default read-only instead.
  commissionRate: number | null;
  shopType: IDropdownSelectItem | null;
  cuisines: IDropdownSelectItem[];
  image: string;
  logo: string;
}


export interface IRestaurantDeliveryForm {
  minDeliveryFee: number | null;
  deliveryDistance: number | null;
  deliveryFee: number | null;
}

export interface IRestaurantDeliveryFormErrors {
  minDeliveryFee: string[];
  deliveryDistance: string[];
  deliveryFee: string[];
}
