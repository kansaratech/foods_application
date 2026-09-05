import { gql } from "@apollo/client";

export const CREATE_WITHDRAW_REQUEST = gql`
  mutation Mutation($requestAmount: Float!) {
    createWithdrawRequest(requestAmount: $requestAmount) {
      status
    }
  }
`;

export const RIDER_REPORT_DEPOSIT = gql`
  mutation RiderReportDeposit($amount: Float!, $method: String, $reference: String, $note: String) {
    riderReportDeposit(amount: $amount, method: $method, reference: $reference, note: $note) {
      _id
      amount
      status
    }
  }
`;
