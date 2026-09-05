import * as Yup from 'yup';
import { IDropdownSelectItem } from '../interfaces';

// Blank is always allowed (edit screens use it to mean "leave unchanged");
// once a value is typed it must be a real strong password and must match
// confirmPassword — previously only a non-blocking toast checked this.
const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

export const RestaurantSchema = Yup.object().shape({
  name: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  username: Yup.string().email('Invalid email').required('Required'),
    address: Yup.string()
    .max(100, 'Maximum 100 characters allowed')
    .trim()
    .matches(/\S/, 'Address cannot be only spaces')
    .matches(/[a-zA-Z]/, 'Address must contain at least one letter.')
    .required('Required'),
  
  deliveryTime: Yup.number()
    .required('Required')
    .min(1, 'The value must be greater than or equal to 1'),
  minOrder: Yup.number()
    .required('Required')
    .min(1, 'The value must be greater than or equal to 1'),
  shopType: Yup.mixed<IDropdownSelectItem>().required('Required'),
  cuisines: Yup.array()
    .of(Yup.mixed<IDropdownSelectItem>())
    .min(1, 'Cuisines field must have at least 1 items')
    .required('Required'),

image: Yup.string().matches(/^http/, 'Invalid image URL').required('Required'),
logo: Yup.string().matches(/^http/, 'Invalid logo URL').required('Required'),
  phoneNumber: Yup.string().required('Required').min(5,"Minimum 5 Numbers are Required"),
  password: Yup.string().test(
    'strong-password',
    'Password must be at least 6 characters and include an uppercase letter, a lowercase letter, a number and a special character',
    (value) => !value || strongPasswordRegex.test(value)
  ),
  confirmPassword: Yup.string().test(
    'passwords-match',
    'Passwords must match',
    function (value) {
      const { password } = this.parent;
      if (!password) return true;
      return value === password;
    }
  ),
});
