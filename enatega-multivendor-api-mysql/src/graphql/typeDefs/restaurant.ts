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
    shopType: String
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
    postCode: String
    pickup: Boolean
    delivery: Boolean
    minDeliveryFee: Float
    deliveryDistance: Float
    deliveryFee: Float
    deliveryInfo: DeliveryInfo
    notificationToken: String
    enableNotification: Boolean
    hasBusinessDetails: Boolean
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
    deliveryTime: Int
    minimumOrder: Float
    tax: Float
    isAvailable: Boolean
    shopType: String
    location: Coordinates
  }

  type RestaurantList {
    offers: [String!]
    sections: [String!]
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
    cuisines: [String!]
    latitude: Float
    longitude: Float
  }

  input RestaurantProfileInput {
    _id: ID!
    name: String
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
    nextPage: Int
    prevPage: Int
  }

  type DeliveryOptionsFields {
    delivery: Boolean
    pickup: Boolean
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
    nearByRestaurants(latitude: Float, longitude: Float, shopType: String): RestaurantList!
    nearByRestaurantsPreview(latitude: Float, longitude: Float, shopType: String, page: Int, limit: Int): [RestaurantCarouselPreview!]!
    restaurant(id: String!): Restaurant
    userFavourite(latitude: Float, longitude: Float): [Restaurant!]!

    restaurants: [Restaurant!]!
    restaurantsPaginated(page: Int, limit: Int, search: String): RestaurantPaginated!
    restaurantByOwner(id: String!): Vendor
    commissionRate(page: Int, limit: Int): CommissionRatePaginated!
    getRestaurantDeliveryZoneInfo(id: ID!): RestaurantDeliveryZoneInfo
    getClonedRestaurants: [Restaurant!]!
    getClonedRestaurantsPaginated(page: Int, limit: Int, search: String): RestaurantPaginated!
  }

  extend type Mutation {
    restaurantLogin(username: String!, password: String!, notificationToken: String): RestaurantAuthPayload!
    saveRestaurantToken(token: String, isEnabled: Boolean): Restaurant!

    createRestaurant(restaurant: RestaurantInput!, owner: ID!): Restaurant!
    editRestaurant(restaurant: RestaurantProfileInput!): Restaurant!
    deleteRestaurant(id: String!): Restaurant!
    hardDeleteRestaurant(id: String!): Boolean!
    duplicateRestaurant(id: String!, owner: String!): Restaurant!

    updateCommission(id: String!, commissionRate: Float!): Restaurant!
    updateDeliveryOptions(restId: String!, pickup: Boolean!, delivery: Boolean!): DeliveryOptionsResult!
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
    ): RestaurantMutationResult!
    updateRestaurantDelivery(id: ID!, minDeliveryFee: Float, deliveryDistance: Float, deliveryFee: Float): RestaurantMutationResult!
    updateRestaurantBussinessDetails(id: String!, bussinessDetails: BussinessDetailsInput): RestaurantMutationResult!
  }
`;
