import { gql } from '@apollo/client';

export const GET_COMMISSION_PERIOD_PREVIEW = gql`
  query CommissionPeriodPreview {
    commissionPeriodPreview {
      periodStart
      periodEnd
      cycle
      unbilledOrderCount
      unbilledCommissionTotal
      rows {
        vendor {
          _id
          name
          email
          phone
        }
        orderCount
        grossFoodSubtotal
        commissionTotal
      }
    }
  }
`;

export const GET_COMMISSION_BILLS = gql`
  query CommissionBills($status: String, $vendorId: ID, $page: Int, $limit: Int) {
    commissionBills(status: $status, vendorId: $vendorId, page: $page, limit: $limit) {
      total
      bills {
        _id
        vendor {
          _id
          name
          email
        }
        periodStart
        periodEnd
        cycle
        orderCount
        grossFoodSubtotal
        commissionTotal
        status
        paidAt
        paidAmount
        note
        createdAt
      }
    }
  }
`;

export const GET_MY_COMMISSION_SUMMARY = gql`
  query MyCommissionSummary {
    myCommissionSummary {
      cycle
      currentPeriodStart
      currentPeriodEnd
      currentPeriodCommission
      currentPeriodOrderCount
      outstandingTotal
      bills {
        _id
        periodStart
        periodEnd
        orderCount
        commissionTotal
        status
        paidAt
      }
    }
  }
`;

export const GET_RIDER_CASH_OUTSTANDING = gql`
  query RiderCashOutstanding {
    riderCashOutstanding {
      rider {
        _id
        name
        username
        phone
      }
      entryCount
      outstanding
      oldestUnremittedAt
    }
  }
`;

export const GET_RIDER_CASH_SUMMARY = gql`
  query RiderCashSummary($riderId: ID!) {
    riderCashSummary(riderId: $riderId) {
      rider {
        _id
        name
        username
        phone
      }
      outstanding
      lifetimeCollected
      lifetimeRemitted
      cashLimit
      walletBalance
      availableToWithdraw
      entries {
        _id
        orderNumber
        collectedTotal
        riderKeeps
        owedToPlatform
        deliveredAt
        remitted
      }
      remittances {
        _id
        amount
        entryCount
        method
        note
        createdAt
      }
    }
  }
`;

export const GET_PLATFORM_FINANCE_REPORT = gql`
  query PlatformFinanceReport($startDate: String, $endDate: String) {
    platformFinanceReport(startDate: $startDate, endDate: $endDate) {
      periodStart
      periodEnd
      orderVolume
      deliveredOrders
      commissionAccrued
      commissionBilled
      commissionPaid
      commissionOutstanding
      storePayouts
      taxCollected
      riderPayouts
      codCashCollected
      codCashRemitted
      codCashOutstanding
      perVendor {
        vendor {
          _id
          name
          email
        }
        orders
        foodSubtotal
        commission
      }
      perRider {
        rider {
          _id
          name
          username
        }
        deliveries
        earned
        cashCollected
        cashOutstanding
      }
    }
  }
`;

export const GET_COMMISSION_BILL = gql`
  query CommissionBill($id: ID!) {
    commissionBill(id: $id) {
      bill {
        _id
        vendor {
          _id
          name
          email
        }
        periodStart
        periodEnd
        orderCount
        grossFoodSubtotal
        commissionTotal
        status
        paidAt
        paidAmount
        note
      }
      records {
        _id
        orderNumber
        storeName
        foodSubtotal
        commissionRate
        commissionAmount
        orderDeliveredAt
      }
    }
  }
`;
