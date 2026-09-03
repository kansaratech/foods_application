'use client';

import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import {
  CLOSE_COMMISSION_PERIOD,
  GET_COMMISSION_BILL,
  GET_COMMISSION_BILLS,
  GET_COMMISSION_PERIOD_PREVIEW,
  GET_CONFIGURATION,
  SAVE_COMMISSION_CONFIGURATION,
  UPDATE_COMMISSION_BILL_STATUS,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';
import {
  ICommissionBill,
  ICommissionBillDetailResponse,
  ICommissionBillsResponse,
  ICommissionPeriodPreviewResponse,
} from '@/lib/utils/interfaces';
import { Dialog } from 'primereact/dialog';

const money = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_FILTERS = ['ALL', 'PENDING', 'PAID', 'WAIVED'];
const statusClass: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  WAIVED: 'bg-gray-200 text-gray-600',
};

export default function CommissionBillsMain() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmClose, setConfirmClose] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // ---- Config (default rate + billing cycle) ----
  const { data: configData, refetch: refetchConfig } = useQuery(GET_CONFIGURATION);
  const config = configData?.configuration;
  const [saveConfig] = useMutation(SAVE_COMMISSION_CONFIGURATION);

  const persistConfig = async (input: {
    defaultCommissionRate?: number;
    commissionBillingCycle?: string;
    riderCashLimit?: number;
  }) => {
    setSavingConfig(true);
    try {
      await saveConfig({ variables: { configurationInput: input } });
      await refetchConfig();
      showToast({ type: 'success', title: t('Commission'), message: t('Commission settings updated'), duration: 2000 });
    } catch {
      showToast({ type: 'error', title: t('Error'), message: t('Could not save - please try again'), duration: 2500 });
    } finally {
      setSavingConfig(false);
    }
  };

  // ---- Current period preview ----
  const {
    data: previewData,
    loading: previewLoading,
    refetch: refetchPreview,
  } = useQuery<ICommissionPeriodPreviewResponse>(GET_COMMISSION_PERIOD_PREVIEW, {
    fetchPolicy: 'cache-and-network',
  });
  const preview = previewData?.commissionPeriodPreview;

  // ---- Bills ----
  const {
    data: billsData,
    loading: billsLoading,
    refetch: refetchBills,
  } = useQuery<ICommissionBillsResponse>(GET_COMMISSION_BILLS, {
    variables: {
      status: statusFilter === 'ALL' ? null : statusFilter,
      page: currentPage,
      limit: rowsPerPage,
    },
    fetchPolicy: 'cache-and-network',
  });
  const bills = billsData?.commissionBills?.bills ?? [];
  const billsTotal = billsData?.commissionBills?.total ?? 0;

  const [closePeriod, { loading: closing }] = useMutation(CLOSE_COMMISSION_PERIOD);
  const [updateBillStatus] = useMutation(UPDATE_COMMISSION_BILL_STATUS);

  const refreshAll = () => {
    refetchPreview();
    refetchBills();
  };

  const handleClosePeriod = async () => {
    setConfirmClose(false);
    try {
      const res = await closePeriod();
      const created = res.data?.closeCommissionPeriod?.length ?? 0;
      showToast({
        type: created ? 'success' : 'info',
        title: t('Commission'),
        message: created
          ? `${created} ${t('bills generated')}`
          : t('No unbilled orders to close'),
        duration: 2500,
      });
      refreshAll();
    } catch {
      showToast({ type: 'error', title: t('Error'), message: t('Could not close the period'), duration: 2500 });
    }
  };

  const setBillStatus = async (bill: ICommissionBill, status: 'PAID' | 'WAIVED') => {
    try {
      await updateBillStatus({ variables: { id: bill._id, status } });
      showToast({
        type: 'success',
        title: t('Commission'),
        message: status === 'PAID' ? t('Bill marked paid') : t('Bill waived'),
        duration: 2000,
      });
      refetchBills();
    } catch {
      showToast({ type: 'error', title: t('Error'), message: t('Could not update the bill'), duration: 2500 });
    }
  };

  const previewRows = useMemo(
    () =>
      (preview?.rows ?? []).map((r) => ({
        _id: r.vendor._id,
        vendorName: r.vendor.name || r.vendor.email || '—',
        orderCount: r.orderCount,
        grossFoodSubtotal: r.grossFoodSubtotal,
        commissionTotal: r.commissionTotal,
      })),
    [preview],
  );

  const { data: detailData } = useQuery<ICommissionBillDetailResponse>(GET_COMMISSION_BILL, {
    variables: { id: detailId },
    skip: !detailId,
  });
  const detail = detailData?.commissionBill;

  return (
    <div className="flex flex-col gap-6 p-3">
      {/* ---- Settings ---- */}
      <section className="rounded border p-4 dark:border-dark-600">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t('Commission settings')}
        </h3>
        <div className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-500">{t('Default commission rate')} (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={config?.defaultCommissionRate ?? 20}
              disabled={savingConfig}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v) && v !== config?.defaultCommissionRate) {
                  persistConfig({ defaultCommissionRate: v });
                }
              }}
              className="h-10 w-32 rounded border border-gray-300 px-2 dark:bg-dark-950"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-500">{t('Billing cycle')}</span>
            <select
              value={config?.commissionBillingCycle ?? 'MONTHLY'}
              disabled={savingConfig}
              onChange={(e) => persistConfig({ commissionBillingCycle: e.target.value })}
              className="h-10 w-40 rounded border border-gray-300 px-2 dark:bg-dark-950"
            >
              <option value="MONTHLY">{t('Monthly')}</option>
              <option value="YEARLY">{t('Yearly')}</option>
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1 text-gray-500">{t('Rider cash limit')} (₹)</span>
            <input
              type="number"
              min={0}
              step={100}
              defaultValue={config?.riderCashLimit ?? 3000}
              disabled={savingConfig}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v) && v !== config?.riderCashLimit) persistConfig({ riderCashLimit: v });
              }}
              className="h-10 w-32 rounded border border-gray-300 px-2 dark:bg-dark-950"
            />
          </label>
          <p className="max-w-md text-xs text-gray-400">{t('commission_settings_help')}</p>
        </div>
      </section>

      {/* ---- Current period ---- */}
      <section className="rounded border p-4 dark:border-dark-600">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('Current period (unbilled)')}
            </h3>
            {preview && (
              <p className="text-xs text-gray-400">
                {day(preview.periodStart)} – {day(preview.periodEnd)} · {preview.unbilledOrderCount}{' '}
                {t('orders')} · {money(preview.unbilledCommissionTotal)} {t('commission')}
              </p>
            )}
          </div>
          {confirmClose ? (
            <div className="flex items-center gap-2 text-sm">
              <span>{t('Generate bills for all unbilled orders?')}</span>
              <button
                onClick={handleClosePeriod}
                disabled={closing}
                className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50"
              >
                {t('Yes, close period')}
              </button>
              <button onClick={() => setConfirmClose(false)} className="rounded border px-3 py-1.5">
                {t('Cancel')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => setConfirmClose(true)}
                disabled={!preview?.unbilledOrderCount}
                className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {t('Close period & generate bills')}
              </button>
              <span className="text-[11px] text-gray-400">{t('auto_close_note')}</span>
            </div>
          )}
        </div>
        <Table
          data={previewLoading ? [] : previewRows}
          loading={previewLoading}
          moduleName="Commission"
          columns={[
            { headerName: t('Vendor'), propertyName: 'vendorName' },
            { headerName: t('Orders'), propertyName: 'orderCount' },
            {
              headerName: t('Food subtotal'),
              propertyName: 'grossFoodSubtotal',
              body: (r: { grossFoodSubtotal: number }) => money(r.grossFoodSubtotal),
            },
            {
              headerName: t('Commission due'),
              propertyName: 'commissionTotal',
              body: (r: { commissionTotal: number }) => (
                <span className="font-semibold">{money(r.commissionTotal)}</span>
              ),
            },
          ]}
        />
      </section>

      {/* ---- Bills ---- */}
      <section className="rounded border p-4 dark:border-dark-600">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{t('Bills')}</h3>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setCurrentPage(1);
                }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  statusFilter === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t(s === 'ALL' ? 'All' : s)}
              </button>
            ))}
          </div>
        </div>
        <Table
          data={billsLoading ? [] : bills}
          loading={billsLoading}
          moduleName="Commission"
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          totalRecords={billsTotal}
          handleRowClick={(e) => setDetailId((e.data as ICommissionBill)?._id ?? null)}
          onPageChange={(page, rows) => {
            setCurrentPage(page);
            setRowsPerPage(rows);
          }}
          columns={[
            {
              headerName: t('Vendor'),
              propertyName: 'vendor',
              body: (r: ICommissionBill) => r.vendor?.name || r.vendor?.email || '—',
            },
            {
              headerName: t('Period'),
              propertyName: 'periodStart',
              body: (r: ICommissionBill) => `${day(r.periodStart)} – ${day(r.periodEnd)}`,
            },
            { headerName: t('Orders'), propertyName: 'orderCount' },
            {
              headerName: t('Commission'),
              propertyName: 'commissionTotal',
              body: (r: ICommissionBill) => (
                <span className="font-semibold">{money(r.commissionTotal)}</span>
              ),
            },
            {
              headerName: t('Status'),
              propertyName: 'status',
              body: (r: ICommissionBill) => (
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[r.status] ?? ''}`}>
                  {t(r.status)}
                </span>
              ),
            },
            {
              headerName: t('Actions'),
              propertyName: 'actions',
              body: (r: ICommissionBill) =>
                r.status === 'PENDING' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBillStatus(r, 'PAID');
                      }}
                      className="rounded bg-green-600 px-2 py-1 text-xs text-white"
                    >
                      {t('Mark paid')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setBillStatus(r, 'WAIVED');
                      }}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      {t('Waive')}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">
                    {r.paidAt ? day(r.paidAt) : '—'}
                  </span>
                ),
            },
          ]}
        />
      </section>

      {/* ---- Bill detail ---- */}
      <Dialog
        header={t('Bill details')}
        visible={!!detailId}
        onHide={() => setDetailId(null)}
        style={{ width: '46rem', maxWidth: '95vw' }}
      >
        {detail && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              <span>
                <b>{t('Vendor')}:</b> {detail.bill.vendor?.name || detail.bill.vendor?.email || '—'}
              </span>
              <span>
                <b>{t('Period')}:</b> {day(detail.bill.periodStart)} – {day(detail.bill.periodEnd)}
              </span>
              <span>
                <b>{t('Status')}:</b> {t(detail.bill.status)}
              </span>
              <span>
                <b>{t('Commission')}:</b> {money(detail.bill.commissionTotal)}
              </span>
            </div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-1">{t('Order')}</th>
                  <th className="py-1">{t('Store')}</th>
                  <th className="py-1">{t('Delivered')}</th>
                  <th className="py-1 text-right">{t('Food subtotal')}</th>
                  <th className="py-1 text-right">%</th>
                  <th className="py-1 text-right">{t('Commission')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.records.map((rec) => (
                  <tr key={rec._id} className="border-b border-dashed">
                    <td className="py-1">{rec.orderNumber}</td>
                    <td className="py-1">{rec.storeName || '—'}</td>
                    <td className="py-1">{day(rec.orderDeliveredAt)}</td>
                    <td className="py-1 text-right">{money(rec.foodSubtotal)}</td>
                    <td className="py-1 text-right">{rec.commissionRate}</td>
                    <td className="py-1 text-right font-semibold">{money(rec.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    </div>
  );
}
