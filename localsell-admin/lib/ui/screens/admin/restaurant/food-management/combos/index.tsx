'use client';
import ActionButton from '@/lib/ui/useable-components/button/action-button';
import Select from '@/lib/ui/useable-components/custom-dropdown/select';

import { useContext, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useTranslations } from 'next-intl';
import FormDialog from '@/lib/ui/useable-components/form/form-dialog';
import CustomButton from '@/lib/ui/useable-components/button';

import { RestaurantLayoutContext } from '@/lib/context/restaurant/layout-restaurant.context';
import { ToastContext } from '@/lib/context/global/toast.context';
import {
  GET_RESTAURANT_COMBOS,
  GET_MENU_FOR_PICKER,
  CREATE_FOOD,
  EDIT_FOOD,
  DELETE_FOOD,
} from '@/lib/api/graphql';
import Table from '@/lib/ui/useable-components/table';

const money = (n: number) =>
  `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

interface ComboItem {
  foodId: string;
  variationId?: string | null;
  title: string;
  quantity: number;
  image?: string | null;
  isOutOfStock?: boolean;
}
interface Combo {
  _id: string;
  title: string;
  description: string | null;
  image: string | null;
  badge: string | null;
  isActive: boolean;
  isOutOfStock: boolean;
  compareAtPrice: number | null;
  variations: { _id: string; price: number }[];
  comboItems: ComboItem[];
}

const blank = {
  _id: '',
  title: '',
  description: '',
  image: '',
  badge: '',
  categoryId: '',
  price: '',
  compareAtPrice: '',
  items: [] as { foodId: string; variationId: string; quantity: number }[],
};

export default function CombosScreen() {
  const t = useTranslations();
  const { showToast } = useContext(ToastContext);
  const { restaurantLayoutContextData } = useContext(RestaurantLayoutContext);
  const restaurantId = restaurantLayoutContextData?.restaurantId || '';

  const {
    data: comboData,
    loading,
    refetch,
  } = useQuery(GET_RESTAURANT_COMBOS, {
    variables: { restaurantId },
    skip: !restaurantId,
    fetchPolicy: 'cache-and-network',
  });
  const combos: Combo[] = comboData?.restaurantCombos ?? [];

  const { data: menuData } = useQuery(GET_MENU_FOR_PICKER, {
    variables: { id: restaurantId },
    skip: !restaurantId,
  });
  const categories = (menuData?.restaurant?.categories ?? []) as {
    _id: string;
    title: string;
    foods: {
      _id: string;
      title: string;
      isCombo: boolean;
      variations: { _id: string; title: string; price: number }[];
    }[];
  }[];
  const pickableFoods = useMemo(
    () => categories.flatMap((c) => c.foods).filter((f) => !f.isCombo),
    [categories]
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);

  const [createFood, { loading: creating }] = useMutation(CREATE_FOOD);
  const [editFood, { loading: editing }] = useMutation(EDIT_FOOD);
  const [deleteFood] = useMutation(DELETE_FOOD);

  const startNew = () => {
    setForm({
      ...blank,
      categoryId:
        categories.find((c) => /combo/i.test(c.title))?._id ||
        categories[0]?._id ||
        '',
    });
    setOpen(true);
  };

  const startEdit = (c: Combo) => {
    setForm({
      _id: c._id,
      title: c.title,
      description: c.description ?? '',
      image: c.image ?? '',
      badge: c.badge ?? '',
      categoryId: categories[0]?._id ?? '',
      price: String(c.variations[0]?.price ?? ''),
      compareAtPrice: c.compareAtPrice != null ? String(c.compareAtPrice) : '',
      items: c.comboItems.map((i) => ({
        foodId: i.foodId,
        variationId: i.variationId ?? '',
        quantity: i.quantity,
      })),
    });
    setOpen(true);
  };

  const addRow = () =>
    setForm((f) => ({
      ...f,
      items: [...f.items, { foodId: '', variationId: '', quantity: 1 }],
    }));
  const setRow = (
    idx: number,
    patch: Partial<{ foodId: string; variationId: string; quantity: number }>
  ) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    }));
  const removeRow = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const itemsWorth = form.items.reduce((sum, r) => {
    const food = pickableFoods.find((f) => f._id === r.foodId);
    const v =
      food?.variations.find((x) => x._id === r.variationId) ??
      food?.variations[0];
    return sum + (v?.price ?? 0) * (r.quantity || 1);
  }, 0);

  const save = async () => {
    const price = parseFloat(form.price);
    if (!form.title || !form.categoryId || form.items.length < 2) {
      showToast({
        type: 'error',
        title: t('Combos'),
        message: t('Name, category and at least 2 items are required'),
        duration: 2800,
      });
      return;
    }
    if (Number.isNaN(price) || price <= 0) {
      showToast({
        type: 'error',
        title: t('Combos'),
        message: t('Price must be greater than 0'),
        duration: 2800,
      });
      return;
    }
    const compareAtPrice = form.compareAtPrice
      ? parseFloat(form.compareAtPrice)
      : null;
    if (
      compareAtPrice != null &&
      !Number.isNaN(compareAtPrice) &&
      compareAtPrice <= price
    ) {
      showToast({
        type: 'error',
        title: t('Combos'),
        message: t(
          'Compare-at price must be greater than the combo price, or leave it blank'
        ),
        duration: 2800,
      });
      return;
    }
    const foodInput = {
      _id: form._id || undefined,
      restaurant: restaurantId,
      category: form.categoryId,
      title: form.title,
      description: form.description || null,
      image: form.image || undefined,
      badge: form.badge || null,
      isActive: true,
      isCombo: true,
      compareAtPrice: form.compareAtPrice
        ? parseFloat(form.compareAtPrice)
        : null,
      comboItems: form.items.map((r) => ({
        foodId: r.foodId,
        variationId: r.variationId || null,
        quantity: r.quantity || 1,
      })),
      variations: [
        { _id: undefined as string | undefined, title: 'Combo', price },
      ],
    };
    try {
      if (form._id) {
        // keep the existing variation id so we update rather than duplicate
        const existing = combos.find((c) => c._id === form._id);
        foodInput.variations = [
          { _id: existing?.variations[0]?._id, title: 'Combo', price },
        ];
        await editFood({ variables: { foodInput } });
      } else {
        await createFood({ variables: { foodInput } });
      }
      showToast({
        type: 'success',
        title: t('Combos'),
        message: t('Combo saved'),
        duration: 1800,
      });
      setOpen(false);
      refetch();
    } catch (e) {
      showToast({
        type: 'error',
        title: t('Error'),
        message: (e as Error).message,
        duration: 3000,
      });
    }
  };

  const remove = async (c: Combo) => {
    if (!window.confirm(t('Delete this combo?'))) return;
    try {
      await deleteFood({
        variables: {
          id: c._id,
          restaurant: restaurantId,
          categoryId: categories[0]?._id ?? '',
        },
      });
      refetch();
    } catch (e) {
      showToast({
        type: 'error',
        title: t('Error'),
        message: (e as Error).message,
        duration: 2800,
      });
    }
  };

  return (
    <div className="screen-container p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t('Combos')}</h1>
          <p className="text-xs text-gray-500">
            {t('Bundle items together at one price, Swiggy/Zomato style')}
          </p>
        </div>
        <CustomButton
          type="button"
          onClick={startNew}
          disabled={!categories.length}
          label={t('New combo')}
          icon="pi pi-plus"
          className="rounded-lg px-4 py-2"
        />
      </div>
      {!categories.length && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
          {t('Create a category first (a "Combos" category is recommended)')}
        </p>
      )}

      <Table
        data={loading ? [] : combos}
        loading={loading}
        moduleName="Combos"
        columns={[
          { headerName: t('Combo'), propertyName: 'title' },
          {
            headerName: t('Contents'),
            propertyName: 'comboItems',
            body: (c: Combo) =>
              c.comboItems.map((i) => `${i.quantity}× ${i.title}`).join(', '),
          },
          {
            headerName: t('Price'),
            propertyName: 'price',
            body: (c: Combo) => (
              <span>
                {money(c.variations[0]?.price ?? 0)}
                {c.compareAtPrice ? (
                  <span className="ml-1 text-xs text-gray-400 line-through">
                    {money(c.compareAtPrice)}
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            headerName: t('Status'),
            propertyName: 'isOutOfStock',
            body: (c: Combo) =>
              c.isOutOfStock
                ? t('Out of Stock')
                : c.isActive
                  ? t('Live')
                  : t('Hidden'),
          },
          {
            headerName: t('Actions'),
            propertyName: 'actions',
            body: (c: Combo) => (
              <span className="flex gap-1">
                <ActionButton
                  variant="secondary"
                  onClick={() => startEdit(c)}
                  className="rounded border px-2 py-0.5 text-xs dark:border-dark-600"
                >
                  {t('Edit')}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => remove(c)}
                  className="rounded border px-2 py-0.5 text-xs text-red-600 dark:border-dark-600"
                >
                  {t('Delete')}
                </ActionButton>
              </span>
            ),
          },
        ]}
      />

      <FormDialog
        title={form._id ? t('Edit combo') : t('New combo')}
        visible={open}
        onHide={() => {
          if (!creating && !editing) setOpen(false);
        }}
        size="lg"
        className="admin-combo-dialog"
        footer={
          <div className="flex items-center justify-end gap-3">
            <CustomButton
              type="button"
              label={t('Cancel')}
              disabled={creating || editing}
              onClick={() => setOpen(false)}
              className="admin-secondary-action"
            />
            <CustomButton
              type="button"
              label={t('Save combo')}
              loading={creating || editing}
              onClick={save}
              className="admin-primary-action"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-5 text-sm">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Name')}</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="ls-field w-full"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Category')}</span>
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.value })}
                className="ls-field w-full"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">{t('Combo price')} (₹)</span>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="ls-field w-full"
              />
            </label>
            <label className="flex flex-col">
              <span className="mb-1 text-gray-500">
                {t('Compare-at price')} (₹, {t('optional')})
              </span>
              <input
                type="number"
                value={form.compareAtPrice}
                onChange={(e) =>
                  setForm({ ...form, compareAtPrice: e.target.value })
                }
                placeholder={itemsWorth ? String(Math.round(itemsWorth)) : ''}
                className="ls-field w-full"
              />
            </label>
          </div>
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">{t('Description')}</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="ls-field w-full"
            />
          </label>
          <label className="flex flex-col">
            <span className="mb-1 text-gray-500">
              {t('Image URL')} ({t('optional')})
            </span>
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="ls-field w-full"
            />
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{t('Items in this combo')}</span>
              <span className="text-xs text-gray-400">
                {t('Worth')} {money(itemsWorth)}
              </span>
            </div>
            {form.items.map((row, idx) => {
              const food = pickableFoods.find((f) => f._id === row.foodId);
              return (
                <div
                  key={idx}
                  className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-surface-border bg-surface-ground p-3"
                >
                  <Select
                    value={row.foodId}
                    onChange={(e) =>
                      setRow(idx, { foodId: e.value, variationId: '' })
                    }
                    aria-label={t('Select item')}
                    className="ls-field min-w-0 basis-full sm:flex-1 sm:basis-40"
                  >
                    <option value="">{t('Select item')}…</option>
                    {pickableFoods.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.title}
                      </option>
                    ))}
                  </Select>
                  {(food?.variations.length ?? 0) > 1 && (
                    <Select
                      value={row.variationId}
                      onChange={(e) => setRow(idx, { variationId: e.value })}
                      aria-label={t('Variations')}
                      className="ls-field min-w-0 flex-1"
                    >
                      <option value="">{t('Any')}</option>
                      {food?.variations.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.title}
                        </option>
                      ))}
                    </Select>
                  )}
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) =>
                      setRow(idx, {
                        quantity: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    aria-label={t('Quantity')}
                    className="ls-field !w-20"
                  />
                  <button
                    type="button"
                    aria-label={t('Remove')}
                    onClick={() => removeRow(idx)}
                    className="h-10 w-10 rounded-lg border border-surface-border text-red-600 hover:bg-surface-hover"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            <ActionButton
              variant="secondary"
              onClick={addRow}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-hover"
            >
              + {t('Add item')}
            </ActionButton>
          </div>
        </div>
      </FormDialog>
    </div>
  );
}
