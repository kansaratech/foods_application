import { IDropdownSelectItem } from '../global.interface';
import { TRiderEmploymentType } from '../rider.interface';

export interface IRiderForm {
  _id?: string;
  name: string;
  email: string;
  image: string;
  username: string;
  password: string;
  confirmPassword: string;
  sendSetupLink: boolean;
  isActive: boolean;
  zone: IDropdownSelectItem | null;
  phone: string;
  vehicleType: IDropdownSelectItem | null;
  vehicleNumber: string;
  employmentType: TRiderEmploymentType;
}

export interface IRiderErrors {
  name: string[];
  username: string[];
  password: string[];
  confirmPassword: string[];
  zone: string[];
  phone: string[];
  vehicleType: string[];
}
