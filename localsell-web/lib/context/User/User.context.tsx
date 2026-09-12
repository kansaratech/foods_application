/* eslint-disable max-lines */
"use client";

import { GET_USER_PROFILE, ORDERS } from "@/lib/api/graphql";
import { saveNotificationTokenWeb } from "@/lib/api/graphql/mutations";
import { orderStatusChanged } from "@/lib/api/graphql/subscription";
import {
  ApolloError,
  gql,
  LazyQueryExecFunction,
  OperationVariables,
  useApolloClient,
  useLazyQuery,
  useMutation,
} from "@apollo/client";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { v4 } from "uuid";

import {
  IAddon,
  ICategory,
  IFood,
  IOption,
  IOrder,
  IRestaurant,
  IVariation,
} from "@/lib/utils/interfaces";
import { invalidateClientSession } from "@/lib/utils/methods/auth";

const SUBSCRIPTION_ORDERS = gql`
  ${orderStatusChanged}
`;
const SAVE_NOTIFICATION_TOKEN_WEB = gql`
  ${saveNotificationTokenWeb}
`;

// Types
export interface CartItem {
  image: string;
  key: string;
  _id: string;
  quantity: number;
  variation: {
    _id: string;
  };
  addons?: Array<{
    _id: string;
    options: Array<{
      _id: string;
      title?: string;
      quantity?: number;
    }>;
  }>;
  specialInstructions?: string;
  title?: string; // Added after querying food info
  foodTitle?: string;
  variationTitle?: string;
  optionTitles?: string[];
  price?: string | number;
}

export interface ProfileType {
  _id: string;
  name: string;
  phone: string;
  phoneIsVerified: boolean;
  email: string;
  emailIsVerified: boolean;
  notificationToken: string;
  isOrderNotification: boolean;
  isOfferNotification: boolean;
  addresses: Array<{
    _id: string;
    label: string;
    deliveryAddress: string;
    details: string;
    location: {
      coordinates: [number, number];
    };
    selected: boolean;
  }>;
  favourite: string[];
}

export interface OrderType {
  _id: string;
  orderId: string;
  restaurant: {
    _id: string;
    name: string;
    image: string;
    slug: string;
    address: string;
    location: {
      coordinates: [number, number];
    };
  };
  deliveryAddress: {
    location: {
      coordinates: [number, number];
    };
    deliveryAddress: string;
  };
  items: CartItem[];
  user: {
    _id: string;
    name: string;
    phone: string;
  };
  rider?: {
    _id: string;
    name: string;
  };
  review?: {
    _id: string;
  };
  paymentMethod: string;
  paidAmount: number;
  orderAmount: number;
  orderStatus: string;
  deliveryCharges: number;
  tipping: number;
  taxationAmount: number;
  orderDate: string;
  expectedTime: string;
  isPickedUp: boolean;
  createdAt: string;
  completionTime: string;
  cancelledAt?: string;
  assignedAt?: string;
  deliveredAt?: string;
  acceptedAt?: string;
  pickedAt?: string;
  preparationTime: number;
}

export interface UserContextType {
  isLoggedIn: boolean;
  loadingProfile: boolean;
  errorProfile: ApolloError | undefined;
  profile: ProfileType | null;
  setTokenAsync: (token: string, cb?: () => void) => Promise<void>;
  logout: () => Promise<void>;
  loadingOrders: boolean;
  errorOrders: ApolloError | undefined;
  orders: OrderType[];
  fetchOrders: () => void;
  fetchMoreOrdersFunc: () => void;
  networkStatusOrders: number;
  cart: CartItem[];
  cartCount: number;
  clearCart: () => void;
  updateCart: (cart: CartItem[]) => Promise<void>;
  addQuantity: (key: string, quantity?: number) => Promise<void>;
  removeQuantity: (key: string) => Promise<void>;
  addItem: (
    image: string,
    foodId: string,
    variationId: string,
    restaurantId: string,
    quantity?: number,
    addons?: Array<{
      _id: string;
      options: Array<{
        _id: string;
      }>;
    }>,
    specialInstructions?: string
  ) => Promise<void>;
  checkItemCart: (itemId: string) => {
    exist: boolean;
    quantity: number;
    key?: string;
  };
  deleteItem: (key: string) => Promise<void>;
  restaurant: string | null;
  setCartRestaurant: (id: string) => Promise<void>;
  isLoading: boolean;
  updateItemQuantity: (key: string, changeAmount: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  calculateSubtotal: () => string;
  transformCartWithFoodInfo: (
    cartItems: CartItem[],
    foodsData: IRestaurant
  ) => CartItem[];
  fetchProfile: LazyQueryExecFunction<any, OperationVariables>;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const UserContext = createContext<UserContextType>({} as UserContextType);

export const UserProvider: React.FC<{ children: ReactNode }> = (props) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const client = useApolloClient();
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<string | null>(null);

  const [saveNotificationToken] = useMutation(SAVE_NOTIFICATION_TOKEN_WEB, {
    onError,
  });

  // Apollo 3.14+ deprecates `onCompleted` / `onError` / `variables` as hook
  // options — side-effects belong in `useEffect` off `data` / `error`, and
  // per-call variables belong on the returned execute fn (see `onInit`).
  const [
    fetchProfile,
    {
      called: calledProfile,
      loading: loadingProfile,
      error: errorProfile,
      data: dataProfile,
    },
  ] = useLazyQuery(GET_USER_PROFILE, {
    fetchPolicy: "cache-and-network",
  });

  const [
    fetchOrders,
    {
      called: calledOrders,
      loading: loadingOrders,
      error: errorOrders,
      data: dataOrders,
      networkStatus: networkStatusOrders,
      fetchMore: fetchMoreOrders,
      subscribeToMore: subscribeToMoreOrders,
    },
  ] = useLazyQuery(ORDERS, {
    fetchPolicy: "cache-and-network",
  });

  // Universal cart transformation function that can be used anywhere
  const transformCartWithFoodInfo = useCallback(
    (cartItems: CartItem[], foodsData: IRestaurant): CartItem[] => {
      if (!foodsData || !cartItems.length) return cartItems;

      // Extract all foods from categories
      const foods = foodsData.categories
        ? foodsData.categories.flatMap((c: ICategory) => c.foods)
        : [];

      // Get addons and options data
      const { addons, options } = foodsData;

      if (!foods.length || !addons || !options) return cartItems;

      // Transform each cart item with display info
      return cartItems.map((cartItem) => {
        // Find the food item
        const foodItem = foods.find((food: IFood) => food._id === cartItem._id);
        if (!foodItem) return cartItem;

        // Find the variation
        const variationItem = foodItem.variations.find(
          (v: IVariation) => v._id === cartItem.variation._id
        );
        if (!variationItem) return cartItem;

        // Create the full title
        const foodTitle = foodItem.title;
        const variationTitle = variationItem.title;
        const title = `${foodTitle}(${variationTitle})`;

        // Calculate price
        let totalPrice = variationItem.price;

        // Process addons and create optionTitles
        let optionTitles: string[] = [];

        if (cartItem.addons && cartItem.addons.length > 0) {
          cartItem.addons.forEach((addon) => {
            const addonItem = addons.find((a: IAddon) => a._id === addon._id);
            if (!addonItem) return;

            // An addon's own `options` can be either inline option objects
            // (store app / seed data — e.g. "Make Your Thali"-style build-
            // your-own items) or _id-strings referencing the restaurant's
            // shared top-level `options` pool (admin panel). Only checking
            // the shared pool silently dropped inline options' prices to 0,
            // undercharging every custom item that used them.
            const inlineOptions =
              addonItem.options?.length &&
              typeof addonItem.options[0] === "object" &&
              addonItem.options[0] !== null
                ? (addonItem.options as unknown as IOption[])
                : null;

            addon.options.forEach((opt) => {
              const optionItem =
                inlineOptions?.find((o) => o._id === opt._id) ??
                options.find((o: IOption) => o._id === opt._id);
              if (!optionItem) return;

              const optQuantity = opt.quantity ?? 1;
              totalPrice += optionItem.price * optQuantity;
              if (optionItem.title) {
                optionTitles.push(
                  optQuantity > 1
                    ? `${optQuantity}x ${optionItem.title}`
                    : optionItem.title,
                );
              }
            });
          });
        }

        return {
          ...cartItem,
          foodTitle,
          variationTitle,
          title,
          optionTitles,
          price: totalPrice.toFixed(2),
        };
      });
    },
    []
  );

  const onInit = useCallback(async (isSubscribed: boolean) => {
    if (!isSubscribed) return;

    setIsLoading(true);

    const _token = localStorage.getItem("token") || null;
    setToken(_token);

    if (_token) {
      await fetchProfile();
      await fetchOrders({ variables: { page: 1, limit: 300 } });
    }

    setIsLoading(false);
  }, [fetchProfile, fetchOrders]);

  // Define setCartRestaurant before it's used in dependencies
  const setCartRestaurant = useCallback(async (id: string) => {
    setRestaurant(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("restaurant", id);
    }
  }, []);

  // Initialize from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRestaurant = localStorage.getItem("restaurant");
      const storedCart = localStorage.getItem("cartItems");

      if (storedRestaurant) {
        setRestaurant(storedRestaurant);
      }

      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (error) {
          console.error("Error parsing cart items from localStorage:", error);
          setCart([]);
        }
      }
    }

    setIsLoading(false);
  }, []);

  // Load user profile and orders
  useEffect(() => {
    let isSubscribed = true;

    onInit(isSubscribed);

    return () => {
      isSubscribed = false;
    };
    // Important: Include token as a dependency to refetch when it changes
  }, [token, onInit]);



  function onError(error: ApolloError) {
    console.log("error", error.message);
  }

  const setTokenAsync = useCallback(
    async (tokenReq: string, cb: () => void = () => {}) => {
      setToken(tokenReq);
      if (typeof window !== "undefined") {
        localStorage.setItem("token", tokenReq);
      }
      cb();
    },
    []
  );

  // AuthProvider (an ancestor of UserProvider, so it can't call useUser()
  // directly) fires "localsell:login" whenever a login completes, for any
  // auth path — phone, email, Google. Without this, `token` here only ever
  // gets set from localStorage at page mount, so profile/orders never
  // refetch after a same-session login and the header is stuck showing
  // whatever (or nothing) was there before.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLogin = (e: Event) => {
      const token = (e as CustomEvent<{ token: string }>).detail?.token;
      if (token) setTokenAsync(token);
    };
    window.addEventListener("localsell:login", onLogin);
    return () => window.removeEventListener("localsell:login", onLogin);
  }, [setTokenAsync]);

  const logout = useCallback(async () => {
    try {
      invalidateClientSession();
      setCart([]);
      setRestaurant(null);
      setToken(null);
      // Tell every other auth-aware context (AuthProvider's `authToken`) to drop
      // its state too, so no single logout entry point can leave a half-logged-in
      // header behind.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("localsell:logout"));
      }
      // clearStore, NOT resetStore: resetStore refetches every active query
      // immediately — with the token already gone that's a burst of guaranteed
      // 401s that trips the "session expired" redirect mid-logout.
      await client.clearStore();
    } catch (error) {
      console.log("error on logout", error);
    }
  }, [client]);

  const subscribeOrders = useCallback(() => {
    if (!subscribeToMoreOrders || !dataProfile?.profile?._id) return;

    try {
      const unsubscribeOrders = subscribeToMoreOrders({
        document: SUBSCRIPTION_ORDERS,
        variables: { userId: dataProfile.profile._id },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const { _id } = subscriptionData.data.orderStatusChanged
            .order as IOrder;
          if (subscriptionData.data.orderStatusChanged.origin === "new") {
            if (
              ((prev?.orders as IOrder[]) || ([] as IOrder[]))?.findIndex(
                (o: IOrder) => o._id === _id
              ) > -1
            )
              return prev;
            return {
              orders: [
                subscriptionData.data.orderStatusChanged.order,
                ...(prev.orders || ([] as IOrder[])),
              ],
            };
          } else {
            const { orders } = prev;
            let newList = [...((orders as IOrder[]) || ([] as IOrder[]))];
            const orderIndex = newList.findIndex((o: IOrder) => o._id === _id);
            if (orderIndex > -1) {
              newList[orderIndex] =
                subscriptionData.data.orderStatusChanged.order;
            }
            return {
              orders: [...newList],
            };
          }
        },
      });

      // Convert the function to return a Promise to satisfy TypeScript
      const unsubscribeAsPromise = () => {
        unsubscribeOrders();
        return Promise.resolve();
      };

      client.onResetStore(unsubscribeAsPromise);
    } catch (error: unknown) {
      const err = error as ApolloError;
      console.log("error subscribing order", err.message);
    }
  }, [client, dataProfile, subscribeToMoreOrders]);

  // Setup subscription when profile is loaded
  useEffect(() => {
    if (!dataProfile) return;
    subscribeOrders();
  }, [dataProfile, subscribeOrders]);

  const fetchMoreOrdersFunc = useCallback(() => {
    if (networkStatusOrders === 7 && fetchMoreOrders) {
      fetchMoreOrders({
        variables: { offset: dataOrders?.orders?.length + 1 || 0 },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          // Don't do anything if there weren't any new items
          if (!fetchMoreResult || fetchMoreResult.orders.length === 0) {
            return previousResult;
          }
          return {
            // Append the new feed results to the old one
            orders: previousResult.orders.concat(fetchMoreResult.orders),
          };
        },
      });
    }
  }, [dataOrders, fetchMoreOrders, networkStatusOrders]);

  const clearCart = useCallback(() => {
    setCart([]);
    setRestaurant(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cartItems");
      localStorage.removeItem("restaurant");
    }
  }, []);

  const addQuantity = useCallback(async (key: string, quantity: number = 1) => {
    setCart((prevCart) => {
      const cartIndex = prevCart.findIndex((c) => c.key === key);
      if (cartIndex === -1) return prevCart;

      // Replace the item object (don't mutate it in place) so memoised cart rows
      // keyed on item identity actually re-render when the quantity changes.
      const updatedCart = prevCart.map((item, index) =>
        index === cartIndex
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("cartItems", JSON.stringify(updatedCart));
      }

      return updatedCart;
    });
  }, []);

  const deleteItem = useCallback(async (key: string) => {
    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      const cartIndex = updatedCart.findIndex((c) => c.key === key);

      if (cartIndex > -1) {
        updatedCart.splice(cartIndex, 1);
        const items = updatedCart.filter((c) => c.quantity > 0);

        // Update localStorage
        if (typeof window !== "undefined") {
          if (items.length === 0) {
            localStorage.removeItem("cartItems");
            localStorage.removeItem("restaurant");
            setRestaurant(null);
          } else {
            localStorage.setItem("cartItems", JSON.stringify(items));
          }
        }

        return items;
      }

      return updatedCart;
    });
  }, []);

  const removeQuantity = useCallback(async (key: string) => {
    setCart((prevCart) => {
      const cartIndex = prevCart.findIndex((c) => c.key === key);

      if (cartIndex === -1) return prevCart;

      // Replace, don't mutate — see addQuantity.
      const updatedCart = prevCart.map((item, index) =>
        index === cartIndex ? { ...item, quantity: item.quantity - 1 } : item,
      );
      const items = updatedCart.filter((c) => c.quantity > 0);

      // Update localStorage
      if (typeof window !== "undefined") {
        if (items.length === 0) {
          localStorage.removeItem("cartItems");
          localStorage.removeItem("restaurant");
          setRestaurant(null);
        } else {
          localStorage.setItem("cartItems", JSON.stringify(items));
        }
      }

      return items;
    });
  }, []);

  const checkItemCart = useCallback(
    (itemId: string) => {
      const cartIndex = cart.findIndex((c) => c._id === itemId);
      if (cartIndex < 0) {
        return {
          exist: false,
          quantity: 0,
        };
      } else {
        return {
          exist: true,
          quantity: cart[cartIndex].quantity,
          key: cart[cartIndex].key,
        };
      }
    },
    [cart]
  );

  const numberOfCartItems = useCallback(() => {
    return cart.map((c) => c.quantity).reduce((a, b) => a + b, 0);
  }, [cart]);

  // Enhanced method that replaces the old addCartItem - uses setCartRestaurant which is defined above
  const addItem = useCallback(
    async (
      image: string,
      foodId: string,
      variationId: string,
      restaurantId: string,
      quantity: number = 1,
      addons: Array<{
        _id: string;
        options: Array<{
          _id: string;
        }>;
      }> = [],
      specialInstructions: string = ""
    ) => {
      // Check if we need to clear the cart (different restaurant)
      const needsClear = Boolean(restaurantId && restaurant !== restaurantId);

      // Create new cart item
      const newItem: CartItem = {
        image,
        key: v4(),
        _id: foodId,
        quantity,
        variation: {
          _id: variationId,
        },
        addons,
        specialInstructions,
      };

      // Set restaurant first
      await setCartRestaurant(restaurantId);

      // Update cart
      setCart((prevCart) => {
        // Use empty array if needsClear is true, otherwise use current cart
        const cartItems = needsClear ? [] : [...prevCart];

        // Add the new item
        const updatedCart = [...cartItems, newItem];

        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("cartItems", JSON.stringify(updatedCart));
        }

        return updatedCart;
      });
    },
    [restaurant, setCartRestaurant]
  );

  const updateCart = useCallback(
    async (updatedCart: CartItem[]) => {
      // Skip update if cart is empty or unchanged (prevents infinite loop)
      if (JSON.stringify(cart) === JSON.stringify(updatedCart)) {
        return;
      }

      setCart(updatedCart);
      if (typeof window !== "undefined") {
        localStorage.setItem("cartItems", JSON.stringify(updatedCart));
      }
    },
    [cart]
  );

  const updateNotificationToken = useCallback(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("messaging-token");
      if (token) {
        saveNotificationToken({ variables: { token } });
      }
    }
  }, [saveNotificationToken]);

  // Derived side-effects — replace the deprecated useLazyQuery
  // `onCompleted` / `onError` options.
  useEffect(() => {
    if (dataProfile?.profile) {
      updateNotificationToken();
    }
  }, [dataProfile, updateNotificationToken]);

  useEffect(() => {
    const err = errorProfile ?? errorOrders;
    if (err) console.log("error", err.message);
  }, [errorProfile, errorOrders]);

  const updateItemQuantity = useCallback(
    async (key: string, changeAmount: number) => {
      // Force change to be exactly +1 or -1
      const safeChange = changeAmount > 0 ? 1 : -1;

      // Use a local variable that will be unique to each function call
      // This ensures the flag is reset for each new click
      let updateApplied = false;

      setCart((prevCart) => {
        // If we've already applied an update in this callback invocation, don't do it again
        if (updateApplied) {
          return prevCart;
        }

        const updatedCart = [...prevCart];
        const cartIndex = updatedCart.findIndex((c) => c.key === key);

        if (cartIndex === -1) {
          return prevCart;
        }

        const currentItem = updatedCart[cartIndex];
        const currentQuantity = currentItem.quantity;

        // For decrement
        if (safeChange < 0) {
          if (currentQuantity <= 1) {
            updatedCart.splice(cartIndex, 1);
          } else {
            updatedCart[cartIndex] = {
              ...currentItem,
              quantity: currentQuantity + safeChange,
            };
          }
        }
        // For increment
        else {
          updatedCart[cartIndex] = {
            ...currentItem,
            quantity: currentQuantity + safeChange,
          };
        }

        // Mark that we've applied an update
        updateApplied = true;

        // Update localStorage
        if (typeof window !== "undefined") {
          if (updatedCart.length === 0) {
            localStorage.removeItem("cartItems");
            localStorage.removeItem("restaurant");
            setRestaurant(null);
          } else {
            localStorage.setItem("cartItems", JSON.stringify(updatedCart));
          }
        }

        return updatedCart;
      });
    },
    []
  );

  const removeItem = useCallback(
    async (key: string) => {
      await deleteItem(key);
    },
    [deleteItem]
  );

  const calculateSubtotal = useCallback(() => {
    return cart
      .reduce((total, item) => {
        const priceRaw = (item.variation as { price?: number | string })?.price ?? item.price ?? 0;
        const price = typeof priceRaw === 'string' ? parseFloat(priceRaw) : priceRaw;
        const quantity = item.quantity ?? 0;
        return total + price * quantity;
      }, 0)
      .toFixed(2);
  }, [cart]);

  const contextValue = useMemo(
    () => ({
      isLoggedIn: !!token,
      loadingProfile: loadingProfile && calledProfile,
      errorProfile,
      profile: dataProfile && dataProfile.profile ? dataProfile.profile : null,
      fetchProfile,
      setTokenAsync,
      logout,
      loadingOrders: loadingOrders && calledOrders,
      errorOrders,
      orders: dataOrders && dataOrders.orders ? dataOrders.orders : [],
      fetchOrders,
      fetchMoreOrdersFunc,
      networkStatusOrders,
      cart,
      cartCount: numberOfCartItems(),
      clearCart,
      updateCart,
      addQuantity,
      removeQuantity,
      addItem,
      checkItemCart,
      deleteItem,
      restaurant,
      setCartRestaurant,
      isLoading,
      updateItemQuantity,
      removeItem,
      calculateSubtotal,
      transformCartWithFoodInfo,
      setCart,
    }),
    [
      token,
      loadingProfile,
      calledProfile,
      errorProfile,
      dataProfile,
      fetchProfile,
      setTokenAsync,
      logout,
      loadingOrders,
      calledOrders,
      errorOrders,
      dataOrders,
      fetchOrders,
      fetchMoreOrdersFunc,
      networkStatusOrders,
      cart,
      numberOfCartItems,
      clearCart,
      updateCart,
      addQuantity,
      removeQuantity,
      addItem,
      checkItemCart,
      deleteItem,
      restaurant,
      setCartRestaurant,
      isLoading,
      updateItemQuantity,
      removeItem,
      calculateSubtotal,
      transformCartWithFoodInfo,
      setCart,
    ]
  );







  return (
    <UserContext.Provider value={contextValue}>
      {props.children}
    </UserContext.Provider>
  );
};

export const UserConsumer = UserContext.Consumer;
export default UserContext;
