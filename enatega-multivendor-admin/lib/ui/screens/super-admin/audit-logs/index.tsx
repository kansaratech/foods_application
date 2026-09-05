'use client';
import '@/lib/ui/useable-components/management-page/management.css';

import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_AUDIT_LOGS } from '@/lib/api/graphql/queries/audit';
import AuditLogCard, {
  AuditLog,
} from '@/lib/ui/screen-components/protected/super-admin/audit-logs/AuditLogCard';
import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import { Paginator, PaginatorPageChangeEvent } from 'primereact/paginator';
import { Skeleton } from 'primereact/skeleton';
import { Card } from 'primereact/card';
import { useTranslations } from 'next-intl';

const AuditLogScreen = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const t = useTranslations();

  const { data, loading, error } = useQuery(GET_AUDIT_LOGS, {
    variables: { page: currentPage, limit },
    fetchPolicy: 'cache-and-network',
  });

  const onPageChange = (event: PaginatorPageChangeEvent) => {
    setCurrentPage(event.page + 1);
    setLimit(event.rows);
  };

  if (loading && !data) {
    return (
      <div className="management-page management-audit-logs">
        <ManagementHeading
          title={t('Audit Logs')}
          description="Review administrative activity and changes across the platform."
        />
        <div className="mt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height="8rem" className="mb-4" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="management-page management-audit-logs">
        <Card
          title="Error Loading Audit Logs"
          className="shadow-md border border-red-300 bg-red-50 text-red-800"
        >
          <p className="mb-3">
            We encountered an issue while trying to fetch the audit logs.
          </p>
          <p className="font-semibold">Details: {error.message}</p>
        </Card>
      </div>
    );
  }

  const auditLogs = data?.auditLogs?.auditLogs || [];
  const totalRecords = data?.auditLogs?.totalCount || 0;

  return (
    <div className="management-page management-audit-logs">
      <div className="mb-6">
        <ManagementHeading
          title={t('Audit Logs')}
          description="Review administrative activity and changes across the platform."
        />
        <p className="text-gray-500 dark:text-white mt-1">
          {t('audit_log_header_desc')}
        </p>
      </div>

      <div className="bg-white dark:bg-dark-950 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-dark-600">
        <div className="min-h-64">
          {auditLogs.length > 0 ? (
            <div className="relative">
              {auditLogs.map((log: AuditLog, index: number) => (
                <AuditLogCard
                  key={log._id}
                  log={log}
                  isLast={index === auditLogs.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Card>
                <p>No audit logs found.</p>
              </Card>
            </div>
          )}
        </div>

        {totalRecords > 0 && (
          <div className="flex justify-center pt-4 border-t dark:border-dark-600 border-gray-200">
            <Paginator
              className="dark:bg-gray-950 dark:text-white"
              first={(currentPage - 1) * limit}
              rows={limit}
              totalRecords={totalRecords}
              rowsPerPageOptions={[10, 20, 30]}
              onPageChange={onPageChange}
              template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogScreen;
