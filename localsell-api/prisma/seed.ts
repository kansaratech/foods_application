import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';

const prisma = new PrismaClient();

// Deogarh (Rajsamand, Rajasthan) — same anchor as seed-deogarh.ts, since this
// base seed's fixtures (zones, sample stores, sample customer) are India-only
// for this launch, not the original template's San Francisco placeholders.
const DEOGARH_LAT = 25.534;
const DEOGARH_LNG = 73.899;

async function main() {
  // ---- Configuration ----
  const existingConfig = await prisma.configuration.findFirst();
  if (!existingConfig) {
    await prisma.configuration.create({
      data: {
        currency: 'INR',
        currencySymbol: '₹',
        deliveryRate: 20,
        testOtp: '1234',
        skipMobileVerification: true,
        skipEmailVerification: true,
        defaultLatitude: DEOGARH_LAT,
        defaultLongitude: DEOGARH_LNG,
        platformLegalName: 'Maekotech Solutions LLP',
        termsAndConditions: 'LocalSell — Terms of Service (placeholder; run seed:deogarh or edit in Admin → Configuration for the full text).',
        privacyPolicy: 'LocalSell — Privacy Policy (placeholder; run seed:deogarh or edit in Admin → Configuration for the full text).',
      },
    });
  }

  // ---- Shop types ----
  const restaurantShopType = await prisma.shopType.upsert({
    where: { slug: 'restaurant' },
    update: {},
    create: { name: 'Restaurant', slug: 'restaurant' },
  });
  const groceryShopType = await prisma.shopType.upsert({
    where: { slug: 'grocery' },
    update: {},
    create: { name: 'Grocery', slug: 'grocery' },
  });

  // ---- Cuisines ----
  const fastFoodCuisine = await prisma.cuisine.findFirst({ where: { name: 'Fast Food' } });
  const cuisineFastFood =
    fastFoodCuisine ??
    (await prisma.cuisine.create({
      data: { name: 'Fast Food', description: 'Burgers, fries and more', shopTypeId: restaurantShopType.id },
    }));
  const italianCuisine = await prisma.cuisine.findFirst({ where: { name: 'Italian' } });
  const cuisineItalian =
    italianCuisine ??
    (await prisma.cuisine.create({
      data: { name: 'Italian', description: 'Pizza and pasta', shopTypeId: restaurantShopType.id },
    }));

  // ---- Zones (small boxes on either side of Deogarh town centre) ----
  const downtownZone = await prisma.zone.findFirst({ where: { title: 'Deogarh North Zone' } });
  const zoneDowntown =
    downtownZone ??
    (await prisma.zone.create({
      data: {
        title: 'Deogarh North Zone',
        description: 'Central delivery zone',
        boundary: [
          [
            [DEOGARH_LNG - 0.03, DEOGARH_LAT],
            [DEOGARH_LNG + 0.03, DEOGARH_LAT],
            [DEOGARH_LNG + 0.03, DEOGARH_LAT + 0.03],
            [DEOGARH_LNG - 0.03, DEOGARH_LAT + 0.03],
            [DEOGARH_LNG - 0.03, DEOGARH_LAT],
          ],
        ],
      },
    }));
  const uptownZone = await prisma.zone.findFirst({ where: { title: 'Deogarh South Zone' } });
  const zoneUptown =
    uptownZone ??
    (await prisma.zone.create({
      data: {
        title: 'Deogarh South Zone',
        description: 'Southern delivery zone',
        boundary: [
          [
            [DEOGARH_LNG - 0.03, DEOGARH_LAT - 0.03],
            [DEOGARH_LNG + 0.03, DEOGARH_LAT - 0.03],
            [DEOGARH_LNG + 0.03, DEOGARH_LAT],
            [DEOGARH_LNG - 0.03, DEOGARH_LAT],
            [DEOGARH_LNG - 0.03, DEOGARH_LAT - 0.03],
          ],
        ],
      },
    }));

  // ---- Users ----
  const admin = await prisma.user.upsert({
    where: { email: 'admin@localsell.in' },
    update: {},
    create: {
      email: 'admin@localsell.in',
      name: 'Super Admin',
      password: await hashPassword('Admin@123'),
      userType: 'ADMIN',
      emailIsVerified: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@localsell.in' },
    update: {},
    create: {
      email: 'staff@localsell.in',
      name: 'Sample Staff',
      password: await hashPassword('Staff@123'),
      userType: 'STAFF',
      permissions: ['ORDERS', 'RESTAURANTS'],
      emailIsVerified: true,
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@localsell.in' },
    update: {},
    create: {
      email: 'vendor@localsell.in',
      name: 'Sample Vendor',
      password: await hashPassword('Vendor@123'),
      userType: 'VENDOR',
      emailIsVerified: true,
    },
  });

  const vendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@localsell.in' },
    update: {},
    create: {
      email: 'vendor2@localsell.in',
      name: 'Pizza Vendor',
      password: await hashPassword('Vendor@123'),
      userType: 'VENDOR',
      emailIsVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@localsell.in' },
    update: {},
    create: {
      email: 'customer@localsell.in',
      name: 'Sample Customer',
      phone: '+919829000099',
      password: await hashPassword('Customer@123'),
      userType: 'CUSTOMER',
      emailIsVerified: true,
      phoneIsVerified: true,
    },
  });

  let customerAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!customerAddress) {
    customerAddress = await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        deliveryAddress: 'Fort Road, Deogarh, Rajsamand, Rajasthan 313331',
        details: 'Near Deogarh Mahal',
        latitude: DEOGARH_LAT + 0.005,
        longitude: DEOGARH_LNG + 0.005,
        selected: true,
      },
    });
  }

  const rider1 = await prisma.user.upsert({
    where: { email: 'rider1@localsell.in' },
    update: {},
    create: {
      email: 'rider1@localsell.in',
      username: 'rider1',
      name: 'Alex Rider',
      phone: '+919829000098',
      password: await hashPassword('Rider@123'),
      userType: 'RIDER',
      emailIsVerified: true,
    },
  });
  await prisma.riderProfile.upsert({
    where: { userId: rider1.id },
    update: {},
    create: {
      userId: rider1.id,
      vehicleType: 'motorcycle',
      available: true,
      zoneId: zoneDowntown.id,
      licenseDetails: { number: 'LIC-1001', expiryDate: '2027-01-01', image: null },
      vehicleDetails: { number: 'MC-1001', image: null },
    },
  });

  const rider2 = await prisma.user.upsert({
    where: { email: 'rider2@localsell.in' },
    update: {},
    create: {
      email: 'rider2@localsell.in',
      username: 'rider2',
      name: 'Sam Delivers',
      phone: '+919829000097',
      password: await hashPassword('Rider@123'),
      userType: 'RIDER',
      emailIsVerified: true,
    },
  });
  await prisma.riderProfile.upsert({
    where: { userId: rider2.id },
    update: {},
    create: {
      userId: rider2.id,
      vehicleType: 'bicycle',
      available: false,
      zoneId: zoneUptown.id,
      licenseDetails: { number: 'LIC-1002', expiryDate: '2027-06-01', image: null },
      vehicleDetails: { number: 'BC-1002', image: null },
    },
  });

  // ---- Restaurant 1: Sample Restaurant (Burgers) ----
  let restaurant = await prisma.restaurant.findUnique({ where: { slug: 'sample-restaurant' } });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        ownerId: vendor.id,
        name: 'Sample Restaurant',
        slug: 'sample-restaurant',
        orderPrefix: 'SAM',
        username: 'sample-restaurant@store.localsell.in',
        password: await hashPassword('Store@123'),
        address: 'Fort Road, Deogarh, Rajsamand, Rajasthan',
        city: 'Deogarh',
        postCode: '313331',
        deliveryTime: 30,
        minimumOrder: 10,
        tax: 5,
        latitude: DEOGARH_LAT + 0.01,
        longitude: DEOGARH_LNG - 0.01,
        shopTypeId: restaurantShopType.id,
        isActive: true,
        isAvailable: true,
        boundType: 'radius',
        circleBounds: { radius: 5000 },
        minDeliveryFee: 2,
        deliveryDistance: 10,
        deliveryFee: 3.5,
        bussinessDetails: {
          bankName: 'Sample Bank',
          accountName: 'Sample Vendor',
          accountCode: '001',
          accountNumber: '000123456',
          bussinessRegNo: 'BRN-001',
          companyRegNo: 'CRN-001',
          taxRate: 5,
        },
        cuisines: { create: [{ cuisineId: cuisineFastFood.id }] },
      },
    });
  }

  let category = await prisma.category.findFirst({ where: { restaurantId: restaurant.id, title: 'Burgers' } });
  if (!category) {
    category = await prisma.category.create({ data: { restaurantId: restaurant.id, title: 'Burgers' } });
  }

  const subCategory = await prisma.subCategory.findFirst({ where: { parentCategoryId: category.id } });
  if (!subCategory) {
    await prisma.subCategory.create({ data: { title: 'Beef Burgers', parentCategoryId: category.id } });
  }

  let cheeseAddon = await prisma.addon.findFirst({ where: { restaurantId: restaurant.id, title: 'Extra Toppings' } });
  if (!cheeseAddon) {
    cheeseAddon = await prisma.addon.create({
      data: {
        restaurantId: restaurant.id,
        title: 'Extra Toppings',
        description: 'Choose extra toppings',
        quantityMinimum: 0,
        quantityMaximum: 3,
        options: {
          create: [
            { title: 'Extra Cheese', price: 20 },
            { title: 'Bacon', price: 2 },
          ],
        },
      },
    });
  }

  const existingFood = await prisma.food.findFirst({ where: { categoryId: category.id, title: 'Classic Burger' } });
  if (!existingFood) {
    await prisma.food.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: category.id,
        title: 'Classic Burger',
        description: 'Beef patty, lettuce, tomato, cheese',
        isActive: true,
        variations: {
          create: [
            { title: 'Regular', price: 149, addons: { create: [{ addonId: cheeseAddon.id }] } },
            { title: 'Large', price: 199, addons: { create: [{ addonId: cheeseAddon.id }] } },
          ],
        },
      },
    });
  }

  // ---- Restaurant 2: Pizza Palace ----
  let restaurant2 = await prisma.restaurant.findUnique({ where: { slug: 'pizza-palace' } });
  if (!restaurant2) {
    restaurant2 = await prisma.restaurant.create({
      data: {
        ownerId: vendor2.id,
        name: 'Pizza Palace',
        slug: 'pizza-palace',
        orderPrefix: 'PIZ',
        address: 'Station Road, Deogarh, Rajsamand, Rajasthan',
        city: 'Deogarh',
        postCode: '313331',
        deliveryTime: 40,
        minimumOrder: 15,
        tax: 5,
        latitude: DEOGARH_LAT - 0.01,
        longitude: DEOGARH_LNG + 0.01,
        shopTypeId: restaurantShopType.id,
        isActive: true,
        isAvailable: true,
        cuisines: { create: [{ cuisineId: cuisineItalian.id }] },
      },
    });
  }

  let pizzaCategory = await prisma.category.findFirst({ where: { restaurantId: restaurant2.id, title: 'Pizzas' } });
  if (!pizzaCategory) {
    pizzaCategory = await prisma.category.create({ data: { restaurantId: restaurant2.id, title: 'Pizzas' } });
  }

  const existingPizza = await prisma.food.findFirst({ where: { categoryId: pizzaCategory.id, title: 'Margherita Pizza' } });
  if (!existingPizza) {
    await prisma.food.create({
      data: {
        restaurantId: restaurant2.id,
        categoryId: pizzaCategory.id,
        title: 'Margherita Pizza',
        description: 'Tomato, mozzarella, basil',
        isActive: true,
        variations: { create: [{ title: 'Medium', price: 249 }, { title: 'Large', price: 349 }] },
      },
    });
  }

  // ---- Coupons ----
  const globalCoupon = await prisma.coupon.findFirst({ where: { title: 'WELCOME10', restaurantId: null } });
  if (!globalCoupon) {
    await prisma.coupon.create({
      data: { title: 'WELCOME10', discount: 10, enabled: true, lifeTimeActive: true },
    });
  }
  const restaurantCoupon = await prisma.coupon.findFirst({ where: { title: 'BURGER5', restaurantId: restaurant.id } });
  if (!restaurantCoupon) {
    await prisma.coupon.create({
      data: { title: 'BURGER5', discount: 5, enabled: true, restaurantId: restaurant.id },
    });
  }

  // ---- Banners ----
  const banner1 = await prisma.banner.findFirst({ where: { title: 'Weekend Special' } });
  if (!banner1) {
    await prisma.banner.create({
      data: { title: 'Weekend Special', description: '20% off this weekend', action: 'Navigate Specific Restaurant', screen: 'Near By Restaurants' },
    });
  }

  // ---- Sample order ----
  const existingOrder = await prisma.order.findFirst({ where: { userId: customer.id, restaurantId: restaurant.id } });
  if (!existingOrder) {
    const food = await prisma.food.findFirst({ where: { categoryId: category.id, title: 'Classic Burger' }, include: { variations: true } });
    const variation = food?.variations.find((v) => v.title === 'Regular');
    if (food && variation) {
      await prisma.order.create({
        data: {
          orderId: 'ORD-SEED001',
          userId: customer.id,
          restaurantId: restaurant.id,
          addressId: customerAddress.id,
          paymentMethod: 'COD',
          orderAmount: variation.price + 3.5,
          deliveryCharges: 3.5,
          orderStatus: 'PENDING',
          items: {
            create: [
              {
                foodId: food.id,
                variationId: variation.id,
                title: `${food.title} (${variation.title})`,
                price: variation.price,
                quantity: 1,
              },
            ],
          },
        },
      });
    }
  }

  console.log('Seed complete:');
  console.log(`  Admin login:    admin@localsell.in / Admin@123`);
  console.log(`  Staff login:    staff@localsell.in / Staff@123`);
  console.log(`  Vendor login:   vendor@localsell.in / Vendor@123 (Sample Restaurant)`);
  console.log(`  Store app login: sample-restaurant@store.localsell.in / Store@123 (Sample Restaurant)`);
  console.log(`  Vendor login:   vendor2@localsell.in / Vendor@123 (Pizza Palace)`);
  console.log(`  Customer login: customer@localsell.in / Customer@123`);
  console.log(`  Rider login:    rider1@localsell.in / Rider@123 (available, Deogarh North Zone)`);
  console.log(`  Rider login:    rider2@localsell.in / Rider@123 (unavailable, Deogarh South Zone)`);
  console.log('  2 restaurants, 2 zones, 2 cuisines, 1 sub-category, 2 coupons, 1 banner, 1 sample order seeded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
