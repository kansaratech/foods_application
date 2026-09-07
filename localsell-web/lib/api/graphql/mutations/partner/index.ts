import { gql } from "@apollo/client";

export const SUBMIT_PARTNER_APPLICATION = gql`
  mutation SubmitPartnerApplication(
    $role: String!
    $firstName: String!
    $lastName: String!
    $email: String!
    $phone: String!
  ) {
    submitPartnerApplication(
      role: $role
      firstName: $firstName
      lastName: $lastName
      email: $email
      phone: $phone
    )
  }
`;
