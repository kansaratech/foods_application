import { IDropdownSelectItem } from '../global.interface';

// Errors
export interface IVendorErrors {
  _id: string[];
  name: string[];
  email: string[];
  password: string[];
  confirmPassword: string[];
  image: string[];
  firstName: string[];
  lastName: string[];
  phoneNumber: string[];
}

export interface IVendorForm {
  
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
  image?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

// 4-step vendor registration wizard (Localsell admin): Account → Business &
// KYC → Payout → Review. Store-level details (address, timings, delivery
// fee, GST rate, ...) are deliberately not part of this form — they belong
// to the store, created afterwards.
export interface IVendorRegistrationForm {
  // Set once the wizard's first draft save succeeds; carried through every
  // later save so each step updates the same vendor row instead of creating
  // a new one.
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  image?: string;
  sendSetupLink: boolean;
  password: string;
  confirmPassword: string;
  businessName: string;
  businessType: IDropdownSelectItem | null;
  isGstRegistered: boolean;
  gstin: string;
  // Business & KYC — documents
  panFileUrl: string;
  gstCertFileUrl: string;
  // Payout — all optional per spec; only validated if the admin starts
  // filling one of them in.
  payoutHolderName: string;
  payoutAccountNumber: string;
  payoutIfsc: string;
  payoutBankName: string;
}

export interface IRestauransVendorDetailsForm {
  _id: IDropdownSelectItem | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  image?: string;
  phoneNumber?: string;
}
