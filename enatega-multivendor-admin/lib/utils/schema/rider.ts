import * as Yup from 'yup';

export const RiderSchema = Yup.object().shape({
  name: Yup.string()
    .max(35)
    .trim()
    .matches(/\S/, 'Name cannot be only spaces')
    .required('Required'),
  email: Yup.string().email('Enter a valid email').required('Required'),
  username: Yup.string().min(2).max(35).required('Required'),
  // Only required when the admin turns off "Send account setup link" and
  // sets a password manually — mirrors the vendor registration form.
  password: Yup.string().when('sendSetupLink', {
    is: false,
    then: (schema) =>
      schema
        .required('Required')
        .min(6, 'At least 6 characters')
        .matches(/[a-z]/, 'At least one lowercase letter (a-z)')
        .matches(/[A-Z]/, 'At least one uppercase letter (A-Z)')
        .matches(/[0-9]/, 'At least one number (0-9)')
        .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'At least one special character'),
    otherwise: (schema) => schema.notRequired(),
  }),
  confirmPassword: Yup.string().when('sendSetupLink', {
    is: false,
    then: (schema) => schema.nullable().oneOf([Yup.ref('password'), null], 'Password must match').required('Required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  zone: Yup.object()
    .shape({
      label: Yup.string().required('Required'),
      code: Yup.string().required('Required'),
    })
    .required('Required'),
  phone: Yup.string().required('Required').min(5, 'Minimum 5 Numbers are Required'),
  vehicleType: Yup.object()
    .shape({
      label: Yup.string().required('Required'),
      code: Yup.string().required('Required'),
    })
    .required('Required'),
  vehicleNumber: Yup.string().notRequired(),
  employmentType: Yup.string().oneOf(['INDEPENDENT', 'STORE_ASSIGNED']).required('Required'),
});
