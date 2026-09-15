import { Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { prisma } from '../prisma/client';
import { userInputError } from '../utils/errors';

const nanoid = customAlphabet('0123456789', 8);

// A discounted price is only real if it's a positive number strictly below
// the original price — guards against a stray 0 (or a bad discount >= price)
// ever being charged as the unit price. Belt-and-suspenders alongside the
// sanitizing done on write in food.resolvers.ts.
function effectivePrice(price: number, discounted: number | null | undefined): number {
  return discounted != null && discounted > 0 && discounted < price ? discounted : price;
}

export interface OrderAddonInput {
  _id: string;
  options: string[];
}

export interface OrderItemInput {
  food: string;
  quantity: number;
  variation?: string | null;
  addons?: OrderAddonInput[] | null;
  specialInstructions?: string | null;
}

interface BuiltOrderItem {
  data: Prisma.OrderItemCreateWithoutOrderInput;
  lineTotal: number;
  gstRate: number;
}

export interface OrderItemLine {
  lineTotal: number;
  gstRate: number;
}

/**
 * Recomputes prices from the current Food/Variation/Option records rather than
 * trusting client-sent totals, and snapshots titles/prices onto the order item
 * so historical orders stay accurate if the menu changes later.
 *
 * `defaultGstRate` is the owning restaurant's default rate (Restaurant.tax) —
 * each line uses its own Food.gstRatePercent when set, else this default, so
 * the caller can compute tax per line (pricing.service.ts computeGst) after
 * discount is known.
 */
export async function buildOrderItems(
  restaurantId: string,
  items: OrderItemInput[],
  defaultGstRate: number = 0,
): Promise<{ itemsData: Prisma.OrderItemCreateWithoutOrderInput[]; itemsTotal: number; lines: OrderItemLine[] }> {
  if (!items.length) {
    throw userInputError('An order must contain at least one item');
  }

  const built: BuiltOrderItem[] = [];

  for (const item of items) {
    const food = await prisma.food.findFirst({
      where: { id: item.food, restaurantId },
      include: {
        variations: { include: { addons: { include: { addon: true } } } },
      },
    });
    if (!food) {
      throw userInputError(`Food ${item.food} was not found for this restaurant`);
    }
    if (food.isOutOfStock || !food.isActive) {
      throw userInputError(`Food "${food.title}" is currently unavailable`);
    }

    let unitPrice: number;
    let variationId: string | null = null;
    let variationTitle = '';
    let resolvedVariation: (typeof food.variations)[number] | null = null;

    if (item.variation) {
      const variation = food.variations.find((v) => v.id === item.variation);
      if (!variation) {
        throw userInputError(`Variation ${item.variation} does not belong to food ${food.title}`);
      }
      if (variation.isOutOfStock) {
        throw userInputError(`Variation "${variation.title}" is currently unavailable`);
      }
      unitPrice = effectivePrice(variation.price, variation.discounted);
      variationId = variation.id;
      variationTitle = variation.title;
      resolvedVariation = variation;
    } else if (food.variations.length === 1) {
      const [only] = food.variations;
      unitPrice = effectivePrice(only.price, only.discounted);
      variationId = only.id;
      variationTitle = only.title;
      resolvedVariation = only;
    } else {
      throw userInputError(`A variation must be selected for food "${food.title}"`);
    }

    // Belt-and-suspenders: createFood/editFood reject a ₹0 price outright now,
    // but this also catches any item that predates that check.
    if (!(unitPrice > 0)) {
      throw userInputError(`"${food.title}" is not available for order right now`);
    }

    let addonsTotal = 0;
    const addonsData: Prisma.OrderItemAddonCreateWithoutOrderItemInput[] = [];
    const selectedCountByAddonId = new Map<string, number>();

    for (const addonInput of item.addons ?? []) {
      const addon = await prisma.addon.findFirst({
        where: { id: addonInput._id, restaurantId },
        include: { options: true },
      });
      if (!addon) {
        throw userInputError(`Addon ${addonInput._id} was not found for this restaurant`);
      }

      // Quantity (e.g. 2x Tawa Roti) is expressed by the client repeating an
      // option's id in the array that many times — no API shape change, the
      // resolver just counts occurrences and stores one aggregated row.
      const quantityByOptionId = new Map<string, number>();
      for (const optionId of addonInput.options) {
        quantityByOptionId.set(optionId, (quantityByOptionId.get(optionId) ?? 0) + 1);
      }

      const optionsData: Prisma.OrderItemAddonOptionCreateWithoutOrderItemAddonInput[] = [];
      let selectedCount = 0;
      for (const [optionId, optionQuantity] of quantityByOptionId) {
        const option = addon.options.find((o) => o.id === optionId);
        if (!option) {
          throw userInputError(`Option ${optionId} does not belong to addon ${addon.title}`);
        }
        selectedCount += optionQuantity;
        addonsTotal += option.price * optionQuantity;
        optionsData.push({
          title: option.title,
          price: option.price,
          quantity: optionQuantity,
          option: { connect: { id: option.id } },
        });
      }

      if (selectedCount < addon.quantityMinimum) {
        throw userInputError(
          `"${addon.title}" requires at least ${addon.quantityMinimum} selection(s)`,
        );
      }
      if (selectedCount > addon.quantityMaximum) {
        throw userInputError(
          `"${addon.title}" allows at most ${addon.quantityMaximum} selection(s)`,
        );
      }
      selectedCountByAddonId.set(addon.id, selectedCount);

      addonsData.push({
        title: addon.title,
        addon: { connect: { id: addon.id } },
        options: { create: optionsData },
      });
    }

    // Required addon groups (quantityMinimum > 0) that the client never
    // submitted at all — the loop above only validates groups that were
    // actually present in the request.
    for (const { addon } of resolvedVariation?.addons ?? []) {
      if (addon.quantityMinimum > 0 && !selectedCountByAddonId.has(addon.id)) {
        throw userInputError(
          `"${addon.title}" requires at least ${addon.quantityMinimum} selection(s)`,
        );
      }
    }

    const quantity = Math.max(1, Math.floor(item.quantity));
    const lineTotal = (unitPrice + addonsTotal) * quantity;
    const gstRate = food.gstRatePercent ?? defaultGstRate;

    built.push({
      lineTotal,
      gstRate,
      data: {
        title: variationTitle ? `${food.title} (${variationTitle})` : food.title,
        price: unitPrice,
        quantity,
        specialInstructions: item.specialInstructions ?? null,
        food: { connect: { id: food.id } },
        variation: variationId ? { connect: { id: variationId } } : undefined,
        addons: { create: addonsData },
      },
    });
  }

  return {
    itemsData: built.map((b) => b.data),
    itemsTotal: built.reduce((sum, b) => sum + b.lineTotal, 0),
    lines: built.map((b) => ({ lineTotal: b.lineTotal, gstRate: b.gstRate })),
  };
}

export function generateDisplayOrderId(): string {
  return `ORD-${nanoid()}`;
}
