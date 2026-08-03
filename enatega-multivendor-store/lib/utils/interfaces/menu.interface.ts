export interface IOption {
  _id: string;
  title: string;
  description?: string | null;
  price: number;
}

export interface IAddon {
  _id: string;
  title: string;
  description?: string | null;
  quantityMinimum?: number | null;
  quantityMaximum?: number | null;
  options: IOption[];
}

export interface IVariation {
  _id: string;
  title: string;
  price: number;
  discounted?: number | null;
  isOutOfStock?: boolean | null;
  addons: string[];
}

export interface IFood {
  _id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean | null;
  isOutOfStock?: boolean | null;
  variations: IVariation[];
}

export interface ICategory {
  _id: string;
  title: string;
  image?: string | null;
  foods: IFood[];
}

export interface ICategoryPaginated {
  data: ICategory[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface IRestaurantCategoriesPaginatedResponse {
  restaurantCategoriesPaginated: ICategoryPaginated;
}

export interface IRestaurantAddonsResponse {
  restaurant: { addons: IAddon[] } | null;
}
