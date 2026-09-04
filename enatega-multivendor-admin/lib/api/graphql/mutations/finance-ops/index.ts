import { gql } from '@apollo/client';

export const ADJUST_WALLET = gql`
  mutation AdjustWallet(
    $subjectType: String!
    $subjectId: ID!
    $amount: Float!
    $reason: String!
    $note: String
  ) {
    adjustWallet(
      subjectType: $subjectType
      subjectId: $subjectId
      amount: $amount
      reason: $reason
      note: $note
    ) {
      _id
      amount
      reason
      subjectName
      createdAt
    }
  }
`;

export const CREATE_PAYOUT_RUN = gql`
  mutation CreatePayoutRun(
    $label: String
    $periodStart: String
    $periodEnd: String
    $minAmount: Float
    $includeStores: Boolean
    $includeRiders: Boolean
  ) {
    createPayoutRun(
      label: $label
      periodStart: $periodStart
      periodEnd: $periodEnd
      minAmount: $minAmount
      includeStores: $includeStores
      includeRiders: $includeRiders
    ) {
      _id
      label
      itemCount
      grossTotal
      status
    }
  }
`;

export const MARK_PAYOUT_ITEM_PAID = gql`
  mutation MarkPayoutItemPaid($id: ID!, $method: String, $reference: String, $note: String) {
    markPayoutItemPaid(id: $id, method: $method, reference: $reference, note: $note) {
      _id
      status
      method
      reference
      paidAt
    }
  }
`;

export const SKIP_PAYOUT_ITEM = gql`
  mutation SkipPayoutItem($id: ID!, $note: String) {
    skipPayoutItem(id: $id, note: $note) {
      _id
      status
      note
    }
  }
`;

export const COMPLETE_PAYOUT_RUN = gql`
  mutation CompletePayoutRun($id: ID!) {
    completePayoutRun(id: $id) {
      _id
      status
      paidTotal
      completedAt
    }
  }
`;
