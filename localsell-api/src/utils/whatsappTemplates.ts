/**
 * The WhatsApp templates LocalSell sends, keyed by an internal event name. This
 * constant is the source of truth for which Meta template each event uses and
 * what its positional {{n}} variables mean; the `WhatsappTemplate` DB table
 * mirrors Meta's live review status (populated by `syncWhatsappTemplates`) and
 * can re-point a key at a different Meta template without a redeploy.
 *
 * Keep in sync with LOCALSELL_WHATSAPP.md.
 */

export type WaCategory = 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
export type WaAudience = 'CUSTOMER' | 'VENDOR' | 'RIDER';

export interface WaTemplateDef {
  /** internal event key — what the code references */
  key: string;
  /** exact template name registered in WhatsApp Manager */
  metaName: string;
  language: string;
  category: WaCategory;
  audience: WaAudience;
  /** WhatsappMessageLog.purpose written for a send of this template */
  purpose: string;
  /** ordered description of {{1}}..{{n}} — length = expected body param count */
  bodyVars: string[];
  /** authentication templates carry Meta's copy-code button */
  hasOtpButton?: boolean;
}

export const WA_TEMPLATES: WaTemplateDef[] = [
  {
    key: 'otp_verify',
    metaName: 'localsell_otp',
    language: 'en_US',
    category: 'AUTHENTICATION',
    audience: 'CUSTOMER',
    purpose: 'OTP',
    bodyVars: ['code'],
    hasOtpButton: true,
  },
  {
    key: 'order_placed',
    metaName: 'localsell_order_placed',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'CUSTOMER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['customerName', 'orderNumber', 'storeName', 'orderTotal'],
  },
  {
    key: 'order_confirmed',
    metaName: 'localsell_order_confirmed',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'CUSTOMER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['customerName', 'orderNumber', 'storeName', 'prepMinutes'],
  },
  {
    // No code in the body — Meta forces "code" templates to AUTHENTICATION
    // (fixed, non-editable body). The proof-of-delivery code stays on the
    // customer's in-app / web order screen; this message points them to it.
    key: 'order_out_for_delivery',
    metaName: 'localsell_order_out_for_delivery',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'CUSTOMER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['customerName', 'orderNumber', 'storeName'],
  },
  {
    key: 'order_delivered',
    metaName: 'localsell_order_delivered',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'CUSTOMER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['customerName', 'orderNumber', 'storeName', 'amountNote'],
  },
  {
    key: 'order_cancelled',
    metaName: 'localsell_order_cancelled',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'CUSTOMER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['customerName', 'orderNumber', 'storeName', 'reason'],
  },
  {
    key: 'vendor_new_order',
    metaName: 'localsell_vendor_new_order',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'VENDOR',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['orderNumber', 'itemCount', 'orderTotal', 'paymentMethod'],
  },
  {
    key: 'rider_assigned',
    metaName: 'localsell_rider_assigned',
    language: 'en_US',
    category: 'UTILITY',
    audience: 'RIDER',
    purpose: 'ORDER_UPDATE',
    bodyVars: ['riderName', 'orderNumber', 'storeNameArea', 'deliveryArea'],
  },
];

export function waTemplateByKey(key: string): WaTemplateDef | undefined {
  return WA_TEMPLATES.find((t) => t.key === key);
}
