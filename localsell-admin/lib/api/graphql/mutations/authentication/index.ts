import { gql } from '@apollo/client';
export { REFRESH_TOKEN } from './refresh';

export const VERIFY_MY_PASSWORD = gql`
  mutation VerifyMyPassword($password: String!) {
    verifyMyPassword(password: $password)
  }
`;

export const OWNER_LOGIN = gql`
  mutation ownerLogin($email: String!, $password: String!) {
    ownerLogin(email: $email, password: $password) {
      userId
      token
      tokenExpiration
      refreshToken
      refreshTokenExpiration
      email
      userType
      restaurants {
        _id
        orderId
        name
        image
        address
      }
      permissions
      userTypeId
      image
      name
    }
  }
`;
