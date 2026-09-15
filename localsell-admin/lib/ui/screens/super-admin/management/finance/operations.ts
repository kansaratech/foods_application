import { gql } from '@apollo/client';
export const BILL_FIELDS = gql`
  fragment CollectionBill on CommissionBill {
    _id
    invoiceNumber
    vendor {
      _id
      name
      email
      phone
    }
    periodStart
    periodEnd
    orderCount
    grossFoodSubtotal
    commissionTotal
    paidAmount
    outstandingAmount
    paidAt
    status
    createdAt
    note
  }
`;
export const PAYMENT_FIELDS = gql`
  fragment CollectionReceipt on CommissionPayment {
    _id
    receiptNumber
    billId
    invoiceNumber
    vendor {
      _id
      name
      email
    }
    amount
    method
    reference
    note
    receivedAt
    createdAt
  }
`;
export const COLLECTION_OVERVIEW = gql`
  query CollectionOverview {
    commissionCollectionOverview {
      unbilled
      outstanding
      collected
      openBills
      vendorsOwing
      pendingBills {
        ...CollectionBill
      }
      recentReceipts {
        ...CollectionReceipt
      }
    }
  }
  ${BILL_FIELDS}
  ${PAYMENT_FIELDS}
`;
export const COLLECTION_BILLS = gql`
  query CollectionBills(
    $status: String
    $page: Int
    $limit: Int
    $search: String
    $startDate: String
    $endDate: String
  ) {
    commissionBills(
      status: $status
      page: $page
      limit: $limit
      search: $search
      startDate: $startDate
      endDate: $endDate
    ) {
      total
      bills {
        ...CollectionBill
      }
    }
  }
  ${BILL_FIELDS}
`;
export const COLLECTION_DETAIL = gql`
  query CollectionDetail($id: ID!) {
    commissionBill(id: $id) {
      bill {
        ...CollectionBill
        payments {
          ...CollectionReceipt
        }
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
      invoice {
        platformName
        platformAddress
        platformGstin
        vendorName
        vendorEmail
        invoiceNumber
        periodLabel
      }
    }
  }
  ${BILL_FIELDS}
  ${PAYMENT_FIELDS}
`;
export const COLLECTION_RECEIPTS = gql`
  query CollectionReceipts(
    $startDate: String
    $endDate: String
    $page: Int
    $limit: Int
  ) {
    commissionPayments(
      startDate: $startDate
      endDate: $endDate
      page: $page
      limit: $limit
    ) {
      total
      payments {
        ...CollectionReceipt
      }
    }
  }
  ${PAYMENT_FIELDS}
`;
export const RECORD_COLLECTION = gql`
  mutation RecordCollection(
    $billId: ID!
    $amount: Float!
    $method: String!
    $reference: String
    $note: String
    $receivedAt: String!
    $idempotencyKey: String!
  ) {
    recordCommissionPayment(
      billId: $billId
      amount: $amount
      method: $method
      reference: $reference
      note: $note
      receivedAt: $receivedAt
      idempotencyKey: $idempotencyKey
    ) {
      ...CollectionReceipt
    }
  }
  ${PAYMENT_FIELDS}
`;
export const VENDOR_PAYABLE_FIELDS = gql`
  fragment VendorPayableRow on VendorPayable {
    _id
    orderId
    orderNumber
    vendor {
      _id
      name
      email
      phone
    }
    storeName
    orderAmount
    commissionAmount
    netPayable
    status
    orderDeliveredAt
    createdAt
  }
`;
export const VENDOR_PAYOUT_FIELDS = gql`
  fragment VendorPayoutRow on VendorPayout {
    _id
    vendor {
      _id
      name
      email
    }
    amount
    method
    reference
    note
    paidAt
    createdAt
  }
`;
export const VENDOR_PAYOUT_OVERVIEW = gql`
  query VendorPayoutOverview {
    vendorPayoutOverview {
      pendingTotal
      pendingOrderCount
      vendorsOwed
      recentPayouts {
        ...VendorPayoutRow
      }
    }
  }
  ${VENDOR_PAYOUT_FIELDS}
`;
export const VENDOR_PAYABLES = gql`
  query VendorPayables($vendorId: ID, $status: String, $page: Int, $limit: Int) {
    vendorPayables(vendorId: $vendorId, status: $status, page: $page, limit: $limit) {
      total
      payables {
        ...VendorPayableRow
      }
    }
  }
  ${VENDOR_PAYABLE_FIELDS}
`;
export const RECORD_VENDOR_PAYOUT = gql`
  mutation RecordVendorPayout(
    $vendorId: ID!
    $payableIds: [ID!]!
    $method: String!
    $reference: String
    $note: String
    $paidAt: String!
    $idempotencyKey: String!
  ) {
    recordVendorPayout(
      vendorId: $vendorId
      payableIds: $payableIds
      method: $method
      reference: $reference
      note: $note
      paidAt: $paidAt
      idempotencyKey: $idempotencyKey
    ) {
      ...VendorPayoutRow
    }
  }
  ${VENDOR_PAYOUT_FIELDS}
`;
export type VendorPayable = {
  _id: string;
  orderId: string;
  orderNumber: string;
  vendor?: Vendor;
  storeName?: string;
  orderAmount: number;
  commissionAmount: number;
  netPayable: number;
  status: string;
  orderDeliveredAt: string;
  createdAt: string;
};
export type Vendor = { _id: string; name?: string; email?: string };
export type Receipt = {
  _id: string;
  receiptNumber: string;
  billId: string;
  invoiceNumber?: string;
  vendor?: Vendor;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  receivedAt: string;
};
export type Bill = {
  _id: string;
  invoiceNumber?: string;
  vendor?: Vendor;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossFoodSubtotal: number;
  commissionTotal: number;
  paidAmount?: number;
  outstandingAmount: number;
  paidAt?: string;
  status: string;
  createdAt: string;
  payments?: Receipt[];
  note?: string;
};
export const money = (n?: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n ?? 0);
export const day = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '-';
