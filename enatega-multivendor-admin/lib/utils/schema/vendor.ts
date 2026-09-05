import * as Yup from 'yup';
// import { PasswordErrors } from '../constants';
import { IDropdownSelectItem } from '../interfaces';
import { isValidIndianMobile } from '../methods';

// Standard 15-character GSTIN structure: 2-digit state code, 10-char PAN,
// 1-digit entity code, 'Z' by convention, 1-char checksum.
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const passwordStrengthTest = (value: string | undefined) =>
  !!value &&
  value.length >= 6 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value);

// IFSC: 4-letter bank code + 0 + 6-char branch code.
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// 4-step vendor registration wizard (see VendorRegistrationScreen). Split
// per-step so "Continue" can validate just the step in front of the admin,
// while VendorRegistrationSchema (the union of all four) still gates the
// final "Create vendor" submit on the Review step.

export const vendorAccountStepSchema = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .min(2, 'At least 2 characters')
    .max(50, 'At most 50 characters')
    .matches(/\S/, 'First name cannot be only spaces')
    .required('Required'),
  lastName: Yup.string()
    .trim()
    .min(1, 'At least 1 character')
    .max(50, 'At most 50 characters')
    .matches(/\S/, 'Last name cannot be only spaces')
    .required('Required'),
  email: Yup.string()
    .trim()
    .email('Enter a valid email address')
    .required('Required'),
  phoneNumber: Yup.string()
    .required('Required')
    .test(
      'is-valid-indian-mobile',
      'Enter a valid 10-digit mobile number',
      (value) => isValidIndianMobile(value)
    ),
  image: Yup.string().notRequired(),
  sendSetupLink: Yup.boolean().required(),
  password: Yup.string().when('sendSetupLink', {
    is: false,
    then: (schema) =>
      schema
        .required('Required')
        .test(
          'password-strength',
          'At least 6 characters, one lowercase, one uppercase, one number, and one special character',
          passwordStrengthTest
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  confirmPassword: Yup.string().when('sendSetupLink', {
    is: false,
    then: (schema) =>
      schema
        .required('Required')
        .oneOf([Yup.ref('password')], 'Password must match'),
    otherwise: (schema) => schema.notRequired(),
  }),
});

export const vendorBusinessKycStepSchema = Yup.object().shape({
  businessName: Yup.string()
    .trim()
    .min(2, 'At least 2 characters')
    .max(120, 'At most 120 characters')
    .required('Required'),
  businessType: Yup.mixed<IDropdownSelectItem>()
    .nullable()
    .required('Required'),
  isGstRegistered: Yup.boolean().required(),
  gstin: Yup.string().when('isGstRegistered', {
    is: true,
    then: (schema) =>
      schema
        .required('Required')
        .test(
          'is-valid-gstin',
          'Enter a valid 15-character GSTIN',
          (value) => !!value && GSTIN_REGEX.test(value.toUpperCase())
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  panFileUrl: Yup.string().required('Upload a PAN card scan to continue'),
  gstCertFileUrl: Yup.string().notRequired(),
});

// Payout is optional end to end (no backend contract makes it mandatory) —
// but once the admin starts filling it in, keep the fields internally
// consistent rather than silently accepting a half-entered bank account.
export const vendorPayoutStepSchema = Yup.object().shape({
  payoutHolderName: Yup.string().notRequired(),
  payoutAccountNumber: Yup.string().notRequired(),
  payoutBankName: Yup.string().notRequired(),
  payoutIfsc: Yup.string().when('payoutAccountNumber', {
    is: (value: string) => !!value,
    then: (schema) =>
      schema
        .required('IFSC is required once an account number is entered')
        .test('is-valid-ifsc', 'Enter a valid IFSC code', (value) => !!value && IFSC_REGEX.test(value.toUpperCase())),
    otherwise: (schema) =>
      schema.test('is-valid-ifsc', 'Enter a valid IFSC code', (value) => !value || IFSC_REGEX.test(value.toUpperCase())),
  }),
});

export const VendorRegistrationSchema = vendorAccountStepSchema
  .concat(vendorBusinessKycStepSchema)
  .concat(vendorPayoutStepSchema);

export const VendorSchema = Yup.object().shape({
  // name: Yup.string()
  //   .max(35)
  //   .trim()
  //   .matches(/\S/, 'Name cannot be only spaces')
  //   .required('Required'),

  // Why there are more than one name fields?, in some place its asking for only name and in some it is asking for both first and last names... (please choose one either 'name' or 'firstName & lastName')
  firstName: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'First name cannot be only spaces')
    .required('Required'),
  lastName: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Last name cannot be only spaces')
    .required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string()
    .required('Required')
    .min(6, 'At least 6 characters')
    .matches(/[a-z]/, 'At least one lowercase letter (a-z)')
    .matches(/[A-Z]/, 'At least one uppercase letter (A-Z)')
    .matches(/[0-9]/, 'At least one number (0-9)')
    .matches(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      'At least one special character'
    ),
  confirmPassword: Yup.string()
    .nullable()
    .oneOf([Yup.ref('password'), null], 'Password must match')
    .required('Required'),
  image: Yup.string().required('Image is required'),
  phoneNumber: Yup.string()
    .required('Required')
    .min(5, 'Minimum 5 Numbers are Required'),
});

// Creating separate schema for store vendor form
export const VendorSchemaForStoreForm = Yup.object().shape({
  name: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().required('Required'),
  confirmPassword: Yup.string()
    .nullable()
    .oneOf([Yup.ref('password'), null], 'Password must match')
    .required('Required'),
  image: Yup.string().required('Image is required'),
});

export const VendorEditSchema = Yup.object().shape({
  name: Yup.string().trim().matches(/\S/, 'Name cannot be only spaces'),
  email: Yup.string().email('Invalid email').required('Required'),
  // Password fields are optional here: this is a profile-edit form, not a
  // create-vendor form, so leaving them blank must not block saving other
  // changes (name/phone/etc). Only validate strength/match when the vendor
  // is actually setting a new password.
  password: Yup.string()
    .notRequired()
    .test(
      'password-strength',
      'At least 6 characters, one lowercase, one uppercase, one number, and one special character',
      (value) =>
        !value ||
        (value.length >= 6 &&
          /[a-z]/.test(value) &&
          /[A-Z]/.test(value) &&
          /[0-9]/.test(value) &&
          /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value))
    ),
  confirmPassword: Yup.string()
    .nullable()
    .test('passwords-match', 'Password must match', function (value) {
      const { password } = this.parent;
      if (!password) return true;
      return value === password;
    }),
  image: Yup.string().required(),
  phoneNumber: Yup.string()
    .required('Required')
    .min(5, 'Minimum 5 Numbers are Required'),
  firstName: Yup.string()
    .trim()
    .matches(/\S/, 'First Name cannot be only spaces')
    .required('Required'),
  lastName: Yup.string()
    .trim()
    .matches(/\S/, 'Last Name cannot be only spaces')
    .required('Required'),
});

export const RestaurantsVendorDetails = Yup.object().shape({
  _id: Yup.mixed<IDropdownSelectItem>().required('Required'),
});

export const VendorSchemaOnStoreCreate = Yup.object().shape({
  // name: Yup.string()
  // .max(35)
  // .trim()
  // .matches(/\S/, 'Name cannot be only spaces')
  // .required('Required'),
  firstName: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'First name cannot be only spaces')
    .required('Required'),
  lastName: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Last name cannot be only spaces')
    .required('Required'),
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string()
    .required('Required')
    .min(6, 'At least 6 characters')
    .matches(/[a-z]/, 'At least one lowercase letter (a-z)')
    .matches(/[A-Z]/, 'At least one uppercase letter (A-Z)')
    .matches(/[0-9]/, 'At least one number (0-9)')
    .matches(
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      'At least one special character'
    ),
  confirmPassword: Yup.string()
    .nullable()
    .oneOf([Yup.ref('password'), null], 'Password must match')
    .required('Required'),
 image: Yup.string().required('Image is required'),
  phoneNumber: Yup.string()
    .required('Required')
    .min(5, 'Minimum 5 Numbers are Required'),
});
