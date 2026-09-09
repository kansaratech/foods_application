import { gql } from '@apollo/client';

export const UPDATE_USER_STATUS = gql`
  mutation updateUserStatus($id: ID!, $status: String!, $reason: String) {
    updateUserStatus(id: $id, status: $status, reason: $reason) {
      _id
      status
    }
  }
`;

export const UPDATE_USER_NOTES = gql`
  mutation updateUserNotes($id: ID!, $notes: String!) {
    updateUserNotes(id: $id, notes: $notes) {
      _id
      notes
    }
  }
`;

export const DELETE_USER = gql`
  mutation deleteUser($id: ID!) {
    deleteUser(id: $id) {
      _id
    }
  }
`;

export const CHANGE_MY_PASSWORD = gql`
  mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
    changePassword(oldPassword: $oldPassword, newPassword: $newPassword)
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String, $phone: String) {
    forgotPassword(email: $email, phone: $phone) {
      result
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($password: String!, $email: String, $phone: String, $otp: String) {
    resetPassword(password: $password, email: $email, phone: $phone, otp: $otp) {
      result
    }
  }
`;

export const RESET_USER_SESSION = gql`
  mutation resetUserSession($userId: ID!) {
    resetUserSession(userId: $userId) {
      _id
    }
  }
`;
