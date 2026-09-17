"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "primereact/skeleton";
import { useMutation } from "@apollo/client";
import { ADD_FAVOURITE_RESTAURANT } from "@/lib/api/graphql/mutations/restaurant";
import { GET_USER_PROFILE, GET_USER_FAVOURITE } from "@/lib/api/graphql";
import { useQuery } from "@apollo/client";

// Context & Hooks
import useUser from "@/lib/hooks/useUser";
import useRestaurant from "@/lib/hooks/useRestaurant";
import useToast from "@/lib/hooks/useToast";
import useActiveCoupons from "@/lib/hooks/useActiveCoupons";

// Campaign
import Badge from "@/lib/ui/useable-components/badge";
import CampaignBanner from "@/lib/ui/screen-components/un-protected/campaign-banner";

// Icons
import { ClockSvg, HeartSvg, InfoSvg, RatingSvg } from "@/lib/utils/assets/svg";
import { faPlus, faSearch } from "@fortawesome/free-solid-svg-icons";

// Components
import { PaddingContainer } from "@/lib/ui/useable-components/containers";
import FoodItemDetail from "@/lib/ui/useable-components/item-detail";
import FoodCategorySkeleton from "@/lib/ui/useable-components/custom-skeletons/food-items.skeleton";
import ClearCartModal from "@/lib/ui/useable-components/clear-cart-modal";
import Confetti from "react-confetti";
import { useConfig } from "@/lib/context/configuration/configuration.context";
import EmptySearch from "@/lib/ui/useable-components/empty-search-results";
// Interface
import { ICategory, IFood } from "@/lib/utils/interfaces";

// Methods
import { filterMenu, countMenuItems } from "./menu-data";
import styles from "./menu.module.css";
import { calculateDistance } from "@/lib/utils/methods/order";
import { MARKETPLACE_LOCATION } from "@/lib/utils/constants";
import { useUserAddress } from "@/lib/context/address/address.context";
import ChatSvg from "@/lib/utils/assets/svg/chat";
import { isRestaurantOpen } from "@/lib/utils/constants/isRestaurantOpen";
import ReviewsModal from "@/lib/ui/useable-components/reviews-modal";
import InfoModal from "@/lib/ui/useable-components/info-modal";
import BackButton from "@/lib/ui/useable-components/back-button";
import { onUseLocalStorage } from "@/lib/utils/methods/local-storage";

// Queries
import { GET_POPULAR_SUB_CATEGORIES_LIST } from "@/lib/api/graphql";
import { Dialog } from "primereact/dialog";
import Loader from "@/app/(localized)/mapview/[slug]/components/Loader";
import CustomDialog from "@/lib/ui/useable-components/custom-dialog";
import Image, {
  FALLBACK_IMAGE_SRC,
} from "@/lib/ui/useable-components/safe-image";
import { useTranslations } from "next-intl";

export default function RestaurantDetailsScreen() {
  // Access the UserContext via our custom hook
  const {
    cart,
    transformCartWithFoodInfo,
    updateCart,
    restaurant: cartRestaurant,
    clearCart,
  } = useUser();

  // Params from route
  const { id, slug }: { id: string; slug: string } = useParams();

  // Refs
  const menuContentRef = useRef<HTMLDivElement>(null);
  const categoryNavRef = useRef<HTMLElement>(null);

  // State
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [filter, setFilter] = useState("");
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [selectedFood, setSelectedFood] = useState<IFood | null>(null);
  const [showClearCartModal, setShowClearCartModal] = useState<boolean>(false);
  const [pendingRestaurantAction, setPendingRestaurantAction] =
    useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { CURRENCY_SYMBOL } = useConfig();
  const [isModalOpen, setIsModalOpen] = useState({ value: false, id: "" });

  // Active campaign discount for this store (its own coupons + globals)
  const { bestDiscountFor } = useActiveCoupons(id);
  const storeOfferPct = bestDiscountFor(id);

  // Get user profile from context
  const { profile } = useUser();

  // Fetch restaurant data
  const { data, loading: refreshing } = useRestaurant(id, decodeURIComponent(slug));
  // Keep the current menu visible while cached data refreshes.
  const loading = refreshing && !data?.restaurant;

  // fetch popular deals id
  const { data: popularSubCategoriesList } = useQuery(
    GET_POPULAR_SUB_CATEGORIES_LIST,
    {
      variables: {
        restaurantId: id,
      },
    },
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = document.documentElement.getAttribute("dir");
    setDirection(dir === "rtl" ? "rtl" : "ltr");
  }, []);
  // Transform cart items when restaurant data is loaded - only once when dependencies change
  useEffect(() => {
    if (data?.restaurant && cart.length > 0) {
      const transformedCart = transformCartWithFoodInfo(cart, data.restaurant);
      if (JSON.stringify(transformedCart) !== JSON.stringify(cart)) {
        updateCart(transformedCart);
      }
    }
  }, [data?.restaurant, cart?.length, transformCartWithFoodInfo, updateCart]);

  // Filter food categories based on search term
  const allDeals = useMemo(
    () =>
      (data?.restaurant?.categories ?? []).filter(
        (category: ICategory) => category.foods.length > 0,
      ),
    [data?.restaurant?.categories],
  );

  // Check if restaurant is favorited when profile is loaded
  useEffect(() => {
    if (profile?.favourite) {
      const isFavorite = profile.favourite.includes(id);
      setIsLiked(isFavorite);
    }
  }, [profile, id]);

  // Handle update is modal open if restaurant is not active
  const handleUpdateIsModalOpen = useCallback(
    (value: boolean, id: string) => {
      if (isModalOpen.value !== value || isModalOpen.id !== id) {
        setIsModalOpen({ value, id });
      }
    },
    [isModalOpen],
  );

  const normalizedFilter = filter.trim().toLowerCase();
  const deals: ICategory[] = useMemo(() => {
    const popularIds = new Set(
      (popularSubCategoriesList?.popularItems ?? []).map(
        (item: { id: string }) => item.id,
      ),
    );
    const popularFoods = Array.from(
      new Map(
        allDeals
          .flatMap((category: ICategory) => category.foods)
          .filter((food: IFood) => popularIds.has(food._id))
          .map((food: IFood) => [food._id, food] as const),
      ).values(),
    ) as IFood[];
    return popularFoods.length
      ? [
          { _id: "popular-deals", title: "Popular Deals", foods: popularFoods },
          ...allDeals,
        ]
      : allDeals;
  }, [allDeals, popularSubCategoriesList?.popularItems]);
  const [categorySelection, setCategorySelection] = useState({
    restaurantId: id,
    categoryId: "",
  });
  const selectedCategory =
    categorySelection.restaurantId === id &&
    deals.some((category) => category._id === categorySelection.categoryId)
      ? categorySelection.categoryId
      : "";
  const visibleDeals = useMemo(
    () => filterMenu(deals, selectedCategory, filter),
    [deals, selectedCategory, filter],
  );
  const searchedDeals = useMemo(
    () => filterMenu(deals, "", filter),
    [deals, filter],
  );
  const categoryCounts = new Map(
    searchedDeals.map((category) => [category._id, category.foods.length]),
  );
  const resultCount = countMenuItems(visibleDeals);

  useEffect(() => {
    const revealSelection = () => {
      const nav = categoryNavRef.current;
      const active = nav?.querySelector<HTMLElement>(
        'button[aria-pressed="true"]',
      );
      if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
      const bounds = nav.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.left < bounds.left)
        nav.scrollBy({ left: item.left - bounds.left - 8 });
      else if (item.right > bounds.right)
        nav.scrollBy({ left: item.right - bounds.right + 8 });
    };
    revealSelection();
    window.addEventListener("resize", revealSelection);
    return () => window.removeEventListener("resize", revealSelection);
  }, [selectedCategory]);

  const [addFavorite, { loading: addFavoriteLoading }] = useMutation(
    ADD_FAVOURITE_RESTAURANT,
    {
      onCompleted: () => {
        const wasLiked = isLiked;
        setIsLiked(!isLiked);

        // Only show confetti when adding a favorite (not removing)
        if (!wasLiked) {
          setShowConfetti(true);

          // Reset confetti after a longer delay
          setTimeout(() => {
            setShowConfetti(false);
          }, 5000); // Increased from 3000ms to 5000ms
        }
      },
      onError: (error) => {
        console.error("Error adding favorite:", error);
        setIsLiked((prev) => !prev); // Revert the like state on error
      },
      // See store/index.tsx's identical refetch for why GET_USER_FAVOURITE is
      // needed alongside GET_USER_PROFILE (Issue 109).
      refetchQueries: [{ query: GET_USER_PROFILE }, { query: GET_USER_FAVOURITE }],
    },
  );

  const t = useTranslations();

  const handleFavoriteClick = () => {
    if (!profile) {
      // // Handle case where user is not logged in
      return;
    }

    addFavorite({
      variables: {
        id: id,
      },
    });
  };

  // Restaurant info
  const headerData = {
    name: data?.restaurant?.name ?? "...",
    averageReview:
      typeof data?.restaurant?.reviewData?.ratings === "number"
        ? data.restaurant.reviewData.ratings.toFixed(1)
        : "...",
    averageTotal: data?.restaurant?.reviewData?.total ?? "...",
    isAvailable: data?.restaurant?.isAvailable ?? true,
    openingTimes: data?.restaurant?.openingTimes ?? [],
    deals: deals,
    deliveryTime: data?.restaurant?.deliveryTime,
  };

  const restaurantInfo = {
    _id: data?.restaurant?._id ?? "",
    name: data?.restaurant?.name ?? "...",
    image: data?.restaurant?.image || FALLBACK_IMAGE_SRC,
    logo: data?.restaurant?.logo || FALLBACK_IMAGE_SRC,
    deals: deals,
    reviewData: data?.restaurant?.reviewData ?? {},
    address: data?.restaurant?.address ?? "",
    deliveryCharges: data?.restaurant?.deliveryCharges ?? "",
    deliveryTime: data?.restaurant?.deliveryTime ?? "...",
    isAvailable: data?.restaurant?.isAvailable ?? true,
    openingTimes: data?.restaurant?.openingTimes ?? [],
    isActive: data?.restaurant?.isActive ?? true,
  };

  const restaurantInfoModalProps = {
    _id: data?.restaurant?._id ?? "",
    name: data?.restaurant?.name ?? "...",
    username: data?.restaurant?.username ?? "N/A",
    phone: data?.restaurant?.phone ?? "N/A",
    address: data?.restaurant?.address ?? "N/A",
    location: data?.restaurant?.location ?? "N/A",
    isAvailable: data?.restaurant?.isAvailable ?? true,
    openingTimes: data?.restaurant?.openingTimes ?? [],
    description: data?.restaurant?.description ?? t("restaurant_modal_label"),
    deliveryTime: data?.restaurant?.deliveryTime ?? "...",
    deliveryTax: data?.restaurant?.deliveryTax ?? 0,
    MinimumOrder: data?.restaurant?.MinimumOrder ?? 0,
  };

  // States
  const [showReviews, setShowReviews] = useState<boolean>(false);
  const [showMoreInfo, setShowMoreInfo] = useState<boolean>(false);

  const isOpen = isRestaurantOpen(restaurantInfo);

  // Is this store reachable from the customer's chosen delivery location?
  // `restaurant.deliveryDistance` when the vendor has set one, else the
  // marketplace radius (every LocalSell store serves within it).
  const router = useRouter();
  const { showToast } = useToast();
  const { userAddress } = useUserAddress();
  const outOfDeliveryRange = useMemo(() => {
    const storeCoords = data?.restaurant?.location?.coordinates;
    const userCoords = userAddress?.location?.coordinates;
    if (!storeCoords || !userCoords) return false;

    const sLng = Number(storeCoords[0]);
    const sLat = Number(storeCoords[1]);
    const uLng = Number(userCoords[0]);
    const uLat = Number(userCoords[1]);
    const valid = [sLng, sLat, uLng, uLat].every(Number.isFinite);
    if (!valid || (uLng === 0 && uLat === 0) || (sLng === 0 && sLat === 0)) {
      return false;
    }

    const radiusKm =
      Number(data?.restaurant?.deliveryDistance) > 0
        ? Number(data?.restaurant?.deliveryDistance)
        : MARKETPLACE_LOCATION.radiusKm;
    return calculateDistance(sLat, sLng, uLat, uLng) > radiusKm;
  }, [
    data?.restaurant?.location?.coordinates,
    data?.restaurant?.deliveryDistance,
    userAddress?.location?.coordinates,
  ]);

  // Function to handle clicking on a restaurant
  const handleRestaurantClick = (food: IFood) => {
    if (food.isOutOfStock) return;
    if (!isOpen) {
      // Store the action we want to perform after cart confirmation
      handleUpdateIsModalOpen(true, food?._id);
      return;
    }
    // Check if there's a different restaurant in the cart
    if (cart.length > 0 && cartRestaurant && id !== cartRestaurant) {
      // Store the action we want to perform after cart confirmation
      setPendingRestaurantAction({
        type: "foodModal",
        payload: food,
      });
      // Show clear cart confirmation
      setShowClearCartModal(true);
    } else {
      // No conflict, open food modal directly
      handleOpenFoodModal(food);
    }
  };

  // Function to handle clear cart confirmation
  const handleClearCartConfirm = async () => {
    await clearCart();

    // Execute the pending action
    if (pendingRestaurantAction) {
      if (pendingRestaurantAction.type === "foodModal") {
        handleOpenFoodModal(pendingRestaurantAction.payload);
      }
      // Reset the pending action
      setPendingRestaurantAction(null);
    }

    onUseLocalStorage("save", "restaurant", data?.restaurant?._id);
    onUseLocalStorage("save", "restaurant-slug", data?.restaurant?.slug);
    onUseLocalStorage(
      "save",
      "currentShopType",
      data?.restaurant?.shopType === "restaurant" ? "restaurant" : "store",
    );

    // Hide the modal
    setShowClearCartModal(false);
  };

  // Handlers
  const selectCategory = (categoryId: string) => {
    setCategorySelection({ restaurantId: id, categoryId });
    // scrollIntoView also works when the application uses a nested scroll container.
    requestAnimationFrame(() => {
      if (
        menuContentRef.current &&
        menuContentRef.current.getBoundingClientRect().top < 140
      ) {
        menuContentRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  };

  // Function to handle opening the food item modal
  const handleOpenFoodModal = (food: IFood) => {
    if (outOfDeliveryRange) {
      showToast({
        type: "info",
        title: "Outside delivery area",
        message: `${restaurantInfo.name} doesn't deliver to your location. Change it in the top bar to order.`,
      });
      return;
    }
    // Add restaurant ID to the food item
    setSelectedFood({
      ...food,
      restaurant: restaurantInfo._id,
    });
    setShowDialog(true);
  };

  // Function to close the food item modal
  const handleCloseFoodModal = () => {
    setShowDialog(false);
    setSelectedFood(null);
  };

  // Function to handle the logic for seeing reviews
  const handleSeeReviews = () => {
    setShowReviews(true);
  };

  // Function to handle the logic for seeing more information
  const handleSeeMoreInfo = () => {
    setShowMoreInfo(true);
  };

  return (
    <>
      {/* Reviews Modal */}
      <ReviewsModal
        restaurantId={id}
        visible={showReviews && !loading}
        onHide={() => setShowReviews(false)}
      />

      {/* See More Info Modal */}
      <InfoModal
        restaurantInfo={restaurantInfoModalProps}
        // make sure data is not loading because if configuration data is not available it can cause error on google map due to unavailability of api key
        visible={showMoreInfo && !loading}
        onHide={() => setShowMoreInfo(false)}
      />

      {/* Clear Cart Modal */}
      <ClearCartModal
        isVisible={showClearCartModal}
        onHide={() => setShowClearCartModal(false)}
        onConfirm={handleClearCartConfirm}
      />
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
              zIndex: 10000, // Increased z-index
            }}
          >
            <Confetti
              width={window.innerWidth}
              height={window.innerHeight}
              recycle={false}
              numberOfPieces={1000}
              gravity={0.3}
            />
          </div>
          {/* Backdrop overlay to ensure confetti is visible on all backgrounds */}
        </>
      )}

      {/* Banner */}
      <div className="relative">
        <BackButton
          fallbackHref="/discovery"
          className="!absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1.5 shadow-md backdrop-blur hover:bg-white dark:bg-gray-900/90"
        />
        {loading ? (
          <Skeleton width="100%" height="18rem" borderRadius="0" />
        ) : (
          <div className="relative h-[220px] w-full sm:h-[260px]">
            <Image
              src={restaurantInfo.image}
              alt={restaurantInfo.name}
              width={1600}
              height={400}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />
          </div>
        )}

        {!loading && (
          <div
            className={`${direction === "rtl" ? "right-0 md:right-20" : "left-0 md:left-20"} absolute bottom-0 w-full px-4 pb-6 md:w-auto md:px-0`}
          >
            <div className="flex items-end gap-4">
              <span className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lg sm:block">
                <Image
                  src={restaurantInfo.logo}
                  alt={`${restaurantInfo.name} logo`}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </span>
              <div className="min-w-0 text-white">
                <h1 className="font-bold tracking-[-0.025em] text-[28px] leading-tight drop-shadow-md sm:text-[36px] md:text-[40px]">
                  {restaurantInfo.name}
                </h1>
                <p className="mt-1.5 line-clamp-1 text-sm font-medium text-white/90 sm:text-base">
                  {restaurantInfo.address}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          aria-label={isLiked ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={isLiked}
          disabled={addFavoriteLoading}
          onClick={handleFavoriteClick}
          className={`absolute top-4 ${direction === "rtl" ? "left-4" : "right-4"} flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition hover:scale-105 active:scale-95 dark:bg-gray-700`}
        >
          {addFavoriteLoading ? (
            <Loader style={{ width: "1.5rem", height: "1.5rem" }} />
          ) : (
            <HeartSvg filled={isLiked} />
          )}
        </button>
      </div>
      {/* Restaurant Info */}
      <div className="border-b border-slate-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-900">
        <PaddingContainer>
          <div className="flex flex-wrap items-center gap-3 px-3 sm:gap-4">
            {/* Time */}
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-2 text-sm font-medium leading-5">
              <ClockSvg />
              {loading ? (
                <Skeleton width="1rem" height="1.5rem" />
              ) : (
                `${headerData.deliveryTime} mins`
              )}
            </span>

            {/* Rating */}
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300  rounded-lg px-3 py-2 text-sm font-medium leading-5">
              <RatingSvg />
              {loading ? (
                <Skeleton width="1rem" height="1.5rem" />
              ) : (
                headerData.averageReview
              )}
            </span>

            {/* Info Link */}
            <a
              className="flex items-center gap-2 text-secondary-color dark:text-primary-color rounded-lg px-3 py-2 text-sm font-medium leading-5"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleSeeMoreInfo();
              }}
            >
              <InfoSvg />
              {loading ? (
                <Skeleton width="10rem" height="1.5rem" />
              ) : (
                t("see_more_information")
              )}
            </a>

            {/* Review Link */}
            <a
              className="flex items-center gap-2 text-secondary-color dark:text-primary-color rounded-lg px-3 py-2 text-sm font-medium leading-5"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleSeeReviews();
              }}
            >
              <ChatSvg />
              {loading ? (
                <Skeleton width="10rem" height="1.5rem" />
              ) : (
                t("see_reviews")
              )}
            </a>
          </div>
        </PaddingContainer>
      </div>

      {/* Festival campaign banner for store pages */}
      <CampaignBanner placement="STORE" />

      {/* Out-of-delivery-range notice */}
      {!loading && outOfDeliveryRange && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/25">
          <PaddingContainer>
            <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                <span className="font-semibold">{restaurantInfo.name}</span>
                {" doesn’t deliver to "}
                <span className="font-semibold">
                  {userAddress?.deliveryAddress}
                </span>
                {
                  ". You can browse the menu, but ordering is off until you pick a nearer delivery location (top bar)."
                }
              </p>
              <button
                type="button"
                onClick={() => router.push("/discovery")}
                className="shrink-0 rounded-full bg-[#1c5bc7] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Browse stores near you →
              </button>
            </div>
          </PaddingContainer>
        </div>
      )}

      <PaddingContainer className="pb-10">
        <div className={styles.layout}>
          <aside className={styles.navigation}>
            <h2 className={styles.navTitle}>Menu categories</h2>
            <nav
              ref={categoryNavRef}
              aria-label="Menu categories"
              className={styles.categories}
            >
              {[
                {
                  _id: "",
                  title: "All items",
                  count: countMenuItems(searchedDeals),
                },
                ...deals.map((category) => ({
                  _id: category._id,
                  title: category.title,
                  count: categoryCounts.get(category._id) ?? 0,
                })),
              ].map((category) => (
                <button
                  key={category._id}
                  type="button"
                  aria-pressed={selectedCategory === category._id}
                  aria-controls="restaurant-menu-results"
                  onClick={() => selectCategory(category._id)}
                  className={`${styles.category} ${selectedCategory === category._id ? styles.active : ""}`}
                >
                  <span>{category.title}</span>
                  <span className={styles.count}>{category.count}</span>
                </button>
              ))}
            </nav>
          </aside>
          <div
            id="restaurant-menu-results"
            className={styles.content}
            ref={menuContentRef}
          >
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.menuTitle}>
                  {deals.find((category) => category._id === selectedCategory)
                    ?.title ?? "Explore the menu"}
                </h2>
                <p className={styles.resultCount} role="status">
                  {loading
                    ? "Loading menu..."
                    : `${resultCount} items${normalizedFilter ? ` matching "${filter.trim()}"` : " available"}`}
                </p>
              </div>
              <div className={styles.search}>
                <FontAwesomeIcon icon={faSearch} aria-hidden="true" />
                <input
                  aria-label={t("search_for_food_items_placeholder")}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  type="search"
                  placeholder={t("search_for_food_items_placeholder")}
                />
                {filter && (
                  <button
                    type="button"
                    aria-label="Clear menu search"
                    onClick={() => setFilter("")}
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
            {loading ? (
              <FoodCategorySkeleton />
            ) : visibleDeals.length === 0 ? (
              <div className="py-10 text-center">
                <EmptySearch />
                <div className="mt-4 text-gray-500 dark:text-gray-400">
                  {normalizedFilter
                    ? `No items match "${filter.trim()}" in this category.`
                    : "No items available in this category."}
                  {normalizedFilter && (
                    <button
                      type="button"
                      onClick={() => setFilter("")}
                      className={styles.clearSearch}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              visibleDeals.map((category: ICategory) => {
                return (
                  <div key={category._id} className={styles.section}>
                    {!selectedCategory && (
                      <h2 className={styles.sectionTitle}>
                        {category.title}
                        <span>{category.foods.length}</span>
                      </h2>
                    )}

                    <div className={styles.foodGrid}>
                      {category.foods.map((meal: IFood) => (
                        <div
                          key={meal._id}
                          className={`group relative flex gap-4 overflow-hidden rounded-2xl border p-4 transition duration-200 hover:cursor-pointer hover:shadow-md ${
                            meal.isOutOfStock
                              ? "border-slate-200 bg-slate-100 opacity-70 dark:border-gray-700 dark:bg-gray-950"
                              : "border-slate-200 bg-white shadow-sm hover:border-[#1c5bc7]/40 dark:border-gray-700 dark:bg-gray-800"
                          }`}
                          onClick={() => handleRestaurantClick(meal)}
                        >
                          {(meal.badge ||
                            meal.isCombo ||
                            (storeOfferPct && !meal.isOutOfStock)) && (
                            <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1">
                              {meal.isCombo && (
                                <Badge variant="offer">
                                  {t("combo_label")}
                                </Badge>
                              )}
                              {meal.badge && (
                                <Badge variant="festive">{meal.badge}</Badge>
                              )}
                              {storeOfferPct &&
                                !meal.isOutOfStock &&
                                !meal.isCombo && (
                                  <Badge variant="offer">
                                    {t("offer_percent_off", {
                                      pct: storeOfferPct,
                                    })}
                                  </Badge>
                                )}
                            </div>
                          )}
                          {/* Image */}
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
                            <Image
                              alt={meal.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              src={meal.image}
                              width={120}
                              height={120}
                            />
                          </div>

                          {/* Text Content */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <h3 className="line-clamp-2 text-[15px] font-semibold tracking-[-0.01em] text-slate-900 dark:text-gray-100">
                              {meal.title}
                            </h3>
                            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                              {meal.isCombo && meal.comboItems?.length
                                ? meal.comboItems
                                    .map((ci) => `${ci.quantity}× ${ci.title}`)
                                    .join(" + ")
                                : meal.description}
                            </p>
                            <div className="mt-auto flex items-center justify-between gap-2 pe-10 pt-3">
                              {(() => {
                                const basePrice = meal.variations[0].price;
                                const discounted =
                                  meal.variations[0].discounted;
                                const hasVariationDiscount =
                                  discounted != null &&
                                  discounted > 0 &&
                                  discounted < basePrice;
                                const displayPrice = hasVariationDiscount
                                  ? discounted
                                  : basePrice;
                                const strikePrice =
                                  meal.isCombo &&
                                  meal.compareAtPrice &&
                                  meal.compareAtPrice > displayPrice
                                    ? meal.compareAtPrice
                                    : hasVariationDiscount
                                      ? basePrice
                                      : null;
                                return (
                                  <span className="flex items-baseline gap-1.5 text-[15px] font-black text-[#16293f] dark:text-primary-color">
                                    <span>
                                      {CURRENCY_SYMBOL}
                                      {displayPrice}
                                    </span>
                                    {strikePrice != null && (
                                      <span className="text-[11px] font-semibold text-slate-400 line-through">
                                        {CURRENCY_SYMBOL}
                                        {strikePrice}
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                              {meal.isOutOfStock && (
                                <span className="text-[11px] font-bold uppercase tracking-wide text-red-500">
                                  {t("out_of_stock_label")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Add Button */}
                          <button
                            disabled={meal.isOutOfStock}
                            className={`${direction === "rtl" ? "left-4" : "right-4"} absolute bottom-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#1c5bc7] text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestaurantClick(meal);
                            }}
                            type="button"
                            aria-label={`Add ${meal.title}`}
                          >
                            <FontAwesomeIcon icon={faPlus} color="white" />
                          </button>

                          {/* create a modal that will be show that this restaurant is closed do want to see menu or want to close if click on the see menu then will move to the next page other wise modal will be closed */}
                          <CustomDialog
                            className="max-w-[300px]"
                            visible={
                              isModalOpen.value &&
                              isModalOpen.id === meal?._id?.toString()
                            }
                            onHide={() =>
                              handleUpdateIsModalOpen(
                                false,
                                meal?._id?.toString(),
                              )
                            }
                          >
                            <div className="text-center pb-10 pt-10">
                              <p className="text-lg font-bold pb-3 dark:text-gray-100">
                                {t("restaurant_is_closed")}
                              </p>
                              <p className="text-sm dark:text-gray-300">
                                {t("cannot_order_food_item_now")}
                                <br></br> {t("please_try_again_later")}
                              </p>
                            </div>
                          </CustomDialog>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PaddingContainer>

      {/* Food Item Detail Modal */}
      <Dialog
        contentClassName="dark:bg-gray-800 dark:text-gray-300"
        headerClassName="dark:bg-gray-800 dark:text-gray-300"
        visible={!!showDialog}
        className="mx-3 sm:mx-4 md:mx-0 " // Adds margin on small screens
        onHide={handleCloseFoodModal}
        showHeader={false}
        contentStyle={{
          borderTopLeftRadius: "4px",
          borderTopRightRadius: "4px",
          padding: "0px",
        }} // Rounds top corners
        style={{ borderRadius: "1rem" }} // Rounds full box including top corners
      >
        {selectedFood && (
          <FoodItemDetail
            foodItem={selectedFood}
            addons={data?.restaurant?.addons}
            options={data?.restaurant?.options}
            restaurant={data?.restaurant}
            onClose={handleCloseFoodModal}
          />
        )}
      </Dialog>
    </>
  );
}
