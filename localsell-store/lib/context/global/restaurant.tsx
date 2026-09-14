import {
  ApolloError,
  ApolloQueryResult,
  NetworkStatus,
  useQuery,
} from "@apollo/client";
import React, {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "@/lib/services/secure-store";

// Context
import { AuthContext } from "@/lib/context/global/auth.context";

// API
import { GET_ORDERS } from "@/lib/apollo/queries/orders";
import { SUBSCRIBE_PLACE_ORDER } from "@/lib/apollo/subscriptions";
import { getStoreId } from "@/lib/services";
import { IRestaurantProviderProps } from "@/lib/utils/interfaces";
import { IOrder } from "@/lib/utils/interfaces/order.interface";

interface Printer {
  name?: string;
  url?: string;
  deviceName?: string;
  macAddress?: string;
}

interface RestaurantOrdersData {
  restaurantOrders: IOrder[];
}

interface IRestaurantContext {
  loading: boolean;
  error?: ApolloError;
  data?: RestaurantOrdersData;
  subscribeToMoreOrders: (force?: boolean) => Promise<void>;
  refetch: () => Promise<ApolloQueryResult<RestaurantOrdersData>>;
  networkStatus: NetworkStatus;
  printer: Printer | null;
  setPrinter: Dispatch<SetStateAction<Printer | null>>;
  notificationToken: string | null;
}

const Context = React.createContext<IRestaurantContext>(
  {} as IRestaurantContext,
);

const Provider = ({ children }: IRestaurantProviderProps) => {
  const { logout } = useContext(AuthContext);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [notificationToken, setNotificationToken] = useState<string | null>(
    null,
  );
  const [storeId, setStoreId] = useState<string | null>(null);
  const unsubscribeRef = useRef<null | (() => void)>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedRestaurantRef = useRef<string | null>(null);

  // The store this login is scoped to. Without this, GET_ORDERS falls back
  // server-side to "the vendor's one restaurant" and throws for any vendor
  // who owns more than one outlet (#64) — same ID the subscription below
  // already uses via getStoreId().
  useEffect(() => {
    (async () => {
      setStoreId(await getStoreId());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const printerStr = await AsyncStorage.getItem("printer");
        if (printerStr) setPrinter(JSON.parse(printerStr));
      } catch {
        // Ignore invalid cached printer data.
      }
    })();
  }, []);

  // No pollInterval: new orders and status changes arrive instantly over the
  // subscription (subscribePlaceOrder + per-order subscriptionOrder). The
  // initial fetch loads the list; realtime keeps it current. Pull-to-refresh
  // still calls refetch() manually.
  const { loading, error, data, subscribeToMore, refetch, networkStatus } =
    useQuery<RestaurantOrdersData>(GET_ORDERS, {
      variables: { restaurant: storeId },
      skip: !storeId,
      fetchPolicy: "cache-and-network",
    });

  // The token can be valid while the store it points at no longer exists —
  // e.g. hard-deleted from the admin panel, or the id was for a different
  // owner. restaurantOrders is the one query that checks both (restaurant
  // exists AND currentUser owns it) and throws NOT_FOUND if either fails, so
  // it's a safe, unambiguous signal to force a logout rather than leaving the
  // merchant stuck on a blank/broken screen indefinitely.
  useEffect(() => {
    const restaurantMissing = error?.graphQLErrors?.some(
      (e) => e.extensions?.code === "NOT_FOUND",
    );
    if (restaurantMissing) {
      void logout();
    }
  }, [error, logout]);

  useEffect(() => {
    async function GetToken() {
      try {
        const result = await SecureStore.getItemAsync("notification-token");
        if (result) {
          setNotificationToken(JSON.parse(result));
        } else {
          setNotificationToken(null);
        }
      } catch {
        setNotificationToken(null);
      }
    }
    GetToken();
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const cleanupSubscription = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    subscribedRestaurantRef.current = null;
  }, []);

  const subscribeToMoreOrders = useCallback(
    async (force = false) => {
      try {
        const restaurant = await getStoreId();
        if (!restaurant) {
          return;
        }

        if (
          !force &&
          unsubscribeRef.current &&
          subscribedRestaurantRef.current === restaurant
        ) {
          return;
        }

        clearRetryTimer();
        cleanupSubscription();

        unsubscribeRef.current = subscribeToMore<{
          subscribePlaceOrder: { origin: string; order: IOrder };
        }>({
          document: SUBSCRIBE_PLACE_ORDER,
          variables: { restaurant },
          updateQuery: (prev, { subscriptionData }) => {
            if (!subscriptionData.data) return prev;
            const restaurantOrders = prev?.restaurantOrders ?? [];
            // subscribePlaceOrder fires once — when a customer places an order
            // for this outlet. `origin` from the API is an internal tag
            // ("order_service"), not "new"/"update"; don't gate on it, just
            // upsert so the order shows without a manual pull-to-refresh.
            const { order } = subscriptionData.data.subscribePlaceOrder;
            if (!order?._id) return prev;
            const orderIndex = restaurantOrders.findIndex(
              (o: IOrder) => o?._id === order._id,
            );
            if (orderIndex < 0) {
              return { restaurantOrders: [order, ...restaurantOrders] };
            }
            const updatedOrders = [...restaurantOrders];
            updatedOrders[orderIndex] = order;
            return { restaurantOrders: updatedOrders };
          },
          onError: () => {
            cleanupSubscription();
            clearRetryTimer();
            retryTimerRef.current = setTimeout(() => {
              refetch().catch(() => {});
              void subscribeToMoreOrders(true);
            }, 1500);
          },
        });
        subscribedRestaurantRef.current = restaurant;
      } catch {
        cleanupSubscription();
      }
    },
    [cleanupSubscription, clearRetryTimer, refetch, subscribeToMore],
  );

  useEffect(() => {
    void subscribeToMoreOrders();
    return () => {
      clearRetryTimer();
      cleanupSubscription();
    };
  }, [cleanupSubscription, clearRetryTimer, subscribeToMoreOrders]);

  const value = useMemo<IRestaurantContext>(
    () => ({
      loading,
      error,
      data,
      subscribeToMoreOrders,
      refetch,
      networkStatus,
      printer,
      setPrinter,
      notificationToken,
    }),
    [
      data,
      error,
      loading,
      networkStatus,
      notificationToken,
      printer,
      refetch,
      subscribeToMoreOrders,
    ],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export const useRestaurantContext = () => useContext(Context);
export default { Context, Provider };
