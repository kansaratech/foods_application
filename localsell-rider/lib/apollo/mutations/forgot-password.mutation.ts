import { gql } from "@apollo/client";

// A rider is a regular User row, so the platform's OTP reset (email or phone)
// works here too (QA #43).
export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String, $phone: String) {
    forgotPassword(email: $email, phone: $phone) {
      result
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword(
    $password: String!
    $email: String
    $phone: String
    $otp: String
  ) {
    resetPassword(password: $password, email: $email, phone: $phone, otp: $otp) {
      result
    }
  }
`;
