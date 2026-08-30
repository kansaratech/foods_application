/**
 * Padharo — Ahmedabad marketplace seed.
 *
 * Creates a realistic set of Ahmedabad stores (restaurants, sweet shops and
 * grocers) so the localized landing page ("Popular in Ahmedabad") renders real
 * data instead of hard-coded mock cards. Safe to re-run: every entity is keyed
 * by a stable slug / marker and skipped if it already exists.
 *
 *   npm run seed:ahmedabad
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';

const prisma = new PrismaClient();

// Ahmedabad city centre — stores are scattered in a ~6km box around it.
const AHM_LAT = 23.0225;
const AHM_LNG = 72.5714;

type Seed = {
  name: string;
  cuisines: [string, string?];
  shop: 'restaurant' | 'grocery';
  deliveryTime: number; // minutes, shown as "28 min"
  costForOne: number | null; // shown as "₹200 for one"
  rating: number; // target review average, e.g. 4.6
  categories: { title: string; foods: { title: string; description: string; price: number }[] }[];
};

const RESTAURANTS: Seed[] = [
  {
    name: 'Sharma Rasoi',
    cuisines: ['Gujarati', 'Thali'],
    shop: 'restaurant',
    deliveryTime: 28,
    costForOne: 200,
    rating: 4.6,
    categories: [
      {
        title: 'Thali',
        foods: [
          { title: 'Gujarati Unlimited Thali', description: 'Rotli, shaak, dal, kadhi, rice, farsan, sweet', price: 240 },
          { title: 'Mini Thali', description: 'A lighter single-plate thali', price: 160 },
          { title: 'Kathiyawadi Thali', description: 'Spicy Saurashtra-style thali', price: 260 },
        ],
      },
      {
        title: 'Rotla & Shaak',
        foods: [
          { title: 'Bajra Rotla with Ringan no Olo', description: 'Millet flatbread, smoked aubergine mash', price: 120 },
          { title: 'Sev Tameta nu Shaak', description: 'Tomato curry topped with sev', price: 110 },
        ],
      },
    ],
  },
  {
    name: 'Thali House',
    cuisines: ['Gujarati', 'North Indian'],
    shop: 'restaurant',
    deliveryTime: 31,
    costForOne: 250,
    rating: 4.5,
    categories: [
      {
        title: 'Family Thali',
        foods: [
          { title: 'Rajwadi Thali', description: 'Royal spread with 3 sweets and 4 farsan', price: 320 },
          { title: 'Regular Thali', description: 'Everyday unlimited thali', price: 220 },
          { title: 'Jain Thali', description: 'No onion, no garlic, no root vegetables', price: 230 },
        ],
      },
      {
        title: 'Punjabi',
        foods: [
          { title: 'Dal Makhani', description: 'Slow-cooked black lentils with butter', price: 180 },
          { title: 'Paneer Butter Masala', description: 'Cottage cheese in rich tomato gravy', price: 210 },
        ],
      },
    ],
  },
  {
    name: 'Punjabi Dhaba',
    cuisines: ['Punjabi', 'North Indian'],
    shop: 'restaurant',
    deliveryTime: 34,
    costForOne: 300,
    rating: 4.3,
    categories: [
      {
        title: 'Tandoor',
        foods: [
          { title: 'Amritsari Kulcha with Chole', description: 'Stuffed kulcha, chickpea curry, butter', price: 190 },
          { title: 'Tandoori Roti Basket', description: 'Assorted breads from the clay oven', price: 130 },
          { title: 'Sarson da Saag with Makki Roti', description: 'Winter special mustard greens', price: 220 },
        ],
      },
      {
        title: 'Curries',
        foods: [
          { title: 'Butter Chicken', description: 'Creamy tomato and butter gravy', price: 320 },
          { title: 'Kadhai Paneer', description: 'Peppers, onion and cottage cheese', price: 240 },
        ],
      },
    ],
  },
  {
    name: 'Green Bowl',
    cuisines: ['Healthy', 'Salads'],
    shop: 'restaurant',
    deliveryTime: 26,
    costForOne: 350,
    rating: 4.4,
    categories: [
      {
        title: 'Signature Bowls',
        foods: [
          { title: 'Protein Power Bowl', description: 'Quinoa, chickpea, tofu, greens, tahini', price: 360 },
          { title: 'Mediterranean Bowl', description: 'Hummus, falafel, olives, pita', price: 340 },
          { title: 'Peanut Buddha Bowl', description: 'Brown rice, edamame, peanut dressing', price: 330 },
        ],
      },
      {
        title: 'Cold-Pressed',
        foods: [
          { title: 'Green Detox Juice', description: 'Spinach, cucumber, apple, ginger', price: 180 },
          { title: 'Beetroot Booster', description: 'Beet, carrot, orange, lemon', price: 180 },
        ],
      },
    ],
  },
  {
    name: 'Shree Sweets',
    cuisines: ['Sweets', 'Farsan'],
    shop: 'restaurant',
    deliveryTime: 22,
    costForOne: 150,
    rating: 4.7,
    categories: [
      {
        title: 'Mithai',
        foods: [
          { title: 'Kaju Katli (250g)', description: 'Cashew fudge with edible silver', price: 260 },
          { title: 'Mohanthal (250g)', description: 'Gram-flour fudge with cardamom', price: 180 },
          { title: 'Ghari (2 pcs)', description: 'Surat-style rich sweet', price: 120 },
        ],
      },
      {
        title: 'Farsan',
        foods: [
          { title: 'Khaman Dhokla (500g)', description: 'Soft steamed gram-flour cake', price: 110 },
          { title: 'Fafda Jalebi Combo', description: 'Crisp fafda with hot jalebi', price: 140 },
        ],
      },
    ],
  },
  {
    name: 'Biryani Central',
    cuisines: ['Mughlai', 'Biryani'],
    shop: 'restaurant',
    deliveryTime: 38,
    costForOne: 400,
    rating: 4.2,
    categories: [
      {
        title: 'Dum Biryani',
        foods: [
          { title: 'Hyderabadi Chicken Dum Biryani', description: 'Sealed-pot biryani with raita', price: 380 },
          { title: 'Mutton Biryani', description: 'Slow-cooked with saffron and fried onion', price: 460 },
          { title: 'Veg Handi Biryani', description: 'Mixed vegetables, whole spices', price: 300 },
        ],
      },
      {
        title: 'Kebabs',
        foods: [
          { title: 'Murgh Malai Tikka', description: 'Creamy char-grilled chicken', price: 320 },
          { title: 'Seekh Kebab', description: 'Spiced minced meat skewers', price: 300 },
        ],
      },
    ],
  },
  {
    name: 'Chai Corner',
    cuisines: ['Beverages', 'Snacks'],
    shop: 'restaurant',
    deliveryTime: 18,
    costForOne: 100,
    rating: 4.6,
    categories: [
      {
        title: 'Chai',
        foods: [
          { title: 'Kadak Masala Chai', description: 'Strong cutting chai with spices', price: 40 },
          { title: 'Adrak Chai', description: 'Ginger tea, freshly brewed', price: 40 },
          { title: 'Tandoori Chai', description: 'Smoky clay-pot tea', price: 70 },
        ],
      },
      {
        title: 'Bites',
        foods: [
          { title: 'Maska Bun', description: 'Buttered soft bun', price: 45 },
          { title: 'Vada Pav', description: 'Mumbai-style potato fritter pav', price: 50 },
        ],
      },
    ],
  },
  {
    name: 'Fresh Mart',
    cuisines: ['Grocery', 'Daily needs'],
    shop: 'grocery',
    deliveryTime: 40,
    costForOne: null,
    rating: 4.4,
    categories: [
      {
        title: 'Staples',
        foods: [
          { title: 'Aashirvaad Atta 5kg', description: 'Whole wheat flour', price: 275 },
          { title: 'Kolam Rice 5kg', description: 'Everyday cooking rice', price: 360 },
          { title: 'Toor Dal 1kg', description: 'Split pigeon peas', price: 160 },
        ],
      },
      {
        title: 'Dairy & Bakery',
        foods: [
          { title: 'Amul Taaza Milk 1L', description: 'Toned milk, tetra pack', price: 76 },
          { title: 'Brown Bread', description: 'Fresh whole-wheat loaf', price: 45 },
        ],
      },
    ],
  },

  // ---- Wider Ahmedabad marketplace ----
  mk('Agashiye', ['Gujarati', 'Thali'], 'restaurant', 33, 900, 4.5),
  mk('Gordhan Thal', ['Gujarati', 'Thali'], 'restaurant', 30, 550, 4.4),
  mk('Rajwadu', ['Gujarati', 'Kathiyawadi'], 'restaurant', 36, 650, 4.3),
  mk('Vishalla Village', ['Gujarati', 'Rustic'], 'restaurant', 42, 700, 4.2),
  mk('Toran Dining Hall', ['Gujarati', 'Family'], 'restaurant', 29, 300, 4.1),
  mk('Swati Snacks Corner', ['Gujarati', 'Snacks'], 'restaurant', 24, 280, 4.6),
  mk('Honest Bhaji Pav', ['Street Food', 'Snacks'], 'restaurant', 21, 150, 4.3),
  mk('Manek Chowk Bhajiya', ['Street Food', 'Chaat'], 'restaurant', 27, 180, 4.4),
  mk('Karnavati Dabeli House', ['Street Food', 'Snacks'], 'restaurant', 19, 90, 4.5),
  mk('Jai Bhavani Vada Pav', ['Street Food', 'Snacks'], 'restaurant', 20, 80, 4.2),
  mk('Das Khaman', ['Farsan', 'Sweets'], 'restaurant', 23, 120, 4.6),
  mk('Induben Khakhrawala', ['Farsan', 'Snacks'], 'restaurant', 35, 200, 4.5),
  mk('Gwalia Sweets', ['Sweets', 'Farsan'], 'restaurant', 26, 160, 4.3),
  mk('Ganga Sweets', ['Sweets', 'Bakery'], 'restaurant', 28, 170, 4.2),
  mk('Jassi De Parathe', ['Punjabi', 'North Indian'], 'restaurant', 32, 260, 4.3),
  mk('Sasuji Restaurant', ['Punjabi', 'North Indian'], 'restaurant', 34, 320, 4.1),
  mk('Sankalp South Indian', ['South Indian', 'Dosa'], 'restaurant', 25, 220, 4.4),
  mk('Dosa Plaza CG Road', ['South Indian', 'Dosa'], 'restaurant', 27, 200, 4.2),
  mk('The Chocolate Room', ['Cafe', 'Desserts'], 'restaurant', 30, 450, 4.3),
  mk('Cafe Upper Crust', ['Cafe', 'Continental'], 'restaurant', 33, 500, 4.2),
  mk('Huber & Holly', ['Desserts', 'Ice Cream'], 'restaurant', 29, 350, 4.5),
  mk('Havmor Ice Cream Parlour', ['Ice Cream', 'Desserts'], 'restaurant', 22, 250, 4.4),
  mk("La Pino'z SG Highway", ['Pizza', 'Italian'], 'restaurant', 31, 500, 4.1),
  mk("Uncle's Pizza", ['Pizza', 'Fast Food'], 'restaurant', 28, 450, 4.0),
  mk('Burger Hub Satellite', ['Fast Food', 'Burgers'], 'restaurant', 24, 300, 4.2),
  mk('Wok This Way', ['Chinese', 'Pan Asian'], 'restaurant', 30, 380, 4.1),
  mk('Mainland Tiffin', ['Chinese', 'North Indian'], 'restaurant', 35, 420, 4.0),
  mk('Barbeque Junction', ['BBQ', 'Mughlai'], 'restaurant', 40, 800, 4.3),
  mk('Zaika Lucknowi', ['Mughlai', 'Kebabs'], 'restaurant', 37, 450, 4.2),
  mk('Kathiyawadi Khadau', ['Kathiyawadi', 'Gujarati'], 'restaurant', 38, 400, 4.4),
  mk('Jalaram Khichdi', ['Gujarati', 'Comfort Food'], 'restaurant', 26, 160, 4.5),
  mk('Panchvati Gaurav', ['Gujarati', 'North Indian'], 'restaurant', 31, 350, 4.1),

  mk('Reliance Smart Point', ['Grocery', 'Daily needs'], 'grocery', 45, null, 4.2),
  mk('DMart Ready Kiosk', ['Grocery', 'Household'], 'grocery', 50, null, 4.3),
  mk("Nature's Basket Express", ['Grocery', 'Gourmet'], 'grocery', 38, null, 4.1),
  mk('Apna Bazaar', ['Grocery', 'Daily needs'], 'grocery', 42, null, 4.0),
  mk('Fresho Fruits & Veg', ['Grocery', 'Fruits & Vegetables'], 'grocery', 33, null, 4.4),
];

function mk(
  name: string,
  cuisines: [string, string?],
  shop: 'restaurant' | 'grocery',
  deliveryTime: number,
  costForOne: number | null,
  rating: number,
): Seed {
  const isGrocery = shop === 'grocery';
  return {
    name,
    cuisines,
    shop,
    deliveryTime,
    costForOne,
    rating,
    categories: isGrocery
      ? [
          {
            title: 'Everyday Essentials',
            foods: [
              { title: 'Amul Butter 500g', description: 'Salted table butter', price: 285 },
              { title: 'Tata Salt 1kg', description: 'Iodised vacuum-evaporated salt', price: 28 },
              { title: 'Fortune Sunflower Oil 1L', description: 'Refined cooking oil pouch', price: 145 },
            ],
          },
        ]
      : [
          {
            title: 'Bestsellers',
            foods: [
              { title: `${cuisines[0]} Special`, description: `House speciality at ${name}`, price: Math.round((costForOne ?? 250) * 1.1) },
              { title: 'Chef Thali', description: 'Curated plate for one', price: costForOne ?? 250 },
              { title: 'Light Bite', description: 'A smaller portion to share', price: Math.round((costForOne ?? 250) * 0.6) },
            ],
          },
        ],
  };
}

/** Deterministic-ish scatter around Ahmedabad centre. */
function scatter(i: number): { lat: number; lng: number } {
  const golden = 2.399963; // radians
  const r = 0.006 + (i % 7) * 0.0045; // ~0.6km .. ~4km
  const a = i * golden;
  return { lat: AHM_LAT + r * Math.cos(a), lng: AHM_LNG + r * Math.sin(a) * 1.08 };
}

const AREAS = [
  'Navrangpura', 'Satellite', 'Vastrapur', 'Bodakdev', 'Prahlad Nagar', 'Maninagar',
  'Bopal', 'Thaltej', 'Paldi', 'Chandkheda', 'Naranpura', 'Gota', 'Ellisbridge',
  'CG Road', 'SG Highway', 'Ambawadi', 'Ghatlodia', 'Nikol', 'Vejalpur', 'Shahibaug',
];

/** Ratings for a target average over 5 reviews (integer ratings, capped 1..5). */
function ratingsFor(target: number): number[] {
  const base = Math.min(5, Math.max(1, Math.floor(target)));
  const bump = Math.round((target - base) * 5); // how many of the 5 get +1
  return Array.from({ length: 5 }, (_, i) => Math.min(5, i < bump ? base + 1 : base));
}

function slugify(name: string): string {
  return 'ahm-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  // ---- Currency: this is an Ahmedabad (India) marketplace ----
  const config = await prisma.configuration.findFirst();
  const RUPEE = '₹';
  if (config && (config.currency !== 'INR' || config.currencySymbol !== RUPEE)) {
    await prisma.configuration.update({
      where: { id: config.id },
      data: { currency: 'INR', currencySymbol: RUPEE, deliveryRate: 25 },
    });
    console.log(`Configuration currency set to INR (${RUPEE}).`);
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

  // ---- Cuisine cache ----
  const cuisineCache = new Map<string, string>();
  async function getCuisineId(name: string, shopTypeId: string): Promise<string> {
    const key = name.toLowerCase();
    if (cuisineCache.has(key)) return cuisineCache.get(key)!;
    const existing = await prisma.cuisine.findFirst({ where: { name } });
    const row =
      existing ??
      (await prisma.cuisine.create({
        data: { name, description: `${name} cuisine`, shopTypeId },
      }));
    cuisineCache.set(key, row.id);
    return row.id;
  }

  // ---- Owner + review customer ----
  const owner = await prisma.user.upsert({
    where: { email: 'ahmedabad-vendors@padharo.local' },
    update: {},
    create: {
      email: 'ahmedabad-vendors@padharo.local',
      name: 'Padharo Ahmedabad Partners',
      password: await hashPassword('Vendor@123'),
      userType: 'VENDOR',
      emailIsVerified: true,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'ahmedabad-diner@padharo.local' },
    update: {},
    create: {
      email: 'ahmedabad-diner@padharo.local',
      name: 'Ahmedabad Diner',
      phone: '+919825000001',
      password: await hashPassword('Customer@123'),
      userType: 'CUSTOMER',
      emailIsVerified: true,
      phoneIsVerified: true,
    },
  });

  let reviewerAddress = await prisma.address.findFirst({ where: { userId: reviewer.id } });
  if (!reviewerAddress) {
    reviewerAddress = await prisma.address.create({
      data: {
        userId: reviewer.id,
        label: 'Home',
        deliveryAddress: 'Navrangpura, Ahmedabad, Gujarat 380009',
        details: 'Near HL College',
        latitude: AHM_LAT,
        longitude: AHM_LNG,
        selected: true,
      },
    });
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < RESTAURANTS.length; i++) {
    const seed = RESTAURANTS[i];
    const slug = slugify(seed.name);
    const shopType = seed.shop === 'grocery' ? groceryShopType : restaurantShopType;
    const { lat, lng } = scatter(i);
    const area = AREAS[i % AREAS.length];

    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      skipped++;
      continue;
    }

    const cuisineIds: string[] = [];
    for (const c of seed.cuisines) {
      if (c) cuisineIds.push(await getCuisineId(c, shopType.id));
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: seed.name,
        slug,
        orderPrefix: slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || 'AHM',
        address: `${area}, Ahmedabad, Gujarat`,
        city: 'Ahmedabad',
        postCode: '38000' + (i % 9),
        phone: `+9179${String(26000000 + i * 7919).slice(0, 8)}`,
        deliveryTime: seed.deliveryTime,
        minimumOrder: seed.costForOne ?? 0,
        tax: 5,
        latitude: lat,
        longitude: lng,
        shopTypeId: shopType.id,
        isActive: true,
        isAvailable: true,
        boundType: 'radius',
        circleBounds: { radius: 8000 } as Prisma.InputJsonValue,
        minDeliveryFee: 15,
        deliveryDistance: 12,
        deliveryFee: 25,
        bussinessDetails: {
          bankName: 'HDFC Bank',
          accountName: seed.name,
          accountCode: 'HDFC0001',
          accountNumber: String(50100000000000 + i),
          bussinessRegNo: `GST24AAA${1000 + i}A1Z5`,
          companyRegNo: `U55101GJ20${10 + (i % 15)}PTC${100000 + i}`,
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
            isActive: true,
            variations: { create: [{ title: 'Regular', price: food.price }] },
          },
        });
      }
    }

    // ---- Reviews (via lightweight delivered orders) ----
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
            orderId: `AHM-${slug}-${k + 1}`,
            userId: reviewer.id,
            restaurantId: restaurant.id,
            addressId: reviewerAddress.id,
            paymentMethod: 'COD',
            paymentStatus: 'PAID',
            orderStatus: 'DELIVERED',
            status: 'DELIVERED',
            orderAmount: variation.price + 25,
            paidAmount: variation.price + 25,
            deliveryCharges: 25,
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
            description: 'Seeded review for Ahmedabad marketplace demo.',
          },
        });
      }
    }

    created++;
  }

  const total = await prisma.restaurant.count({ where: { isActive: true } });
  console.log(`Ahmedabad seed complete: ${created} stores created, ${skipped} already existed.`);
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
