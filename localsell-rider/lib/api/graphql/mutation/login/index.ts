import { gql } from "@apollo/client";

export const RIDER_LOGIN = gql`
  mutation RiderLogin(
    $username: String
    $password: String
    $notificationToken: String
    $timeZone: String!
  ) {
    riderLogin(
      username: $username
      password: $password
      notificationToken: $notificationToken
      timeZone: $timeZone
    ) {
      userId
      token
    }
  }
`;

export const RIDER_SELF_REGISTER = gql`
  mutation RiderSelfRegister(
    $name: String!
    $phone: String!
    $email: String
    $password: String!
    $vehicleType: String
    $vehicleNumber: String
  ) {
    riderSelfRegister(
      name: $name
      phone: $phone
      email: $email
      password: $password
      vehicleType: $vehicleType
      vehicleNumber: $vehicleNumber
    ) {
      userId
      token
    }
  }
`;
