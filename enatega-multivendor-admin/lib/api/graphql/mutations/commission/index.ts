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
      riderCashLimit
      platformLegalName
      platformAddress
      platformGstin
      defaultLatitude
      defaultLongitude
    }
  }
`;

export const RIDER_REPORT_DEPOSIT = gql`
  mutation RiderReportDeposit($riderId: ID, $amount: Float!, $method: String, $reference: String, $note: String) {
    riderReportDeposit(riderId: $riderId, amount: $amount, method: $method, reference: $reference, note: $note) {
      _id
      amount
      status
    }
  }
`;

export const CONFIRM_RIDER_CASH_DEPOSIT = gql`
  mutation ConfirmRiderCashDeposit($id: ID!, $approve: Boolean!, $note: String) {
    confirmRiderCashDeposit(id: $id, approve: $approve, note: $note) {
      _id
      status
      amount
      entryCount
      confirmedAt
    }
  }
`;

export const SET_STORE_APPROVAL = gql`
  mutation SetStoreApproval($id: String!, $status: String!, $note: String) {
    setStoreApproval(id: $id, status: $status, note: $note) {
      _id
      approvalStatus
      approvalNote
      approvedAt
      isActive
    }
  }
`;
