'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import FinanceReportMain from '@/lib/ui/screen-components/protected/super-admin/finance-report/view/main';
import CommissionBillsMain from '@/lib/ui/screen-components/protected/super-admin/commission-bills/view/main';
import RiderCashMain from '@/lib/ui/screen-components/protected/super-admin/rider-cash/view/main';
import CommissionRateMain from '@/lib/ui/screen-components/protected/super-admin/commission-rate/view/main';
import CommissionRateHeader from '@/lib/ui/screen-components/protected/super-admin/commission-rate/view/header/screen-header';
import WithDrawRequestSuperAdminScreen from '@/lib/ui/screens/super-admin/wallet/withdrawalRequest';
import PayoutRunsMain from '@/lib/ui/screen-components/protected/super-admin/payout-runs/view/main';
import ReconciliationMain from '@/lib/ui/screen-components/protected/super-admin/reconciliation/view/main';
import WalletAdjustmentsMain from '@/lib/ui/screen-components/protected/super-admin/wallet-adjustments/view/main';

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
    <div className="screen-container">
      <div className="border-b px-3 pt-4 dark:border-dark-600">
        <h1 className="mb-3 text-xl font-bold">{t('Finance')}</h1>
        <div className="flex flex-wrap gap-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
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
            <CommissionRateHeader />
            <CommissionRateMain />
          </>
        )}
        {tab === 'ridercash' && <RiderCashMain />}
        {tab === 'payoutruns' && <PayoutRunsMain />}
        {tab === 'withdrawals' && <WithDrawRequestSuperAdminScreen />}
        {tab === 'adjustments' && <WalletAdjustmentsMain />}
      </div>
    </div>
  );
}
