'use client';

import { useContext, useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';

import {
  GET_WAITLIST_ENTRIES,
  MARK_WAITLIST_NOTIFIED,
} from '@/lib/api/graphql';
import { ToastContext } from '@/lib/context/global/toast.context';
import { useQueryGQL } from '@/lib/hooks/useQueryQL';
import Table from '@/lib/ui/useable-components/table';
import { WAITLIST_COLUMNS } from '@/lib/ui/useable-components/table/columns/waitlist-columns';
import {
  IWaitlistEntriesResponse,
  IWaitlistEntry,
} from '@/lib/utils/interfaces';

import WaitlistHeader from '../header/screen-header';

export default function WaitlistMain() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Debounce the search box so we don't fire a query per keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, loading, refetch } = useQueryGQL(
    GET_WAITLIST_ENTRIES,
    { page: currentPage, limit: rowsPerPage, search: search || null },
    { fetchPolicy: 'cache-and-network' }
  ) as { data?: IWaitlistEntriesResponse; loading: boolean; refetch: () => void };

  const [markNotified] = useMutation(MARK_WAITLIST_NOTIFIED);

  const entries = data?.waitlistEntries?.entries ?? [];
  const total = data?.waitlistEntries?.total ?? 0;

  const handleToggleNotified = async (entry: IWaitlistEntry) => {
    setPendingId(entry._id);
    try {
      await markNotified({
        variables: { id: entry._id, notified: !entry.notified },
      });
      showToast({
        type: 'success',
        title: t('Waitlist'),
        message: entry.notified
          ? t('Marked as not notified')
          : t('Marked as notified'),
        duration: 2000,
      });
      refetch();
    } catch {
      showToast({
        type: 'error',
        title: t('Error'),
        message: t('Could not update this entry - please try again'),
        duration: 2000,
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="p-3">
      <Table
        data={loading ? [] : entries}
        columns={WAITLIST_COLUMNS({
          onToggleNotified: handleToggleNotified,
          pendingId,
        })}
        loading={loading}
        moduleName="Waitlist"
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        totalRecords={total}
        onPageChange={(page, rows) => {
          setCurrentPage(page);
          setRowsPerPage(rows);
        }}
        header={
          <WaitlistHeader
            search={searchInput}
            onSearch={setSearchInput}
            total={total}
          />
        }
      />
    </div>
  );
}
