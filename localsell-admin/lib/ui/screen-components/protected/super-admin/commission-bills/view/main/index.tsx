'use client';

import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';

import {
  CLOSE_COMMISSION_PERIOD,
  GET_COMMISSION_BILL,
  GET_COMMISSION_BILLS,
  GET_COMMISSION_PERIOD_PREVIEW,
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

  const printInvoice = () => {
    const inv = detail?.invoice;
    if (!inv) return;
    const rows = detail.records
      .map(
        (r) =>
          `<tr><td>${r.orderNumber}</td><td>${r.storeName ?? ''}</td><td>${day(r.orderDeliveredAt)}</td><td style="text-align:right">${money(r.foodSubtotal)}</td><td style="text-align:right">${money(r.commissionAmount)}</td></tr>`,
      )
      .join('');
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${inv.invoiceNumber}</title>
      <style>body{font:13px/1.5 system-ui,sans-serif;padding:40px;color:#111}h1{font-size:20px;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}
      .muted{color:#666}.tot{font-weight:700;font-size:15px}.row{display:flex;justify-content:space-between;gap:40px;margin-top:20px}</style>
      </head><body>
      <h1>${inv.platformName}</h1>
      <div class="muted">${inv.platformAddress ?? ''}${inv.platformGstin ? ` · GSTIN ${inv.platformGstin}` : ''}</div>
      <div class="row">
        <div><b>Invoice</b> ${inv.invoiceNumber}<br/><span class="muted">Issued ${day(inv.issuedOn)}</span><br/><span class="muted">Period ${inv.periodLabel}</span></div>
        <div style="text-align:right"><b>Billed to</b><br/>${inv.vendorName}<br/><span class="muted">${inv.vendorEmail ?? ''} ${inv.vendorPhone ?? ''}</span><br/><span class="muted">${inv.storeNames.join(', ')}</span></div>
      </div>
      <table><thead><tr><th>Order</th><th>Store</th><th>Delivered</th><th style="text-align:right">Food subtotal</th><th style="text-align:right">Commission</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="row"><div class="muted">${inv.orderCount} orders · effective rate ${inv.commissionRate}% · gross food subtotal ${money(inv.grossFoodSubtotal)}</div>
      <div class="tot">Amount due: ${money(inv.commissionTotal)} <span class="muted">(${inv.status})</span></div></div>
      ${inv.note ? `<p class="muted">${inv.note}</p>` : ''}
      <script>window.print()</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="flex flex-col gap-6 p-3">
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
            <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
              <span>
                <b>{t('Invoice')}:</b> {detail.bill.invoiceNumber || '—'}
              </span>
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
              <button
                onClick={printInvoice}
                className="ml-auto rounded border px-3 py-1 text-xs dark:border-dark-600"
              >
                {t('Print invoice')}
              </button>
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
