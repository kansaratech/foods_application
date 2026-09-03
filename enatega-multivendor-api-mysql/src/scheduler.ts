import { autoCloseCompletedPeriods } from './services/commission.service';

/**
 * Lightweight in-process schedulers. No external cron / queue — a single
 * `setInterval` per job. Fine for one API instance; if you ever run multiple,
 * gate these behind an env flag on one of them.
 *
 * Disable with `COMMISSION_AUTOCLOSE=off`.
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

async function runCommissionAutoClose(): Promise<void> {
  try {
    const bills = await autoCloseCompletedPeriods();
    if (bills.length > 0) {
      console.log(`[scheduler] commission auto-close: generated ${bills.length} bill(s) for completed period(s)`);
    }
  } catch (err) {
    console.error('[scheduler] commission auto-close failed:', (err as Error).message);
  }
}

export function startSchedulers(): void {
  if (process.env.COMMISSION_AUTOCLOSE === 'off') {
    console.log('[scheduler] commission auto-close disabled (COMMISSION_AUTOCLOSE=off)');
    return;
  }
  // Run shortly after boot (covers a restart that happened right after a period
  // boundary), then every 6 hours.
  setTimeout(runCommissionAutoClose, 15_000);
  setInterval(runCommissionAutoClose, SIX_HOURS_MS);
  console.log('[scheduler] commission auto-close armed (every 6h; closes only completed periods)');
}
