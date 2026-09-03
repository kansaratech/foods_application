export const commonTypeDefs = /* GraphQL */ `
  type Coordinates {
    coordinates: [Float!]!
  }

  type Result {
    result: String
  }

  type SuccessMessage {
    success: Boolean!
    message: String
  }

  type Configuration {
    _id: ID!
    currency: String
    currencySymbol: String
    deliveryRate: Float
    termsAndConditions: String
    privacyPolicy: String
    testOtp: String
    skipMobileVerification: Boolean
    skipEmailVerification: Boolean
    skipWhatsAppOTP: Boolean
    costType: String

    email: String
    emailName: String
    enableEmail: Boolean

    formEmail: String

    sendGridEnabled: Boolean
    sendGridEmail: String
    sendGridEmailName: String

    clientId: String
    sandbox: Boolean

    publishableKey: String

    twilioAccountSid: String
    twilioPhoneNumber: String
    twilioEnabled: Boolean
    twilioWhatsAppNumber: String

    dashboardSentryUrl: String
    webSentryUrl: String
    apiSentryUrl: String
    customerAppSentryUrl: String
    restaurantAppSentryUrl: String
    riderAppSentryUrl: String

    googleMapsApiKey: String
    webClientID: String
    androidClientID: String
    iOSClientID: String
    expoClientID: String
    googleMapLibraries: String
    googleColor: String

    cloudinaryUploadUrl: String
    cloudinaryApiKey: String

    webAmplitudeApiKey: String
    appAmplitudeApiKey: String

    firebaseKey: String
    authDomain: String
    projectId: String
    storageBucket: String
    msgSenderId: String
    appId: String
    measurementId: String
    vapidKey: String

    isPaidVersion: Boolean
    enableCustomerDemoMode: Boolean
    customerDemoZoneId: String

    defaultCommissionRate: Float
    commissionBillingCycle: String
    riderCashLimit: Float
    defaultLatitude: Float
    defaultLongitude: Float
  }

  input EmailConfigurationInput {
    email: String
    emailName: String
    enableEmail: Boolean
    password: String
  }

  input FormEmailConfigurationInput {
    formEmail: String
  }

  input SendGridConfigurationInput {
    sendGridEnabled: Boolean
    sendGridEmail: String
    sendGridEmailName: String
    apiKey: String
  }

  input FirebaseConfigurationInput {
    firebaseKey: String
    authDomain: String
    projectId: String
    storageBucket: String
    msgSenderId: String
    appId: String
    measurementId: String
    vapidKey: String
  }

  input SentryConfigurationInput {
    dashboardSentryUrl: String
    webSentryUrl: String
    apiSentryUrl: String
    customerAppSentryUrl: String
    restaurantAppSentryUrl: String
    riderAppSentryUrl: String
  }

  input GoogleApiKeyConfigurationInput {
    googleApiKey: String
  }

  input CloudinaryConfigurationInput {
    cloudinaryUploadUrl: String
    cloudinaryApiKey: String
  }

  input AmplitudeApiKeyConfigurationInput {
    webAmplitudeApiKey: String
    appAmplitudeApiKey: String
  }

  input GoogleClientIDConfigurationInput {
    webClientID: String
    androidClientID: String
    iOSClientID: String
    expoClientID: String
  }

  input WebConfigurationInput {
    googleMapLibraries: String
    googleColor: String
  }

  input AppConfigurationsInput {
    termsAndConditions: String
    privacyPolicy: String
    testOtp: String
    enableCustomerDemoMode: Boolean
    customerDemoZoneId: String
  }

  input DeliveryCostConfigurationInput {
    deliveryRate: Float
    costType: String
  }

  input CommissionConfigurationInput {
    defaultCommissionRate: Float
    commissionBillingCycle: String
    riderCashLimit: Float
    defaultLatitude: Float
    defaultLongitude: Float
  }

  input PaypalConfigurationInput {
    clientId: String
    sandbox: Boolean
    clientSecret: String
  }

  input StripeConfigurationInput {
    publishableKey: String
    secretKey: String
  }

  input TwilioConfigurationInput {
    twilioAccountSid: String
    twilioPhoneNumber: String
    twilioEnabled: Boolean
    twilioWhatsAppNumber: String
    twilioAuthToken: String
  }

  input VerificationConfigurationInput {
    skipEmailVerification: Boolean
    skipMobileVerification: Boolean
    skipWhatsAppOTP: Boolean
  }

  input CurrencyConfigurationInput {
    currency: String
    currencySymbol: String
  }

  type ShopType {
    _id: ID!
    name: String!
    image: String
    slug: String!
    isActive: Boolean
  }

  type ShopTypeFetchPaginated {
    data: [ShopType!]!
    total: Int!
    page: Int!
    pageSize: Int!
    totalPages: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }

  input CreateShopTypeInput {
    name: String!
    image: String
  }

  input UpdateShopTypeInput {
    _id: ID!
    name: String
    image: String
    isActive: Boolean
  }

  input FetchShopTypeFilter {
    search: String
    isActive: Boolean
  }

  input PaginationInput {
    page: Int
    limit: Int
  }

  type Cuisine {
    _id: ID!
    name: String!
    description: String
    image: String
    shopType: String
  }

  type CuisinePaginated {
    data: [Cuisine!]!
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
  }

  input CuisineInput {
    _id: ID
    name: String!
    description: String
    image: String
    shopType: String
  }

  type UploadResponse {
    imageUrl: String!
  }

  type ShopTypeList {
    data: [ShopType!]!
  }

  type Query {
    configuration: Configuration
    fetchAllShopTypes: ShopTypeList
    fetchShopTypes(filter: FetchShopTypeFilter, pagination: PaginationInput): ShopTypeFetchPaginated!
    cuisines: [Cuisine!]!
    cuisinesPaginated(page: Int, limit: Int, search: String, shopType: String): CuisinePaginated!
  }

  type Mutation {
    uploadImageToS3(image: String!): UploadResponse!
    createShopType(dto: CreateShopTypeInput): ShopType!
    updateShopType(dto: UpdateShopTypeInput): ShopType!
    deleteShopType(id: String!): ShopType!
    createCuisine(cuisineInput: CuisineInput!): Cuisine!
    editCuisine(cuisineInput: CuisineInput!): Cuisine!
    deleteCuisine(id: String!): Boolean!

    saveEmailConfiguration(configurationInput: EmailConfigurationInput!): Configuration!
    saveFormEmailConfiguration(configurationInput: FormEmailConfigurationInput!): Configuration!
    saveSendGridConfiguration(configurationInput: SendGridConfigurationInput!): Configuration!
    saveFirebaseConfiguration(configurationInput: FirebaseConfigurationInput!): Configuration!
    saveSentryConfiguration(configurationInput: SentryConfigurationInput!): Configuration!
    saveGoogleApiKeyConfiguration(configurationInput: GoogleApiKeyConfigurationInput!): Configuration!
    saveCloudinaryConfiguration(configurationInput: CloudinaryConfigurationInput!): Configuration!
    saveAmplitudeApiKeyConfiguration(configurationInput: AmplitudeApiKeyConfigurationInput!): Configuration!
    saveGoogleClientIDConfiguration(configurationInput: GoogleClientIDConfigurationInput!): Configuration!
    saveWebConfiguration(configurationInput: WebConfigurationInput!): Configuration!
    saveAppConfigurations(configurationInput: AppConfigurationsInput!): Configuration!
    saveDeliveryRateConfiguration(configurationInput: DeliveryCostConfigurationInput!): Configuration!
    savePaypalConfiguration(configurationInput: PaypalConfigurationInput!): Configuration!
    saveStripeConfiguration(configurationInput: StripeConfigurationInput!): Configuration!
    saveTwilioConfiguration(configurationInput: TwilioConfigurationInput!): Configuration!
    saveVerificationsToggle(configurationInput: VerificationConfigurationInput!): Configuration!
    saveCurrencyConfiguration(configurationInput: CurrencyConfigurationInput!): Configuration!
    saveCommissionConfiguration(configurationInput: CommissionConfigurationInput!): Configuration!
  }

  type Subscription {
    _noop: Boolean
  }
`;
