export const restaurantTypeDefs = /* GraphQL */ `
  type OpeningTime {
    day: String
    times: [OpeningTimeRange!]
  }

  type OpeningTimeRange {
    startTime: [String!]
    endTime: [String!]
  }

  type Owner {
    _id: ID!
    email: String
    isActive: Boolean
  }

  type Restaurant {
    _id: ID!
    unique_restaurant_id: String
    orderId: String
    orderPrefix: String
    name: String!
    description: String
    image: String
    logo: String
    address: String
    phone: String
    username: String
    slug: String
    location: Coordinates
    deliveryTime: Int
    minimumOrder: Float
    tax: Float
    commissionRate: Float
    isActive: Boolean
    isAvailable: Boolean
    approvalStatus: String
    approvalNote: String
    approvedAt: String
    shopType: String
    "The ShopType id shopType resolves from — lets an edit form preselect the right dropdown option without a slug round-trip."
    shopTypeId: String
    cuisines: [String!]
    openingTimes: [OpeningTime!]
    owner: Owner
    categories: [Category!]!
    options: [Option!]!
    addons: [Addon!]!
    bussinessDetails: BussinessDetails
    currentWalletAmount: Float
    totalWalletAmount: Float
    withdrawnWalletAmount: Float
    stripeDetailsSubmitted: Boolean
    deliveryBounds: ZoneLocation
    city: String
    state: String
    postCode: String
    pickup: Boolean
    delivery: Boolean
    "Who fulfils a delivery order: PLATFORM (LocalSell fleet) | SELF (store's own people) | BOTH (store picks per order)."
    deliveryProvider: String
    minDeliveryFee: Float
    deliveryDistance: Float
    deliveryFee: Float
    deliveryInfo: DeliveryInfo
    notificationToken: String
    enableNotification: Boolean
    hasBusinessDetails: Boolean
    rating: Float
    reviewAverage: Float
    reviewCount: Int
    reviewData: ReviewData!
    restaurantUrl: String
    zone: ZoneLite
  }

  type DeliveryInfo {
    minDeliveryFee: Float
    deliveryDistance: Float
    deliveryFee: Float
  }

  type RestaurantCarouselPreview {
    _id: ID!
    name: String!
    image: String
    logo: String
    slug: String
    deliveryTime: Int
    minimumOrder: Float
    tax: Float
    isAvailable: Boolean
    isActive: Boolean
    shopType: String
    cuisines: [String!]
    tags: [String!]
    openingTimes: [OpeningTime!]
    location: Coordinates
    reviewAverage: Float
    reviewCount: Int
  }

  # offers/sections are object lists (kept for the legacy mobile query shape;
  # this API always returns []). restaurants is the real payload.
  type RestaurantListOffer {
    _id: ID
    name: String
    tag: String
    restaurants: [String!]
  }

  type RestaurantListSection {
    _id: ID
    name: String
    restaurants: [String!]
  }

  type RestaurantList {
    offers: [RestaurantListOffer!]
    sections: [RestaurantListSection!]
    restaurants: [Restaurant!]!
  }

  type RestaurantPaginated {
    data: [Restaurant!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input RestaurantInput {
    name: String!
    description: String
    address: String
    phone: String
    image: String
    logo: String
    deliveryTime: Int
    minimumOrder: Float
    username: String
    password: String
    shopType: String
    salesTax: Float
    commissionRate: Float
    cuisines: [String!]
    latitude: Float
    longitude: Float
    deliveryProvider: String
  }

  input RestaurantProfileInput {
    _id: ID!
    name: String
    description: String
    phone: String
    address: String
    image: String
    logo: String
    deliveryTime: Int
    minimumOrder: Float
    username: String
    shopType: String
    salesTax: Float
    orderPrefix: String
    cuisines: [String!]
    password: String
    isAvailable: Boolean
    latitude: Float
    longitude: Float
    deliveryProvider: String
  }

  type CommissionRateLite {
    _id: ID!
    unique_restaurant_id: String
    orderId: String
    orderPrefix: String
    name: String!
    commissionRate: Float
  }

  type CommissionRatePaginated {
    restaurant: [CommissionRateLite!]!
    currentPage: Int!
    totalPages: Int!
    totalCount: Int!
    nextPage: Int
    prevPage: Int
  }

  type DeliveryOptionsFields {
    delivery: Boolean
    pickup: Boolean
    deliveryProvider: String
  }

  type DeliveryOptionsResult {
    deliveryOptions: DeliveryOptionsFields!
  }

  input OpeningTimeRangeInput {
    startTime: [String!]
    endTime: [String!]
  }

  input TimingsInput {
    day: String
    times: [OpeningTimeRangeInput!]
  }

  type RestaurantDeliveryZoneInfo {
    boundType: String
    deliveryBounds: ZoneLocation
    location: Coordinates
    circleBounds: CircleBounds
    address: String
    city: String
    postCode: String
  }

  type CircleBounds {
    radius: Float
  }

  input CircleBoundsInput {
    radius: Float!
  }

  input CoordinatesInput {
    latitude: Float!
    longitude: Float!
  }

  input BussinessDetailsInput {
    bankName: String
    accountName: String
    accountCode: String
    accountNumber: String
    bussinessRegNo: String
    companyRegNo: String
    taxRate: Float
  }

  type RestaurantMutationResult {
    success: Boolean!
    message: String
    data: Restaurant
  }

  type RestaurantAuthPayload {
    token: String!
    restaurantId: String!
  }

  extend type Query {
    nearByRestaurants(latitude: Float, longitude: Float, radiusKm: Float, shopType: String): RestaurantList!
    nearByRestaurantsPreview(latitude: Float, longitude: Float, shopType: String, page: Int, limit: Int): RestaurantList!
    recentOrderRestaurantsPreview(latitude: Float, longitude: Float): [RestaurantCarouselPreview!]!
    mostOrderedRestaurantsPreview(latitude: Float, longitude: Float, page: Int, limit: Int, shopType: String): [RestaurantCarouselPreview!]!
    topRatedVendorsPreview(latitude: Float, longitude: Float, page: Int, limit: Int, shopType: String): [RestaurantCarouselPreview!]!
    popularRestaurantsPreview(latitude: Float, longitude: Float, radiusKm: Float, limit: Int, shopType: String): [RestaurantCarouselPreview!]!
    activeRestaurantCount(latitude: Float, longitude: Float, radiusKm: Float, shopType: String): Int!
    nearByRestaurantsCuisines(latitude: Float, longitude: Float, shopType: String): [Cuisine!]!
    attachedCuisines: [Cuisine!]!
    restaurant(id: String): Restaurant
    userFavourite(latitude: Float, longitude: Float): [Restaurant!]!

    restaurants: [Restaurant!]!
    restaurantsPaginated(page: Int, limit: Int, search: String, approvalStatus: String): RestaurantPaginated!
    restaurantByOwner(id: String!): Vendor
    commissionRate(page: Int, limit: Int, search: String, minRate: Float): CommissionRatePaginated!
    getRestaurantDeliveryZoneInfo(id: ID!): RestaurantDeliveryZoneInfo
    getClonedRestaurants: [Restaurant!]!
    getClonedRestaurantsPaginated(page: Int, limit: Int, search: String): RestaurantPaginated!
  }

  extend type Mutation {
    restaurantLogin(username: String!, password: String!, notificationToken: String): RestaurantAuthPayload!
    saveRestaurantToken(token: String, isEnabled: Boolean): Restaurant!

    createRestaurant(restaurant: RestaurantInput!, owner: ID!): Restaurant!
    editRestaurant(restaurant: RestaurantProfileInput!): Restaurant!
    toggleStoreAvailability(restaurantId: String!): Restaurant!
    setStoreApproval(id: String!, status: String!, note: String): Restaurant!
    deleteRestaurant(id: String!): Restaurant!
    hardDeleteRestaurant(id: String!): Boolean!
    duplicateRestaurant(id: String!, owner: String!): Restaurant!

    updateCommission(id: String!, commissionRate: Float!): Restaurant!
    updateDeliveryOptions(restId: String!, pickup: Boolean!, delivery: Boolean!, deliveryProvider: String): DeliveryOptionsResult!
    updateTimings(id: String!, openingTimes: [TimingsInput]): Restaurant!

    updateDeliveryBoundsAndLocation(
      id: ID!
      boundType: String!
      bounds: [[[Float!]]]
      circleBounds: CircleBoundsInput
      location: CoordinatesInput!
      address: String
      postCode: String
      city: String
      state: String
    ): RestaurantMutationResult!
    updateRestaurantDelivery(id: ID!, minDeliveryFee: Float, deliveryDistance: Float, deliveryFee: Float): RestaurantMutationResult!
    updateRestaurantBussinessDetails(id: String!, bussinessDetails: BussinessDetailsInput): RestaurantMutationResult!
  }
`;
