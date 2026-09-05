 'use client';
import '@/lib/ui/useable-components/management-page/management.css';
import './documents.css';
import { useContext, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { GET_PENDING_STORE_DOCUMENTS, GET_STORE_DOCUMENTS, GET_RESTAURANTS, REVIEW_STORE_DOCUMENT, UPSERT_STORE_DOCUMENT, DELETE_STORE_DOCUMENT, UPLOAD_IMAGE_TO_S3 } from '@/lib/api/graphql';
import { GET_VENDOR_DOCUMENTS } from '@/lib/api/graphql/mutations/vendor';
import { ToastContext } from '@/lib/context/global/toast.context';
import Table from '@/lib/ui/useable-components/table';

interface Doc { _id: string; restaurantId: string; storeName?: string; kind: string; number?: string; fileUrl?: string; fileName?: string; fileSize?: string; issueDate?: string; expiryDate?: string; createdAt?: string; status: string; reviewNote?: string; }
const titles: Record<string, string> = { FSSAI: 'FSSAI Licence', TRADE_LICENCE: 'Local Trade Licence', PAN: 'PAN', GST: 'GSTIN', BANK: 'Bank account' };
const licenceKinds = ['FSSAI', 'TRADE_LICENCE'];
const dateValue = (value?: string) => value ? new Date(value + 'T00:00:00') : null;
const dateText = (date: Date | null) => date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '';
function Badge({ status, hasFile = true }: { status?: string; hasFile?: boolean }) {
  // A VERIFIED/REJECTED doc with no file attached is a data anomaly (the file
  // was removed after review) — flag it instead of showing a plain green
  // "Verified" that would otherwise read as "everything's fine".
  if (status && status !== 'PENDING' && !hasFile) {
    return <span className="document-status anomaly" title="This document was reviewed, but no file is on record.">{(status === 'VERIFIED' ? 'Verified' : 'Rejected')} · no file</span>;
  }
  return <span className={`document-status ${(status || 'missing').toLowerCase()}`}>{({ PENDING: 'Pending review', VERIFIED: 'Verified', REJECTED: 'Rejected' } as Record<string,string>)[status || ''] || 'Not submitted'}</span>;
}
export default function StoreDocumentsScreen() {
  const { showToast } = useContext(ToastContext);
  const [tab, setTab] = useState('byStore');
  const [storeId, setStoreId] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(10);
  const [editKind, setEditKind] = useState('');
  const [form, setForm] = useState<Record<string,string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Doc | null>(null);
  const [reason, setReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
  const { data: storeData, loading: storesLoading } = useQuery(GET_RESTAURANTS);
  const stores = (storeData?.restaurants ?? []) as { _id: string; name: string; owner?: { _id: string } }[];
  const selectedId = storeId || stores[0]?._id || '';
  const selected = stores.find(s => s._id === selectedId);
  const vendorHref = selected?.owner?._id ? `/general/vendors/add?id=${selected.owner._id}` : null;
  const { data: queueData, loading: queueLoading, refetch: refreshQueue, error: queueError } = useQuery(GET_PENDING_STORE_DOCUMENTS, { variables: { page, limit: rows }, fetchPolicy: 'cache-and-network' });
  const pending = (queueData?.pendingStoreDocuments?.documents ?? []) as Doc[];
  const { data: docsData, loading: docsLoading, refetch: refreshDocs, error: docsError } = useQuery(GET_STORE_DOCUMENTS, { variables: { restaurantId: selectedId }, skip: !selectedId, fetchPolicy: 'cache-and-network' });
  const docs = (docsData?.storeDocuments ?? []) as Doc[];
  const { data: vendorData, loading: vendorLoading, error: vendorError } = useQuery(GET_VENDOR_DOCUMENTS, { variables: { vendorId: selected?.owner?._id }, skip: !selected?.owner?._id });
  const vendorDocs = (vendorData?.vendorDocuments ?? []) as Doc[];
  const [upsert] = useMutation(UPSERT_STORE_DOCUMENT);
  const [review] = useMutation(REVIEW_STORE_DOCUMENT);
  const [remove] = useMutation(DELETE_STORE_DOCUMENT);
  const [upload, { loading: uploading }] = useMutation(UPLOAD_IMAGE_TO_S3);
  const notifyError = (error: unknown) => showToast({ type: 'error', title: 'Store documents', message: error instanceof Error ? error.message : 'Please try again.' });
  const refresh = () => { refreshQueue(); if (selectedId) refreshDocs(); };
  const open = (kind: string) => { const doc = docs.find(d => d.kind === kind); setForm({ number: doc?.number || '', fileUrl: doc?.fileUrl || '', fileName: doc?.fileName || '', fileSize: doc?.fileSize || '', issueDate: doc?.issueDate || '', expiryDate: doc?.expiryDate || '' }); setFormError(''); setEditKind(kind); };
  const uploadFile = async (file?: File) => {
    if (!file || uploading) return;
    if (!['application/pdf','image/jpeg','image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { setFormError('Choose a PDF, JPG or PNG file up to 5 MB.'); return; }
    setFormError('');
    try {
      const base64 = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const result = await upload({ variables: { image: base64 } });
      const url = result.data?.uploadImageToS3?.imageUrl;
      if (!url) throw new Error('Upload failed. Please try again.');
      setForm(previous => ({ ...previous, fileUrl: url, fileName: file.name, fileSize: String(file.size) }));
    } catch (error) { setFormError(error instanceof Error ? error.message : 'Upload failed.'); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.number?.trim() || !form.fileUrl) { setFormError('Enter a licence number and upload a document.'); return; }
    if (form.issueDate && form.expiryDate && form.issueDate > form.expiryDate) { setFormError('Expiry date must be on or after the issue date.'); return; }
    setBusy(true);
    try { await upsert({ variables: { restaurantId: selectedId, kind: editKind, ...form } }); setEditKind(''); refresh(); showToast({ type: 'success', title: 'Document submitted', message: 'The document is pending review.' }); } catch(error) { notifyError(error); } finally { setBusy(false); }
  };
  const reviewDocument = async (doc: Doc, status: string) => { setBusy(true); try { await review({ variables: { id: doc._id, status, note: status === 'REJECTED' ? reason.trim() : undefined } }); setReviewTarget(null); refresh(); } catch(error) { notifyError(error); } finally { setBusy(false); } };
  const card = (kind: string) => {
    const doc = docs.find(d => d.kind === kind);
    return <article className="store-document-card" key={kind}>
      <div className="document-card-heading"><span className={`document-icon ${doc ? 'submitted' : ''}`}><i className="pi pi-file" aria-hidden="true" /></span><div><h2>{titles[kind] || kind}</h2><p>{doc?.number ? `Licence number: ${doc.number}` : kind === 'TRADE_LICENCE' ? "Required if applicable in the store's municipality." : 'Upload the licence issued for this store.'}</p></div><Badge status={doc?.status} hasFile={!!doc?.fileUrl} /></div>
      {doc ? <><div className="document-file"><i className="pi pi-file-pdf" aria-hidden="true" /><div><strong>{doc.fileName || (doc.fileUrl ? 'Document file' : 'No file on record')}</strong>{doc.fileSize && <small>{(Number(doc.fileSize)/1024/1024).toFixed(1)} MB</small>}</div>{doc.createdAt && <small className="document-submitted">Submitted {new Date(doc.createdAt).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' })}</small>}</div>{doc.reviewNote && <p className="document-error">{doc.reviewNote}</p>}<div className="document-actions">{doc.fileUrl && <button onClick={() => setPreviewDoc(doc)}><i className="pi pi-eye" aria-hidden="true" />Preview</button>}<button onClick={() => open(kind)}>Replace</button>{doc.status === 'PENDING' && <>{doc.fileUrl ? <button className="primary" disabled={busy} onClick={() => reviewDocument(doc,'VERIFIED')}>Verify</button> : <span className="document-hint">Nothing to verify yet</span>}<button className="danger" onClick={() => { setReason(''); setReviewTarget(doc); }}>Reject</button></>}<button title="Delete document" aria-label={`Delete ${titles[kind] || kind}`} onClick={() => setDeleteTarget(doc)}><i className="pi pi-trash" /></button></div></> : <div className="document-empty"><i className="pi pi-file-plus" aria-hidden="true" /><button onClick={() => open(kind)}><i className="pi pi-plus" aria-hidden="true" />Add document</button></div>}
    </article>;
  };
  return <div className="management-page store-documents-page">
    <header className="management-heading"><div><div className="management-breadcrumb">Management / Store Documents</div><h1>Store Documents</h1><p>Review store licences and verification documents.</p></div></header>
    <nav className="management-tabs" aria-label="Document views"><button aria-current={tab === 'queue' ? 'page' : undefined} onClick={() => setTab('queue')}>Review queue ({queueData?.pendingStoreDocuments?.total ?? 0})</button><button aria-current={tab === 'byStore' ? 'page' : undefined} onClick={() => setTab('byStore')}>By store</button></nav>
    {(queueError || docsError) && <p role="alert" className="document-error">Unable to load documents. <button onClick={refresh}>Retry</button></p>}
    {tab === 'queue' ? <Table data={pending} loading={queueLoading} scrollable={false} className="directory-admin-table" minWidth="60rem" rowsPerPage={rows} currentPage={page} totalRecords={queueData?.pendingStoreDocuments?.total ?? 0} onPageChange={(next,count) => { setPage(next); setRows(count); }} columns={[{ headerName:'Store', propertyName:'storeName' },{ headerName:'Document',propertyName:'kind',body:(d:Doc) => titles[d.kind] || d.kind },{ headerName:'Number',propertyName:'number' },{ headerName:'Submitted',propertyName:'createdAt',body:(d:Doc) => d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB',{ day:'numeric', month:'short', year:'numeric' }) : '—' },{headerName:'Actions',propertyName:'actions',body:(d:Doc) => <div className="document-actions">{d.fileUrl ? <button onClick={() => setPreviewDoc(d)}><i className="pi pi-eye" aria-hidden="true" />Preview</button> : <span className="document-hint">No file</span>}<button disabled={busy || !d.fileUrl} className="primary" onClick={() => reviewDocument(d,'VERIFIED')}>Verify</button><button className="danger" onClick={() => {setReason('');setReviewTarget(d);}}>Reject</button><button onClick={() => {setStoreId(d.restaurantId);setTab('byStore');}}>Open store</button></div>}]} /> : <>
      <section className="document-store-toolbar"><label>Store<Dropdown value={selectedId} options={stores} optionLabel="name" optionValue="_id" filter loading={storesLoading} onChange={e => setStoreId(e.value)} placeholder="Select a store" aria-label="Store" className="document-store-dropdown" panelClassName="document-store-dropdown-panel" /></label>{selectedId && <span className="document-submitted-count">{docsLoading ? 'Loading…' : `${docs.filter(d => licenceKinds.includes(d.kind)).length} of 2 licences submitted`}</span>}{vendorHref && <a href="#vendor-verification">View vendor verification</a>}</section>
      {selectedId ? <><div className="store-document-grid">{licenceKinds.map(card)}</div><section className="vendor-verification" id="vendor-verification"><header><div><h2>Vendor business verification</h2><p>Inherited from the vendor account. Manage these documents from the vendor profile.</p></div>{vendorHref && <Link href={vendorHref}>Open vendor profile <i className="pi pi-external-link" /></Link>}</header>{vendorError ? <p className="document-error">Unable to load vendor verification.</p> : <div className="vendor-verification-status">{['PAN','GST','BANK'].map(kind => <div key={kind}><i className={`pi pi-${kind === 'BANK' ? 'building-columns' : kind === 'PAN' ? 'id-card' : 'file'}`} /><div><strong>{titles[kind]}</strong>{vendorLoading ? <small>Loading...</small> : <Badge status={vendorDocs.find(d => d.kind === kind)?.status} />}</div></div>)}</div>}</section>{docs.some(d => ['PAN','GST','BANK'].includes(d.kind)) && <details className="legacy-documents"><summary>Previously submitted store business documents</summary><div className="store-document-grid">{docs.filter(d => ['PAN','GST','BANK'].includes(d.kind)).map(d => card(d.kind))}</div></details>}<p className="document-info"><i className="pi pi-info-circle" />Product GST rates and HSN/SAC are managed at product level.</p></> : <p className="document-info">Select a store to review its documents.</p>}
    </>}
    <Dialog visible={!!editKind} onHide={() => { if (!busy && !uploading) setEditKind(''); }} header={`${docs.some(d => d.kind === editKind) ? 'Replace' : 'Add'} ${titles[editKind] || editKind}`} className="store-document-dialog" style={{width:'500px',maxWidth:'95vw'}} draggable={false} dismissableMask={false}>
      <form onSubmit={submit}><p className="document-dialog-description">Upload the licence issued for this store.</p><label>Licence number<input required value={form.number || ''} onChange={e => setForm({...form,number:e.target.value})} placeholder="Enter licence number" /></label><div className="document-date-grid"><label>Issue date<Calendar value={dateValue(form.issueDate)} onChange={e => setForm({...form,issueDate:dateText(e.value as Date | null)})} dateFormat="dd-mm-yy" showIcon readOnlyInput placeholder="DD-MM-YYYY" /></label><label>Expiry date<Calendar value={dateValue(form.expiryDate)} onChange={e => setForm({...form,expiryDate:dateText(e.value as Date | null)})} dateFormat="dd-mm-yy" showIcon readOnlyInput showButtonBar placeholder="DD-MM-YYYY" /><small>Leave blank if it does not expire</small></label></div>
      <label>Document file</label><label className="document-dropzone" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault(); if (!busy) uploadFile(e.dataTransfer.files[0]);}}><input type="file" accept="application/pdf,image/jpeg,image/png" disabled={uploading || busy} onChange={e => {uploadFile(e.target.files?.[0]); e.target.value='';}} /><i className={`pi pi-${uploading ? 'spin pi-spinner' : 'cloud-upload'}`} /><span>{uploading ? 'Uploading...' : form.fileUrl ? form.fileName || 'Document uploaded' : 'Drop a PDF, JPG or PNG here'}</span><strong>{form.fileUrl ? 'Replace file' : 'or browse files'}</strong></label><small>Maximum file size: 5 MB</small>{formError && <p role="alert" className="document-error">{formError}</p>}<p className="document-info"><i className="pi pi-info-circle" />Submitting this document will set its status to Pending review.</p><footer className="document-actions"><button type="button" disabled={busy || uploading} onClick={() => setEditKind('')}>Cancel</button><button className="primary" type="submit" disabled={busy || uploading}>{busy ? 'Submitting...' : 'Submit for review'}</button></footer></form>
    </Dialog>
    <Dialog visible={!!reviewTarget} header="Reject document" onHide={() => !busy && setReviewTarget(null)} style={{width:'420px',maxWidth:'95vw'}}><label className="flex flex-col gap-2">Reason for rejection<textarea className="rounded border p-2" value={reason} onChange={e => setReason(e.target.value)} /></label><div className="document-actions"><button onClick={() => setReviewTarget(null)} disabled={busy}>Cancel</button><button className="danger" disabled={!reason.trim() || busy} onClick={() => reviewTarget && reviewDocument(reviewTarget,'REJECTED')}>Reject document</button></div></Dialog>
    <Dialog visible={!!deleteTarget} header="Delete document?" onHide={() => !busy && setDeleteTarget(null)} style={{width:'420px',maxWidth:'95vw'}}><p>This removes the submitted document from the store.</p><div className="document-actions"><button disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button><button disabled={busy} className="danger" onClick={async () => { if (!deleteTarget) return; setBusy(true); try {await remove({variables:{id:deleteTarget._id}});setDeleteTarget(null);refresh();} catch(error){notifyError(error);} finally{setBusy(false);}}}>Delete</button></div></Dialog>
    <Dialog visible={!!previewDoc} onHide={() => setPreviewDoc(null)} header={previewDoc ? `${titles[previewDoc.kind] || previewDoc.kind}${previewDoc.storeName ? ` — ${previewDoc.storeName}` : ''}` : ''} className="document-preview-dialog" style={{ width: '640px', maxWidth: '95vw' }}>
      {previewDoc?.fileUrl && (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(previewDoc.fileUrl) ? (
        <img src={previewDoc.fileUrl} alt={titles[previewDoc.kind] || previewDoc.kind} className="document-preview-image" />
      ) : (
        <iframe src={previewDoc.fileUrl} title="Document preview" className="document-preview-frame" />
      ))}
      <div className="document-preview-footer">
        {previewDoc?.number && <span>Licence number: {previewDoc.number}</span>}
        {previewDoc?.fileUrl && <a href={previewDoc.fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>}
      </div>
    </Dialog>
  </div>;
}
