import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';

const prisma = new PrismaClient();

async function main() {
  // ---- Configuration ----
  const existingConfig = await prisma.configuration.findFirst();
  if (!existingConfig) {
    await prisma.configuration.create({
      data: {
        currency: 'USD',
        currencySymbol: '$',
        deliveryRate: 5,
        testOtp: '1234',
        skipMobileVerification: true,
        skipEmailVerification: true,
        termsAndConditions: 'Sample terms and conditions for local testing.',
        privacyPolicy: 'Sample privacy policy for local testing.',
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

  // ---- Zones ----
  const downtownZone = await prisma.zone.findFirst({ where: { title: 'Downtown Zone' } });
  const zoneDowntown =
    downtownZone ??
    (await prisma.zone.create({
      data: {
        title: 'Downtown Zone',
        description: 'Central delivery zone',
        boundary: [
          [
            [-122.43, 37.76],
            [-122.4, 37.76],
            [-122.4, 37.79],
            [-122.43, 37.79],
            [-122.43, 37.76],
          ],
        ],
      },
    }));
  const uptownZone = await prisma.zone.findFirst({ where: { title: 'Uptown Zone' } });
  const zoneUptown =
    uptownZone ??
    (await prisma.zone.create({
      data: {
        title: 'Uptown Zone',
        description: 'Northern delivery zone',
        boundary: [
          [
            [-122.46, 37.79],
            [-122.43, 37.79],
            [-122.43, 37.82],
            [-122.46, 37.82],
            [-122.46, 37.79],
          ],
        ],
      },
    }));

  // ---- Users ----
  const admin = await prisma.user.upsert({
    where: { email: 'admin@enatega.local' },
    update: {},
    create: {
      email: 'admin@enatega.local',
      name: 'Super Admin',
      password: await hashPassword('Admin@123'),
      userType: 'ADMIN',
      emailIsVerified: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@enatega.local' },
    update: {},
    create: {
      email: 'staff@enatega.local',
      name: 'Sample Staff',
      password: await hashPassword('Staff@123'),
      userType: 'STAFF',
      permissions: ['ORDERS', 'RESTAURANTS'],
      emailIsVerified: true,
    },
  });

  const vendor = await prisma.user.upsert({
    where: { email: 'vendor@enatega.local' },
    update: {},
    create: {
      email: 'vendor@enatega.local',
      name: 'Sample Vendor',
      password: await hashPassword('Vendor@123'),
      userType: 'VENDOR',
      emailIsVerified: true,
    },
  });

  const vendor2 = await prisma.user.upsert({
    where: { email: 'vendor2@enatega.local' },
    update: {},
    create: {
      email: 'vendor2@enatega.local',
      name: 'Pizza Vendor',
      password: await hashPassword('Vendor@123'),
      userType: 'VENDOR',
      emailIsVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@enatega.local' },
    update: {},
    create: {
      email: 'customer@enatega.local',
      name: 'Sample Customer',
      phone: '+15550000001',
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
        deliveryAddress: '456 Market St, San Francisco, CA',
        details: 'Apt 2B',
        latitude: 37.775,
        longitude: -122.418,
        selected: true,
      },
    });
  }

  const rider1 = await prisma.user.upsert({
    where: { email: 'rider1@enatega.local' },
    update: {},
    create: {
      email: 'rider1@enatega.local',
      username: 'rider1',
      name: 'Alex Rider',
      phone: '+15550000002',
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
    where: { email: 'rider2@enatega.local' },
    update: {},
    create: {
      email: 'rider2@enatega.local',
      username: 'rider2',
      name: 'Sam Delivers',
      phone: '+15550000003',
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
        username: 'FalafelTmeer@yopmail.com',
        password: await hashPassword('Yalla0014yalla0014@'),
        address: '123 Main St, San Francisco, CA',
        city: 'San Francisco',
        postCode: '94103',
        deliveryTime: 30,
        minimumOrder: 10,
        tax: 5,
        latitude: 37.7749,
        longitude: -122.4194,
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
            { title: 'Extra Cheese', price: 1.5 },
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
            { title: 'Regular', price: 8.99, addons: { create: [{ addonId: cheeseAddon.id }] } },
            { title: 'Large', price: 11.99, addons: { create: [{ addonId: cheeseAddon.id }] } },
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
        address: '789 Uptown Ave, San Francisco, CA',
        city: 'San Francisco',
        postCode: '94109',
        deliveryTime: 40,
        minimumOrder: 15,
        tax: 5,
        latitude: 37.805,
        longitude: -122.445,
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
        variations: { create: [{ title: 'Medium', price: 12.99 }, { title: 'Large', price: 16.99 }] },
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
  console.log(`  Admin login:    admin@enatega.local / Admin@123`);
  console.log(`  Staff login:    staff@enatega.local / Staff@123`);
  console.log(`  Vendor login:   vendor@enatega.local / Vendor@123 (Sample Restaurant)`);
  console.log(`  Store app login: FalafelTmeer@yopmail.com / Yalla0014yalla0014@ (Sample Restaurant)`);
  console.log(`  Vendor login:   vendor2@enatega.local / Vendor@123 (Pizza Palace)`);
  console.log(`  Customer login: customer@enatega.local / Customer@123`);
  console.log(`  Rider login:    rider1@enatega.local / Rider@123 (available, Downtown Zone)`);
  console.log(`  Rider login:    rider2@enatega.local / Rider@123 (unavailable, Uptown Zone)`);
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
