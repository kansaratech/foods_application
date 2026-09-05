'use client';
import '@/lib/ui/useable-components/management-page/management.css';

import ManagementHeading from '@/lib/ui/useable-components/management-page/heading';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import FinanceReportMain from '@/lib/ui/screen-components/protected/super-admin/finance-report/view/main';
import CommissionBillsMain from '@/lib/ui/screen-components/protected/super-admin/commission-bills/view/main';
import RiderCashMain from '@/lib/ui/screen-components/protected/super-admin/rider-cash/view/main';
import CommissionRateMain from '@/lib/ui/screen-components/protected/super-admin/commission-rate/view/main';
import CommissionSettingsPanel from '@/lib/ui/screen-components/protected/super-admin/commission-rate/settings-panel';
import WithdrawRequestsSuperAdminMain from '@/lib/ui/screen-components/protected/super-admin/withdraw-requests/view/main';
import WithdrawRequestForm from '@/lib/ui/screen-components/protected/super-admin/withdraw-requests/form';
import PayoutRunsMain from '@/lib/ui/screen-components/protected/super-admin/payout-runs/view/main';
import ReconciliationMain from '@/lib/ui/screen-components/protected/super-admin/reconciliation/view/main';
import WalletAdjustmentsMain from '@/lib/ui/screen-components/protected/super-admin/wallet-adjustments/view/main';
import { IWithDrawRequest } from '@/lib/utils/interfaces/withdraw-request.interface';

type TabKey =
  | 'overview'
  | 'recon'
  | 'bills'
  | 'rates'
  | 'ridercash'
  | 'payoutruns'
  | 'withdrawals'
  | 'adjustments';

export default function FinanceScreen() {
  const t = useTranslations();
  const [tab, setTab] = useState<TabKey>('overview');
  const [withdrawFormVisible, setWithdrawFormVisible] = useState(false);
  const [selectedWithdrawRequest, setSelectedWithdrawRequest] = useState<IWithDrawRequest | undefined>();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('Overview') },
    { key: 'recon', label: t('Reconciliation') },
    { key: 'bills', label: t('Vendor settlements') },
    { key: 'rates', label: t('Commission rates') },
    { key: 'ridercash', label: t('Rider cash') },
    { key: 'payoutruns', label: t('Payout runs') },
    { key: 'withdrawals', label: t('Withdraw requests') },
    { key: 'adjustments', label: t('Adjustments') },
  ];

  return (
    <div className="management-page management-finance">
      <div>
        <ManagementHeading
          title={t('Finance')}
          description="Monitor revenue, settlements, commissions and payouts."
        />

        <div className="management-tabs" aria-label="Finance views">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              aria-current={tab === tb.key ? 'page' : undefined}
              onClick={() => setTab(tb.key)}
              className={`rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition ${
                tab === tb.key
                  ? 'border-primary-color text-primary-color'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        {tab === 'overview' && <FinanceReportMain />}
        {tab === 'recon' && <ReconciliationMain />}
        {tab === 'bills' && <CommissionBillsMain />}
        {tab === 'rates' && (
          <>
            <CommissionSettingsPanel />
            <CommissionRateMain />
          </>
        )}
        {tab === 'ridercash' && <RiderCashMain />}
        {tab === 'payoutruns' && <PayoutRunsMain />}
        {tab === 'withdrawals' && (
          <>
            <WithdrawRequestsSuperAdminMain
              setVisible={setWithdrawFormVisible}
              setSelectedRequest={setSelectedWithdrawRequest}
            />
            <WithdrawRequestForm
              setVisible={setWithdrawFormVisible}
              visible={withdrawFormVisible}
              selectedRequest={selectedWithdrawRequest}
            />
          </>
        )}
        {tab === 'adjustments' && <WalletAdjustmentsMain />}
      </div>
    </div>
  );
}
