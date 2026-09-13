import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IUpdateProfileFormErrors {
  name: string[];
  username: string[];
  password: string[];
  confirmPassword: string[];
  address: string[];
  deliveryTime: string[];
  minOrder: string[];
  salesTax: string[];
  gstin: string[];
  shopType: string[];
  cuisines: string[];
  image: string[];
  logo: string[];
  email: string[];
  orderprefix: string[];
}

export interface IUpdateBussinessDetailsFormErrors {
  bankName: string[];
  accountName: string[];
  accountCode: string[];
  accountNumber: string[];
  bussinessRegNo: string[];
  companyRegNo: string[];
}

export interface IUpdateProfileForm {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  address: string;
  deliveryTime: number;
  minOrder: number;
  salesTax: number;
  gstRegistrationType: IDropdownSelectItem | null;
  gstin: string;
  shopType: IDropdownSelectItem | null;
  cuisines: IDropdownSelectItem[];
  image: string;
  logo: string;
  email: string;
  orderprefix: string;
}
