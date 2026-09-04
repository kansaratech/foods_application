export interface ICommissionVendorLite {
  _id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
}

export interface ICommissionPeriodPreviewRow {
  vendor: ICommissionVendorLite;
  orderCount: number;
  grossFoodSubtotal: number;
  commissionTotal: number;
}

export interface ICommissionPeriodPreview {
  periodStart: string;
  periodEnd: string;
  cycle: string;
  unbilledOrderCount: number;
  unbilledCommissionTotal: number;
  rows: ICommissionPeriodPreviewRow[];
}

export interface ICommissionBill {
  _id: string;
  invoiceNumber?: string | null;
  vendor: ICommissionVendorLite | null;
  periodStart: string;
  periodEnd: string;
  cycle: string;
  orderCount: number;
  grossFoodSubtotal: number;
  commissionTotal: number;
  status: 'PENDING' | 'PAID' | 'WAIVED';
  paidAt: string | null;
  paidAmount: number | null;
  note: string | null;
  createdAt: string;
}

export interface ICommissionRecordRow {
  _id: string;
  orderNumber: string;
  storeName: string | null;
  foodSubtotal: number;
  commissionRate: number;
  commissionAmount: number;
  orderDeliveredAt: string;
}

export interface ICommissionPeriodPreviewResponse {
  commissionPeriodPreview: ICommissionPeriodPreview;
}

export interface ICommissionBillsResponse {
  commissionBills: { total: number; bills: ICommissionBill[] };
}

export interface ICommissionInvoice {
  invoiceNumber: string;
  issuedOn: string;
  periodLabel: string;
  platformName: string;
  platformAddress: string | null;
  platformGstin: string | null;
  vendorName: string;
  vendorEmail: string | null;
  vendorPhone: string | null;
  storeNames: string[];
  orderCount: number;
  grossFoodSubtotal: number;
  commissionRate: number;
  commissionTotal: number;
  status: string;
  note: string | null;
}
export interface ICommissionBillDetailResponse {
  commissionBill: {
    bill: ICommissionBill;
    records: ICommissionRecordRow[];
    invoice: ICommissionInvoice;
  };
}

// ---- Batch B: finance ops ----
export interface IWalletAdjustmentRow {
  _id: string;
  subjectType: string;
  subjectId: string;
  subjectName: string | null;
  amount: number;
  reason: string;
  note: string | null;
  createdByEmail: string | null;
  createdAt: string;
}
export interface IWalletAdjustmentsResponse {
  walletAdjustments: { total: number; adjustments: IWalletAdjustmentRow[] };
}
export interface IPayoutRunItemRow {
  _id: string;
  subjectType: 'STORE' | 'RIDER';
  subjectId: string;
  payeeName: string;
  walletBalance: number;
  heldCash: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'SKIPPED';
  method: string | null;
  reference: string | null;
  note: string | null;
  paidAt: string | null;
}
export interface IPayoutRun {
  _id: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  status: 'OPEN' | 'COMPLETED';
  itemCount: number;
  grossTotal: number;
  paidTotal: number;
  note?: string | null;
  createdAt: string;
  completedAt: string | null;
  items?: IPayoutRunItemRow[];
}
export interface IPayoutRunsResponse {
  payoutRuns: { total: number; runs: IPayoutRun[] };
}
export interface IPayoutRunResponse {
  payoutRun: IPayoutRun;
}
export interface IReconLine {
  label: string;
  expected: number;
  actual: number;
  delta: number;
  ok: boolean;
}
export interface IReconciliationReport {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  storeWalletOutstanding: number;
  riderWalletOutstanding: number;
  negativeWalletStores: number;
  negativeWalletRiders: number;
  pendingRiderDeposits: number;
  pendingRiderDepositTotal: number;
  lines: IReconLine[];
}
export interface IReconciliationReportResponse {
  reconciliationReport: IReconciliationReport;
}

export interface IMyCommissionSummary {
  cycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currentPeriodCommission: number;
  currentPeriodOrderCount: number;
  outstandingTotal: number;
  bills: ICommissionBill[];
}
export interface IMyCommissionSummaryResponse {
  myCommissionSummary: IMyCommissionSummary;
}

export interface IRiderLite {
  _id: string;
  name: string | null;
  username: string | null;
  phone?: string | null;
}
export interface IRiderCashOutstandingRow {
  rider: IRiderLite;
  entryCount: number;
  outstanding: number;
  oldestUnremittedAt: string | null;
  pendingDepositCount: number;
  pendingDepositTotal: number;
}
export interface IRiderCashOutstandingResponse {
  riderCashOutstanding: IRiderCashOutstandingRow[];
}
export interface IRiderCashEntryRow {
  _id: string;
  orderNumber: string;
  collectedTotal: number;
  riderKeeps: number;
  owedToPlatform: number;
  deliveredAt: string;
  remitted: boolean;
}
export interface IRiderCashRemittanceRow {
  _id: string;
  amount: number;
  entryCount: number;
  method: string | null;
  reference?: string | null;
  note: string | null;
  status: string;
  confirmedAt?: string | null;
  createdAt: string;
}
export interface IRiderCashSummary {
  rider: IRiderLite;
  outstanding: number;
  lifetimeCollected: number;
  lifetimeRemitted: number;
  cashLimit: number;
  walletBalance: number;
  availableToWithdraw: number;
  pendingDepositTotal: number;
  entries: IRiderCashEntryRow[];
  remittances: IRiderCashRemittanceRow[];
}
export interface IRiderCashSummaryResponse {
  riderCashSummary: IRiderCashSummary;
}

export interface IFinanceVendorRow {
  vendor: ICommissionVendorLite;
  orders: number;
  foodSubtotal: number;
  commission: number;
}
export interface IFinanceRiderRow {
  rider: IRiderLite;
  deliveries: number;
  earned: number;
  cashCollected: number;
  cashOutstanding: number;
}
export interface IPlatformFinanceReport {
  periodStart: string;
  periodEnd: string;
  orderVolume: number;
  deliveredOrders: number;
  commissionAccrued: number;
  commissionBilled: number;
  commissionPaid: number;
  commissionOutstanding: number;
  storePayouts: number;
  taxCollected: number;
  riderPayouts: number;
  codCashCollected: number;
  codCashRemitted: number;
  codCashOutstanding: number;
  perVendor: IFinanceVendorRow[];
  perRider: IFinanceRiderRow[];
}
export interface IPlatformFinanceReportResponse {
  platformFinanceReport: IPlatformFinanceReport;
}
