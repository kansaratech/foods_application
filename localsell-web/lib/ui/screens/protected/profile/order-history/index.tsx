"use client";
import styles from "./order-history.module.css";
import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import {
  GET_USERS_ACTIVE_ORDERS,
  GET_USERS_PAST_ORDERS,
} from "@/lib/api/graphql/queries/orders";
import {
  ActiveOrders,
  PastOrders,
} from "@/lib/ui/screen-components/protected/profile";
import { IOrder } from "@/lib/utils/interfaces/orders.interface";
import { useTranslations } from "next-intl";
import ErrorDisplay from "@/lib/ui/useable-components/slider-error-display";

export default function OrderHistoryScreen() {
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"active" | "past">("active");
  const [activeOrders, setActiveOrders] = useState<IOrder[]>([]);
  const [pastOrders, setPastOrders] = useState<IOrder[]>([]);
  const [activeOrderHasMore, setActiveOrderHasMore] = useState(true);
  const [pastOrderHasMore, setPastOrderHasMore] = useState(true);
  const limit = 5;
  const t = useTranslations();

  const {
    data: pastOrder,
    loading: pastOrderLoading,
    fetchMore: pastOrderFetchMore,
    networkStatus: pastOrderNetwork,
    error: pastOrderError,
  } = useQuery(GET_USERS_PAST_ORDERS, {
    variables: {
      page,
      limit,
      offset: 0,
    },
  });

  const {
    data: activeOrder,
    loading: activeOrderLoading,
    fetchMore: activeOrderFetchMore,
    networkStatus: activeOrderNetwork,
    error: activeOrderError,
  } = useQuery(GET_USERS_ACTIVE_ORDERS, {
    variables: {
      page,
      limit,
      offset: 0,
    },
  });

  // Merge new orders & update hasMore
  useEffect(() => {
    if (!activeOrder?.getUsersActiveOrders) return;

    setActiveOrders((prev) => {
      const newOrders = activeOrder.getUsersActiveOrders.filter(
        (order: IOrder) => !prev.some((p) => p._id === order._id),
      );
      return [...prev, ...newOrders];
    });

    // Only update hasMore after pagination starts
    if (activeOrder.getUsersActiveOrders.length < limit) {
      setActiveOrderHasMore(false);
    }
  }, [activeOrder, page, limit]);

  useEffect(() => {
    if (!pastOrder?.getUsersPastOrders) return;

    setPastOrders((prev) => {
      const newOrders = pastOrder.getUsersPastOrders.filter(
        (order: IOrder) => !prev.some((p) => p._id === order._id),
      );
      return [...prev, ...newOrders];
    });

    // Only update hasMore after pagination starts
    if (pastOrder.getUsersPastOrders.length < limit) {
      setPastOrderHasMore(false);
    }
  }, [pastOrder, page, limit]);

  const loadMore = () => {
    // Stop completely if nothing has more data
    if (!activeOrderHasMore && !pastOrderHasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);

    if (activeOrderHasMore) {
      activeOrderFetchMore({
        variables: {
          page: nextPage,
          limit,
          offset: 0,
        },
      });
    }

    if (pastOrderHasMore) {
      pastOrderFetchMore({
        variables: {
          page: nextPage,
          limit,
          offset: 0,
        },
      });
    }
  };

  const retryInitialLoad = () => {
    setPage(1);
    setActiveOrderHasMore(true);
    setPastOrderHasMore(true);
    setActiveOrders([]);
    setPastOrders([]);
    activeOrderFetchMore({ variables: { page: 1 } });
    pastOrderFetchMore({ variables: { page: 1 } });
  };

  if (activeOrderError || pastOrderError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <ErrorDisplay
          message={activeOrderError?.message || pastOrderError?.message}
          onRetry={retryInitialLoad}
        />
      </div>
    );
  }

  return (
    <section className={styles.history} aria-label={t("order_history")}>
      <div className={styles.header}>
        <h2>{t("order_history")}</h2>
        <div
          className={styles.switcher}
          role="group"
          aria-label={t("order_history")}
        >
          <button
            type="button"
            aria-pressed={view === "active"}
            onClick={() => setView("active")}
          >
            {t("active_orders_title")}
          </button>
          <button
            type="button"
            aria-pressed={view === "past"}
            onClick={() => setView("past")}
          >
            {t("past_orders_label")}
          </button>
        </div>
      </div>
      <div className={styles.panel}>
        {view === "active" ? (
          /* Active Orders */
          <ActiveOrders
            activeOrders={activeOrders}
            isOrdersLoading={activeOrderNetwork === 1} // initial load only
          />
        ) : (
          <PastOrders
            pastOrders={pastOrders}
            isOrdersLoading={pastOrderNetwork === 1} // initial load only
            onRatingSubmitted={(orderId, review) =>
              setPastOrders((prev) =>
                prev.map((o) => (o._id === orderId ? { ...o, review } : o)),
              )
            }
          />
        )}
      </div>
      {/* Load More Button */}
      {(view === "active"
        ? activeOrderHasMore && activeOrders.length > 0
        : pastOrderHasMore && pastOrders.length > 0) && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={activeOrderLoading || pastOrderLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-color dark:text-black text-white font-semibold rounded-full shadow-md hover:bg-primary-color transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeOrderLoading || pastOrderLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 dark:text-black text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                <span>{t("loading_orders")}</span>
              </>
            ) : (
              <span>{t("show_more_orders")}</span>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
