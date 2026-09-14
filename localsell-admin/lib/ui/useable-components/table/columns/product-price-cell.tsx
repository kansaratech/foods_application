'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { IFoodNew } from '@/lib/utils/interfaces';
import { useConfiguration } from '@/lib/hooks/useConfiguration';
import FormDialog from '../../form/form-dialog';
import {
  productVariantPricing,
  ProductPricingSettings,
} from '@/lib/utils/methods/product-pricing';

export default function ProductPriceCell({
  food,
  settings,
}: {
  food: IFoodNew;
  settings?: ProductPricingSettings;
}) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations();
  const { DEFAULT_COMMISSION_RATE, CURRENCY_SYMBOL } = useConfiguration();
  const money = (value: number) =>
    `${CURRENCY_SYMBOL || '\u20b9'}${value.toFixed(2)}`;
  const rows = food.variations.map((variant) => ({
    variant,
    ...productVariantPricing(
      variant,
      settings ?? {},
      food.gstRatePercent,
      DEFAULT_COMMISSION_RATE
    ),
  }));
  if (!rows.length) return <span>{t('No variants')}</span>;
  const prices = rows.map((row) => row.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return (
    <>
      <div className="flex min-w-40 flex-col items-start gap-1.5">
        <strong className="whitespace-nowrap text-sm text-content">
          {min === max ? money(min) : `${money(min)} - ${money(max)}`}
        </strong>
        <span className="text-xs text-content-muted">
          {rows.length} {t('Variants')} {'\u00b7'} {t('Before GST')}
        </span>
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="rounded-md text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t('View price breakdown')}
        </button>
      </div>
      <FormDialog
        visible={visible}
        onHide={() => setVisible(false)}
        title={food.title}
        subtitle={t('Variant pricing and earnings')}
        size="xl"
      >
        {!settings ? (
          <p role="status">{t('Pricing settings unavailable')}</p>
        ) : (
          <>
            <div className="mb-5 rounded-xl border border-surface-border bg-surface-ground p-4 text-sm text-content">
              {t(
                'One unit of the selected variant. Valid variant discounts are included.'
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-ground text-xs text-content-muted">
                  <tr>
                    {[
                      t('Variants'),
                      t('Listed price'),
                      t('Variant discount'),
                      t('Selling price'),
                      t('GST'),
                      t('Customer pays'),
                      t('Commission'),
                      t('Estimated earnings'),
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap p-3 font-semibold"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.variant._id ?? index}
                      className="border-t border-surface-border"
                    >
                      <td className="p-3 font-medium">
                        {row.variant.title}
                        <span className="mt-1 block text-xs text-content-muted">
                          {food.isOutOfStock || row.variant.isOutOfStock
                            ? t('Out of Stock')
                            : t('Available')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {money(row.variant.price)}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {money(row.discount)}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {money(row.price)}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {money(row.gst)}
                        <span className="block text-xs text-content-muted">
                          {row.gstRate}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3 font-semibold">
                        {money(row.customerPays)}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {money(row.commission)}
                        <span className="block text-xs text-content-muted">
                          {row.commissionRate}% {'\u00d7'} {money(row.price)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3 font-bold text-primary">
                        {money(row.earnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 space-y-3 text-sm text-content-muted">
              <p>
                <strong className="text-content">
                  {t('Estimated earnings')}
                </strong>
                :{' '}
                {t(
                  'Selling price minus commission. GST is added to the customer total and is not deducted again.'
                )}
              </p>
              <p>
                <strong className="text-content">
                  {t('Other adjustments')}
                </strong>
                :{' '}
                {t(
                  'Not calculated per product. Add-ons, coupons, refunds and settlement adjustments depend on the actual order. Delivery and tips are excluded from this estimate.'
                )}
              </p>
              <p>
                {t(
                  'This is an item earnings estimate, not a final settlement amount. For store-collected COD, commission is billed separately.'
                )}
              </p>
            </div>
          </>
        )}
      </FormDialog>
    </>
  );
}
