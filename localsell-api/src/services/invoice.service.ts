/**
 * Customer-facing GST tax invoice for a DELIVERED order — issued by the
 * STORE (its own GSTIN/address), not by LocalSell. Generated once, on
 * delivery, saved to uploads/invoices/<order.id>.pdf (served statically at
 * `${PUBLIC_UPLOAD_URL}/invoices/<id>.pdf`) and sent to the customer via a
 * WhatsApp document template — see order-notify.ts. Also linked from the
 * order's `invoiceUrl` GraphQL field for in-app viewing.
 *
 * A store with gstRegistrationType REGULAR gets a proper TAX INVOICE with a
 * CGST/SGST breakdown (this is same-city hyperlocal delivery only, so always
 * intra-state — no IGST branch, matching Order.cgstAmount/sgstAmount).
 * COMPOSITION and UNREGISTERED stores legally cannot show tax charged
 * separately, so they get a BILL OF SUPPLY instead (Section 10 CGST Act for
 * composition dealers; below-threshold for unregistered).
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import type {
  Order,
  OrderItem,
  Restaurant,
  User,
  Address,
} from "@prisma/client";

/** Restaurant/catering service HSN/SAC — same for every store today (food-only
 *  marketplace). Revisit if a non-restaurant shop type (e.g. grocery) is added. */
const HSN_CODE = "996331";

const money = (n: number) =>
  `\u20B9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Indian financial year (Apr 1 - Mar 31), IST. */
function financialYear(d: Date): string {
  const local = new Date(d.getTime() + 330 * 60000);
  const y = local.getUTCFullYear();
  const startYear = local.getUTCMonth() >= 3 ? y : y - 1; // Apr(3)+ => FY starts this calendar year
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

/**
 * Per-store, per-financial-year sequential invoice number, e.g.
 * `HOTPIZZA/26-27/00001`. Not row-locked — fine at this order volume; a
 * same-millisecond race on the very first order of a new financial year is
 * the only theoretical double-reset, and even then just wastes one number.
 */
async function nextOrderInvoiceNumber(
  restaurantId: string,
  orderPrefix: string | null,
  when: Date,
): Promise<string> {
  const fy = financialYear(when);
  const store = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { invoiceSeq: true, invoiceSeqFY: true, slug: true },
  });
  const resetForNewFY = store?.invoiceSeqFY !== fy;
  const updated = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: resetForNewFY
      ? { invoiceSeq: 1, invoiceSeqFY: fy }
      : { invoiceSeq: { increment: 1 } },
    select: { invoiceSeq: true },
  });
  const prefix =
    (orderPrefix || store?.slug || "INV")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10) || "INV";
  return `${prefix}/${fy}/${String(updated.invoiceSeq).padStart(5, "0")}`;
}

type OrderForInvoice = Order & {
  restaurant: Restaurant;
  user: Pick<User, "name" | "phone" | "email">;
  address: Address | null;
  items: (OrderItem & {
    addons?: {
      options: { title: string; price: number; quantity: number }[];
    }[];
  })[];
};

function invoiceFilePath(orderId: string): string {
  return path.join(env.uploadDir, "invoices", `${orderId}.pdf`);
}

export function invoicePublicUrl(orderId: string): string {
  return `${env.publicUploadUrl.replace(/\/$/, "")}/invoices/${orderId}.pdf`;
}

/**
 * Generates (if not already generated) the invoice PDF for a DELIVERED
 * order. Idempotent: a redeploy/retry never mints a second invoice number
 * or overwrites the file for the same order — it just returns the existing
 * one. Returns null if the order doesn't exist.
 */
export async function ensureInvoice(orderId: string): Promise<{
  invoiceNumber: string;
  filePath: string;
  publicUrl: string;
} | null> {
  const order = (await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      address: true,
      restaurant: true,
      items: { include: { addons: { include: { options: true } } } },
    },
  })) as OrderForInvoice | null;
  if (!order) return null;

  const filePath = invoiceFilePath(order.id);
  const publicUrl = invoicePublicUrl(order.id);

  if (order.invoiceNumber && fs.existsSync(filePath)) {
    return { invoiceNumber: order.invoiceNumber, filePath, publicUrl };
  }

  const invoiceNumber =
    order.invoiceNumber ??
    (await nextOrderInvoiceNumber(
      order.restaurantId,
      order.restaurant.orderPrefix,
      order.deliveredAt ?? new Date(),
    ));
  if (!order.invoiceNumber) {
    await prisma.order.update({
      where: { id: order.id },
      data: { invoiceNumber },
    });
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const configuration = await prisma.configuration.findFirst({
    select: { termsAndConditions: true },
  });
  await renderInvoicePdf(
    filePath,
    order,
    invoiceNumber,
    configuration?.termsAndConditions,
  );

  return { invoiceNumber, filePath, publicUrl };
}

// Brand palette (LOCALSELL_BRAND.md) — kept in sync with theme-tokens.css.
const BLUE = "#1C5BC7";
const NAVY = "#16293F";
const MUTED = "#6B7280";
const BORDER = "#B8C2CE";
const PANEL = "#F3F6FC";

const LOGO_PATH = path.resolve(
  process.cwd(),
  "src/assets/brand/localsell-logo.png",
);
// A 160 mm receipt, with measured page heights instead of a mostly empty A4 sheet.
const RECEIPT_WIDTH = 454;
const LEFT = 26;
const RIGHT = RECEIPT_WIDTH - LEFT;
const WIDTH = RIGHT - LEFT;
const CONTENT_BOTTOM = 695;

/** Configuration is plain text today; also tolerate basic rich-text content. */
export function invoiceTermsText(value?: string | null): string {
  return (value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (original, code: string) => {
      const point =
        code[0].toLowerCase() === "x"
          ? parseInt(code.slice(1), 16)
          : Number(code);
      return point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : original;
    })
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function renderInvoicePdf(
  filePath: string,
  order: OrderForInvoice,
  invoiceNumber: string,
  termsAndConditions?: string | null,
): Promise<void> {
  const store = order.restaurant;
  const regular = store.gstRegistrationType === "REGULAR" && !!store.gstin;
  const title = regular ? "TAX INVOICE" : "BILL OF SUPPLY";
  const terms = invoiceTermsText(termsAndConditions);
  const heights: number[] = [];
  // First measure with exactly the same typography and wrapping, then render
  // using those page sizes. PDF coordinates must use the final height upfront.
  const build = (measure: boolean): Promise<void> =>
    new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        autoFirstPage: false,
        margin: 0,
        bufferPages: true,
        info: { Title: `${title} - ${invoiceNumber}`, Author: store.name },
      });
      if (measure) {
        doc.on("end", resolve);
        doc.resume();
      } else {
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        stream.on("finish", resolve);
        stream.on("error", reject);
      }
      doc.on("error", reject);
      doc.registerFont(
        "Invoice-Regular",
        path.resolve(process.cwd(), "src/assets/fonts/NotoSans-Regular.ttf"),
      );
      doc.registerFont(
        "Invoice-Bold",
        path.resolve(process.cwd(), "src/assets/fonts/NotoSans-Bold.ttf"),
      );
      let page = 0;
      let y = 0;
      const font = (size = 10, bold = false) =>
        doc.font(bold ? "Invoice-Bold" : "Invoice-Regular").fontSize(size);
      const height = (
        value: string,
        width: number,
        size = 10,
        bold = false,
      ) => {
        font(size, bold);
        return doc.heightOfString(value, { width, lineGap: 1 });
      };
      const text = (
        value: string,
        x: number,
        top: number,
        width: number,
        size = 10,
        bold = false,
        color = NAVY,
        align: "left" | "right" = "left",
      ) => {
        font(size, bold)
          .fillColor(color)
          .text(value, x, top, { width, align, lineGap: 1 });
        return doc.y;
      };
      const rule = (top: number, color = BORDER) =>
        doc
          .moveTo(LEFT, top)
          .lineTo(RIGHT, top)
          .lineWidth(0.6)
          .strokeColor(color)
          .stroke();
      const addPage = () => {
        doc.addPage({
          size: [RECEIPT_WIDTH, measure ? 780 : heights[page]],
          margin: 0,
        });
        y = 26;
        if (page > 0) {
          y = text(`${title} / ${invoiceNumber}`, LEFT, y, WIDTH, 9, true) + 15;
          rule(y - 6);
        }
      };
      const finishPage = () => {
        if (measure) heights.push(Math.max(300, Math.ceil(y + 58)));
      };
      const nextPage = () => {
        finishPage();
        page++;
        addPage();
      };
      const ensure = (needed: number) => {
        if (y + needed > CONTENT_BOTTOM) nextPage();
      };
      addPage();
      if (fs.existsSync(LOGO_PATH))
        doc.image(LOGO_PATH, LEFT + 10, y, { fit: [108, 30] });
      else text("LocalSell", LEFT, y, 140, 22, true, BLUE);
      text(title, 212, y, 206, 16, true, NAVY, "right");
      text(
        "Original for recipient",
        212,
        y + 22,
        206,
        9,
        false,
        MUTED,
        "right",
      );
      y += 44;
      rule(y);
      const date = (order.deliveredAt ?? new Date()).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        },
      );
      const refs = [
        {
          x: LEFT + 10,
          width: 144,
          label: "INVOICE NO.",
          value: invoiceNumber,
        },
        { x: 195, width: 110, label: "ORDER NO.", value: order.orderId },
        { x: 324, width: 94, label: "ISSUED ON", value: date },
      ];
      const referenceTop = y;
      let end = y;
      for (const cell of refs) {
        text(cell.label, cell.x, y + 8, cell.width, 7.5, true, MUTED);
        end = Math.max(
          end,
          text(cell.value, cell.x, y + 21, cell.width, 9, true),
        );
      }
      y = end + 8;
      for (const x of [185, 314])
        doc.moveTo(x, referenceTop).lineTo(x, y).strokeColor(BORDER).stroke();
      rule(y);
      const addressTop = y;
      y += 10;
      // Parallel address blocks save space without reducing reading size.
      text("SOLD BY", LEFT + 10, y, 177, 8, true, NAVY);
      text("BILLED TO", 237, y, 181, 8, true, NAVY);
      let seller = text(store.name, LEFT + 10, y + 14, 177, 11, true) + 3;
      if (store.address)
        seller = text(store.address, LEFT + 10, seller, 177, 9) + 3;
      if (store.phone)
        seller =
          text(
            `Phone: ${store.phone}`,
            LEFT + 10,
            seller,
            177,
            8.5,
            false,
            MUTED,
          ) + 3;
      if (regular)
        seller =
          text(`GSTIN: ${store.gstin}`, LEFT + 10, seller, 177, 8, true) + 3;
      let buyer =
        text(order.user.name || "Customer", 237, y + 14, 181, 11, true) + 3;
      const address = order.address?.deliveryAddress || order.address?.details;
      if (address) buyer = text(address, 237, buyer, 181, 9) + 3;
      if (order.user.phone)
        buyer =
          text(
            `Phone: ${order.user.phone}`,
            237,
            buyer,
            181,
            8.5,
            false,
            MUTED,
          ) + 5;
      y = Math.max(seller, buyer) + 8;
      doc.moveTo(225, addressTop).lineTo(225, y).strokeColor(BORDER).stroke();
      rule(y);
      const method =
        order.paymentMethod === "COD"
          ? "Cash on delivery"
          : order.paymentMethod === "CASHFREE"
            ? "Online / Cashfree"
            : order.paymentMethod || "Not recorded";
      const state =
        order.refundStatus === "SUCCESS"
          ? "Refunded"
          : order.paymentStatus === "PAID"
            ? "Paid"
            : order.paymentStatus === "FAILED"
              ? "Failed"
              : order.paymentStatus === "PENDING"
                ? "Pending"
                : "Not recorded";
      const tableHeader = () => {
        doc.rect(LEFT, y, WIDTH, 27).fill(PANEL);
        text("Item / description", LEFT + 10, y + 8, 185, 8.5, true, NAVY);
        text("Qty", 230, y + 8, 30, 8.5, true, NAVY, "right");
        text("Unit price", 270, y + 8, 64, 8.5, true, NAVY, "right");
        text("Amount", 344, y + 8, 74, 8.5, true, NAVY, "right");
        for (const x of [225, 265, 339])
          doc
            .moveTo(x, y)
            .lineTo(x, y + 27)
            .strokeColor(BORDER)
            .stroke();
        y += 27;
        rule(y);
      };
      ensure(90);
      tableHeader();
      const numeric = money;
      let subtotal = 0;
      for (const item of order.items) {
        const options = item.addons?.flatMap((addon) => addon.options) ?? [];
        const unit =
          item.price +
          options.reduce(
            (sum, option) => sum + option.price * (option.quantity ?? 1),
            0,
          );
        subtotal += unit * item.quantity;
        // Render title and addon lines separately to retain their visual hierarchy.
        const pieces = [
          { value: item.title, bold: true },
          ...options.map((option) => ({
            value: `+ ${option.quantity ?? 1} x ${option.title}`,
            bold: false,
          })),
        ];
        // Keep normal-sized items and their addons together across page breaks.
        const itemHeight = pieces.reduce(
          (sum, piece, index) =>
            sum +
            Math.max(
              index === 0 ? 34 : 22,
              height(piece.value, 185, piece.bold ? 10.5 : 9, piece.bold) + 14,
            ),
          0,
        );
        if (
          itemHeight < CONTENT_BOTTOM - 100 &&
          y + itemHeight > CONTENT_BOTTOM
        ) {
          nextPage();
          tableHeader();
        }
        let first = true;
        for (const piece of pieces) {
          const words = piece.value.split(/\s+/);
          let chunk = "";
          const renderChunk = (value: string) => {
            const size = piece.bold ? 10.5 : 9;
            const rowHeight = Math.max(
              first ? 34 : 22,
              height(value, 185, size, piece.bold) + 14,
            );
            if (y + rowHeight > CONTENT_BOTTOM) {
              nextPage();
              tableHeader();
            }
            const top = y + 7;
            text(
              value,
              LEFT + 10,
              top,
              185,
              size,
              piece.bold,
              piece.bold ? NAVY : MUTED,
            );
            if (first) {
              text(
                String(item.quantity),
                230,
                top,
                30,
                10,
                false,
                NAVY,
                "right",
              );
              text(numeric(unit), 270, top, 64, 10, false, NAVY, "right");
              text(
                numeric(unit * item.quantity),
                344,
                top,
                74,
                10,
                true,
                NAVY,
                "right",
              );
            }
            for (const x of [225, 265, 339])
              doc
                .moveTo(x, y)
                .lineTo(x, y + rowHeight)
                .strokeColor(BORDER)
                .stroke();
            first = false;
            y += rowHeight;
          };
          for (const word of words) {
            const candidate = chunk ? `${chunk} ${word}` : word;
            if (
              chunk &&
              height(candidate, 185, piece.bold ? 10.5 : 9, piece.bold) > 350
            ) {
              renderChunk(chunk);
              chunk = word;
            } else chunk = candidate;
          }
          renderChunk(chunk);
        }
        rule(y);
      }
      const charges: [string, number][] = [["Items subtotal", subtotal]];
      if (order.discountAmount > 0)
        charges.push(["Discount", -order.discountAmount]);
      if (order.deliveryCharges > 0)
        charges.push(["Delivery charges", order.deliveryCharges]);
      if (order.tipping > 0) charges.push(["Tip", order.tipping]);
      if (regular && order.taxationAmount > 0) {
        charges.push([
          `CGST (${(store.tax / 2).toFixed(1)}%)`,
          order.cgstAmount ?? order.taxationAmount / 2,
        ]);
        charges.push([
          `SGST (${(store.tax / 2).toFixed(1)}%)`,
          order.sgstAmount ?? order.taxationAmount / 2,
        ]);
      }
      ensure(Math.max(charges.length * 19, 96) + 43);
      const summaryTop = y;
      const summaryHeight = Math.max(charges.length * 19, 96);
      text("PAYMENT", LEFT + 10, y + 10, 150, 8, true, MUTED);
      text(method, LEFT + 10, y + 25, 150, 10, true);
      text(
        `Status: ${state}`,
        LEFT + 10,
        y + 43,
        150,
        9,
        true,
        state === "Paid" ? "#16704A" : NAVY,
      );
      if (regular)
        text(`HSN/SAC: ${HSN_CODE}`, LEFT + 10, y + 65, 150, 8.5, false, MUTED);
      let chargeY = y + 8;
      for (const [label, value] of charges) {
        text(label, 235, chargeY, 94, 9, false, MUTED);
        text(numeric(value), 349, chargeY, 69, 9.5, false, NAVY, "right");
        chargeY += 19;
      }
      y = summaryTop + summaryHeight + 12;
      doc.moveTo(225, summaryTop).lineTo(225, y).strokeColor(BORDER).stroke();
      doc.moveTo(339, summaryTop).lineTo(339, y).strokeColor(BORDER).stroke();
      rule(y);
      doc.rect(LEFT, y, WIDTH, 42).fill(PANEL);
      text("TOTAL AMOUNT", LEFT + 10, y + 8, 160, 9, true);
      text(
        "Including applicable taxes",
        LEFT + 10,
        y + 23,
        180,
        7.5,
        false,
        MUTED,
      );
      text(money(order.orderAmount), 220, y + 9, 198, 17, true, NAVY, "right");
      y += 42;
      rule(y);
      if (terms) {
        const termsHeading = () => {
          text("TERMS & CONDITIONS", LEFT + 10, y + 9, WIDTH - 20, 8, true);
          y += 25;
        };
        ensure(65);
        termsHeading();
        // Wrap using the same font metrics and paginate every line; never truncate policy text.
        for (const paragraph of terms.split("\n")) {
          let row = "";
          const printRow = (value: string) => {
            const h = height(value || " ", WIDTH - 20, 8.5) + 2;
            if (y + h > CONTENT_BOTTOM) {
              nextPage();
              termsHeading();
            }
            y =
              text(value || " ", LEFT + 10, y, WIDTH - 20, 8.5, false, MUTED) +
              2;
          };
          for (const word of paragraph.split(/\s+/)) {
            const candidate = row ? `${row} ${word}` : word;
            font(8.5);
            if (row && doc.widthOfString(candidate) > WIDTH - 20) {
              printRow(row);
              row = word;
            } else row = candidate;
          }
          printRow(row);
        }
        y += 8;
      }
      finishPage();
      if (!measure) {
        for (let i = 0; i < heights.length; i++) {
          doc.switchToPage(i);
          const top = heights[i] - 48;
          doc
            .rect(LEFT, 16, WIDTH, heights[i] - 32)
            .lineWidth(0.8)
            .strokeColor("#8995A5")
            .stroke();
          rule(top);
          text(
            regular
              ? "Computer-generated tax invoice issued by the store named above."
              : store.gstRegistrationType === "COMPOSITION"
                ? "Composition dealer - not eligible to collect tax separately."
                : "Unregistered dealer - no GST charged on this order.",
            LEFT + 10,
            top + 6,
            WIDTH - 20,
            7,
            false,
            MUTED,
          );
          text(
            "LocalSell | localsell.in",
            LEFT + 10,
            heights[i] - 29,
            290,
            8,
            true,
            MUTED,
          );
          text(
            `Page ${i + 1} of ${heights.length}`,
            330,
            heights[i] - 29,
            88,
            8,
            false,
            MUTED,
            "right",
          );
        }
      }
      doc.end();
    });
  await build(true);
  await build(false);
}
