'use client';

import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { Dialog } from 'primereact/dialog';

import {
  GET_PENDING_STORE_DOCUMENTS,
  GET_STORE_DOCUMENTS,
  GET_RESTAURANTS,
  REVIEW_STORE_DOCUMENT,
  UPSERT_STORE_DOCUMENT,
  DELETE_STORE_DOCUMENT,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';

const KINDS = ['FSSAI', 'GST', 'PAN', 'BANK'] as const;
type Kind = (typeof KINDS)[number];

interface Doc {
  _id: string;
  restaurantId: string;
  storeName: string | null;
  kind: string;
  number: string | null;
  fileUrl: string | null;
  holderName: string | null;
  ifsc: string | null;
  bankName: string | null;
  expiryDate: string | null;
  status: string;
  reviewNote?: string | null;
}

const statusChip: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function StoreDocumentsScreen() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [tab, setTab] = useState<'queue' | 'byStore'>('queue');
  const [storeId, setStoreId] = useState('');
  const [editKind, setEditKind] = useState<Kind | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: queueData, loading: queueLoading, refetch: refetchQueue } = useQuery(GET_PENDING_STORE_DOCUMENTS, {
    variables: { limit: 100 },
    fetchPolicy: 'cache-and-network',
  });
  const pending: Doc[] = queueData?.pendingStoreDocuments?.documents ?? [];

  const { data: storeData } = useQuery(GET_RESTAURANTS);
  const stores = (storeData?.restaurants ?? []) as { _id: string; name: string }[];

  const { data: docsData, refetch: refetchDocs } = useQuery(GET_STORE_DOCUMENTS, {
    variables: { restaurantId: storeId },
    skip: !storeId,
    fetchPolicy: 'cache-and-network',
  });
  const storeDocs: Doc[] = docsData?.storeDocuments ?? [];
  const docsByKind = useMemo(() => {
    const m = new Map<string, Doc>();
    storeDocs.forEach((d) => m.set(d.kind, d));
    return m;
  }, [storeDocs]);

  const [reviewDoc] = useMutation(REVIEW_STORE_DOCUMENT);
  const [upsertDoc, { loading: saving }] = useMutation(UPSERT_STORE_DOCUMENT);
  const [deleteDoc] = useMutation(DELETE_STORE_DOCUMENT);

  const err = (e: unknown) =>
    showToast({ type: 'error', title: t('Error'), message: (e as Error).message, duration: 2800 });

  const review = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      const note = status === 'REJECTED' ? window.prompt(t('Reason for rejection') + '?') || undefined : undefined;
      await reviewDoc({ variables: { id, status, note } });
      showToast({ type: 'success', title: t('Store Documents'), message: t('Document reviewed'), duration: 1600 });
      refetchQueue();
      refetchDocs();
    } catch (e) {
      err(e);
    }
  };

  const openEditor = (kind: Kind) => {
    const d = docsByKind.get(kind);
    setForm({
      number: d?.number ?? '',
      fileUrl: d?.fileUrl ?? '',
      holderName: d?.holderName ?? '',
      ifsc: d?.ifsc ?? '',
      bankName: d?.bankName ?? '',
      expiryDate: d?.expiryDate ?? '',
    });
    setEditKind(kind);
  };

  const saveDoc = async () => {
    if (!editKind || !storeId) return;
    try {
      await upsertDoc({
        variables: {
          restaurantId: storeId,
          kind: editKind,
          number: form.number || null,
          fileUrl: form.fileUrl || null,
          holderName: form.holderName || null,
          ifsc: form.ifsc || null,
          bankName: form.bankName || null,
          expiryDate: form.expiryDate || null,
        },
      });
      setEditKind(null);
      refetchDocs();
      refetchQueue();
      showToast({ type: 'success', title: t('Store Documents'), message: t('Document saved'), duration: 1600 });
    } catch (e) {
      err(e);
    }
  };

  return (
    <div className="screen-container p-3">
      <h1 className="mb-3 text-xl font-bold">{t('Store Documents')}</h1>

      <div className="mb-4 flex gap-1">
        {(['queue', 'byStore'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-t-md border-b-2 px-4 py-2 text-sm font-medium ${
              tab === k ? 'border-primary-color text-primary-color' : 'border-transparent text-gray-500'
            }`}
          >
            {k === 'queue' ? `${t('Review queue')} (${pending.length})` : t('By store')}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <Table
          data={queueLoading ? [] : pending}
          loading={queueLoading}
          moduleName="StoreDocQueue"
          columns={[
            { headerName: t('Store'), propertyName: 'storeName' },
            { headerName: t('Document'), propertyName: 'kind' },
            { headerName: t('Number'), propertyName: 'number' },
            {
              headerName: t('File'),
              propertyName: 'fileUrl',
              body: (d: Doc) =>
                d.fileUrl ? (
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    {t('View')}
                  </a>
                ) : (
                  '—'
                ),
            },
            {
              headerName: t('Actions'),
              propertyName: 'actions',
              body: (d: Doc) => (
                <span className="flex gap-1">
                  <button onClick={() => review(d._id, 'VERIFIED')} className="rounded bg-green-600 px-2 py-0.5 text-xs text-white">
                    {t('Verify')}
                  </button>
                  <button onClick={() => review(d._id, 'REJECTED')} className="rounded border px-2 py-0.5 text-xs dark:border-dark-600">
                    {t('Reject')}
                  </button>
                </span>
              ),
            },
          ]}
        />
      )}

      {tab === 'byStore' && (
        <div>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mb-4 h-10 w-72 rounded border border-gray-300 px-2 text-sm dark:bg-dark-950"
          >
            <option value="">{t('Select a store')}…</option>
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          {storeId && (
            <div className="grid gap-3 md:grid-cols-2">
              {KINDS.map((kind) => {
                const d = docsByKind.get(kind);
                return (
                  <div key={kind} className="rounded border p-3 text-sm dark:border-dark-600">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold">{kind}</span>
                      {d ? (
                        <span className={`rounded px-2 py-0.5 text-xs ${statusChip[d.status] ?? ''}`}>{d.status}</span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('Not submitted')}</span>
                      )}
                    </div>
                    {d && (
                      <dl className="mb-2 space-y-0.5 text-xs text-gray-500">
                        {d.number && <div>{t('Number')}: {d.number}</div>}
                        {kind === 'BANK' && (
                          <div>
                            {d.holderName} · {d.bankName} · {d.ifsc}
                          </div>
                        )}
                        {d.expiryDate && <div>{t('Expiry')}: {d.expiryDate}</div>}
                        {d.fileUrl && (
                          <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            {t('View file')}
                          </a>
                        )}
                        {d.reviewNote && <div className="text-red-500">{d.reviewNote}</div>}
                      </dl>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => openEditor(kind)} className="rounded border px-2 py-1 text-xs dark:border-dark-600">
                        {d ? t('Edit') : t('Add')}
                      </button>
                      {d && d.status === 'PENDING' && (
                        <>
                          <button onClick={() => review(d._id, 'VERIFIED')} className="rounded bg-green-600 px-2 py-1 text-xs text-white">
                            {t('Verify')}
                          </button>
                          <button onClick={() => review(d._id, 'REJECTED')} className="rounded border px-2 py-1 text-xs dark:border-dark-600">
                            {t('Reject')}
                          </button>
                        </>
                      )}
                      {d && (
                        <button
                          onClick={async () => {
                            if (window.confirm(t('Delete this document?'))) {
                              await deleteDoc({ variables: { id: d._id } });
                              refetchDocs();
                            }
                          }}
                          className="rounded border px-2 py-1 text-xs text-red-600 dark:border-dark-600"
                        >
                          {t('Delete')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog header={editKind ?? ''} visible={!!editKind} onHide={() => setEditKind(null)} style={{ width: '26rem', maxWidth: '95vw' }}>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">{editKind === 'BANK' ? t('Account number') : t('Number')}</span>
            <input value={form.number ?? ''} onChange={(e) => setForm({ ...form, number: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
          </label>
          {editKind === 'BANK' && (
            <>
              <label className="flex flex-col">
                <span className="mb-1 text-gray-500">{t('Account holder')}</span>
                <input value={form.holderName ?? ''} onChange={(e) => setForm({ ...form, holderName: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
              </label>
              <label className="flex flex-col">
                <span className="mb-1 text-gray-500">{t('Bank name')}</span>
                <input value={form.bankName ?? ''} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
              </label>
              <label className="flex flex-col">
                <span className="mb-1 text-gray-500">IFSC</span>
                <input value={form.ifsc ?? ''} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
              </label>
            </>
          )}
          {editKind === 'FSSAI' && (
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Expiry date')}</span>
              <input type="date" value={form.expiryDate ?? ''} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
            </label>
          )}
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">{t('File URL')} ({t('optional')})</span>
            <input value={form.fileUrl ?? ''} onChange={(e) => setForm({ ...form, fileUrl: e.target.value })} className="h-10 rounded border border-gray-300 px-2 dark:bg-dark-950" />
          </label>
          <button onClick={saveDoc} disabled={saving} className="mt-1 h-10 rounded bg-black text-white disabled:opacity-50">
            {t('Save')}
          </button>
          <p className="text-xs text-gray-400">{t('Saving resets the document to pending review.')}</p>
        </div>
      </Dialog>
    </div>
  );
}
