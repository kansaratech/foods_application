/* eslint-disable */
/**
 * Generates Postman v2.1 collections for the Enatega MySQL backend, one per
 * client app (admin / customer-web / customer-app / rider / store) plus a shared
 * environment file.
 *
 * Run:  node postman/generate.js
 *
 * Every request targets POST {{baseUrl}}/graphql with a JSON GraphQL body.
 * Collection-level auth is Bearer {{token}}. Login requests capture the token
 * (and other ids) into collection variables via test scripts, and the main
 * "list" queries capture the first returned id into a matching variable so the
 * Collection Runner can be run top-to-bottom to smoke-test the whole surface.
 */
const fs = require('fs');
const path = require('path');

const OUT = __dirname;

/* ------------------------------------------------------------------ helpers */

const noErrorsTest = [
  "const status = pm.response.code;",
  "pm.test('HTTP 200', () => pm.expect(status).to.eql(200));",
  "let body;",
  "try { body = pm.response.json(); } catch (e) { body = {}; }",
  "pm.test('No GraphQL errors', () => pm.expect(body.errors, JSON.stringify(body.errors)).to.be.undefined);",
];

/**
 * capture: array of [ jsonPath, variableName ] applied after the no-errors test.
 * e.g. ['data.ownerLogin.token', 'token']
 */
function captureScript(capture) {
  if (!capture || !capture.length) return [];
  const lines = ["const d = (body && body.data) || {};"];
  for (const [pathExpr, varName] of capture) {
    // pathExpr is relative to response root (usually starts with data.)
    lines.push(
      `try { const v = ${pathExpr.replace(/^data\./, 'body.data.')}; if (v !== undefined && v !== null && v !== '') pm.collectionVariables.set('${varName}', typeof v === 'object' ? JSON.stringify(v) : String(v)); } catch (e) {}`
    );
  }
  return lines;
}

function req(name, query, variables, opts = {}) {
  const bodyObj = { query: query.trim(), variables: variables || {} };
  const events = [];
  const testExec = [...noErrorsTest, ...captureScript(opts.capture)];
  events.push({
    listen: 'test',
    script: { type: 'text/javascript', exec: testExec },
  });
  const item = {
    name,
    event: events,
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: JSON.stringify(bodyObj, null, 2),
        options: { raw: { language: 'json' } },
      },
      url: {
        raw: '{{baseUrl}}/graphql',
        host: ['{{baseUrl}}'],
        path: ['graphql'],
      },
    },
  };
  if (opts.description) item.request.description = opts.description;
  if (opts.noAuth) item.request.auth = { type: 'noauth' };
  return item;
}

/** websocket/subscription placeholder (documentation only) */
function subNote(name, query, variables) {
  return {
    name: `[SUB] ${name}`,
    request: {
      method: 'OPTIONS',
      header: [],
      body: {
        mode: 'raw',
        raw:
          '# GraphQL subscription — not runnable as HTTP.\n' +
          '# Connect a WebSocket client to {{wsUrl}}/graphql\n' +
          '# sub-protocol: graphql-transport-ws (or legacy graphql-ws)\n' +
          '# connectionParams: { "authorization": "Bearer {{token}}" }\n\n' +
          'subscription ' + query.trim() + '\n\n' +
          '# variables:\n# ' + JSON.stringify(variables || {}),
      },
      url: { raw: '{{wsUrl}}/graphql', host: ['{{wsUrl}}'], path: ['graphql'] },
      description: 'Subscription reference only. Use a WebSocket client.',
    },
  };
}

function folder(name, items) {
  return { name, item: items };
}

function collection(name, description, folders, extraVars = []) {
  return {
    info: {
      name,
      description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
    },
    event: [
      {
        listen: 'prerequest',
        script: { type: 'text/javascript', exec: [''] },
      },
    ],
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000', type: 'string' },
      { key: 'wsUrl', value: 'ws://localhost:4000', type: 'string' },
      { key: 'token', value: '', type: 'string' },
      ...extraVars.map((v) => ({ key: v.key, value: v.value || '', type: 'string' })),
    ],
    item: folders,
  };
}

function write(fileName, obj) {
  fs.writeFileSync(path.join(OUT, fileName), JSON.stringify(obj, null, 2) + '\n');
  console.log('wrote', fileName);
}

/* ============================================================= GraphQL bits */

const F = {
  restaurant: '_id name slug isActive isAvailable address deliveryTime minimumOrder',
  restaurantPreview: '_id name slug image deliveryTime minimumOrder isAvailable reviewAverage reviewCount',
  order:
    '_id orderId orderStatus paymentMethod paymentStatus orderAmount paidAmount isActive isPickedUp createdAt ' +
    'restaurant { _id name } user { _id name phone } rider { _id name } items { _id title quantity price }',
  adminUser: '_id name email phone userType isActive status',
  user: '_id name email phone emailIsVerified phoneIsVerified isActive addresses { _id label deliveryAddress selected } favourite',
  rider: '_id name username phone email available isActive vehicleType zone { _id title }',
  category: '_id title image',
  food: '_id title description image isActive isOutOfStock variations { _id title price }',
  addon: '_id title description quantityMinimum quantityMaximum options { _id title price }',
  option: '_id title description price',
  coupon: '_id title discount enabled lifeTimeActive startDate endDate',
  zone: '_id title description isActive',
  cuisine: '_id name description image shopType',
  shopType: '_id name slug image isActive',
  banner: '_id title description action screen file',
  config: '_id currency currencySymbol deliveryRate termsAndConditions privacyPolicy skipEmailVerification skipMobileVerification',
  review: '_id rating description comments isActive createdAt order { user { _id name } }',
  vendor: '_id email name firstName lastName phoneNumber isActive restaurants { _id name }',
  staff: '_id name email phone isActive permissions userType',
  ticket: '_id title description status category orderId createdAt user { _id name userType }',
  ticketMsg: '_id content senderType isRead ticket createdAt',
  withdraw: '_id requestId requestAmount status createdAt',
  notification: '_id title body createdAt',
};

const ADDRESS_INPUT = {
  label: 'Home',
  deliveryAddress: '456 Market St, San Francisco, CA',
  details: 'Apt 2B',
  latitude: '37.775',
  longitude: '-122.418',
};

/* =============================================================== ADMIN */

const adminAuth = folder('01 · Auth & Session', [
  req(
    'ownerLogin',
    `mutation ownerLogin($email:String!,$password:String!){ ownerLogin(email:$email,password:$password){ userId token refreshToken userType email name permissions restaurants { _id name } } }`,
    { email: 'admin@enatega.local', password: 'Admin@123' },
    { noAuth: true, capture: [['data.ownerLogin.token', 'token'], ['data.ownerLogin.refreshToken', 'refreshToken'], ['data.ownerLogin.userId', 'ownerId']] }
  ),
  req(
    'ownerLogin (vendor)',
    `mutation ownerLogin($email:String!,$password:String!){ ownerLogin(email:$email,password:$password){ userId token refreshToken userType restaurants { _id name } } }`,
    { email: 'vendor@enatega.local', password: 'Vendor@123' },
    { noAuth: true }
  ),
  req(
    'refreshToken',
    `mutation refreshToken($refreshToken:String!,$userType:String!){ refreshToken(refreshToken:$refreshToken,userType:$userType){ token refreshToken userType } }`,
    { refreshToken: '{{refreshToken}}', userType: 'ADMIN' },
    { noAuth: true, capture: [['data.refreshToken.token', 'token']] }
  ),
  req('ownerSession', `query { ownerSession { userId email userType name permissions restaurants { _id name } } }`, {}),
  req('hasOwnerPermission', `query hasOwnerPermission($permission:String!){ hasOwnerPermission(permission:$permission) }`, { permission: 'orders' }),
]);

const adminVendors = folder('02 · Vendors', [
  req('vendors', `query { vendors { ${F.vendor} } }`, {}, { capture: [['data.vendors.0._id', 'vendorId']] }),
  req('getVendor', `query getVendor($id:String!){ getVendor(id:$id){ ${F.vendor} } }`, { id: '{{vendorId}}' }),
  req('restaurantByOwner', `query restaurantByOwner($id:String!){ restaurantByOwner(id:$id){ ${F.vendor} } }`, { id: '{{vendorId}}' }),
  req(
    'createVendor',
    `mutation createVendor($vendorInput:VendorInput!){ createVendor(vendorInput:$vendorInput){ ${F.vendor} } }`,
    { vendorInput: { name: 'QA Vendor', email: `qa.vendor.${Date.now()}@enatega.local`, firstName: 'QA', lastName: 'Vendor', phoneNumber: '+15550009999', password: 'Vendor@123' } }
  ),
  req('editVendor', `mutation editVendor($vendorInput:VendorInput!){ editVendor(vendorInput:$vendorInput){ ${F.vendor} } }`, { vendorInput: { _id: '{{vendorId}}', email: 'vendor@enatega.local', firstName: 'Sample', lastName: 'Vendor', phoneNumber: '+15550001111' } }),
  req('deleteVendor', `mutation deleteVendor($id:String!){ deleteVendor(id:$id) }`, { id: 'REPLACE_WITH_DISPOSABLE_VENDOR_ID' }),
]);

const adminUsers = folder('03 · Users', [
  req('users', `query { users { ${F.adminUser} } }`, {}, { capture: [['data.users.0._id', 'userId']] }),
  req('usersPaginated', `query usersPaginated($page:Int,$limit:Int,$search:String){ usersPaginated(page:$page,limit:$limit,search:$search){ totalCount currentPage totalPages data { ${F.adminUser} } } }`, { page: 1, limit: 10, search: '' }),
  req('user', `query user($id:ID!){ user(id:$id){ ${F.adminUser} addresses { _id label deliveryAddress } } }`, { id: '{{userId}}' }),
  req('getDashboardUsers', `query { getDashboardUsers { usersCount vendorsCount restaurantsCount ridersCount } }`, {}),
  req('updateUserStatus', `mutation updateUserStatus($id:ID!,$status:String!,$reason:String){ updateUserStatus(id:$id,status:$status,reason:$reason){ ${F.adminUser} } }`, { id: '{{userId}}', status: 'active', reason: 'QA check' }),
  req('updateUserNotes', `mutation updateUserNotes($id:ID!,$notes:String!){ updateUserNotes(id:$id,notes:$notes){ _id notes } }`, { id: '{{userId}}', notes: 'QA note' }),
  req('resetUserSession', `mutation resetUserSession($userId:ID!){ resetUserSession(userId:$userId){ _id } }`, { userId: '{{userId}}' }),
  req('deleteUser', `mutation deleteUser($id:ID!){ deleteUser(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_USER_ID' }),
]);

const adminRestaurants = folder('04 · Restaurants', [
  req('restaurants', `query { restaurants { ${F.restaurant} owner { _id email } } }`, {}, { capture: [['data.restaurants.0._id', 'restaurantId']] }),
  req('restaurantsPaginated', `query restaurantsPaginated($page:Int,$limit:Int,$search:String){ restaurantsPaginated(page:$page,limit:$limit,search:$search){ totalCount currentPage totalPages data { ${F.restaurant} } } }`, { page: 1, limit: 10, search: '' }),
  req('restaurant', `query restaurant($id:String){ restaurant(id:$id){ ${F.restaurant} categories { _id title } cuisines openingTimes { day } } }`, { id: '{{restaurantId}}' }),
  req('commissionRate', `query commissionRate($page:Int,$limit:Int){ commissionRate(page:$page,limit:$limit){ currentPage totalPages restaurant { _id name commissionRate } } }`, { page: 1, limit: 10 }),
  req('getRestaurantDeliveryZoneInfo', `query getRestaurantDeliveryZoneInfo($id:ID!){ getRestaurantDeliveryZoneInfo(id:$id){ boundType address city postCode location { coordinates } circleBounds { radius } } }`, { id: '{{restaurantId}}' }),
  req('getClonedRestaurants', `query { getClonedRestaurants { ${F.restaurant} } }`, {}),
  req('getClonedRestaurantsPaginated', `query($page:Int,$limit:Int,$search:String){ getClonedRestaurantsPaginated(page:$page,limit:$limit,search:$search){ totalCount data { _id name } } }`, { page: 1, limit: 10, search: '' }),
  req(
    'createRestaurant',
    `mutation createRestaurant($restaurant:RestaurantInput!,$owner:ID!){ createRestaurant(restaurant:$restaurant,owner:$owner){ ${F.restaurant} } }`,
    { owner: '{{vendorId}}', restaurant: { name: 'QA Restaurant', address: '1 Test St', phone: '+15550002222', deliveryTime: 30, minimumOrder: 10, username: `qa.rest.${Date.now()}@enatega.local`, password: 'Rest@1234', shopType: 'restaurant', salesTax: 5, cuisines: ['Fast Food'], latitude: 37.7749, longitude: -122.4194 } }
  ),
  req('editRestaurant', `mutation editRestaurant($restaurant:RestaurantProfileInput!){ editRestaurant(restaurant:$restaurant){ ${F.restaurant} } }`, { restaurant: { _id: '{{restaurantId}}', name: 'Sample Restaurant', phone: '+15550003333', deliveryTime: 35, minimumOrder: 12 } }),
  req('toggleStoreAvailability', `mutation toggleStoreAvailability($restaurantId:String!){ toggleStoreAvailability(restaurantId:$restaurantId){ _id isAvailable } }`, { restaurantId: '{{restaurantId}}' }),
  req('updateCommission', `mutation updateCommission($id:String!,$commissionRate:Float!){ updateCommission(id:$id,commissionRate:$commissionRate){ _id commissionRate } }`, { id: '{{restaurantId}}', commissionRate: 15 }),
  req('updateDeliveryOptions', `mutation updateDeliveryOptions($restId:String!,$pickup:Boolean!,$delivery:Boolean!){ updateDeliveryOptions(restId:$restId,pickup:$pickup,delivery:$delivery){ deliveryOptions { pickup delivery } } }`, { restId: '{{restaurantId}}', pickup: true, delivery: true }),
  req('updateTimings', `mutation updateTimings($id:String!,$openingTimes:[TimingsInput]){ updateTimings(id:$id,openingTimes:$openingTimes){ _id openingTimes { day times { startTime endTime } } } }`, { id: '{{restaurantId}}', openingTimes: [{ day: 'MON', times: [{ startTime: ['09', '00'], endTime: ['22', '00'] }] }] }),
  req('updateDeliveryBoundsAndLocation', `mutation($id:ID!,$boundType:String!,$circleBounds:CircleBoundsInput,$location:CoordinatesInput!,$address:String,$city:String,$postCode:String){ updateDeliveryBoundsAndLocation(id:$id,boundType:$boundType,circleBounds:$circleBounds,location:$location,address:$address,city:$city,postCode:$postCode){ success message } }`, { id: '{{restaurantId}}', boundType: 'radius', circleBounds: { radius: 5000 }, location: { latitude: 37.7749, longitude: -122.4194 }, address: '123 Main St', city: 'San Francisco', postCode: '94103' }),
  req('updateRestaurantDelivery', `mutation($id:ID!,$minDeliveryFee:Float,$deliveryDistance:Float,$deliveryFee:Float){ updateRestaurantDelivery(id:$id,minDeliveryFee:$minDeliveryFee,deliveryDistance:$deliveryDistance,deliveryFee:$deliveryFee){ success message } }`, { id: '{{restaurantId}}', minDeliveryFee: 2, deliveryDistance: 10, deliveryFee: 3.5 }),
  req('updateRestaurantBussinessDetails', `mutation($id:String!,$bussinessDetails:BussinessDetailsInput){ updateRestaurantBussinessDetails(id:$id,bussinessDetails:$bussinessDetails){ success message } }`, { id: '{{restaurantId}}', bussinessDetails: { bankName: 'Sample Bank', accountName: 'Sample Vendor', accountCode: '001', accountNumber: '000123456', bussinessRegNo: 'BRN-001', companyRegNo: 'CRN-001', taxRate: 5 } }),
  req('duplicateRestaurant', `mutation duplicateRestaurant($id:String!,$owner:String!){ duplicateRestaurant(id:$id,owner:$owner){ _id name } }`, { id: '{{restaurantId}}', owner: '{{vendorId}}' }),
  req('deleteRestaurant', `mutation deleteRestaurant($id:String!){ deleteRestaurant(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_RESTAURANT_ID' }),
  req('hardDeleteRestaurant', `mutation hardDeleteRestaurant($id:String!){ hardDeleteRestaurant(id:$id) }`, { id: 'REPLACE_WITH_DISPOSABLE_RESTAURANT_ID' }),
]);

const adminMenu = folder('05 · Menu (Categories / Food / Addons)', [
  req('restaurantCategoriesPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantCategoriesPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { _id title foods { _id title } } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }, { capture: [['data.restaurantCategoriesPaginated.data.0._id', 'categoryId'], ['data.restaurantCategoriesPaginated.data.0.foods.0._id', 'foodId']] }),
  req('restaurantOptionsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantOptionsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { ${F.option} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }),
  req('restaurantAddonsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantAddonsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { ${F.addon} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }, { capture: [['data.restaurantAddonsPaginated.data.0._id', 'addonId']] }),
  req('popularFoodItems', `query popularFoodItems($restaurantId:String!){ popularFoodItems(restaurantId:$restaurantId){ ${F.food} } }`, { restaurantId: '{{restaurantId}}' }),
  req('subCategories', `query { subCategories { _id title parentCategoryId } }`, {}),
  req('subCategoriesByParentId', `query($parentCategoryId:String!){ subCategoriesByParentId(parentCategoryId:$parentCategoryId){ _id title parentCategoryId } }`, { parentCategoryId: '{{categoryId}}' }),
  req('createCategory', `mutation createCategory($category:CategoryInput!){ createCategory(category:$category){ _id categories { _id title } } }`, { category: { title: 'QA Category', restaurant: '{{restaurantId}}' } }),
  req('editCategory', `mutation editCategory($category:CategoryInput!){ editCategory(category:$category){ _id categories { _id title } } }`, { category: { _id: '{{categoryId}}', title: 'Burgers', restaurant: '{{restaurantId}}' } }),
  req('deleteCategory', `mutation deleteCategory($id:String!,$restaurant:String!){ deleteCategory(id:$id,restaurant:$restaurant){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_CATEGORY_ID', restaurant: '{{restaurantId}}' }),
  req('createFood', `mutation createFood($foodInput:FoodInput!){ createFood(foodInput:$foodInput){ _id categories { _id title foods { _id title } } } }`, { foodInput: { restaurant: '{{restaurantId}}', title: 'QA Burger', description: 'Test item', category: '{{categoryId}}', variations: [{ title: 'Regular', price: 9.99 }] } }),
  req('editFood', `mutation editFood($foodInput:FoodInput!){ editFood(foodInput:$foodInput){ _id } }`, { foodInput: { _id: '{{foodId}}', restaurant: '{{restaurantId}}', title: 'Classic Burger', category: '{{categoryId}}', variations: [{ title: 'Regular', price: 8.99 }] } }),
  req('updateFoodOutOfStock', `mutation($id:String!,$restaurant:String!,$categoryId:String!){ updateFoodOutOfStock(id:$id,restaurant:$restaurant,categoryId:$categoryId) }`, { id: '{{foodId}}', restaurant: '{{restaurantId}}', categoryId: '{{categoryId}}' }),
  req('deleteFood', `mutation deleteFood($id:String!,$restaurant:String!,$categoryId:String!){ deleteFood(id:$id,restaurant:$restaurant,categoryId:$categoryId){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_FOOD_ID', restaurant: '{{restaurantId}}', categoryId: '{{categoryId}}' }),
  req('createAddon', `mutation createAddon($addonInput:AddonInput!){ createAddon(addonInput:$addonInput){ ${F.addon} } }`, { addonInput: { restaurant: '{{restaurantId}}', title: 'QA Addon', description: 'Test', quantityMinimum: 0, quantityMaximum: 2, options: [{ title: 'Extra', price: 1 }] } }),
  req('editAddon', `mutation editAddon($addonInput:AddonInput!){ editAddon(addonInput:$addonInput){ ${F.addon} } }`, { addonInput: { _id: '{{addonId}}', restaurant: '{{restaurantId}}', title: 'Extra Toppings', quantityMinimum: 0, quantityMaximum: 3 } }),
  req('deleteAddon', `mutation deleteAddon($id:String!,$restaurant:String!){ deleteAddon(id:$id,restaurant:$restaurant) }`, { id: 'REPLACE_WITH_DISPOSABLE_ADDON_ID', restaurant: '{{restaurantId}}' }),
  req('createSubCategories', `mutation createSubCategories($subCategories:[SubCategoryInput!]!){ createSubCategories(subCategories:$subCategories) }`, { subCategories: [{ title: 'QA Sub', parentCategoryId: '{{categoryId}}' }] }),
  req('deleteSubCategory', `mutation deleteSubCategory($_id:String!){ deleteSubCategory(_id:$_id) }`, { _id: 'REPLACE_WITH_DISPOSABLE_SUBCATEGORY_ID' }),
]);

const adminRiders = folder('06 · Riders', [
  req('riders', `query { riders { ${F.rider} } }`, {}, { capture: [['data.riders.0._id', 'riderId']] }),
  req('ridersPaginated', `query($page:Int,$limit:Int,$search:String,$zone:String,$available:Boolean,$isActive:Boolean){ ridersPaginated(page:$page,limit:$limit,search:$search,zone:$zone,available:$available,isActive:$isActive){ totalCount data { ${F.rider} } } }`, { page: 1, limit: 10, search: '' }),
  req('rider', `query rider($id:String!){ rider(id:$id){ ${F.rider} } }`, { id: '{{riderId}}' }),
  req('availableRiders', `query { availableRiders { ${F.rider} } }`, {}),
  req('ridersByZone', `query ridersByZone($id:String!){ ridersByZone(id:$id){ ${F.rider} } }`, { id: '{{zoneId}}' }),
  req('createRider', `mutation createRider($riderInput:RiderInput!){ createRider(riderInput:$riderInput){ ${F.rider} } }`, { riderInput: { name: 'QA Rider', username: `qarider${Date.now()}`, phone: '+15550007777', zone: '{{zoneId}}', vehicleType: 'motorcycle', available: true, password: 'Rider@123' } }),
  req('editRider', `mutation editRider($riderInput:RiderInput!){ editRider(riderInput:$riderInput){ ${F.rider} } }`, { riderInput: { _id: '{{riderId}}', name: 'Alex Rider', phone: '+15550000002', vehicleType: 'motorcycle', available: true } }),
  req('toggleAvailablity', `mutation toggleAvailablity($id:String!){ toggleAvailablity(id:$id){ _id available } }`, { id: '{{riderId}}' }),
  req('deleteRider', `mutation deleteRider($id:String!){ deleteRider(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_RIDER_ID' }),
]);

const adminStaff = folder('07 · Staff', [
  req('staffs', `query { staffs { ${F.staff} } }`, {}, { capture: [['data.staffs.0._id', 'staffId']] }),
  req('staffsPaginated', `query($page:Int,$limit:Int,$search:String,$isActive:Boolean){ staffsPaginated(page:$page,limit:$limit,search:$search,isActive:$isActive){ totalCount data { ${F.staff} } } }`, { page: 1, limit: 10 }),
  req('createStaff', `mutation createStaff($staffInput:StaffInput!){ createStaff(staffInput:$staffInput){ ${F.staff} } }`, { staffInput: { name: 'QA Staff', email: `qa.staff.${Date.now()}@enatega.local`, phone: '+15550006666', isActive: true, permissions: ['ORDERS'], password: 'Staff@123' } }),
  req('editStaff', `mutation editStaff($staffInput:StaffInput!){ editStaff(staffInput:$staffInput){ ${F.staff} } }`, { staffInput: { _id: '{{staffId}}', name: 'Sample Staff', email: 'staff@enatega.local', permissions: ['ORDERS', 'RESTAURANTS'] } }),
  req('deleteStaff', `mutation deleteStaff($id:String!){ deleteStaff(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_STAFF_ID' }),
]);

const adminZones = folder('08 · Zones', [
  req('zones', `query { zones { ${F.zone} location { coordinates } } }`, {}, { capture: [['data.zones.0._id', 'zoneId']] }),
  req('zonesPaginated', `query($page:Int,$limit:Int,$search:String,$isActive:Boolean){ zonesPaginated(page:$page,limit:$limit,search:$search,isActive:$isActive){ totalCount data { ${F.zone} } } }`, { page: 1, limit: 10 }),
  req('createZone', `mutation createZone($zone:ZoneInput!){ createZone(zone:$zone){ ${F.zone} } }`, { zone: { title: 'QA Zone', description: 'Test zone', coordinates: [[[-122.43, 37.76], [-122.4, 37.76], [-122.4, 37.79], [-122.43, 37.79], [-122.43, 37.76]]] } }),
  req('editZone', `mutation editZone($zone:ZoneInput!){ editZone(zone:$zone){ ${F.zone} } }`, { zone: { _id: '{{zoneId}}', title: 'Downtown Zone', description: 'Central delivery zone', coordinates: [[[-122.43, 37.76], [-122.4, 37.76], [-122.4, 37.79], [-122.43, 37.79], [-122.43, 37.76]]] } }),
  req('deleteZone', `mutation deleteZone($id:String!){ deleteZone(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_ZONE_ID' }),
]);

const adminCoupons = folder('09 · Coupons', [
  req('coupons', `query { coupons { ${F.coupon} } }`, {}, { capture: [['data.coupons.0._id', 'couponId']] }),
  req('couponsPaginated', `query($page:Int,$limit:Int,$search:String,$enabled:Boolean){ couponsPaginated(page:$page,limit:$limit,search:$search,enabled:$enabled){ totalCount data { ${F.coupon} } } }`, { page: 1, limit: 10 }),
  req('restaurantCoupons', `query restaurantCoupons($restaurantId:String!){ restaurantCoupons(restaurantId:$restaurantId){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}' }),
  req('restaurantCouponsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int){ restaurantCouponsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit){ totalCount data { ${F.coupon} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10 }),
  req('createCoupon', `mutation createCoupon($couponInput:CouponInput!){ createCoupon(couponInput:$couponInput){ ${F.coupon} } }`, { couponInput: { title: `QA${Date.now()}`, discount: 10, enabled: true, lifeTimeActive: true } }),
  req('editCoupon', `mutation editCoupon($couponInput:CouponInput!){ editCoupon(couponInput:$couponInput){ ${F.coupon} } }`, { couponInput: { _id: '{{couponId}}', title: 'WELCOME10', discount: 10, enabled: true, lifeTimeActive: true } }),
  req('deleteCoupon', `mutation deleteCoupon($id:String!){ deleteCoupon(id:$id) }`, { id: 'REPLACE_WITH_DISPOSABLE_COUPON_ID' }),
  req('createRestaurantCoupon', `mutation($restaurantId:ID!,$couponInput:CouponInput!){ createRestaurantCoupon(restaurantId:$restaurantId,couponInput:$couponInput){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}', couponInput: { title: `RQA${Date.now()}`, discount: 5, enabled: true } }),
  req('editRestaurantCoupon', `mutation($restaurantId:ID!,$couponInput:CouponInput!){ editRestaurantCoupon(restaurantId:$restaurantId,couponInput:$couponInput){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}', couponInput: { _id: '{{couponId}}', title: 'BURGER5', discount: 5, enabled: true } }),
  req('deleteRestaurantCoupon', `mutation($restaurantId:ID!,$couponId:ID!){ deleteRestaurantCoupon(restaurantId:$restaurantId,couponId:$couponId) }`, { restaurantId: '{{restaurantId}}', couponId: 'REPLACE_WITH_DISPOSABLE_COUPON_ID' }),
]);

const adminBanners = folder('10 · Banners', [
  req('banners', `query { banners { ${F.banner} } }`, {}, { capture: [['data.banners.0._id', 'bannerId']] }),
  req('createBanner', `mutation createBanner($bannerInput:BannerInput!){ createBanner(bannerInput:$bannerInput){ ${F.banner} } }`, { bannerInput: { title: 'QA Banner', description: 'Test', action: 'Navigate Specific Restaurant', screen: 'Near By Restaurants' } }),
  req('editBanner', `mutation editBanner($bannerInput:BannerInput!){ editBanner(bannerInput:$bannerInput){ ${F.banner} } }`, { bannerInput: { _id: '{{bannerId}}', title: 'Weekend Special', description: '20% off this weekend' } }),
  req('deleteBanner', `mutation deleteBanner($id:String!){ deleteBanner(id:$id) }`, { id: 'REPLACE_WITH_DISPOSABLE_BANNER_ID' }),
]);

const adminCuisinesShop = folder('11 · Cuisines & Shop Types', [
  req('cuisines', `query { cuisines { ${F.cuisine} } }`, {}, { capture: [['data.cuisines.0._id', 'cuisineId']] }),
  req('cuisinesPaginated', `query($page:Int,$limit:Int,$search:String,$shopType:String){ cuisinesPaginated(page:$page,limit:$limit,search:$search,shopType:$shopType){ totalCount data { ${F.cuisine} } } }`, { page: 1, limit: 10 }),
  req('attachedCuisines', `query { attachedCuisines { ${F.cuisine} } }`, {}),
  req('createCuisine', `mutation createCuisine($cuisineInput:CuisineInput!){ createCuisine(cuisineInput:$cuisineInput){ ${F.cuisine} } }`, { cuisineInput: { name: `QA Cuisine ${Date.now()}`, description: 'Test', shopType: 'restaurant' } }),
  req('editCuisine', `mutation editCuisine($cuisineInput:CuisineInput!){ editCuisine(cuisineInput:$cuisineInput){ ${F.cuisine} } }`, { cuisineInput: { _id: '{{cuisineId}}', name: 'Fast Food', description: 'Burgers, fries and more', shopType: 'restaurant' } }),
  req('deleteCuisine', `mutation deleteCuisine($id:String!){ deleteCuisine(id:$id) }`, { id: 'REPLACE_WITH_DISPOSABLE_CUISINE_ID' }),
  req('fetchAllShopTypes', `query { fetchAllShopTypes { data { ${F.shopType} } } }`, {}, { capture: [['data.fetchAllShopTypes.data.0._id', 'shopTypeId']] }),
  req('fetchShopTypes', `query($filter:FetchShopTypeFilter,$pagination:PaginationInput){ fetchShopTypes(filter:$filter,pagination:$pagination){ total page totalPages data { ${F.shopType} } } }`, { filter: { search: '' }, pagination: { page: 1, limit: 10 } }),
  req('createShopType', `mutation createShopType($dto:CreateShopTypeInput){ createShopType(dto:$dto){ ${F.shopType} } }`, { dto: { name: `QA Shop ${Date.now()}` } }),
  req('updateShopType', `mutation updateShopType($dto:UpdateShopTypeInput){ updateShopType(dto:$dto){ ${F.shopType} } }`, { dto: { _id: '{{shopTypeId}}', name: 'Restaurant', isActive: true } }),
  req('deleteShopType', `mutation deleteShopType($id:String!){ deleteShopType(id:$id){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_SHOPTYPE_ID' }),
]);

const adminConfig = folder('12 · Configuration', [
  req('configuration', `query { configuration { ${F.config} email enableEmail twilioEnabled sendGridEnabled googleMapsApiKey isPaidVersion } }`, {}),
  req('saveEmailConfiguration', `mutation($c:EmailConfigurationInput!){ saveEmailConfiguration(configurationInput:$c){ _id email emailName enableEmail } }`, { c: { email: 'noreply@enatega.local', emailName: 'Enatega', enableEmail: false, password: 'x' } }),
  req('saveFormEmailConfiguration', `mutation($c:FormEmailConfigurationInput!){ saveFormEmailConfiguration(configurationInput:$c){ _id formEmail } }`, { c: { formEmail: 'form@enatega.local' } }),
  req('saveSendGridConfiguration', `mutation($c:SendGridConfigurationInput!){ saveSendGridConfiguration(configurationInput:$c){ _id sendGridEnabled sendGridEmail } }`, { c: { sendGridEnabled: false, sendGridEmail: 'sg@enatega.local', sendGridEmailName: 'Enatega', apiKey: 'x' } }),
  req('saveFirebaseConfiguration', `mutation($c:FirebaseConfigurationInput!){ saveFirebaseConfiguration(configurationInput:$c){ _id projectId } }`, { c: { firebaseKey: 'x', authDomain: 'x', projectId: 'x', storageBucket: 'x', msgSenderId: 'x', appId: 'x', measurementId: 'x', vapidKey: 'x' } }),
  req('saveSentryConfiguration', `mutation($c:SentryConfigurationInput!){ saveSentryConfiguration(configurationInput:$c){ _id webSentryUrl apiSentryUrl } }`, { c: { dashboardSentryUrl: '', webSentryUrl: '', apiSentryUrl: '', customerAppSentryUrl: '', restaurantAppSentryUrl: '', riderAppSentryUrl: '' } }),
  req('saveGoogleApiKeyConfiguration', `mutation($c:GoogleApiKeyConfigurationInput!){ saveGoogleApiKeyConfiguration(configurationInput:$c){ _id googleMapsApiKey } }`, { c: { googleApiKey: 'AIza-test' } }),
  req('saveCloudinaryConfiguration', `mutation($c:CloudinaryConfigurationInput!){ saveCloudinaryConfiguration(configurationInput:$c){ _id cloudinaryUploadUrl } }`, { c: { cloudinaryUploadUrl: 'https://api.cloudinary.com/x', cloudinaryApiKey: 'x' } }),
  req('saveAmplitudeApiKeyConfiguration', `mutation($c:AmplitudeApiKeyConfigurationInput!){ saveAmplitudeApiKeyConfiguration(configurationInput:$c){ _id webAmplitudeApiKey appAmplitudeApiKey } }`, { c: { webAmplitudeApiKey: 'x', appAmplitudeApiKey: 'x' } }),
  req('saveGoogleClientIDConfiguration', `mutation($c:GoogleClientIDConfigurationInput!){ saveGoogleClientIDConfiguration(configurationInput:$c){ _id webClientID } }`, { c: { webClientID: 'x', androidClientID: 'x', iOSClientID: 'x', expoClientID: 'x' } }),
  req('saveWebConfiguration', `mutation($c:WebConfigurationInput!){ saveWebConfiguration(configurationInput:$c){ _id googleMapLibraries googleColor } }`, { c: { googleMapLibraries: 'places', googleColor: '#000000' } }),
  req('saveAppConfigurations', `mutation($c:AppConfigurationsInput!){ saveAppConfigurations(configurationInput:$c){ _id termsAndConditions privacyPolicy testOtp } }`, { c: { termsAndConditions: 'Sample terms', privacyPolicy: 'Sample privacy', testOtp: '1234', enableCustomerDemoMode: false } }),
  req('saveDeliveryRateConfiguration', `mutation($c:DeliveryCostConfigurationInput!){ saveDeliveryRateConfiguration(configurationInput:$c){ _id deliveryRate costType } }`, { c: { deliveryRate: 5, costType: 'perKM' } }),
  req('savePaypalConfiguration', `mutation($c:PaypalConfigurationInput!){ savePaypalConfiguration(configurationInput:$c){ _id clientId sandbox } }`, { c: { clientId: 'x', sandbox: true, clientSecret: 'x' } }),
  req('saveStripeConfiguration', `mutation($c:StripeConfigurationInput!){ saveStripeConfiguration(configurationInput:$c){ _id publishableKey } }`, { c: { publishableKey: 'pk_test_x', secretKey: 'sk_test_x' } }),
  req('saveTwilioConfiguration', `mutation($c:TwilioConfigurationInput!){ saveTwilioConfiguration(configurationInput:$c){ _id twilioAccountSid twilioEnabled } }`, { c: { twilioAccountSid: 'AC-x', twilioPhoneNumber: '+10000000000', twilioEnabled: false, twilioWhatsAppNumber: '+10000000000', twilioAuthToken: 'x' } }),
  req('saveVerificationsToggle', `mutation($c:VerificationConfigurationInput!){ saveVerificationsToggle(configurationInput:$c){ _id skipEmailVerification skipMobileVerification skipWhatsAppOTP } }`, { c: { skipEmailVerification: true, skipMobileVerification: true, skipWhatsAppOTP: true } }),
  req('saveCurrencyConfiguration', `mutation($c:CurrencyConfigurationInput!){ saveCurrencyConfiguration(configurationInput:$c){ _id currency currencySymbol } }`, { c: { currency: 'USD', currencySymbol: '$' } }),
]);

const adminDashboard = folder('13 · Dashboard & Metrics', [
  req('getDashboardUsersByYear', `query($year:Int!){ getDashboardUsersByYear(year:$year){ usersCount vendorsCount restaurantsCount ridersCount percentageChange { usersPercent vendorsPercent } } }`, { year: new Date().getFullYear() }),
  req('getDashboardOrdersByType', `query { getDashboardOrdersByType { value label } }`, {}),
  req('getDashboardSalesByType', `query { getDashboardSalesByType { value label } }`, {}),
  req('getRestaurantDashboardOrdersSalesStats', `query($restaurant:String!,$starting_date:String!,$ending_date:String!,$dateKeyword:String){ getRestaurantDashboardOrdersSalesStats(restaurant:$restaurant,starting_date:$starting_date,ending_date:$ending_date,dateKeyword:$dateKeyword){ totalOrders totalSales totalCODOrders totalCardOrders } }`, { restaurant: '{{restaurantId}}', starting_date: '2025-01-01', ending_date: '2025-12-31', dateKeyword: 'Custom' }),
  req('getRestaurantDashboardSalesOrderCountDetailsByYear', `query($restaurant:String!,$year:Int!){ getRestaurantDashboardSalesOrderCountDetailsByYear(restaurant:$restaurant,year:$year){ salesAmount ordersCount } }`, { restaurant: '{{restaurantId}}', year: new Date().getFullYear() }),
  req('getRestaurantDashboardOrderSalesDetailsByPaymentMethod', `query($restaurant:String!,$starting_date:String!,$ending_date:String!){ getRestaurantDashboardOrderSalesDetailsByPaymentMethod(restaurant:$restaurant,starting_date:$starting_date,ending_date:$ending_date){ total_orders total_sales pickup_orders delivery_orders } }`, { restaurant: '{{restaurantId}}', starting_date: '2025-01-01', ending_date: '2025-12-31' }),
  req('getStoreDetailsByVendorId', `query($id:String!,$dateKeyword:String){ getStoreDetailsByVendorId(id:$id,dateKeyword:$dateKeyword){ _id restaurantName totalOrders totalSales pickUpCount deliveryCount } }`, { id: '{{vendorId}}', dateKeyword: 'All' }),
  req('getStoreDetailsByVendorIdPaginated', `query($id:String!,$page:Int,$limit:Int){ getStoreDetailsByVendorIdPaginated(id:$id,page:$page,limit:$limit){ totalCount data { _id restaurantName totalOrders totalSales } } }`, { id: '{{vendorId}}', page: 1, limit: 10 }),
  req('getVendorDashboardStatsCardDetails', `query($vendorId:String!,$starting_date:String!,$ending_date:String!){ getVendorDashboardStatsCardDetails(vendorId:$vendorId,starting_date:$starting_date,ending_date:$ending_date){ totalRestaurants totalOrders totalSales totalDeliveries } }`, { vendorId: '{{vendorId}}', starting_date: '2025-01-01', ending_date: '2025-12-31' }),
  req('getLiveMonitorData', `query($id:String!){ getLiveMonitorData(id:$id){ online_stores cancelled_orders delayed_orders ratings } }`, { id: '{{vendorId}}' }),
  req('getVendorDashboardGrowthDetailsByYear', `query($vendorId:String!,$year:Int!){ getVendorDashboardGrowthDetailsByYear(vendorId:$vendorId,year:$year){ totalRestaurants totalOrders totalSales } }`, { vendorId: '{{vendorId}}', year: new Date().getFullYear() }),
  req('metricsGeneral', `mutation { metricsGeneral { excellence topgun experience skydiver rider } }`, {}),
]);

const adminOrders = folder('14 · Orders & Dispatch', [
  req('allOrders', `query allOrders($page:Int){ allOrders(page:$page){ ${F.order} } }`, { page: 1 }, { capture: [['data.allOrders.0._id', 'orderId']] }),
  req('allOrdersPaginated', `query($page:Int,$rows:Int,$dateKeyword:String,$orderStatus:[String],$search:String,$restaurantId:ID,$riderId:ID){ allOrdersPaginated(page:$page,rows:$rows,dateKeyword:$dateKeyword,orderStatus:$orderStatus,search:$search,restaurantId:$restaurantId,riderId:$riderId){ totalCount currentPage totalPages orders { ${F.order} } } }`, { page: 1, rows: 10, dateKeyword: 'All', orderStatus: [], search: '' }),
  req('getActiveOrders', `query($restaurantId:String,$page:Int,$rowsPerPage:Int,$actions:[String],$search:String){ getActiveOrders(restaurantId:$restaurantId,page:$page,rowsPerPage:$rowsPerPage,actions:$actions,search:$search){ totalCount orders { ${F.order} } } }`, { page: 1, rowsPerPage: 10, actions: [], search: '' }),
  req('ordersByRestId', `query($restaurant:String!,$page:Int,$rows:Int,$search:String,$orderStatus:[String]){ ordersByRestId(restaurant:$restaurant,page:$page,rows:$rows,search:$search,orderStatus:$orderStatus){ totalCount orders { ${F.order} } } }`, { restaurant: '{{restaurantId}}', page: 1, rows: 10, search: '', orderStatus: [] }),
  req('order', `query order($id:String!){ order(id:$id){ ${F.order} } }`, { id: '{{orderId}}' }),
  req('orderDetails', `query orderDetails($id:String!){ orderDetails(id:$id){ ${F.order} deliveryAddress { deliveryAddress } } }`, { id: '{{orderId}}' }),
  req('orderFilterOptions', `query { orderFilterOptions { restaurants { _id name } riders { _id name } } }`, {}),
  req('updateOrderStatus', `mutation updateOrderStatus($id:String!,$status:String!){ updateOrderStatus(id:$id,status:$status){ _id orderStatus } }`, { id: '{{orderId}}', status: 'ACCEPTED' }),
  req('updateStatus', `mutation updateStatus($id:String!,$orderStatus:String!){ updateStatus(id:$id,orderStatus:$orderStatus){ _id orderStatus } }`, { id: '{{orderId}}', orderStatus: 'ACCEPTED' }),
  req('assignRider', `mutation assignRider($id:String!,$riderId:String!){ assignRider(id:$id,riderId:$riderId){ _id rider { _id name } orderStatus } }`, { id: '{{orderId}}', riderId: '{{riderId}}' }),
  req('muteRing', `mutation muteRing($orderId:String){ muteRing(orderId:$orderId) }`, { orderId: '{{orderId}}' }),
  subNote('subscriptionDispatcher', `subscriptionDispatcher { _id orderId orderStatus }`, {}),
  subNote('subscriptionZoneOrders', `subscriptionZoneOrders($zoneId:String!){ zoneId order { _id orderId } }`, { zoneId: '{{zoneId}}' }),
]);

const adminPayments = folder('15 · Payments / Withdraw / Earnings', [
  req('withdrawRequests', `query($userType:UserTypeEnum,$pagination:MoneyPaginationInput,$search:String){ withdrawRequests(userType:$userType,pagination:$pagination,search:$search){ success pagination { total } data { ${F.withdraw} rider { _id name } store { _id name } } } }`, { pagination: { pageSize: 10, pageNo: 1 }, search: '' }),
  req('storeCurrentWithdrawRequest', `query($storeId:String){ storeCurrentWithdrawRequest(storeId:$storeId){ ${F.withdraw} } }`, { storeId: '{{restaurantId}}' }),
  req('riderCurrentWithdrawRequest', `query($riderId:String){ riderCurrentWithdrawRequest(riderId:$riderId){ ${F.withdraw} } }`, { riderId: '{{riderId}}' }),
  req('storeEarningsGraph', `query($storeId:ID!,$page:Int,$limit:Int){ storeEarningsGraph(storeId:$storeId,page:$page,limit:$limit){ totalCount earnings { _id totalEarningsSum } } }`, { storeId: '{{restaurantId}}', page: 1, limit: 10 }),
  req('riderEarningsGraph', `query($riderId:ID!,$page:Int,$limit:Int){ riderEarningsGraph(riderId:$riderId,page:$page,limit:$limit){ totalCount earnings { _id totalEarningsSum totalDeliveries } } }`, { riderId: '{{riderId}}', page: 1, limit: 10 }),
  req('transactionHistory', `query($userType:UserTypeEnum,$pagination:MoneyPaginationInput){ transactionHistory(userType:$userType,pagination:$pagination){ pagination { total } data { _id transactionId status amountTransferred userType } } }`, { pagination: { pageSize: 10, pageNo: 1 } }),
  req('earnings', `query($userType:UserTypeEnum,$pagination:MoneyPaginationInput){ earnings(userType:$userType,pagination:$pagination){ success pagination { total } data { grandTotalEarnings { platformTotal riderTotal storeTotal } earnings { _id orderId orderType paymentMethod } } } }`, { pagination: { pageSize: 10, pageNo: 1 } }),
  req('createWithdrawRequest', `mutation($requestAmount:Float!,$restaurant:String,$userId:String){ createWithdrawRequest(requestAmount:$requestAmount,restaurant:$restaurant,userId:$userId){ ${F.withdraw} } }`, { requestAmount: 10, restaurant: '{{restaurantId}}' }),
  req('updateWithdrawReqStatus', `mutation($id:ID!,$status:String!){ updateWithdrawReqStatus(id:$id,status:$status){ success message data { _id status } } }`, { id: 'REPLACE_WITH_WITHDRAW_REQUEST_ID', status: 'TRANSFERRED' }),
]);

const adminReviews = folder('16 · Reviews', [
  req('reviewsByRestaurant', `query reviewsByRestaurant($restaurant:String!){ reviewsByRestaurant(restaurant:$restaurant){ reviews { ${F.review} } } }`, { restaurant: '{{restaurantId}}' }),
]);

const adminNotifications = folder('17 · Notifications', [
  req('notifications', `query { notifications { ${F.notification} } }`, {}),
  req('notificationsPaginated', `query($page:Int,$limit:Int,$search:String){ notificationsPaginated(page:$page,limit:$limit,search:$search){ totalCount data { ${F.notification} } } }`, { page: 1, limit: 10 }),
  req('webNotifications', `query { webNotifications { _id body navigateTo read createdAt } }`, {}),
  req('markWebNotificationsAsRead', `mutation { markWebNotificationsAsRead { _id read } }`, {}),
  req('sendNotificationUser', `mutation($notificationTitle:String,$notificationBody:String!){ sendNotificationUser(notificationTitle:$notificationTitle,notificationBody:$notificationBody) }`, { notificationTitle: 'QA', notificationBody: 'QA broadcast' }),
  req('saveNotificationTokenWeb', `mutation($token:String!){ saveNotificationTokenWeb(token:$token){ success message } }`, { token: 'fcm-web-token-123' }),
]);

const adminSupport = folder('18 · Support Tickets', [
  req('getTicketUsersWithLatest', `query($input:FiltersInput){ getTicketUsersWithLatest(input:$input){ docsCount totalPages currentPage users { _id name userType latestTicket { _id title status } } } }`, { input: { page: 1, limit: 10 } }),
  req('getTicketUsers', `query($input:FiltersInput){ getTicketUsers(input:$input){ docsCount users { _id name userType } } }`, { input: { page: 1, limit: 10 } }),
  req('getSingleUserSupportTickets', `query($input:SingleUserSupportTicketsInput!){ getSingleUserSupportTickets(input:$input){ docsCount tickets { ${F.ticket} } } }`, { input: { userId: '{{userId}}', filters: { page: 1, limit: 10 } } }),
  req('getSingleSupportTicket', `query($ticketId:ID!){ getSingleSupportTicket(ticketId:$ticketId){ ${F.ticket} } }`, { ticketId: '{{ticketId}}' }),
  req('getTicketMessages', `query($input:TicketMessagesInput!){ getTicketMessages(input:$input){ page totalPages docsCount messages { ${F.ticketMsg} } ticket { _id title status } } }`, { input: { ticket: '{{ticketId}}', page: 1, limit: 20 } }),
  req('createMessage', `mutation($messageInput:MessageInput!){ createMessage(messageInput:$messageInput){ ${F.ticketMsg} } }`, { messageInput: { content: 'Admin reply', ticket: '{{ticketId}}' } }),
  req('updateSupportTicketStatus', `mutation($input:UpdateSupportTicketInput!){ updateSupportTicketStatus(input:$input){ _id status } }`, { input: { ticketId: '{{ticketId}}', status: 'closed' } }),
]);

const adminUpload = folder('19 · Upload', [
  req('uploadImageToS3', `mutation uploadImageToS3($image:String!){ uploadImageToS3(image:$image){ imageUrl } }`, { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }),
]);

const adminCollection = collection(
  'Enatega Backend · Admin',
  'Admin dashboard (enatega-multivendor-admin) GraphQL surface. Auth via ownerLogin. Run "01 · Auth" first, then the list queries auto-populate ids for the rest.',
  [adminAuth, adminVendors, adminUsers, adminRestaurants, adminMenu, adminRiders, adminStaff, adminZones, adminCoupons, adminBanners, adminCuisinesShop, adminConfig, adminDashboard, adminOrders, adminPayments, adminReviews, adminNotifications, adminSupport, adminUpload],
  [
    { key: 'refreshToken' }, { key: 'ownerId' }, { key: 'vendorId' }, { key: 'userId' }, { key: 'restaurantId' },
    { key: 'categoryId' }, { key: 'foodId' }, { key: 'addonId' }, { key: 'riderId' }, { key: 'staffId' },
    { key: 'zoneId' }, { key: 'couponId' }, { key: 'bannerId' }, { key: 'cuisineId' }, { key: 'shopTypeId' },
    { key: 'orderId' }, { key: 'ticketId' },
  ]
);

/* =============================================================== CUSTOMER (shared builder for web + app) */

function customerAuthFolder(extra) {
  const items = [
    req(
      'login',
      `mutation login($email:String,$password:String,$type:String!){ login(email:$email,password:$password,type:$type){ userId token tokenExpiration name email phone isActive isNewUser } }`,
      { email: 'customer@enatega.local', password: 'Customer@123', type: 'default' },
      { noAuth: true, capture: [['data.login.token', 'token'], ['data.login.userId', 'userId']] }
    ),
    req(
      'createUser',
      `mutation createUser($userInput:UserInput!){ createUser(userInput:$userInput){ userId token name email phone isNewUser } }`,
      { userInput: { name: 'QA Customer', email: `qa.customer.${Date.now()}@enatega.local`, phone: `+1555${String(Date.now()).slice(-7)}`, password: 'Customer@123', emailIsVerified: true } },
      { noAuth: true }
    ),
    req('profile', `query { profile { ${F.user} } }`, {}, { capture: [['data.profile._id', 'userId'], ['data.profile.addresses.0._id', 'addressId']] }),
    req('updateUser', `mutation updateUser($updateUserInput:UpdateUserInput!){ updateUser(updateUserInput:$updateUserInput){ _id name phone phoneIsVerified } }`, { updateUserInput: { name: 'QA Customer', phone: '+15550000001', phoneIsVerified: true } }),
    req('changePassword', `mutation($oldPassword:String!,$newPassword:String!){ changePassword(oldPassword:$oldPassword,newPassword:$newPassword) }`, { oldPassword: 'Customer@123', newPassword: 'Customer@123' }),
    req('emailExist', `mutation emailExist($email:String!){ emailExist(email:$email) }`, { email: 'customer@enatega.local' }, { noAuth: true }),
    req('phoneExist', `mutation phoneExist($phone:String!){ phoneExist(phone:$phone) }`, { phone: '+15550000001' }, { noAuth: true }),
    req('sendOtpToEmail', `mutation sendOtpToEmail($email:String!){ sendOtpToEmail(email:$email){ result } }`, { email: 'customer@enatega.local' }, { noAuth: true }),
    req('sendOtpToPhoneNumber', `mutation sendOtpToPhoneNumber($phone:String!){ sendOtpToPhoneNumber(phone:$phone){ result } }`, { phone: '+15550000001' }, { noAuth: true }),
    req('verifyOtp', `mutation verifyOtp($otp:String!,$email:String,$phone:String){ verifyOtp(otp:$otp,email:$email,phone:$phone){ result } }`, { otp: '1234', email: 'customer@enatega.local' }, { noAuth: true }),
    req('forgotPassword', `mutation forgotPassword($email:String!){ forgotPassword(email:$email){ result } }`, { email: 'customer@enatega.local' }, { noAuth: true }),
    req('resetPassword', `mutation resetPassword($password:String!,$email:String!,$otp:String!){ resetPassword(password:$password,email:$email,otp:$otp){ result } }`, { password: 'Customer@123', email: 'customer@enatega.local', otp: '1234' }, { noAuth: true }),
    req('Deactivate', `mutation Deactivate($isActive:Boolean!,$email:String!){ Deactivate(isActive:$isActive,email:$email){ isActive } }`, { isActive: true, email: 'customer@enatega.local' }),
  ];
  return folder('01 · Auth & Profile', items.concat(extra || []));
}

const customerConfigFolder = folder('02 · Config & Discovery', [
  req('configuration', `query { configuration { ${F.config} googleMapsApiKey currencySymbol } }`, {}, { noAuth: true }),
  req('cuisines', `query { cuisines { ${F.cuisine} } }`, {}, { noAuth: true }),
  req('fetchAllShopTypes', `query { fetchAllShopTypes { data { ${F.shopType} } } }`, {}, { noAuth: true }),
  req('banners', `query { banners { ${F.banner} } }`, {}, { noAuth: true }),
  req('zones', `query { zones { ${F.zone} location { coordinates } } }`, {}, { noAuth: true }),
]);

const customerRestaurantsFolder = folder('03 · Restaurants', [
  req('nearByRestaurants', `query nearByRestaurants($latitude:Float,$longitude:Float,$shopType:String){ nearByRestaurants(latitude:$latitude,longitude:$longitude,shopType:$shopType){ offers sections restaurants { ${F.restaurant} } } }`, { latitude: 37.7749, longitude: -122.4194 }, { noAuth: true, capture: [['data.nearByRestaurants.restaurants.0._id', 'restaurantId']] }),
  req('nearByRestaurantsPreview', `query($latitude:Float,$longitude:Float,$shopType:String,$page:Int,$limit:Int){ nearByRestaurantsPreview(latitude:$latitude,longitude:$longitude,shopType:$shopType,page:$page,limit:$limit){ ${F.restaurantPreview} } }`, { latitude: 37.7749, longitude: -122.4194, page: 1, limit: 10 }, { noAuth: true }),
  req('recentOrderRestaurantsPreview', `query($latitude:Float!,$longitude:Float!){ recentOrderRestaurantsPreview(latitude:$latitude,longitude:$longitude){ ${F.restaurantPreview} } }`, { latitude: 37.7749, longitude: -122.4194 }),
  req('mostOrderedRestaurantsPreview', `query($latitude:Float!,$longitude:Float!,$page:Int,$limit:Int){ mostOrderedRestaurantsPreview(latitude:$latitude,longitude:$longitude,page:$page,limit:$limit){ ${F.restaurantPreview} } }`, { latitude: 37.7749, longitude: -122.4194, page: 1, limit: 10 }, { noAuth: true }),
  req('topRatedVendorsPreview', `query($latitude:Float,$longitude:Float,$page:Int,$limit:Int){ topRatedVendorsPreview(latitude:$latitude,longitude:$longitude,page:$page,limit:$limit){ ${F.restaurantPreview} } }`, { latitude: 37.7749, longitude: -122.4194, page: 1, limit: 10 }, { noAuth: true }),
  req('nearByRestaurantsCuisines', `query($latitude:Float,$longitude:Float){ nearByRestaurantsCuisines(latitude:$latitude,longitude:$longitude){ ${F.cuisine} } }`, { latitude: 37.7749, longitude: -122.4194 }, { noAuth: true }),
  req('restaurant', `query restaurant($id:String){ restaurant(id:$id){ ${F.restaurant} categories { _id title foods { _id title variations { _id title price } } } addons { _id title } options { _id title } reviewData { total ratings } } }`, { id: '{{restaurantId}}' }, { noAuth: true, capture: [['data.restaurant.categories.0.foods.0._id', 'foodId'], ['data.restaurant.categories.0.foods.0.variations.0._id', 'variationId']] }),
  req('popularFoodItems', `query popularFoodItems($restaurantId:String!){ popularFoodItems(restaurantId:$restaurantId){ ${F.food} } }`, { restaurantId: '{{restaurantId}}' }, { noAuth: true }),
  req('userFavourite', `query userFavourite($latitude:Float,$longitude:Float){ userFavourite(latitude:$latitude,longitude:$longitude){ ${F.restaurant} } }`, { latitude: 37.7749, longitude: -122.4194 }),
]);

const customerAddressFolder = folder('04 · Addresses & Favourites', [
  req('createAddress', `mutation createAddress($addressInput:AddressInput!){ createAddress(addressInput:$addressInput){ _id addresses { _id label deliveryAddress selected } } }`, { addressInput: ADDRESS_INPUT }, { capture: [['data.createAddress.addresses.0._id', 'addressId']] }),
  req('editAddress', `mutation editAddress($addressInput:AddressInput!){ editAddress(addressInput:$addressInput){ _id addresses { _id label selected } } }`, { addressInput: { _id: '{{addressId}}', ...ADDRESS_INPUT, label: 'Work' } }),
  req('selectAddress', `mutation selectAddress($id:String!){ selectAddress(id:$id){ _id addresses { _id selected } } }`, { id: '{{addressId}}' }),
  req('deleteAddress', `mutation deleteAddress($id:ID!){ deleteAddress(id:$id){ _id addresses { _id } } }`, { id: '{{addressId}}' }),
  req('deleteBulkAddresses', `mutation deleteBulkAddresses($ids:[ID!]!){ deleteBulkAddresses(ids:$ids){ _id } }`, { ids: ['{{addressId}}'] }),
  req('addFavourite', `mutation addFavourite($id:ID!){ addFavourite(id:$id){ _id favourite } }`, { id: '{{restaurantId}}' }),
]);

const customerOrdersFolder = folder('05 · Orders', [
  req('coupon', `mutation coupon($coupon:String!,$restaurantId:ID!){ coupon(coupon:$coupon,restaurantId:$restaurantId){ success message coupon { _id title discount } } }`, { coupon: 'WELCOME10', restaurantId: '{{restaurantId}}' }),
  req(
    'placeOrder',
    `mutation placeOrder($restaurant:String!,$orderInput:[OrderItemInput!]!,$paymentMethod:String!,$couponCode:String,$tipping:Float!,$taxationAmount:Float!,$address:AddressInput!,$orderDate:String!,$isPickedUp:Boolean!,$deliveryCharges:Float!,$instructions:String){ placeOrder(restaurant:$restaurant,orderInput:$orderInput,paymentMethod:$paymentMethod,couponCode:$couponCode,tipping:$tipping,taxationAmount:$taxationAmount,address:$address,orderDate:$orderDate,isPickedUp:$isPickedUp,deliveryCharges:$deliveryCharges,instructions:$instructions){ ${F.order} } }`,
    {
      restaurant: '{{restaurantId}}',
      orderInput: [{ food: '{{foodId}}', quantity: 1, variation: '{{variationId}}', addons: [], specialInstructions: 'No onions' }],
      paymentMethod: 'COD',
      couponCode: null,
      tipping: 2,
      taxationAmount: 1,
      address: ADDRESS_INPUT,
      orderDate: new Date(Date.now() + 3600000).toISOString(),
      isPickedUp: false,
      deliveryCharges: 3.5,
      instructions: 'Ring the bell',
    },
    { capture: [['data.placeOrder._id', 'orderId']] }
  ),
  req('orders', `query orders($offset:Int){ orders(offset:$offset){ ${F.order} } }`, { offset: 0 }, { capture: [['data.orders.0._id', 'orderId']] }),
  req('getUsersActiveOrders', `query($page:Int,$limit:Int,$offset:Int){ getUsersActiveOrders(page:$page,limit:$limit,offset:$offset){ ${F.order} } }`, { page: 1, limit: 10, offset: 0 }),
  req('getUsersPastOrders', `query($page:Int,$limit:Int,$offset:Int){ getUsersPastOrders(page:$page,limit:$limit,offset:$offset){ ${F.order} } }`, { page: 1, limit: 10, offset: 0 }),
  req('order', `query order($id:String!){ order(id:$id){ ${F.order} } }`, { id: '{{orderId}}' }),
  req('orderDetails', `query orderDetails($id:String!){ orderDetails(id:$id){ ${F.order} deliveryAddress { deliveryAddress location { coordinates } } } }`, { id: '{{orderId}}' }),
  req('abortOrder', `mutation abortOrder($id:String!){ abortOrder(id:$id){ _id orderStatus } }`, { id: '{{orderId}}' }),
  req('reviewOrder', `mutation reviewOrder($reviewInput:ReviewInput!){ reviewOrder(reviewInput:$reviewInput){ _id review { _id rating } } }`, { reviewInput: { order: '{{orderId}}', rating: 5, description: 'Great', comments: 'Fast delivery' } }),
]);

const customerChatFolder = folder('06 · Chat with Rider', [
  req('chat', `query chat($order:ID!){ chat(order:$order){ id message image createdAt user { id name } } }`, { order: '{{orderId}}' }),
  req('sendChatMessage', `mutation($orderId:ID!,$message:ChatMessageInput!){ sendChatMessage(orderId:$orderId,message:$message){ success message data { id message } } }`, { orderId: '{{orderId}}', message: { message: 'Where are you?', user: { id: '{{userId}}', name: 'QA Customer' } } }),
]);

const customerSupportFolder = folder('07 · Support Tickets', [
  req('createSupportTicket', `mutation($ticketInput:SupportTicketInput!){ createSupportTicket(ticketInput:$ticketInput){ ${F.ticket} } }`, { ticketInput: { title: 'App issue', description: 'Something broke', category: 'ORDER', userType: 'CUSTOMER', orderId: '{{orderId}}' } }, { capture: [['data.createSupportTicket._id', 'ticketId']] }),
  req('getSingleUserSupportTickets', `query($input:SingleUserSupportTicketsInput!){ getSingleUserSupportTickets(input:$input){ docsCount tickets { ${F.ticket} } } }`, { input: { userId: '{{userId}}', filters: { page: 1, limit: 10 } } }),
  req('getSingleSupportTicket', `query($ticketId:ID!){ getSingleSupportTicket(ticketId:$ticketId){ ${F.ticket} } }`, { ticketId: '{{ticketId}}' }),
  req('getTicketMessages', `query($input:TicketMessagesInput!){ getTicketMessages(input:$input){ docsCount messages { ${F.ticketMsg} } } }`, { input: { ticket: '{{ticketId}}', page: 1, limit: 20 } }),
  req('createMessage', `mutation($messageInput:MessageInput!){ createMessage(messageInput:$messageInput){ ${F.ticketMsg} } }`, { messageInput: { content: 'Any update?', ticket: '{{ticketId}}' } }),
]);

const customerSubsFolder = folder('08 · Subscriptions (reference)', [
  subNote('orderStatusChanged', `orderStatusChanged($userId:String!){ userId order { _id orderStatus } }`, { userId: '{{userId}}' }),
  subNote('subscriptionOrder', `subscriptionOrder($id:String!){ _id orderStatus }`, { id: '{{orderId}}' }),
  subNote('subscriptionRiderLocation', `subscriptionRiderLocation($riderId:String!){ _id location { coordinates } }`, { riderId: '{{riderId}}' }),
  subNote('subscriptionNewMessage', `subscriptionNewMessage($order:ID!){ id message user { id name } }`, { order: '{{orderId}}' }),
]);

const customerExtraVars = [
  { key: 'userId' }, { key: 'restaurantId' }, { key: 'foodId' }, { key: 'variationId' },
  { key: 'addressId' }, { key: 'orderId' }, { key: 'ticketId' }, { key: 'riderId' },
];

/* ---- Web collection ---- */
const webCollection = collection(
  'Enatega Backend · Customer Web',
  'Customer ordering website (enatega-multivendor-web). Auth via login(type:"default"). Public discovery queries need no token.',
  [
    customerAuthFolder([
      req('saveNotificationTokenWeb', `mutation($token:String!){ saveNotificationTokenWeb(token:$token){ success message } }`, { token: 'fcm-web-token-123' }),
    ]),
    customerConfigFolder,
    customerRestaurantsFolder,
    customerAddressFolder,
    customerOrdersFolder,
    customerChatFolder,
    customerSupportFolder,
    customerSubsFolder,
  ],
  customerExtraVars
);

/* ---- Customer app collection ---- */
const appCollection = collection(
  'Enatega Backend · Customer App',
  'Customer mobile app (enatega-multivendor-app). Auth via login(type:"default" | "google" | "apple"). Superset of the web customer surface (push tokens, favourites, notification prefs, social login).',
  [
    customerAuthFolder([
      req('login (google)', `mutation login($email:String,$type:String!,$name:String){ login(email:$email,type:$type,name:$name){ userId token isNewUser } }`, { email: `qa.google.${Date.now()}@gmail.com`, type: 'google', name: 'QA Google' }, { noAuth: true }),
      req('login (apple)', `mutation login($appleId:String,$type:String!,$name:String){ login(appleId:$appleId,type:$type,name:$name){ userId token isNewUser } }`, { appleId: `apple-${Date.now()}`, type: 'apple', name: 'QA Apple' }, { noAuth: true }),
      req('pushToken', `mutation pushToken($token:String){ pushToken(token:$token){ _id notificationToken } }`, { token: 'ExponentPushToken[qa-123]' }),
      req('updateNotificationStatus', `mutation($offerNotification:Boolean!,$orderNotification:Boolean!){ updateNotificationStatus(offerNotification:$offerNotification,orderNotification:$orderNotification){ _id isOrderNotification isOfferNotification } }`, { offerNotification: true, orderNotification: true }),
    ]),
    customerConfigFolder,
    customerRestaurantsFolder,
    customerAddressFolder,
    customerOrdersFolder,
    customerChatFolder,
    customerSupportFolder,
    customerSubsFolder,
  ],
  customerExtraVars
);

/* =============================================================== RIDER */

const riderCollection = collection(
  'Enatega Backend · Rider',
  'Rider app (enatega-multivendor-rider). Auth via riderLogin (username = "rider1", not email).',
  [
    folder('01 · Auth & Profile', [
      req('riderLogin', `mutation riderLogin($username:String,$password:String,$timeZone:String!,$notificationToken:String){ riderLogin(username:$username,password:$password,timeZone:$timeZone,notificationToken:$notificationToken){ userId token tokenExpiration name email phone isActive } }`, { username: 'rider1', password: 'Rider@123', timeZone: 'America/Los_Angeles' }, { noAuth: true, capture: [['data.riderLogin.token', 'token'], ['data.riderLogin.userId', 'riderId']] }),
      req('profile', `query { profile { _id name email phone } }`, {}, { capture: [['data.profile._id', 'riderId']] }),
      req('configuration', `query { configuration { ${F.config} googleMapsApiKey } }`, {}),
    ]),
    folder('02 · Orders', [
      req('riderOrders', `query { riderOrders { ${F.order} } }`, {}, { capture: [['data.riderOrders.0._id', 'orderId']] }),
      req('order', `query order($id:String!){ order(id:$id){ ${F.order} } }`, { id: '{{orderId}}' }),
      req('orderDetails', `query orderDetails($id:String!){ orderDetails(id:$id){ ${F.order} deliveryAddress { deliveryAddress location { coordinates } } } }`, { id: '{{orderId}}' }),
      req('assignOrder', `mutation assignOrder($id:String!){ assignOrder(id:$id){ _id rider { _id name } orderStatus } }`, { id: '{{orderId}}' }),
      req('updateOrderStatusRider (PICKED)', `mutation($id:String!,$status:String!){ updateOrderStatusRider(id:$id,status:$status){ _id orderStatus isPickedUp } }`, { id: '{{orderId}}', status: 'PICKED' }),
      req('updateOrderStatusRider (DELIVERED)', `mutation($id:String!,$status:String!){ updateOrderStatusRider(id:$id,status:$status){ _id orderStatus } }`, { id: '{{orderId}}', status: 'DELIVERED' }),
    ]),
    folder('03 · Rider Status & Schedule', [
      req('updateRiderLocation', `mutation($latitude:String!,$longitude:String!){ updateRiderLocation(latitude:$latitude,longitude:$longitude){ _id location { coordinates } } }`, { latitude: '37.7749', longitude: '-122.4194' }),
      req('updateRiderLicenseDetails', `mutation($id:String!,$licenseDetails:LicenseDetailsInput){ updateRiderLicenseDetails(id:$id,licenseDetails:$licenseDetails){ _id licenseDetails { number expiryDate } } }`, { id: '{{riderId}}', licenseDetails: { number: 'LIC-1001', expiryDate: '2027-01-01' } }),
      req('updateRiderVehicleDetails', `mutation($id:String!,$vehicleDetails:VehicleDetailsInput){ updateRiderVehicleDetails(id:$id,vehicleDetails:$vehicleDetails){ _id vehicleDetails { number } } }`, { id: '{{riderId}}', vehicleDetails: { number: 'MC-1001' } }),
      req('updateRiderBussinessDetails', `mutation($id:String!,$bussinessDetails:BussinessDetailsInput){ updateRiderBussinessDetails(id:$id,bussinessDetails:$bussinessDetails){ _id bussinessDetails { bankName accountNumber } } }`, { id: '{{riderId}}', bussinessDetails: { bankName: 'Sample Bank', accountName: 'Alex Rider', accountNumber: '000999', accountCode: '001' } }),
      req('updateWorkSchedule', `mutation($riderId:String!,$workSchedule:[DayScheduleInput!]!,$timeZone:String!){ updateWorkSchedule(riderId:$riderId,workSchedule:$workSchedule,timeZone:$timeZone){ _id workSchedule { day enabled } } }`, { riderId: '{{riderId}}', timeZone: 'America/Los_Angeles', workSchedule: [{ day: 'MON', enabled: true, slots: [{ startTime: '09:00', endTime: '17:00' }] }] }),
    ]),
    folder('04 · Earnings & Withdraw', [
      req('riderEarningsGraph', `query($riderId:ID!,$page:Int,$limit:Int){ riderEarningsGraph(riderId:$riderId,page:$page,limit:$limit){ totalCount earnings { _id totalEarningsSum totalTipsSum totalDeliveries } } }`, { riderId: '{{riderId}}', page: 1, limit: 10 }),
      req('riderCurrentWithdrawRequest', `query($riderId:String){ riderCurrentWithdrawRequest(riderId:$riderId){ ${F.withdraw} } }`, { riderId: '{{riderId}}' }),
      req('transactionHistory', `query($userType:UserTypeEnum,$userId:String,$pagination:MoneyPaginationInput){ transactionHistory(userType:$userType,userId:$userId,pagination:$pagination){ pagination { total } data { _id transactionId status amountTransferred } } }`, { userType: 'RIDER', userId: '{{riderId}}', pagination: { pageSize: 10, pageNo: 1 } }),
      req('earnings', `query($userId:String,$userType:UserTypeEnum,$pagination:MoneyPaginationInput){ earnings(userId:$userId,userType:$userType,pagination:$pagination){ success pagination { total } data { grandTotalEarnings { riderTotal } earnings { _id orderId } } } }`, { userId: '{{riderId}}', userType: 'RIDER', pagination: { pageSize: 10, pageNo: 1 } }),
      req('createWithdrawRequest', `mutation($requestAmount:Float!,$userId:String){ createWithdrawRequest(requestAmount:$requestAmount,userId:$userId){ ${F.withdraw} } }`, { requestAmount: 10, userId: '{{riderId}}' }),
    ]),
    folder('05 · Chat', [
      req('chat', `query chat($order:ID!){ chat(order:$order){ id message createdAt user { id name } } }`, { order: '{{orderId}}' }),
      req('sendChatMessage', `mutation($orderId:ID!,$message:ChatMessageInput!){ sendChatMessage(orderId:$orderId,message:$message){ success data { id message } } }`, { orderId: '{{orderId}}', message: { message: 'On my way', user: { id: '{{riderId}}', name: 'Alex Rider' } } }),
    ]),
    folder('06 · Subscriptions (reference)', [
      subNote('subscriptionAssignRider', `subscriptionAssignRider($riderId:String!){ origin order { _id orderId } }`, { riderId: '{{riderId}}' }),
      subNote('subscriptionRiderLocation', `subscriptionRiderLocation($riderId:String!){ _id location { coordinates } }`, { riderId: '{{riderId}}' }),
      subNote('riderUpdated', `riderUpdated { _id }`, {}),
      subNote('subscriptionOrder', `subscriptionOrder($id:String!){ _id orderStatus }`, { id: '{{orderId}}' }),
    ]),
  ],
  [{ key: 'riderId' }, { key: 'orderId' }]
);

/* =============================================================== STORE (Vendor) */

const storeCollection = collection(
  'Enatega Backend · Store (Vendor)',
  'Restaurant/store app (enatega-multivendor-store). Auth via restaurantLogin (username = "FalafelTmeer@yopmail.com" / "Yalla0014yalla0014@"); returns an owner (VENDOR) token + restaurantId.',
  [
    folder('01 · Auth & Store Profile', [
      req('restaurantLogin', `mutation restaurantLogin($username:String!,$password:String!,$notificationToken:String){ restaurantLogin(username:$username,password:$password,notificationToken:$notificationToken){ token restaurantId } }`, { username: 'FalafelTmeer@yopmail.com', password: 'Yalla0014yalla0014@' }, { noAuth: true, capture: [['data.restaurantLogin.token', 'token'], ['data.restaurantLogin.restaurantId', 'restaurantId']] }),
      req('profile (owner)', `query { profile { _id name email } }`, {}, { description: 'restaurantLogin returns an owner (VENDOR) token; this resolves the owner user id used by the vendor dashboard / support queries.', capture: [['data.profile._id', 'ownerId']] }),
      req('restaurant', `query restaurant($id:String){ restaurant(id:$id){ ${F.restaurant} logo commissionRate tax currentWalletAmount totalWalletAmount openingTimes { day times { startTime endTime } } bussinessDetails { bankName accountNumber } } }`, { id: '{{restaurantId}}' }),
      req('configuration', `query { configuration { ${F.config} currencySymbol googleMapsApiKey } }`, {}),
      req('editRestaurant', `mutation editRestaurant($restaurant:RestaurantProfileInput!){ editRestaurant(restaurant:$restaurant){ ${F.restaurant} } }`, { restaurant: { _id: '{{restaurantId}}', name: 'Sample Restaurant', phone: '+15550003333', address: '123 Main St, San Francisco, CA', deliveryTime: 30, minimumOrder: 10, isAvailable: true } }),
      req('toggleStoreAvailability', `mutation toggleStoreAvailability($restaurantId:String!){ toggleStoreAvailability(restaurantId:$restaurantId){ _id isAvailable } }`, { restaurantId: '{{restaurantId}}' }),
      req('saveRestaurantToken', `mutation saveRestaurantToken($token:String,$isEnabled:Boolean){ saveRestaurantToken(token:$token,isEnabled:$isEnabled){ _id notificationToken enableNotification } }`, { token: 'fcm-store-token-123', isEnabled: true }),
      req('updateTimings', `mutation updateTimings($id:String!,$openingTimes:[TimingsInput]){ updateTimings(id:$id,openingTimes:$openingTimes){ _id openingTimes { day } } }`, { id: '{{restaurantId}}', openingTimes: [{ day: 'MON', times: [{ startTime: ['09', '00'], endTime: ['22', '00'] }] }] }),
      req('updateRestaurantBussinessDetails', `mutation($id:String!,$bussinessDetails:BussinessDetailsInput){ updateRestaurantBussinessDetails(id:$id,bussinessDetails:$bussinessDetails){ success message } }`, { id: '{{restaurantId}}', bussinessDetails: { bankName: 'Sample Bank', accountName: 'Sample Vendor', accountNumber: '000123456', accountCode: '001', taxRate: 5 } }),
      req('updateDeliveryBoundsAndLocation', `mutation($id:ID!,$boundType:String!,$circleBounds:CircleBoundsInput,$location:CoordinatesInput!,$address:String,$city:String,$postCode:String){ updateDeliveryBoundsAndLocation(id:$id,boundType:$boundType,circleBounds:$circleBounds,location:$location,address:$address,city:$city,postCode:$postCode){ success message } }`, { id: '{{restaurantId}}', boundType: 'radius', circleBounds: { radius: 5000 }, location: { latitude: 37.7749, longitude: -122.4194 }, address: '123 Main St', city: 'San Francisco', postCode: '94103' }),
      req('getRestaurantDeliveryZoneInfo', `query($id:ID!){ getRestaurantDeliveryZoneInfo(id:$id){ boundType address city postCode circleBounds { radius } location { coordinates } } }`, { id: '{{restaurantId}}' }),
    ]),
    folder('02 · Orders', [
      req('restaurantOrders', `query { restaurantOrders { ${F.order} } }`, {}, { capture: [['data.restaurantOrders.0._id', 'orderId']] }),
      req('ordersByRestId', `query($restaurant:String!,$page:Int,$rows:Int,$search:String,$orderStatus:[String]){ ordersByRestId(restaurant:$restaurant,page:$page,rows:$rows,search:$search,orderStatus:$orderStatus){ totalCount orders { ${F.order} } } }`, { restaurant: '{{restaurantId}}', page: 1, rows: 10, search: '', orderStatus: [] }),
      req('getActiveOrders', `query($restaurantId:String,$page:Int,$rowsPerPage:Int){ getActiveOrders(restaurantId:$restaurantId,page:$page,rowsPerPage:$rowsPerPage){ totalCount orders { ${F.order} } } }`, { restaurantId: '{{restaurantId}}', page: 1, rowsPerPage: 10 }),
      req('order', `query order($id:String!){ order(id:$id){ ${F.order} } }`, { id: '{{orderId}}' }),
      req('orderDetails', `query orderDetails($id:String!){ orderDetails(id:$id){ ${F.order} deliveryAddress { deliveryAddress } } }`, { id: '{{orderId}}' }),
      req('acceptOrder', `mutation acceptOrder($_id:String!,$time:String){ acceptOrder(_id:$_id,time:$time){ _id orderStatus acceptedAt preparationTime } }`, { _id: '{{orderId}}', time: '20' }),
      req('orderPickedUp', `mutation orderPickedUp($_id:String!){ orderPickedUp(_id:$_id){ _id orderStatus isPickedUp pickedAt } }`, { _id: '{{orderId}}' }),
      req('cancelOrder', `mutation cancelOrder($_id:String!,$reason:String!){ cancelOrder(_id:$_id,reason:$reason){ _id orderStatus reason cancelledAt } }`, { _id: '{{orderId}}', reason: 'Out of stock' }),
      req('updateOrderStatus', `mutation updateOrderStatus($id:String!,$status:String!){ updateOrderStatus(id:$id,status:$status){ _id orderStatus } }`, { id: '{{orderId}}', status: 'ACCEPTED' }),
      req('assignRider', `mutation assignRider($id:String!,$riderId:String!){ assignRider(id:$id,riderId:$riderId){ _id rider { _id name } } }`, { id: '{{orderId}}', riderId: '{{riderId}}' }),
      req('muteRing', `mutation muteRing($orderId:String){ muteRing(orderId:$orderId) }`, { orderId: '{{orderId}}' }),
    ]),
    folder('03 · Menu Management', [
      req('restaurantCategoriesPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantCategoriesPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { _id title foods { _id title } } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }, { capture: [['data.restaurantCategoriesPaginated.data.0._id', 'categoryId'], ['data.restaurantCategoriesPaginated.data.0.foods.0._id', 'foodId']] }),
      req('restaurantOptionsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantOptionsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { ${F.option} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }),
      req('restaurantAddonsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int,$search:String){ restaurantAddonsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit,search:$search){ totalCount data { ${F.addon} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10, search: '' }, { capture: [['data.restaurantAddonsPaginated.data.0._id', 'addonId']] }),
      req('popularFoodItems', `query popularFoodItems($restaurantId:String!){ popularFoodItems(restaurantId:$restaurantId){ ${F.food} } }`, { restaurantId: '{{restaurantId}}' }),
      req('subCategoriesByParentId', `query($parentCategoryId:String!){ subCategoriesByParentId(parentCategoryId:$parentCategoryId){ _id title parentCategoryId } }`, { parentCategoryId: '{{categoryId}}' }),
      req('createCategory', `mutation createCategory($category:CategoryInput!){ createCategory(category:$category){ _id categories { _id title } } }`, { category: { title: 'QA Category', restaurant: '{{restaurantId}}' } }),
      req('editCategory', `mutation editCategory($category:CategoryInput!){ editCategory(category:$category){ _id } }`, { category: { _id: '{{categoryId}}', title: 'Burgers', restaurant: '{{restaurantId}}' } }),
      req('deleteCategory', `mutation deleteCategory($id:String!,$restaurant:String!){ deleteCategory(id:$id,restaurant:$restaurant){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_CATEGORY_ID', restaurant: '{{restaurantId}}' }),
      req('createFood', `mutation createFood($foodInput:FoodInput!){ createFood(foodInput:$foodInput){ _id } }`, { foodInput: { restaurant: '{{restaurantId}}', title: 'QA Item', description: 'Test', category: '{{categoryId}}', variations: [{ title: 'Regular', price: 9.99 }] } }),
      req('editFood', `mutation editFood($foodInput:FoodInput!){ editFood(foodInput:$foodInput){ _id } }`, { foodInput: { _id: '{{foodId}}', restaurant: '{{restaurantId}}', title: 'Classic Burger', category: '{{categoryId}}', variations: [{ title: 'Regular', price: 8.99 }] } }),
      req('updateFoodOutOfStock', `mutation($id:String!,$restaurant:String!,$categoryId:String!){ updateFoodOutOfStock(id:$id,restaurant:$restaurant,categoryId:$categoryId) }`, { id: '{{foodId}}', restaurant: '{{restaurantId}}', categoryId: '{{categoryId}}' }),
      req('deleteFood', `mutation deleteFood($id:String!,$restaurant:String!,$categoryId:String!){ deleteFood(id:$id,restaurant:$restaurant,categoryId:$categoryId){ _id } }`, { id: 'REPLACE_WITH_DISPOSABLE_FOOD_ID', restaurant: '{{restaurantId}}', categoryId: '{{categoryId}}' }),
      req('createAddon', `mutation createAddon($addonInput:AddonInput!){ createAddon(addonInput:$addonInput){ ${F.addon} } }`, { addonInput: { restaurant: '{{restaurantId}}', title: 'QA Addon', quantityMinimum: 0, quantityMaximum: 2, options: [{ title: 'Extra', price: 1 }] } }),
      req('editAddon', `mutation editAddon($addonInput:AddonInput!){ editAddon(addonInput:$addonInput){ ${F.addon} } }`, { addonInput: { _id: '{{addonId}}', restaurant: '{{restaurantId}}', title: 'Extra Toppings', quantityMinimum: 0, quantityMaximum: 3 } }),
      req('deleteAddon', `mutation deleteAddon($id:String!,$restaurant:String!){ deleteAddon(id:$id,restaurant:$restaurant) }`, { id: 'REPLACE_WITH_DISPOSABLE_ADDON_ID', restaurant: '{{restaurantId}}' }),
      req('createSubCategories', `mutation createSubCategories($subCategories:[SubCategoryInput!]!){ createSubCategories(subCategories:$subCategories) }`, { subCategories: [{ title: 'QA Sub', parentCategoryId: '{{categoryId}}' }] }),
      req('uploadImageToS3', `mutation uploadImageToS3($image:String!){ uploadImageToS3(image:$image){ imageUrl } }`, { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }),
    ]),
    folder('04 · Coupons', [
      req('restaurantCoupons', `query restaurantCoupons($restaurantId:String!){ restaurantCoupons(restaurantId:$restaurantId){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}' }, { capture: [['data.restaurantCoupons.0._id', 'couponId']] }),
      req('restaurantCouponsPaginated', `query($restaurantId:String!,$page:Int,$limit:Int){ restaurantCouponsPaginated(restaurantId:$restaurantId,page:$page,limit:$limit){ totalCount data { ${F.coupon} } } }`, { restaurantId: '{{restaurantId}}', page: 1, limit: 10 }),
      req('createRestaurantCoupon', `mutation($restaurantId:ID!,$couponInput:CouponInput!){ createRestaurantCoupon(restaurantId:$restaurantId,couponInput:$couponInput){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}', couponInput: { title: `SQA${Date.now()}`, discount: 5, enabled: true } }),
      req('editRestaurantCoupon', `mutation($restaurantId:ID!,$couponInput:CouponInput!){ editRestaurantCoupon(restaurantId:$restaurantId,couponInput:$couponInput){ ${F.coupon} } }`, { restaurantId: '{{restaurantId}}', couponInput: { _id: '{{couponId}}', title: 'BURGER5', discount: 5, enabled: true } }),
      req('deleteRestaurantCoupon', `mutation($restaurantId:ID!,$couponId:ID!){ deleteRestaurantCoupon(restaurantId:$restaurantId,couponId:$couponId) }`, { restaurantId: '{{restaurantId}}', couponId: 'REPLACE_WITH_DISPOSABLE_COUPON_ID' }),
    ]),
    folder('05 · Earnings & Withdraw', [
      req('storeEarningsGraph', `query($storeId:ID!,$page:Int,$limit:Int){ storeEarningsGraph(storeId:$storeId,page:$page,limit:$limit){ totalCount earnings { _id totalEarningsSum } } }`, { storeId: '{{restaurantId}}', page: 1, limit: 10 }),
      req('storeCurrentWithdrawRequest', `query($storeId:String){ storeCurrentWithdrawRequest(storeId:$storeId){ ${F.withdraw} } }`, { storeId: '{{restaurantId}}' }),
      req('transactionHistory', `query($userType:UserTypeEnum,$userId:String,$pagination:MoneyPaginationInput){ transactionHistory(userType:$userType,userId:$userId,pagination:$pagination){ pagination { total } data { _id transactionId status amountTransferred } } }`, { userType: 'STORE', userId: '{{restaurantId}}', pagination: { pageSize: 10, pageNo: 1 } }),
      req('earnings', `query($userType:UserTypeEnum,$pagination:MoneyPaginationInput){ earnings(userType:$userType,pagination:$pagination){ success pagination { total } data { grandTotalEarnings { storeTotal } earnings { _id orderId } } } }`, { userType: 'STORE', pagination: { pageSize: 10, pageNo: 1 } }),
      req('createWithdrawRequest', `mutation($requestAmount:Float!,$restaurant:String){ createWithdrawRequest(requestAmount:$requestAmount,restaurant:$restaurant){ ${F.withdraw} } }`, { requestAmount: 10, restaurant: '{{restaurantId}}' }),
    ]),
    folder('06 · Dashboard & Reviews', [
      req('getRestaurantDashboardOrdersSalesStats', `query($restaurant:String!,$starting_date:String!,$ending_date:String!){ getRestaurantDashboardOrdersSalesStats(restaurant:$restaurant,starting_date:$starting_date,ending_date:$ending_date){ totalOrders totalSales totalCODOrders totalCardOrders } }`, { restaurant: '{{restaurantId}}', starting_date: '2025-01-01', ending_date: '2025-12-31' }),
      req('getRestaurantDashboardSalesOrderCountDetailsByYear', `query($restaurant:String!,$year:Int!){ getRestaurantDashboardSalesOrderCountDetailsByYear(restaurant:$restaurant,year:$year){ salesAmount ordersCount } }`, { restaurant: '{{restaurantId}}', year: new Date().getFullYear() }),
      req('getRestaurantDashboardOrderSalesDetailsByPaymentMethod', `query($restaurant:String!,$starting_date:String!,$ending_date:String!){ getRestaurantDashboardOrderSalesDetailsByPaymentMethod(restaurant:$restaurant,starting_date:$starting_date,ending_date:$ending_date){ total_orders total_sales pickup_orders delivery_orders } }`, { restaurant: '{{restaurantId}}', starting_date: '2025-01-01', ending_date: '2025-12-31' }),
      req('getVendorDashboardStatsCardDetails', `query($vendorId:String!,$starting_date:String!,$ending_date:String!){ getVendorDashboardStatsCardDetails(vendorId:$vendorId,starting_date:$starting_date,ending_date:$ending_date){ totalRestaurants totalOrders totalSales totalDeliveries } }`, { vendorId: '{{ownerId}}', starting_date: '2025-01-01', ending_date: '2025-12-31' }),
      req('getLiveMonitorData', `query($id:String!){ getLiveMonitorData(id:$id){ online_stores cancelled_orders delayed_orders ratings } }`, { id: '{{ownerId}}' }),
      req('reviewsByRestaurant', `query reviewsByRestaurant($restaurant:String!){ reviewsByRestaurant(restaurant:$restaurant){ reviews { ${F.review} } } }`, { restaurant: '{{restaurantId}}' }),
    ]),
    folder('07 · Support Tickets', [
      req('createSupportTicket', `mutation($ticketInput:SupportTicketInput!){ createSupportTicket(ticketInput:$ticketInput){ ${F.ticket} } }`, { ticketInput: { title: 'Store issue', description: 'Printer not working', category: 'TECHNICAL', userType: 'VENDOR' } }, { capture: [['data.createSupportTicket._id', 'ticketId']] }),
      req('getSingleUserSupportTickets', `query($input:SingleUserSupportTicketsInput!){ getSingleUserSupportTickets(input:$input){ docsCount tickets { ${F.ticket} } } }`, { input: { userId: '{{ownerId}}', filters: { page: 1, limit: 10 } } }),
      req('getTicketMessages', `query($input:TicketMessagesInput!){ getTicketMessages(input:$input){ docsCount messages { ${F.ticketMsg} } } }`, { input: { ticket: '{{ticketId}}', page: 1, limit: 20 } }),
      req('createMessage', `mutation($messageInput:MessageInput!){ createMessage(messageInput:$messageInput){ ${F.ticketMsg} } }`, { messageInput: { content: 'Still broken', ticket: '{{ticketId}}' } }),
    ]),
    folder('08 · Subscriptions (reference)', [
      subNote('subscriptionOrder', `subscriptionOrder($id:String!){ _id orderStatus }`, { id: '{{orderId}}' }),
      subNote('subscribePlaceOrder', `subscribePlaceOrder($restaurant:String!){ origin order { _id orderId } }`, { restaurant: '{{restaurantId}}' }),
      subNote('subscriptionDispatcher', `subscriptionDispatcher { _id orderId orderStatus }`, {}),
    ]),
  ],
  [{ key: 'restaurantId' }, { key: 'ownerId' }, { key: 'orderId' }, { key: 'categoryId' }, { key: 'foodId' }, { key: 'addonId' }, { key: 'couponId' }, { key: 'riderId' }, { key: 'ticketId' }]
);

/* =============================================================== ENVIRONMENT */

const environment = {
  id: 'enatega-backend-local',
  name: 'Enatega Backend · Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:4000', enabled: true },
    { key: 'wsUrl', value: 'ws://localhost:4000', enabled: true },
    { key: 'token', value: '', enabled: true },
    { key: 'adminEmail', value: 'admin@enatega.local', enabled: true },
    { key: 'adminPassword', value: 'Admin@123', enabled: true },
    { key: 'vendorEmail', value: 'vendor@enatega.local', enabled: true },
    { key: 'vendorPassword', value: 'Vendor@123', enabled: true },
    { key: 'customerEmail', value: 'customer@enatega.local', enabled: true },
    { key: 'customerPassword', value: 'Customer@123', enabled: true },
    { key: 'riderUsername', value: 'rider1', enabled: true },
    { key: 'riderPassword', value: 'Rider@123', enabled: true },
    { key: 'storeUsername', value: 'FalafelTmeer@yopmail.com', enabled: true },
    { key: 'storePassword', value: 'Yalla0014yalla0014@', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

/* =============================================================== WRITE */

write('admin.postman_collection.json', adminCollection);
write('customer-web.postman_collection.json', webCollection);
write('customer-app.postman_collection.json', appCollection);
write('rider.postman_collection.json', riderCollection);
write('store.postman_collection.json', storeCollection);
write('enatega-backend-local.postman_environment.json', environment);

console.log('\nDone. Import the 5 collections + 1 environment into Postman.');
