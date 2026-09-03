import { gql } from '@apollo/client';

export const CLOSE_COMMISSION_PERIOD = gql`
  mutation CloseCommissionPeriod($periodStart: String, $periodEnd: String) {
    closeCommissionPeriod(periodStart: $periodStart, periodEnd: $periodEnd) {
      _id
      vendor {
        name
      }
      commissionTotal
      orderCount
      status
    }
  }
`;

export const UPDATE_COMMISSION_BILL_STATUS = gql`
  mutation UpdateCommissionBillStatus(
    $id: ID!
    $status: String!
    $paidAmount: Float
    $note: String
  ) {
    updateCommissionBillStatus(
      id: $id
      status: $status
      paidAmount: $paidAmount
      note: $note
    ) {
      _id
      status
      paidAt
      paidAmount
      note
    }
  }
`;

export const RECORD_RIDER_CASH_REMITTANCE = gql`
  mutation RecordRiderCashRemittance(
    $riderId: ID!
    $amount: Float
    $method: String
    $note: String
  ) {
    recordRiderCashRemittance(riderId: $riderId, amount: $amount, method: $method, note: $note) {
      _id
      amount
      entryCount
      method
      createdAt
    }
  }
`;

export const SAVE_COMMISSION_CONFIGURATION = gql`
  mutation SaveCommissionConfiguration(
    $configurationInput: CommissionConfigurationInput!
  ) {
    saveCommissionConfiguration(configurationInput: $configurationInput) {
      _id
      defaultCommissionRate
      commissionBillingCycle
      defaultLatitude
      defaultLongitude
    }
  }
`;
