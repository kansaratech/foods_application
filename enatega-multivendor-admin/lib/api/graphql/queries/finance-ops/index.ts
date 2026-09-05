import { gql } from '@apollo/client';

export const GET_WALLET_ADJUSTMENTS = gql`
  query WalletAdjustments($subjectType: String, $subjectId: ID, $page: Int, $limit: Int) {
    walletAdjustments(subjectType: $subjectType, subjectId: $subjectId, page: $page, limit: $limit) {
      total
      adjustments {
        _id
        subjectType
        subjectId
        subjectName
        amount
        reason
        note
        createdByEmail
        createdAt
      }
    }
  }
`;

export const GET_PAYOUT_RUNS = gql`
  query PayoutRuns($page: Int, $limit: Int) {
    payoutRuns(page: $page, limit: $limit) {
      total
      runs {
        _id
        label
        periodStart
        periodEnd
        status
        itemCount
        grossTotal
        paidTotal
        createdAt
        completedAt
      }
    }
  }
`;

export const GET_PAYOUT_RUN = gql`
  query PayoutRun($id: ID!) {
    payoutRun(id: $id) {
      _id
      label
      periodStart
      periodEnd
      status
      itemCount
      grossTotal
      paidTotal
      note
      createdAt
      completedAt
      items {
        _id
        subjectType
        subjectId
        payeeName
        walletBalance
        heldCash
        amount
        status
        method
        reference
        note
        paidAt
        statement {
          statementNumber
          issuedOn
          periodLabel
          runLabel
          platformName
          platformAddress
          platformGstin
          payeeType
          payeeName
          walletBalance
          heldCash
          amount
          status
          method
          reference
          paidAt
        }
      }
    }
  }
`;

export const GET_PAYOUT_RUN_CSV = gql`
  query PayoutRunCsv($id: ID!) {
    payoutRunCsv(id: $id)
  }
`;

export const GET_MY_PAYOUT_HISTORY = gql`
  query MyPayoutHistory($page: Int, $limit: Int) {
    myPayoutHistory(page: $page, limit: $limit) {
      total
      items {
        _id
        payeeName
        walletBalance
        heldCash
        amount
        status
        method
        reference
        paidAt
        runLabel
        periodStart
        periodEnd
        statement {
          statementNumber
          issuedOn
          periodLabel
          runLabel
          platformName
          platformAddress
          platformGstin
          payeeType
          payeeName
          walletBalance
          heldCash
          amount
          status
          method
          reference
          paidAt
        }
      }
    }
  }
`;

export const GET_RECONCILIATION_REPORT = gql`
  query ReconciliationReport($startDate: String, $endDate: String) {
    reconciliationReport(startDate: $startDate, endDate: $endDate) {
      periodStart
      periodEnd
      generatedAt
      storeWalletOutstanding
      riderWalletOutstanding
      negativeWalletStores
      negativeWalletRiders
      pendingRiderDeposits
      pendingRiderDepositTotal
      lines {
        label
        expected
        actual
        delta
        ok
      }
    }
  }
`;
