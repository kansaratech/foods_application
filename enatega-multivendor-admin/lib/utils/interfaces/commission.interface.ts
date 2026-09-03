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

export interface ICommissionBillDetailResponse {
  commissionBill: { bill: ICommissionBill; records: ICommissionRecordRow[] };
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
  note: string | null;
  createdAt: string;
}
export interface IRiderCashSummary {
  rider: IRiderLite;
  outstanding: number;
  lifetimeCollected: number;
  lifetimeRemitted: number;
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
