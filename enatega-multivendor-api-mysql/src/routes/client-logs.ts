import { Router } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Dev-only client log sink. The mobile apps POST their runtime errors /
 * GraphQL failures here so issues can be diagnosed from `logs/<app>.log`
 * instead of being reported one screen at a time.
 *
 * POST /client-logs  { app, level, message, screen?, stack?, extra? }
 * GET  /client-logs/:app        -> plain-text tail of that app's log
 */
export const clientLogsRouter = Router();

const LOG_DIR = path.resolve(process.cwd(), 'logs');
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  /* ignore */
}

const APPS = new Set(['customer', 'rider', 'store', 'unknown']);
const sanitizeApp = (a: unknown) => {
  const s = String(a ?? 'unknown').toLowerCase().replace(/[^a-z]/g, '');
  return APPS.has(s) ? s : 'unknown';
};
const trunc = (v: unknown, n: number) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v ?? null);
  return s && s.length > n ? s.slice(0, n) + '…' : s;
};

clientLogsRouter.post('/', (req, res) => {
  try {
    const b = req.body ?? {};
    const app = sanitizeApp(b.app);
    const line = JSON.stringify({
      t: new Date().toISOString(),
      level: trunc(b.level ?? 'error', 12),
      screen: trunc(b.screen ?? '', 60),
      message: trunc(b.message ?? '', 600),
      stack: trunc(b.stack ?? '', 1200),
      extra: b.extra ? trunc(b.extra, 800) : undefined,
    });
    fs.appendFile(path.join(LOG_DIR, `${app}.log`, ), line + '\n', () => undefined);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

clientLogsRouter.get('/:app', (req, res) => {
  const app = sanitizeApp(req.params.app);
  try {
    const txt = fs.readFileSync(path.join(LOG_DIR, `${app}.log`), 'utf8');
    res.type('text/plain').send(txt.split('\n').slice(-400).join('\n'));
  } catch {
    res.type('text/plain').send('(no logs yet)');
  }
});
