import { IDropdownSelectItem } from '../global.interface';

export type IBannersForm = {
  title: string;
  description: string;
  action: IDropdownSelectItem | null;
  screen: IDropdownSelectItem | null;
  file: string;
  placement: IDropdownSelectItem | null;
  priority: number;
  couponCode: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export interface IBannersErrors {
  title: string[];
  description: string[];
  action: string[];
  screen: string[];
  file: string[];
  placement: string[];
  priority: string[];
  couponCode: string[];
  startDate: string[];
  endDate: string[];
}
