/**
 * Admin-side WhatsApp template management: pull the live template list from Meta
 * and mirror each one's review status / category / language / body into the
 * `WhatsappTemplate` registry, matched by `metaName`. Rows the code knows about
 * (WA_TEMPLATES) that Meta hasn't returned are marked MISSING so the admin sees
 * they still need creating.
 */
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import { WA_TEMPLATES } from '../utils/whatsappTemplates';
import type { WhatsappTemplate } from '@prisma/client';

interface MetaTemplate {
  name: string;
  status: string; // APPROVED | PENDING | REJECTED | PAUSED | DISABLED
  category: string; // AUTHENTICATION | UTILITY | MARKETING
  language: string;
  components?: Array<{ type: string; text?: string; format?: string }>;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  updated: number;
  templates: WhatsappTemplate[];
}

export async function syncWhatsappTemplates(): Promise<SyncResult> {
  const c = await prisma.configuration.findFirst();
  const token = env.whatsappAccessToken || c?.whatsappAccessToken || '';
  const waba = c?.whatsappWabaId;
  const version = c?.whatsappApiVersion || 'v22.0';
  if (!token || !waba) {
    return { ok: false, message: 'Set the WhatsApp access token and WABA ID first.', updated: 0, templates: [] };
  }

  const metaByName = new Map<string, MetaTemplate>();
  let url: string | null =
    `https://graph.facebook.com/${version}/${waba}/message_templates?fields=name,status,category,language,components&limit=100`;
  try {
    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json()) as { data?: MetaTemplate[]; paging?: { next?: string }; error?: { message?: string } };
      if (json.error) return { ok: false, message: `Meta: ${json.error.message}`, updated: 0, templates: [] };
      for (const t of json.data ?? []) metaByName.set(t.name, t);
      url = json.paging?.next ?? null;
    }
  } catch (err) {
    return { ok: false, message: `Fetch failed: ${(err as Error).message}`, updated: 0, templates: [] };
  }

  let updated = 0;
  const out: SyncResult['templates'] = [];
  for (const def of WA_TEMPLATES) {
    const existing = await prisma.whatsappTemplate.findUnique({ where: { key: def.key } });
    const targetName = existing?.metaName || def.metaName;
    const meta = metaByName.get(targetName);
    const bodyText = meta?.components?.find((x) => x.type === 'BODY')?.text ?? existing?.bodyText ?? null;
    const status = meta ? meta.status : 'MISSING';
    const language = meta?.language || existing?.language || def.language;
    const category = meta?.category || existing?.category || def.category;

    const row = await prisma.whatsappTemplate.upsert({
      where: { key: def.key },
      update: {
        status,
        language,
        category,
        bodyText,
        variableMap: def.bodyVars as unknown as object,
        buttonType: def.hasOtpButton ? 'OTP' : 'NONE',
        lastSyncedAt: new Date(),
      },
      create: {
        key: def.key,
        metaName: targetName,
        language,
        category,
        status,
        bodyText,
        buttonType: def.hasOtpButton ? 'OTP' : 'NONE',
        variableMap: def.bodyVars as unknown as object,
        lastSyncedAt: new Date(),
      },
    });
    updated += 1;
    out.push(row);
  }

  const missing = out.filter((t) => t.status === 'MISSING').map((t) => t.metaName);
  const message = missing.length
    ? `Synced ${updated}. Not yet created in Meta: ${missing.join(', ')}`
    : `Synced ${updated} templates.`;
  return { ok: true, message, updated, templates: out };
}
