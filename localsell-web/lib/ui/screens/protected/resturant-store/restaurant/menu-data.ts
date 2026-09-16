import type { ICategory } from "@/lib/utils/interfaces";

/** Category IDs stay distinct even when two categories have the same title. */
export function filterMenu(
  categories: ICategory[],
  categoryId: string,
  query: string,
): ICategory[] {
  const term = query.trim().toLocaleLowerCase();
  return categories
    .filter((category) => !categoryId || category._id === categoryId)
    .map((category) => ({
      ...category,
      foods:
        !term || category.title.toLocaleLowerCase().includes(term)
          ? category.foods
          : category.foods.filter((food) =>
              `${food.title} ${food.description ?? ""}`
                .toLocaleLowerCase()
                .includes(term),
            ),
    }))
    .filter((category) => category.foods.length > 0);
}

export function countMenuItems(categories: ICategory[]): number {
  return new Set(
    categories.flatMap((category) => category.foods.map((food) => food._id)),
  ).size;
}
