import { gql } from "@apollo/client";

export const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: JoinWaitlistInput!) {
    joinWaitlist(input: $input)
  }
`;
