import * as Yup from "yup";

export const SignInSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"),
  password: Yup.string().required("Password cannot be empty"),
});

export const RiderRegisterSchema = Yup.object().shape({
  name: Yup.string().trim().required("Name is required"),
  phone: Yup.string()
    .trim()
    .min(7, "Enter a valid phone number")
    .required("Phone number is required"),
  email: Yup.string().email("Invalid email"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
  vehicleNumber: Yup.string(),
});
