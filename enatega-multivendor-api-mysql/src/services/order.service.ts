import { Prisma } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { prisma } from '../prisma/client';
import { userInputError } from '../utils/errors';

const nanoid = customAlphabet('0123456789', 8);

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
}

/**
 * Recomputes prices from the current Food/Variation/Option records rather than
 * trusting client-sent totals, and snapshots titles/prices onto the order item
 * so historical orders stay accurate if the menu changes later.
 */
export async function buildOrderItems(
  restaurantId: string,
  items: OrderItemInput[],
): Promise<{ itemsData: Prisma.OrderItemCreateWithoutOrderInput[]; itemsTotal: number }> {
  if (!items.length) {
    throw userInputError('An order must contain at least one item');
  }

  const built: BuiltOrderItem[] = [];

  for (const item of items) {
    const food = await prisma.food.findFirst({
      where: { id: item.food, restaurantId },
      include: { variations: true },
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

    if (item.variation) {
      const variation = food.variations.find((v) => v.id === item.variation);
      if (!variation) {
        throw userInputError(`Variation ${item.variation} does not belong to food ${food.title}`);
      }
      if (variation.isOutOfStock) {
        throw userInputError(`Variation "${variation.title}" is currently unavailable`);
      }
      unitPrice = variation.discounted ?? variation.price;
      variationId = variation.id;
      variationTitle = variation.title;
    } else if (food.variations.length === 1) {
      const [only] = food.variations;
      unitPrice = only.discounted ?? only.price;
      variationId = only.id;
      variationTitle = only.title;
    } else {
      throw userInputError(`A variation must be selected for food "${food.title}"`);
    }

    let addonsTotal = 0;
    const addonsData: Prisma.OrderItemAddonCreateWithoutOrderItemInput[] = [];

    for (const addonInput of item.addons ?? []) {
      const addon = await prisma.addon.findFirst({
        where: { id: addonInput._id, restaurantId },
        include: { options: true },
      });
      if (!addon) {
        throw userInputError(`Addon ${addonInput._id} was not found for this restaurant`);
      }

      const optionsData: Prisma.OrderItemAddonOptionCreateWithoutOrderItemAddonInput[] = [];
      for (const optionId of addonInput.options) {
        const option = addon.options.find((o) => o.id === optionId);
        if (!option) {
          throw userInputError(`Option ${optionId} does not belong to addon ${addon.title}`);
        }
        addonsTotal += option.price;
        optionsData.push({
          title: option.title,
          price: option.price,
          option: { connect: { id: option.id } },
        });
      }

      addonsData.push({
        title: addon.title,
        addon: { connect: { id: addon.id } },
        options: { create: optionsData },
      });
    }

    const quantity = Math.max(1, Math.floor(item.quantity));
    const lineTotal = (unitPrice + addonsTotal) * quantity;

    built.push({
      lineTotal,
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
  };
}

export function generateDisplayOrderId(): string {
  return `ORD-${nanoid()}`;
}
