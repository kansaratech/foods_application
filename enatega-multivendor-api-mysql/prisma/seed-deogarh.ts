/**
 * LocalSell — Deogarh (Rajsamand, Rajasthan) marketplace seed.
 *
 * Adds a small set of real-feeling Deogarh stores so the localized landing page
 * shows live data for that location. Safe to re-run: every entity is keyed by a
 * stable slug / marker and skipped if it already exists.
 *
 *   npm run seed:deogarh
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';
import { seedFestivalCampaign } from './seed-campaign';

const prisma = new PrismaClient();

// Deogarh (Devgarh) town centre, Rajsamand district, Rajasthan — PIN 313331.
const DEOGARH_LAT = 25.534;
const DEOGARH_LNG = 73.899;
const RUPEE = '₹';

// Stock photos (Unsplash, https — allowed by the web CSP `img-src ... https:`).
const U = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

// Per-store hero image, keyed by slug.
const STORE_IMAGE: Record<string, string> = {
  'dgh-deogarh-mahal-rasoi': U('1631452180519-c014fe946bc7'), // thali
  'dgh-rathore-bhojanalaya': U('1567188040759-fb8a883dc6d8'), // indian spread
  'dgh-shrinath-mishthan-bhandar': U('1606491956689-2ea866880c84'), // jalebi / mithai
  'dgh-marwari-rasoi': U('1585937421612-70a008356fbe'), // curry
  'dgh-aravalli-cafe-snacks': U('1517248135467-4c7edcad34c4'), // cafe
  'dgh-highway-dhaba-deogarh': U('1596797038530-2c107229654b'), // dhaba food
  'dgh-deogarh-chaat-bhandar': U('1601050690597-df0568f70950'), // chaat / samosa
  'dgh-krishna-kirana-provision': U('1542838132-92c53300491e'), // grocery shelves
};

// Fallback dish photo by cuisine keyword, for individual menu items.
const DISH_IMAGE: { match: RegExp; url: string }[] = [
  { match: /thali|rasoi|mahal/i, url: U('1631452180519-c014fe946bc7', 600) },
  { match: /baati|dal|churma/i, url: U('1567188040759-fb8a883dc6d8', 600) },
  { match: /sweet|mishthan|ghewar|kachori|chakki|bhujia|namkeen|mithai/i, url: U('1606491956689-2ea866880c84', 600) },
  { match: /chaat|bhalla|puri|samosa|street/i, url: U('1601050690597-df0568f70950', 600) },
  { match: /chai|coffee|cafe|maggi|sandwich|poha/i, url: U('1517248135467-4c7edcad34c4', 600) },
  { match: /paneer|curry|makhani|masala|dhaba|maas|gatta|sabzi|sangri/i, url: U('1585937421612-70a008356fbe', 600) },
  { match: /atta|rice|dal 1kg|milk|salt|oil|kirana|provision/i, url: U('1542838132-92c53300491e', 600) },
];

const dishImage = (title: string, cuisine: string) => {
  const hay = `${title} ${cuisine}`;
  return (DISH_IMAGE.find((d) => d.match.test(hay)) ?? DISH_IMAGE[5]).url;
};

type Seed = {
  name: string;
  cuisines: [string, string?];
  shop: 'restaurant' | 'grocery';
  deliveryTime: number;
  costForOne: number | null;
  rating: number;
  area: string;
  categories: { title: string; foods: { title: string; description: string; price: number }[] }[];
};

const STORES: Seed[] = [
  {
    name: 'Deogarh Mahal Rasoi',
    cuisines: ['Rajasthani', 'Thali'],
    shop: 'restaurant',
    deliveryTime: 30,
    costForOne: 250,
    rating: 4.6,
    area: 'Fort Road',
    categories: [
      {
        title: 'Royal Thali',
        foods: [
          { title: 'Deogarh Special Thali', description: 'Dal, baati, churma, gatte ki sabzi, ker sangri, rice', price: 280 },
          { title: 'Regular Rajasthani Thali', description: 'Everyday unlimited thali', price: 200 },
          { title: 'Laal Maas with Bajra Roti', description: 'Fiery Mewari mutton curry', price: 360 },
        ],
      },
      {
        title: 'Mains',
        foods: [
          { title: 'Gatte ki Sabzi', description: 'Gram-flour dumplings in yoghurt gravy', price: 160 },
          { title: 'Ker Sangri', description: 'Desert beans and berries, dry sabzi', price: 180 },
        ],
      },
    ],
  },
  {
    name: 'Rathore Bhojanalaya',
    cuisines: ['Rajasthani', 'Dal Baati'],
    shop: 'restaurant',
    deliveryTime: 25,
    costForOne: 180,
    rating: 4.5,
    area: 'Bus Stand Road',
    categories: [
      {
        title: 'Dal Baati',
        foods: [
          { title: 'Dal Baati Churma (3 baati)', description: 'Baked wheat balls, panchmel dal, sweet churma', price: 190 },
          { title: 'Dal Baati Churma (5 baati)', description: 'Larger plate for hearty appetites', price: 260 },
          { title: 'Besan Gatta Pulao', description: 'Spiced rice with gram-flour dumplings', price: 150 },
        ],
      },
      {
        title: 'Extras',
        foods: [
          { title: 'Buttermilk (Chaas)', description: 'Spiced cooling buttermilk glass', price: 30 },
          { title: 'Mirchi Vada', description: 'Stuffed chilli fritter, Rajasthani style', price: 40 },
        ],
      },
    ],
  },
  {
    name: 'Shrinath Mishthan Bhandar',
    cuisines: ['Sweets', 'Namkeen'],
    shop: 'restaurant',
    deliveryTime: 20,
    costForOne: 120,
    rating: 4.7,
    area: 'Station Road',
    categories: [
      {
        title: 'Mithai',
        foods: [
          { title: 'Mawa Kachori (2 pcs)', description: 'Flaky kachori stuffed with sweet khoya', price: 90 },
          { title: 'Ghewar (250g)', description: 'Disc-shaped honeycomb sweet soaked in syrup', price: 160 },
          { title: 'Besan Chakki (250g)', description: 'Gram-flour fudge with cardamom', price: 140 },
        ],
      },
      {
        title: 'Namkeen',
        foods: [
          { title: 'Bikaneri Bhujia (500g)', description: 'Crisp spiced gram-flour noodles', price: 130 },
          { title: 'Pyaaz Kachori (2 pcs)', description: 'Spiced onion kachori, served hot', price: 60 },
        ],
      },
    ],
  },
  {
    name: 'Marwari Rasoi',
    cuisines: ['Rajasthani', 'North Indian'],
    shop: 'restaurant',
    deliveryTime: 28,
    costForOne: 200,
    rating: 4.4,
    area: 'Anjana Chouraha',
    categories: [
      {
        title: 'Thali & Combos',
        foods: [
          { title: 'Mini Marwari Thali', description: 'Two sabzi, dal, rice, roti, salad, sweet', price: 190 },
          { title: 'Paneer Sabzi with Tawa Roti', description: 'Home-style cottage cheese curry', price: 210 },
          { title: 'Aloo Pyaaz Sabzi with Poori', description: 'Comfort plate with fried bread', price: 130 },
        ],
      },
    ],
  },
  {
    name: 'Aravalli Cafe & Snacks',
    cuisines: ['Cafe', 'Snacks'],
    shop: 'restaurant',
    deliveryTime: 22,
    costForOne: 150,
    rating: 4.3,
    area: 'Kumbhalgarh Road',
    categories: [
      {
        title: 'Snacks',
        foods: [
          { title: 'Masala Maggi', description: 'Loaded instant noodles with veggies', price: 70 },
          { title: 'Grilled Sandwich', description: 'Three-layer veg grilled sandwich', price: 110 },
          { title: 'Poha Plate', description: 'Flattened rice with sev and lemon', price: 50 },
        ],
      },
      {
        title: 'Beverages',
        foods: [
          { title: 'Masala Chai', description: 'Cutting chai with ginger and cardamom', price: 25 },
          { title: 'Cold Coffee', description: 'Thick blended cold coffee', price: 90 },
        ],
      },
    ],
  },
  {
    name: 'Highway Dhaba Deogarh',
    cuisines: ['Punjabi', 'North Indian'],
    shop: 'restaurant',
    deliveryTime: 35,
    costForOne: 220,
    rating: 4.2,
    area: 'Rajnagar Road',
    categories: [
      {
        title: 'Dhaba Special',
        foods: [
          { title: 'Dal Fry with Tandoori Roti', description: 'Tempered yellow dal, fresh roti', price: 170 },
          { title: 'Shahi Paneer', description: 'Rich creamy paneer curry', price: 220 },
          { title: 'Egg Curry with Rice', description: 'Home-style egg masala', price: 190 },
        ],
      },
    ],
  },
  {
    name: 'Deogarh Chaat Bhandar',
    cuisines: ['Street Food', 'Chaat'],
    shop: 'restaurant',
    deliveryTime: 18,
    costForOne: 80,
    rating: 4.5,
    area: 'Purani Abadi',
    categories: [
      {
        title: 'Chaat',
        foods: [
          { title: 'Samosa Chaat', description: 'Crushed samosa, curd, chutney, sev', price: 60 },
          { title: 'Dahi Bhalla', description: 'Soft lentil dumplings in sweet curd', price: 70 },
          { title: 'Pani Puri (6 pcs)', description: 'Crisp puris with spiced water', price: 40 },
        ],
      },
    ],
  },
  {
    name: 'Krishna Kirana & Provision',
    cuisines: ['Grocery', 'Daily needs'],
    shop: 'grocery',
    deliveryTime: 40,
    costForOne: null,
    rating: 4.4,
    area: 'Station Road',
    categories: [
      {
        title: 'Staples',
        foods: [
          { title: 'Chakki Atta 5kg', description: 'Stone-ground whole wheat flour', price: 260 },
          { title: 'Sortex Rice 5kg', description: 'Everyday cooking rice', price: 340 },
          { title: 'Moong Dal 1kg', description: 'Split green gram', price: 150 },
        ],
      },
      {
        title: 'Daily Needs',
        foods: [
          { title: 'Amul Gold Milk 1L', description: 'Full-cream milk pouch', price: 68 },
          { title: 'Tata Salt 1kg', description: 'Iodised vacuum-evaporated salt', price: 28 },
        ],
      },
    ],
  },
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const openingTimesFor = (shop: 'restaurant' | 'grocery') => {
  const [open, close] = shop === 'grocery' ? ['08', '22'] : ['09', '23'];
  return DAYS.map((day) => ({
    day,
    times: [{ startTime: [open, '00'], endTime: [close, '00'] }],
  }));
};

function ratingsFor(target: number): number[] {
  const base = Math.min(5, Math.max(1, Math.floor(target)));
  const bump = Math.round((target - base) * 5);
  return Array.from({ length: 5 }, (_, i) => Math.min(5, i < bump ? base + 1 : base));
}

function slugify(name: string): string {
  return 'dgh-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function scatter(i: number): { lat: number; lng: number } {
  const golden = 2.399963;
  const r = 0.004 + (i % 5) * 0.003; // ~0.4km .. ~1.7km around the town
  const a = i * golden;
  return { lat: DEOGARH_LAT + r * Math.cos(a), lng: DEOGARH_LNG + r * Math.sin(a) };
}

async function main() {
  // ---- Currency + platform config ----
  const config = await prisma.configuration.findFirst();
  if (config) {
    await prisma.configuration.update({
      where: { id: config.id },
      data: {
        currency: 'INR',
        currencySymbol: RUPEE,
        deliveryRate: 20,
        // Platform commission billing + map-centre fallback for the launch town.
        defaultCommissionRate: config.defaultCommissionRate || 20,
        commissionBillingCycle: config.commissionBillingCycle || 'MONTHLY',
        defaultLatitude: DEOGARH_LAT,
        defaultLongitude: DEOGARH_LNG,
      },
    });
    console.log(`Configuration set: INR (${RUPEE}), commission ${config.defaultCommissionRate || 20}% / ${config.commissionBillingCycle || 'MONTHLY'}, map centre Deogarh.`);
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

  // ---- Delivery zone around Deogarh (so the landing map has real coverage) ----
  const existingZone = await prisma.zone.findFirst({ where: { title: 'Deogarh Town' } });
  if (!existingZone) {
    const d = 0.06; // ~6-7 km box around the town centre
    await prisma.zone.create({
      data: {
        title: 'Deogarh Town',
        description: 'Deogarh & nearby villages, Rajsamand',
        boundary: [
          [
            [DEOGARH_LNG - d, DEOGARH_LAT - d],
            [DEOGARH_LNG + d, DEOGARH_LAT - d],
            [DEOGARH_LNG + d, DEOGARH_LAT + d],
            [DEOGARH_LNG - d, DEOGARH_LAT + d],
            [DEOGARH_LNG - d, DEOGARH_LAT - d],
          ],
        ] as Prisma.InputJsonValue,
      },
    });
    console.log('Created "Deogarh Town" delivery zone.');
  }

  // ---- Cuisine cache ----
  const cuisineCache = new Map<string, string>();
  async function getCuisineId(name: string, shopTypeId: string): Promise<string> {
    const key = name.toLowerCase();
    if (cuisineCache.has(key)) return cuisineCache.get(key)!;
    const existing = await prisma.cuisine.findFirst({ where: { name } });
    const row =
      existing ?? (await prisma.cuisine.create({ data: { name, description: `${name} cuisine`, shopTypeId } }));
    cuisineCache.set(key, row.id);
    return row.id;
  }

  // ---- Owner + reviewer ----
  // Each store gets its OWN vendor account: the store app is "one login = one
  // store" (`restaurantOrders` throws if the owner has more than one restaurant).
  const ownerFor = async (slug: string, name: string) =>
    prisma.user.upsert({
      where: { email: `${slug}-owner@padharo.local` },
      update: {},
      create: {
        email: `${slug}-owner@padharo.local`,
        name: `${name} (Owner)`,
        password: await hashPassword('Vendor@123'),
        userType: 'VENDOR',
        emailIsVerified: true,
      },
    });

  // Reuse whatever demo-diner already exists — matched on email OR phone, because
  // a prod seed may have created it under a different email domain
  // (deogarh-diner@padharo.in vs .local) while the phone stays the same.
  const reviewerEmail = 'deogarh-diner@padharo.local';
  const reviewerPhone = '+919829000001';
  let reviewer = await prisma.user.findFirst({
    where: { OR: [{ email: reviewerEmail }, { phone: reviewerPhone }] },
  });
  if (!reviewer) {
    reviewer = await prisma.user.create({
      data: {
        email: reviewerEmail,
        name: 'Deogarh Diner',
        phone: reviewerPhone,
        password: await hashPassword('Customer@123'),
        userType: 'CUSTOMER',
        emailIsVerified: true,
        phoneIsVerified: true,
      },
    });
  }

  let reviewerAddress = await prisma.address.findFirst({ where: { userId: reviewer.id, label: 'Deogarh Home' } });
  if (!reviewerAddress) {
    reviewerAddress = await prisma.address.create({
      data: {
        userId: reviewer.id,
        label: 'Deogarh Home',
        deliveryAddress: 'Station Road, Deogarh, Rajsamand, Rajasthan 313331',
        details: 'Near Bus Stand',
        latitude: DEOGARH_LAT,
        longitude: DEOGARH_LNG,
        selected: true,
      },
    });
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < STORES.length; i++) {
    const seed = STORES[i];
    const slug = slugify(seed.name);
    const shopType = seed.shop === 'grocery' ? groceryShopType : restaurantShopType;
    const { lat, lng } = scatter(i);

    const image = STORE_IMAGE[slug] ?? null;

    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      // Backfill imagery + opening hours on a re-run without recreating the store.
      const patch: Prisma.RestaurantUpdateInput = {};
      if (image && existing.image !== image) {
        patch.image = image;
        patch.logo = image;
      }
      if (!Array.isArray(existing.openingTimes) || existing.openingTimes.length === 0) {
        patch.openingTimes = openingTimesFor(seed.shop) as Prisma.InputJsonValue;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.restaurant.update({ where: { id: existing.id }, data: patch });
      }
      const foods = await prisma.food.findMany({ where: { restaurantId: existing.id } });
      for (const f of foods) {
        if (!f.image) {
          await prisma.food.update({
            where: { id: f.id },
            data: { image: dishImage(f.title, seed.cuisines[0]) },
          });
        }
      }
      skipped++;
      continue;
    }

    const cuisineIds: string[] = [];
    for (const c of seed.cuisines) {
      if (c) cuisineIds.push(await getCuisineId(c, shopType.id));
    }

    const storeOwner = await ownerFor(slug, seed.name);
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: storeOwner.id,
        name: seed.name,
        slug,
        image,
        logo: image,
        // Store-app (merchant) login: `<slug>@store.padharo` / `Store@123`
        username: `${slug}@store.padharo`,
        password: await hashPassword('Store@123'),
        openingTimes: openingTimesFor(seed.shop) as Prisma.InputJsonValue,
        orderPrefix: slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || 'DGH',
        address: `${seed.area}, Deogarh, Rajsamand, Rajasthan`,
        city: 'Deogarh',
        postCode: '313331',
        phone: `+9129${String(54000000 + i * 7919).slice(0, 8)}`,
        deliveryTime: seed.deliveryTime,
        minimumOrder: seed.costForOne ?? 0,
        tax: 5,
        latitude: lat,
        longitude: lng,
        shopTypeId: shopType.id,
        isActive: true,
        isAvailable: true,
        boundType: 'radius',
        circleBounds: { radius: 7000 } as Prisma.InputJsonValue,
        minDeliveryFee: 12,
        deliveryDistance: 10,
        deliveryFee: 20,
        bussinessDetails: {
          bankName: 'Bank of Baroda',
          accountName: seed.name,
          accountCode: 'BARB0DEOGAR',
          accountNumber: String(37010000000000 + i),
          bussinessRegNo: `GST08AAA${2000 + i}A1Z5`,
          companyRegNo: `U55101RJ20${12 + (i % 12)}PTC${200000 + i}`,
          taxRate: 5,
        } as Prisma.InputJsonValue,
        cuisines: { create: cuisineIds.map((cuisineId) => ({ cuisineId })) },
      },
    });

    for (const cat of seed.categories) {
      const category = await prisma.category.create({
        data: { restaurantId: restaurant.id, title: cat.title },
      });
      for (const food of cat.foods) {
        await prisma.food.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            title: food.title,
            description: food.description,
            image: dishImage(food.title, seed.cuisines[0]),
            isActive: true,
            variations: { create: [{ title: 'Regular', price: food.price }] },
          },
        });
      }
    }

    const anyFood = await prisma.food.findFirst({
      where: { restaurantId: restaurant.id },
      include: { variations: true },
    });
    const variation = anyFood?.variations[0];
    if (anyFood && variation) {
      const ratings = ratingsFor(seed.rating);
      for (let k = 0; k < ratings.length; k++) {
        const order = await prisma.order.create({
          data: {
            orderId: `DGH-${slug}-${k + 1}`,
            userId: reviewer.id,
            restaurantId: restaurant.id,
            addressId: reviewerAddress.id,
            paymentMethod: 'COD',
            paymentStatus: 'PAID',
            orderStatus: 'DELIVERED',
            status: 'DELIVERED',
            orderAmount: variation.price + 20,
            paidAmount: variation.price + 20,
            deliveryCharges: 20,
            deliveredAt: new Date(Date.now() - (k + 1) * 86400000),
            items: {
              create: [
                {
                  foodId: anyFood.id,
                  variationId: variation.id,
                  title: `${anyFood.title} (${variation.title})`,
                  price: variation.price,
                  quantity: 1,
                },
              ],
            },
          },
        });
        await prisma.review.create({
          data: {
            orderId: order.id,
            restaurantId: restaurant.id,
            userId: reviewer.id,
            rating: ratings[k],
            description: 'Seeded review for Deogarh marketplace demo.',
          },
        });
      }
    }

    created++;
  }

  await seedFestivalCampaign(prisma);

  const total = await prisma.restaurant.count({ where: { isActive: true } });
  console.log(`Deogarh seed complete: ${created} stores created, ${skipped} already existed.`);
  console.log(`Active stores now in DB: ${total}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
