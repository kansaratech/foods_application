'use client';

// Core
import { createContext, useEffect, useState } from 'react';

// Interface
import {
  ICategory,
  IOptions,
  IProvider,
  ISubCategory,
  RestaurantLayoutContextData,
  RestaurantLayoutContextProps,
} from '@/lib/utils/interfaces';

// Utils
import { SELECTED_RESTAURANT, SELECTED_SHOPTYPE } from '../../utils/constants';
import { onUseLocalStorage } from '../../utils/methods';

// Types
export const RestaurantLayoutContext =
  createContext<RestaurantLayoutContextProps>(
    {} as RestaurantLayoutContextProps
  );

export const RestaurantLayoutProvider = ({ children }: IProvider) => {
  // States
  const [isAddOptionsVisible, setIsAddOptionsVisible] = useState(false);
  const [option, setOption] = useState<IOptions | null>(null);
  const [restaurantLayoutContextData, setRestaurantLayoutContextData] =
    useState<RestaurantLayoutContextData>({
      restaurantId: onUseLocalStorage('get', SELECTED_RESTAURANT),
      shopType: onUseLocalStorage('get', SELECTED_SHOPTYPE ),
    } as RestaurantLayoutContextData);
  const [isAddSubCategoriesVisible, setIsAddSubCategoriesVisible] = useState({
    bool: false,
    parentCategoryId: '',
  });
  const [category, setCategory] = useState<ICategory | null>(null);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] =
    useState<boolean>(false);
  const [subCategories, setSubCategories] = useState<ISubCategory[]>([]);
  const [subCategoryParentId, setSubCategoryParentId] = useState<string>('');

  // The initial state is read from localStorage during the first render, which
  // is `null` on the server and stale if this provider was already mounted from
  // a previous store visit. Re-sync from localStorage once on the client so
  // "View Details" always lands on the store that was just clicked.
  useEffect(() => {
    const storedId = onUseLocalStorage('get', SELECTED_RESTAURANT);
    const storedShopType = onUseLocalStorage('get', SELECTED_SHOPTYPE);
    setRestaurantLayoutContextData((prev) =>
      prev.restaurantId === storedId && prev.shopType === storedShopType
        ? prev
        : {
            ...prev,
            restaurantId: storedId as string,
            shopType: storedShopType as string,
          }
    );
  }, []);

  // Handlers
  const onSetRestaurantLayoutContextData = (
    data: Partial<RestaurantLayoutContextData>
  ) => {
    setRestaurantLayoutContextData((prevData) => ({
      ...prevData,
      ...data,
    }));
  };
  const value: RestaurantLayoutContextProps = {
    restaurantLayoutContextData,
    onSetRestaurantLayoutContextData,
    isAddSubCategoriesVisible,
    setIsAddSubCategoriesVisible,
    category,
    setCategory,
    subCategories,
    setSubCategories,
    isSubCategoryModalOpen,
    setIsSubCategoryModalOpen,
    subCategoryParentId,
    setSubCategoryParentId,
    isAddOptionsVisible,
    setIsAddOptionsVisible,
    option,
    setOption
  };

  return (
    <RestaurantLayoutContext.Provider value={value}>
      {children}
    </RestaurantLayoutContext.Provider>
  );
};
