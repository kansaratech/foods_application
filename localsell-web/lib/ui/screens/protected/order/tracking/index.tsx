"use client";

// Components
import Link from "next/link";
import OrderPaymentPanel from "@/lib/ui/screen-components/protected/order-tracking/components/order-payment-panel";
import OrderHandoverCard from "@/lib/ui/screen-components/protected/order-tracking/components/order-handover-card";
import styles from "./tracking.module.css";
import GoogleMapTrackingComponent from "@/lib/ui/screen-components/protected/order-tracking/components/gm-tracking-comp";
import TrackingOrderDetails from "../../../../screen-components/protected/order-tracking/components/tracking-order-details";
import TrackingHelpCard from "../../../../screen-components/protected/order-tracking/components/tracking-help-card";
import TrackingStatusCard from "@/lib/ui/screen-components/protected/order-tracking/components/tracking-status-card";
import TrackingOrderDetailsDummy from "../../../../screen-components/protected/order-tracking/components/tracking-order-details-dummy";

// Services
import useLocation from "@/lib/ui/screen-components/protected/order-tracking/services/useLocation";
import useTracking from "@/lib/ui/screen-components/protected/order-tracking/services/useTracking";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { ADD_REVIEW_ORDER, GET_USER_PROFILE } from "@/lib/api/graphql";
import useReviews from "@/lib/hooks/useReviews";
import { IReview } from "@/lib/utils/interfaces";
import useToast from "@/lib/hooks/useToast";
import { RatingModal } from "@/lib/ui/screen-components/protected/profile";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";
import ReactConfetti from "react-confetti";
import ChatRider from "@/lib/ui/screen-components/protected/order-tracking/components/ChatRider";
import BackButton from "@/lib/ui/useable-components/back-button";

interface IOrderTrackingScreenProps {
  orderId: string;
  view?: "confirmation" | "details";
}

export default function OrderTrackingScreen({
  orderId,
  view = "details",
}: IOrderTrackingScreenProps) {
  const [showMap, setShowMap] = useState(false);
  //states
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showChat, setShowChat] = useState(false);

  //Queries and Mutations
  const {
    orderTrackingDetails,
    isOrderTrackingDetailsLoading,
    refetch: refetchTracking,
    error: trackingError,
  } = useTracking({ orderId: orderId });

  const {
    isLoaded,
    origin,
    destination,
    directions,
    setDirections,
    directionsCallback,
    store_user_location_cache_key,
    isCheckingCache,
    setIsCheckingCache,
  } = useLocation(orderTrackingDetails);

  const { showToast } = useToast();

  const { data: profile } = useQuery(GET_USER_PROFILE, {
    fetchPolicy: "cache-only",
  });

  const [mutate] = useMutation(ADD_REVIEW_ORDER, {
    onCompleted,
    onError,
  });

  function onCompleted() {
    showToast({
      type: "success",
      title: "Rating",
      message: "Rating submitted successfully",
      duration: 3000,
    });

    // Add a small delay before navigation
    // Use window.location for a hard redirect
    setTimeout(() => {
      window.location.href = "/profile/order-history";
    }, 1000); // Increased timeout to ensure toast has time to display
  }

  function onError() {
    showToast({
      type: "error",
      title: "Rating",
      message: "Failed to submit rating",
      duration: 3000,
    });
  }
  // Subscription events trigger a refetch. Render the latest full API snapshot
  // so an older subscription cannot overwrite a newer payment/order poll.
  let mergedOrderDetails = orderTrackingDetails;

  if (mergedOrderDetails?.orderStatus === "PICKUP") {
    mergedOrderDetails = {
      ...mergedOrderDetails,
      orderStatus: "PICKED",
    };
  }

  // Get restaurant ID for reviews query
  const restaurantId = useMemo(
    () => mergedOrderDetails?.restaurant?._id,
    [mergedOrderDetails?.restaurant?._id],
  );

  // Fetch reviews data for the specified restaurant
  const { data: reviewsData, refetch } = useReviews(restaurantId);

  // Check if the user has already reviewed the order
  // Memoize the check for existing user review
  const hasUserReview = useMemo(() => {
    if (
      !reviewsData?.reviewsByRestaurant?.reviews ||
      !profile?.profile?.email
    ) {
      return false;
    }
    return reviewsData.reviewsByRestaurant.reviews.some(
      (review: IReview) =>
        review?.order?.user?.email === profile.profile.email &&
        review?.order?._id === orderId,
    );
  }, [
    reviewsData?.reviewsByRestaurant?.reviews,
    profile?.profile?.email,
    orderId,
  ]);

  // Handlers
  const onInitDirectionCacheSet = () => {
    try {
      const stored_direction = onUseLocalStorage(
        "get",
        store_user_location_cache_key,
      );
      if (stored_direction) {
        setDirections(JSON.parse(stored_direction));
      } else {
        setDirections(null);
      }
      setIsCheckingCache(false); // done checking
    } catch (err) {
      setIsCheckingCache(false);
    } finally {
      setIsCheckingCache(false);
    }
  };

  // handle submit rating
  const handleSubmitRating = async (
    orderId: string | undefined,
    ratingValue: number,
    comment?: string,
    aspects: string[] = [],
  ) => {
    const reviewDescription = comment?.trim() || undefined;
    const reviewComments = aspects?.filter(Boolean).join(", ") || undefined;

    // Here you would  call an API to save the rating
    try {
      await mutate({
        variables: {
          order: orderId,
          description: reviewDescription,
          rating: ratingValue,
          comments: reviewComments,
        },
      });
    } catch (error) {
      console.error("Error submitting rating:", error);
    }

    // Close the modal
    setShowRatingModal(false);
  };

  //useEffects

  // useEffect to handle order status changes
  useEffect(() => {
    if (mergedOrderDetails?.orderStatus == "PICKED") {
      setShowChat(true);
    }

    if (mergedOrderDetails?.orderStatus == "DELIVERED") {
      // add timer
      const timer = setTimeout(() => {
        setShowRatingModal(true);
      }, 4000); // 4 seconds delay before showing the modal
      return () => clearTimeout(timer); // Clear timeout on component unmount
    } else if (
      mergedOrderDetails?.orderStatus == "ACCEPTED" &&
      (mergedOrderDetails.paymentMethod === "COD" ||
        mergedOrderDetails.paymentStatus === "PAID")
    ) {
      setShowConfetti(true);

      // Reset confetti after a longer delay
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    }
  }, [
    mergedOrderDetails?.orderStatus,
    mergedOrderDetails?.paymentMethod,
    mergedOrderDetails?.paymentStatus,
  ]);

  // useEffect to handle subscription data changes
  useEffect(() => {
    if (mergedOrderDetails?.restaurant?._id) {
      refetch();
    }
  }, [mergedOrderDetails?.restaurant?._id, isOrderTrackingDetailsLoading]);

  useEffect(() => {
    onInitDirectionCacheSet();
  }, [store_user_location_cache_key]);

  return (
    <>
      {showConfetti && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              pointerEvents: "none",
              zIndex: 10000,
            }}
          >
            <ReactConfetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={1000}
              gravity={0.3}
            />
          </div>
        </>
      )}
      <RatingModal
        visible={view === "details" && showRatingModal && !hasUserReview}
        onHide={() => setShowRatingModal(false)}
        order={orderTrackingDetails}
        onSubmitRating={handleSubmitRating}
      />
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <BackButton fallbackHref="/profile/order-history" />
            <h1>
              {view === "confirmation"
                ? "Order confirmation"
                : "Order details & tracking"}
            </h1>
            {mergedOrderDetails && (
              <p>
                {mergedOrderDetails.restaurant?.name} &middot;{" "}
                {mergedOrderDetails.orderId}
              </p>
            )}
          </div>
          <Link
            href={
              view === "confirmation"
                ? `/order/${orderId}/tracking`
                : "/profile/order-history"
            }
          >
            {view === "confirmation"
              ? "View details & track order"
              : "All orders"}
          </Link>
        </header>
        {isOrderTrackingDetailsLoading ? (
          <TrackingOrderDetailsDummy />
        ) : !mergedOrderDetails ? (
          <div role="alert" className={styles.card}>
            <h2>Unable to load this order</h2>
            <p>
              {trackingError?.message ||
                "Please sign in to the account that placed this order."}
            </p>
            <button type="button" onClick={() => refetchTracking()}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className={styles.layout}>
              <aside
                className={styles.sidebar}
                aria-label="Payment and delivery information"
              >
                <OrderPaymentPanel
                  orderTrackingDetails={mergedOrderDetails}
                  onUpdated={refetchTracking}
                />
                <OrderHandoverCard order={mergedOrderDetails} />
                <section className={styles.card}>
                  <h2>
                    {mergedOrderDetails.isPickedUp
                      ? "Pickup address"
                      : "Delivery address"}
                  </h2>
                  <p>
                    {mergedOrderDetails.isPickedUp
                      ? mergedOrderDetails.restaurant?.address
                      : mergedOrderDetails.deliveryAddress?.deliveryAddress}
                  </p>
                  <button
                    type="button"
                    aria-expanded={showMap}
                    aria-controls="order-map"
                    onClick={() => setShowMap(!showMap)}
                  >
                    {showMap ? "Hide map" : "Show map"}
                  </button>
                  {showMap && (
                    <div id="order-map" className={styles.map}>
                      <GoogleMapTrackingComponent
                        isLoaded={isLoaded}
                        origin={origin}
                        destination={destination}
                        directions={directions}
                        isCheckingCache={isCheckingCache}
                        directionsCallback={directionsCallback}
                        orderStatus={mergedOrderDetails.orderStatus}
                        riderId={mergedOrderDetails.rider?._id}
                      />
                    </div>
                  )}
                </section>
                <TrackingHelpCard />
              </aside>
              <div className={styles.mainColumn}>
                {mergedOrderDetails.paymentMethod === "CASHFREE" &&
                mergedOrderDetails.paymentStatus !== "PAID" &&
                mergedOrderDetails.orderStatus === "PENDING" ? (
                  <section className={styles.card}>
                    <h2>Order saved - payment not confirmed</h2>
                    <p>
                      Check or complete your payment in the payment panel.
                      Delivery progress will appear after payment and store
                      confirmation.
                    </p>
                  </section>
                ) : (
                  <TrackingStatusCard
                    orderTrackingDetails={mergedOrderDetails}
                  />
                )}
                {view === "confirmation" ? (
                  <section className={styles.card}>
                    <h2>
                      {mergedOrderDetails.orderStatus === "CANCELLED"
                        ? "Order cancelled"
                        : "Order received"}
                    </h2>
                    <p>
                      {mergedOrderDetails.isPickedUp
                        ? "Collect from"
                        : "Deliver to"}
                      :{" "}
                      {mergedOrderDetails.isPickedUp
                        ? mergedOrderDetails.restaurant?.address
                        : mergedOrderDetails.deliveryAddress?.deliveryAddress}
                    </p>
                    <p>
                      Order status:{" "}
                      {mergedOrderDetails.orderStatus
                        .replaceAll("_", " ")
                        .toLowerCase()}
                      . Payment status is shown separately above.
                    </p>
                    <Link href={`/order/${orderId}/tracking`}>
                      View items, bill and tracking
                    </Link>
                  </section>
                ) : (
                  <section className={styles.card}>
                    <TrackingOrderDetails
                      orderTrackingDetails={mergedOrderDetails}
                    />
                  </section>
                )}
                {showChat && (
                  <ChatRider
                    orderId={orderId}
                    customerId={profile?.profile._id}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
