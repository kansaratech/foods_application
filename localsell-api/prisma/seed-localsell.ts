/**
 * LocalSell — full marketplace seed (Deogarh, Rajsamand, Rajasthan).
 *
 * Wipes ALL existing commerce data (stores, menus, add-ons, options, orders,
 * commission/payout ledgers, reviews) and rebuilds a realistic four-store
 * marketplace with proper variations, add-on option groups, build-your-own
 * combos and per-item photos.
 *
 * Keeps: users, Configuration, delivery zones, shop types, cuisines, riders.
 *
 *   npm run seed:localsell
 *
 * Store-app login:  <slug>@store.localsell.in / Store@123
 * Vendor login:     <slug>-owner@localsell.in / Vendor@123
 * Admin:            admin@localsell.in / Admin@123
 * Customer:         customer@localsell.in / Customer@123
 * Rider:            rider1 / Rider@123
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';

const prisma = new PrismaClient();

const DEOGARH_LAT = 25.534;
const DEOGARH_LNG = 73.899;
const RUPEE = '₹';

// Unsplash stock photos (https — allowed by the web CSP img-src).
const IMG = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const PIC = {
  pizzaShop: IMG('1513104890138-7c749659a591'),
  pizzaMargherita: IMG('1574071318508-1cdbab80d002'),
  pizzaFarmhouse: IMG('1565299624946-b28f40a0ae38'),
  pizzaPaneer: IMG('1594007654729-407eedc4be65'),
  pizzaChicken: IMG('1628840042765-356cda07504e'),
  garlicBread: IMG('1573140247632-f8fd74997d5c'),
  sandwich: IMG('1528735602780-2552fd46c7af'),
  clubSandwich: IMG('1567234669003-dce7a7a88821'),
  burger: IMG('1568901346375-23c9450c58cd'),
  fries: IMG('1630384060421-cb20d0e0649d'),
  manchurian: IMG('1626074353765-517a681e40be'),
  chilliPaneer: IMG('1603894584373-5ac82b2ae398'),
  noodles: IMG('1612929633738-8fe44f7ec841'),
  friedRice: IMG('1603133872878-684f208fb84b'),
  coffeeHot: IMG('1509042239860-f550ce710b93'),
  coffeeCold: IMG('1461023058943-07fb0f1ff6a4'),
  coldDrink: IMG('1581636625402-29b2a704ef13'),
  thali: IMG('1631452180519-c014fe946bc7'),
  dalMakhani: IMG('1626500155537-92d8f37c8c9c'),
  shahiPaneer: IMG('1631452180519-c014fe946bc7'),
  kadhai: IMG('1585937421612-70a008356fbe'),
  laalMaas: IMG('1606491956689-2ea866880c84'),
  dalBaati: IMG('1567188040759-fb8a883dc6d8'),
  roti: IMG('1565557623262-b51c2513a641'),
  gulabJamun: IMG('1606491956689-2ea866880c84'),
  kaju: IMG('1631452180519-c014fe946bc7'),
  ghewar: IMG('1666181593796-3e7c1e02b2b0'),
  besan: IMG('1589308078059-be1415eab4c3'),
  bhujia: IMG('1601050690597-df0568f70950'),
  mixBox: IMG('1606491956689-2ea866880c84'),
} as const;

const STORE_PIC: Record<string, string> = {
  'hot-pizza-corner': PIC.pizzaShop,
  'devshree-kitchen': PIC.thali,
  'deogarh-mahal-rasoi': PIC.laalMaas,
  'shrinath-sweets-namkeen': PIC.gulabJamun,
};

// ---------------------------------------------------------------- types
type Opt = { title: string; price: number; description?: string };
type AddonGroup = {
  title: string;
  min?: number; // default 0
  max: number;
  options: Opt[];
};
type FoodSeed = {
  title: string;
  desc: string;
  image: string;
  /** flat price when there are no size/weight variations */
  price?: number;
  /** size / weight variations (Regular, Medium, Large / 250g, 500g, 1kg …) */
  variations?: Opt[];
  addons?: AddonGroup[];
  /** marks a build-your-own / value combo for the customer app card */
  combo?: { worth: number };
};
type CatSeed = { title: string; foods: FoodSeed[] };
type StoreSeed = {
  name: string;
  slug: string;
  tagline: string;
  area: string;
  cuisines: string[];
  deliveryTime: number;
  minOrder: number;
  rating: number;
  deliveryProvider: 'PLATFORM' | 'SELF' | 'BOTH';
  categories: CatSeed[];
};

// ---------------------------------------------------------------- shared add-on groups
const EXTRA_TOPPINGS: AddonGroup = {
  title: 'Extra Toppings',
  max: 6,
  options: [
    { title: 'Extra Cheese', price: 60 },
    { title: 'Paneer', price: 70 },
    { title: 'Mushroom', price: 50 },
    { title: 'Onion & Capsicum', price: 30 },
    { title: 'Sweet Corn', price: 35 },
    { title: 'Jalapeño', price: 40 },
    { title: 'Black Olives', price: 45 },
  ],
};
const PIZZA_CRUST: AddonGroup = {
  title: 'Crust',
  min: 1,
  max: 1,
  options: [
    { title: 'Hand Tossed', price: 0 },
    { title: 'Thin Crust', price: 0 },
    { title: 'Cheese Burst', price: 90 },
    { title: 'Wheat Base', price: 20 },
  ],
};
const SPICE_LEVEL: AddonGroup = {
  title: 'Spice Level',
  min: 1,
  max: 1,
  options: [
    { title: 'Mild', price: 0 },
    { title: 'Medium', price: 0 },
    { title: 'Extra Spicy', price: 0 },
  ],
};
const SANDWICH_ADDON: AddonGroup = {
  title: 'Make it better',
  max: 3,
  options: [
    { title: 'Extra Cheese Slice', price: 25 },
    { title: 'Grilled', price: 15 },
    { title: 'Peri Peri Sprinkle', price: 10 },
  ],
};

// ---------------------------------------------------------------- stores
const STORES: StoreSeed[] = [
  {
    name: 'Hot Pizza Corner',
    slug: 'hot-pizza-corner',
    tagline: 'Wood-fired pizzas, sandwiches, Indo-Chinese & shakes',
    area: 'Station Road',
    cuisines: ['Pizza', 'Fast Food'],
    deliveryTime: 30,
    minOrder: 149,
    rating: 4.4,
    deliveryProvider: 'BOTH',
    categories: [
      {
        title: 'Pizzas',
        foods: [
          {
            title: 'Margherita Pizza',
            desc: 'Classic 100% real mozzarella on our signature sauce',
            image: PIC.pizzaMargherita,
            variations: [
              { title: 'Regular 7"', price: 149 },
              { title: 'Medium 10"', price: 279 },
              { title: 'Large 12"', price: 429 },
            ],
            addons: [PIZZA_CRUST, EXTRA_TOPPINGS],
          },
          {
            title: 'Farmhouse Pizza',
            desc: 'Onion, capsicum, tomato, grilled mushroom & corn',
            image: PIC.pizzaFarmhouse,
            variations: [
              { title: 'Regular 7"', price: 199 },
              { title: 'Medium 10"', price: 359 },
              { title: 'Large 12"', price: 529 },
            ],
            addons: [PIZZA_CRUST, EXTRA_TOPPINGS],
          },
          {
            title: 'Peppy Paneer Pizza',
            desc: 'Paneer, crisp capsicum and red paprika',
            image: PIC.pizzaPaneer,
            variations: [
              { title: 'Regular 7"', price: 219 },
              { title: 'Medium 10"', price: 389 },
              { title: 'Large 12"', price: 569 },
            ],
            addons: [PIZZA_CRUST, EXTRA_TOPPINGS],
          },
          {
            title: 'Chicken Tikka Pizza',
            desc: 'Tandoori chicken tikka, onion and mint mayo drizzle',
            image: PIC.pizzaChicken,
            variations: [
              { title: 'Regular 7"', price: 259 },
              { title: 'Medium 10"', price: 449 },
              { title: 'Large 12"', price: 649 },
            ],
            addons: [PIZZA_CRUST, EXTRA_TOPPINGS],
          },
          {
            title: 'Cheesy Garlic Bread',
            desc: 'Stuffed garlic bread with mozzarella & herbs (6 pcs)',
            image: PIC.garlicBread,
            price: 129,
            addons: [{ title: 'Dip', max: 2, options: [{ title: 'Cheese Dip', price: 25 }, { title: 'Peri Peri Dip', price: 25 }] }],
          },
        ],
      },
      {
        title: 'Sandwiches & Burgers',
        foods: [
          {
            title: 'Veg Grilled Sandwich',
            desc: 'Aloo, beetroot, cucumber, tomato & chutney, grilled',
            image: PIC.sandwich,
            variations: [
              { title: '2 Slice', price: 89 },
              { title: '4 Slice Club', price: 149 },
            ],
            addons: [SANDWICH_ADDON],
          },
          {
            title: 'Paneer Tikka Sandwich',
            desc: 'Masala paneer, onion and mint mayo',
            image: PIC.clubSandwich,
            variations: [
              { title: '2 Slice', price: 119 },
              { title: '4 Slice Club', price: 189 },
            ],
            addons: [SANDWICH_ADDON],
          },
          {
            title: 'Aloo Tikki Burger',
            desc: 'Spiced potato patty, lettuce, tomato & burger sauce',
            image: PIC.burger,
            price: 79,
            addons: [{ title: 'Upgrade', max: 2, options: [{ title: 'Add Cheese Slice', price: 20 }, { title: 'Double Patty', price: 40 }] }],
          },
          {
            title: 'Peri Peri Fries',
            desc: 'Crispy fries tossed in peri peri seasoning',
            image: PIC.fries,
            variations: [
              { title: 'Regular', price: 69 },
              { title: 'Large', price: 109 },
            ],
          },
        ],
      },
      {
        title: 'Indo-Chinese',
        foods: [
          {
            title: 'Veg Manchurian',
            desc: 'Fried veg dumplings in spicy-sweet garlic gravy',
            image: PIC.manchurian,
            variations: [
              { title: 'Half', price: 119 },
              { title: 'Full', price: 189 },
            ],
            addons: [SPICE_LEVEL, { title: 'Style', min: 1, max: 1, options: [{ title: 'Gravy', price: 0 }, { title: 'Dry', price: 0 }] }],
          },
          {
            title: 'Chilli Paneer',
            desc: 'Paneer cubes, bell pepper, onion in chilli soy toss',
            image: PIC.chilliPaneer,
            variations: [
              { title: 'Half', price: 149 },
              { title: 'Full', price: 239 },
            ],
            addons: [SPICE_LEVEL],
          },
          {
            title: 'Veg Hakka Noodles',
            desc: 'Wok-tossed noodles with julienne vegetables',
            image: PIC.noodles,
            variations: [
              { title: 'Half', price: 99 },
              { title: 'Full', price: 159 },
            ],
            addons: [{ title: 'Add-on', max: 3, options: [{ title: 'Add Manchurian (2 pc)', price: 40 }, { title: 'Add Paneer', price: 50 }, { title: 'Add Egg', price: 25 }] }],
          },
          {
            title: 'Veg Fried Rice',
            desc: 'Basmati rice tossed with vegetables and soy',
            image: PIC.friedRice,
            variations: [
              { title: 'Half', price: 99 },
              { title: 'Full', price: 159 },
            ],
          },
        ],
      },
      {
        title: 'Beverages',
        foods: [
          {
            title: 'Filter Coffee',
            desc: 'South-Indian style strong filter coffee',
            image: PIC.coffeeHot,
            price: 40,
          },
          {
            title: 'Cold Coffee',
            desc: 'Thick blended cold coffee with ice cream',
            image: PIC.coffeeCold,
            variations: [
              { title: 'Regular', price: 90 },
              { title: 'Large', price: 130 },
            ],
            addons: [{ title: 'Add-on', max: 2, options: [{ title: 'Extra Ice Cream Scoop', price: 30 }, { title: 'Chocolate Shot', price: 20 }] }],
          },
          {
            title: 'Masala Cold Drink (300 ml)',
            desc: 'Chilled soft drink',
            image: PIC.coldDrink,
            price: 40,
          },
        ],
      },
    ],
  },

  {
    name: 'Devshree Kitchen',
    slug: 'devshree-kitchen',
    tagline: 'Home-style North Indian, pizzas & build-your-own thali',
    area: 'Rajmahal Road',
    cuisines: ['North Indian', 'Thali'],
    deliveryTime: 35,
    minOrder: 120,
    rating: 4.5,
    deliveryProvider: 'SELF',
    categories: [
      {
        title: 'Build Your Own Thali',
        foods: [
          {
            title: 'Make Your Thali',
            desc: 'Pick your breads and sabzis — we plate it fresh. Price updates with your choices.',
            image: PIC.thali,
            price: 90, // base: dal + rice + salad + papad + sweet
            combo: { worth: 260 },
            addons: [
              {
                title: 'Choose your bread',
                min: 1,
                max: 4,
                options: [
                  { title: 'Tawa Roti', price: 12 },
                  { title: 'Butter Roti', price: 18 },
                  { title: 'Missi Roti', price: 22 },
                  { title: 'Butter Naan', price: 40 },
                ],
              },
              {
                title: 'Choose 2 sabzi',
                min: 2,
                max: 2,
                options: [
                  { title: 'Dal Fry', price: 60 },
                  { title: 'Aloo Matar', price: 60 },
                  { title: 'Gatte ki Sabzi', price: 80 },
                  { title: 'Paneer Butter Masala', price: 110 },
                  { title: 'Mix Veg', price: 70 },
                  { title: 'Ker Sangri', price: 90 },
                ],
              },
              {
                title: 'Add extras',
                max: 4,
                options: [
                  { title: 'Jeera Rice', price: 45 },
                  { title: 'Boondi Raita', price: 30 },
                  { title: 'Gulab Jamun (2 pc)', price: 40 },
                  { title: 'Buttermilk', price: 25 },
                ],
              },
            ],
          },
          {
            title: 'Rajasthani Special Thali',
            desc: 'Dal-baati-churma, gatte ki sabzi, ker sangri, rice, salad',
            image: PIC.dalBaati,
            combo: { worth: 320 },
            variations: [
              { title: 'Regular', price: 240 },
              { title: 'Jumbo (extra baati + sweet)', price: 320 },
            ],
          },
        ],
      },
      {
        title: 'North Indian Mains',
        foods: [
          {
            title: 'Dal Makhani',
            desc: 'Slow-cooked black lentils, butter & cream',
            image: PIC.dalMakhani,
            variations: [
              { title: 'Half', price: 120 },
              { title: 'Full', price: 190 },
            ],
          },
          {
            title: 'Shahi Paneer',
            desc: 'Paneer in a rich cashew-tomato gravy',
            image: PIC.shahiPaneer,
            variations: [
              { title: 'Half', price: 150 },
              { title: 'Full', price: 230 },
            ],
          },
          {
            title: 'Kadhai Veg',
            desc: 'Seasonal vegetables in freshly ground kadhai masala',
            image: PIC.kadhai,
            variations: [
              { title: 'Half', price: 130 },
              { title: 'Full', price: 200 },
            ],
          },
          {
            title: 'Tandoori Roti',
            desc: 'Fresh from the tandoor',
            image: PIC.roti,
            price: 12,
            addons: [{ title: 'Make it', max: 1, options: [{ title: 'With Butter', price: 6 }] }],
          },
        ],
      },
      {
        title: 'Pizzas',
        foods: [
          {
            title: 'Margherita Pizza',
            desc: 'Mozzarella and house tomato sauce',
            image: PIC.pizzaMargherita,
            variations: [
              { title: 'Regular 7"', price: 149 },
              { title: 'Large 12"', price: 399 },
            ],
            addons: [EXTRA_TOPPINGS],
          },
          {
            title: 'Paneer Makhani Pizza',
            desc: 'Makhani sauce base, paneer and onion',
            image: PIC.pizzaPaneer,
            variations: [
              { title: 'Regular 7"', price: 219 },
              { title: 'Large 12"', price: 519 },
            ],
            addons: [EXTRA_TOPPINGS],
          },
        ],
      },
    ],
  },

  {
    name: 'Deogarh Mahal Rasoi',
    slug: 'deogarh-mahal-rasoi',
    tagline: 'Royal Mewari thalis, laal maas & heritage recipes',
    area: 'Fort Road',
    cuisines: ['Rajasthani', 'Thali'],
    deliveryTime: 40,
    minOrder: 200,
    rating: 4.7,
    deliveryProvider: 'PLATFORM',
    categories: [
      {
        title: 'Royal Thali',
        foods: [
          {
            title: 'Deogarh Mahal Thali',
            desc: 'Dal, baati, churma, gatte, ker sangri, kadhi, rice, 2 breads, salad, sweet',
            image: PIC.thali,
            combo: { worth: 420 },
            variations: [
              { title: 'Veg Royal', price: 320 },
              { title: 'Non-Veg (with Laal Maas)', price: 480 },
            ],
            addons: [
              {
                title: 'Add to your thali',
                max: 4,
                options: [
                  { title: 'Extra Baati (2 pc)', price: 40 },
                  { title: 'Extra Churma', price: 50 },
                  { title: 'Mawa Kachori', price: 60 },
                  { title: 'Chaas', price: 25 },
                ],
              },
            ],
          },
          {
            title: 'Mini Rajasthani Thali',
            desc: '1 sabzi, dal, rice, 2 roti, salad, papad, sweet',
            image: PIC.dalBaati,
            combo: { worth: 240 },
            price: 190,
          },
        ],
      },
      {
        title: 'Mewari Specials',
        foods: [
          {
            title: 'Laal Maas',
            desc: 'Fiery Mathania red-chilli mutton curry',
            image: PIC.laalMaas,
            variations: [
              { title: 'Half', price: 280 },
              { title: 'Full', price: 460 },
            ],
            addons: [SPICE_LEVEL],
          },
          {
            title: 'Gatte ki Sabzi',
            desc: 'Gram-flour dumplings in spiced yoghurt gravy',
            image: PIC.kadhai,
            variations: [
              { title: 'Half', price: 110 },
              { title: 'Full', price: 180 },
            ],
          },
          {
            title: 'Ker Sangri',
            desc: 'Desert beans & berries tempered dry sabzi',
            image: PIC.kadhai,
            price: 190,
          },
          {
            title: 'Dal Baati Churma',
            desc: 'Panchmel dal, 3 baati, sweet churma',
            image: PIC.dalBaati,
            variations: [
              { title: '3 Baati', price: 190 },
              { title: '5 Baati', price: 270 },
            ],
          },
        ],
      },
      {
        title: 'Breads & Extras',
        foods: [
          {
            title: 'Bajra Roti',
            desc: 'Pearl-millet roti with white butter',
            image: PIC.roti,
            price: 25,
          },
          {
            title: 'Churma Ladoo (2 pc)',
            desc: 'Ghee-rich wheat churma ladoo',
            image: PIC.besan,
            price: 70,
          },
        ],
      },
    ],
  },

  {
    name: 'Shrinath Sweets & Namkeen',
    slug: 'shrinath-sweets-namkeen',
    tagline: 'Fresh mithai, ghewar & Bikaneri namkeen by weight',
    area: 'Sadar Bazaar',
    cuisines: ['Sweets', 'Namkeen'],
    deliveryTime: 25,
    minOrder: 100,
    rating: 4.6,
    deliveryProvider: 'BOTH',
    categories: [
      {
        title: 'Mithai (by weight)',
        foods: [
          {
            title: 'Kaju Katli',
            desc: 'Cashew fudge with edible silver leaf',
            image: PIC.kaju,
            variations: [
              { title: '250 g', price: 260 },
              { title: '500 g', price: 500 },
              { title: '1 kg', price: 950 },
            ],
          },
          {
            title: 'Gulab Jamun',
            desc: 'Soft khoya dumplings in cardamom syrup',
            image: PIC.gulabJamun,
            variations: [
              { title: '4 pc', price: 90 },
              { title: '500 g', price: 220 },
              { title: '1 kg', price: 420 },
            ],
          },
          {
            title: 'Besan Chakki',
            desc: 'Roasted gram-flour fudge with cardamom',
            image: PIC.besan,
            variations: [
              { title: '250 g', price: 130 },
              { title: '500 g', price: 250 },
              { title: '1 kg', price: 480 },
            ],
          },
          {
            title: 'Mawa Ghewar (seasonal)',
            desc: 'Disc-shaped honeycomb sweet soaked in rabri',
            image: PIC.ghewar,
            variations: [
              { title: '1 pc', price: 90 },
              { title: 'Box of 4', price: 340 },
            ],
          },
        ],
      },
      {
        title: 'Namkeen (by weight)',
        foods: [
          {
            title: 'Bikaneri Bhujia',
            desc: 'Crisp spiced moth-bean noodles',
            image: PIC.bhujia,
            variations: [
              { title: '250 g', price: 70 },
              { title: '500 g', price: 130 },
              { title: '1 kg', price: 250 },
            ],
          },
          {
            title: 'Navratan Mixture',
            desc: 'Nine-ingredient sweet-and-salty namkeen mix',
            image: PIC.bhujia,
            variations: [
              { title: '250 g', price: 80 },
              { title: '500 g', price: 150 },
              { title: '1 kg', price: 280 },
            ],
          },
          {
            title: 'Pyaaz Kachori (2 pc)',
            desc: 'Spiced onion kachori, served hot',
            image: PIC.besan,
            price: 60,
          },
        ],
      },
      {
        title: 'Gift Boxes',
        foods: [
          {
            title: 'Assorted Mithai Box',
            desc: 'Chef’s selection of 6 sweets',
            image: PIC.mixBox,
            combo: { worth: 700 },
            variations: [
              { title: '500 g', price: 360 },
              { title: '1 kg', price: 690 },
            ],
          },
          {
            title: 'Sweet + Namkeen Hamper',
            desc: '500 g Kaju Katli + 500 g Bhujia + dry fruits pack',
            image: PIC.mixBox,
            combo: { worth: 900 },
            price: 780,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------- helpers
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const openingTimes = (o: string, c: string) =>
  DAYS.map((day) => ({ day, times: [{ startTime: [o, '00'], endTime: [c, '00'] }] }));

function scatter(i: number): { lat: number; lng: number } {
  const golden = 2.399963;
  const r = 0.004 + (i % 4) * 0.0035;
  const a = i * golden;
  return { lat: DEOGARH_LAT + r * Math.cos(a), lng: DEOGARH_LNG + r * Math.sin(a) };
}

function ratingsFor(target: number): number[] {
  const base = Math.min(5, Math.max(1, Math.floor(target)));
  const bump = Math.round((target - base) * 5);
  return Array.from({ length: 5 }, (_, i) => Math.min(5, i < bump ? base + 1 : base));
}

async function wipeCommerceData() {
  console.log('Wiping existing stores, menus, add-ons, options and orders…');
  await prisma.orderItemAddonOption.deleteMany({});
  await prisma.orderItemAddon.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.orderChatMessage.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.commissionRecord.deleteMany({});
  await prisma.commissionBill.deleteMany({});
  await prisma.riderCashEntry.deleteMany({});
  await prisma.riderCashRemittance.deleteMany({});
  await prisma.walletAdjustment.deleteMany({});
  await prisma.payoutRunItem.deleteMany({});
  await prisma.payoutRun.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.withdrawRequest.deleteMany({});
  await prisma.storeDeliveryAgent.deleteMany({});
  await prisma.variationAddon.deleteMany({});
  await prisma.option.deleteMany({});
  await prisma.addon.deleteMany({});
  await prisma.variation.deleteMany({});
  await prisma.food.deleteMany({});
  await prisma.subCategory.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.storeDocument.deleteMany({});
  await prisma.restaurantCuisine.deleteMany({});
  await prisma.restaurant.deleteMany({});
}

async function ensureUsers() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@localsell.in' },
    update: {},
    create: {
      email: 'admin@localsell.in',
      name: 'LocalSell Admin',
      password: await hashPassword('Admin@123'),
      userType: 'ADMIN',
      emailIsVerified: true,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@localsell.in' },
    update: {},
    create: {
      email: 'customer@localsell.in',
      name: 'Deogarh Diner',
      phone: '+919829000001',
      password: await hashPassword('Customer@123'),
      userType: 'CUSTOMER',
      emailIsVerified: true,
      phoneIsVerified: true,
    },
  });

  let address = await prisma.address.findFirst({ where: { userId: customer.id, label: 'Home' } });
  if (!address) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        deliveryAddress: 'Station Road, Deogarh, Rajsamand, Rajasthan 313331',
        details: 'Near Bus Stand',
        latitude: DEOGARH_LAT,
        longitude: DEOGARH_LNG,
        selected: true,
      },
    });
  }

  for (const uname of ['rider1', 'rider2']) {
    const rider = await prisma.user.upsert({
      where: { username: uname },
      update: {},
      create: {
        username: uname,
        name: uname === 'rider1' ? 'Mohan Lal' : 'Suresh Kumar',
        phone: uname === 'rider1' ? '+919829111101' : '+919829111102',
        password: await hashPassword('Rider@123'),
        userType: 'RIDER',
        emailIsVerified: true,
        phoneIsVerified: true,
      },
    });
    await prisma.riderProfile.upsert({
      where: { userId: rider.id },
      update: { available: true, approvalStatus: 'APPROVED' },
      create: {
        userId: rider.id,
        vehicleType: 'MOTORCYCLE',
        available: true,
        approvalStatus: 'APPROVED',
        latitude: DEOGARH_LAT,
        longitude: DEOGARH_LNG,
      },
    });
  }

  return { admin, customer, address };
}

async function getShopType() {
  return prisma.shopType.upsert({
    where: { slug: 'restaurant' },
    update: {},
    create: { name: 'Restaurant', slug: 'restaurant' },
  });
}

async function ensureConfig() {
  const config = await prisma.configuration.findFirst();
  const data = {
    currency: 'INR',
    currencySymbol: RUPEE,
    deliveryRate: 20,
    defaultCommissionRate: 20,
    commissionBillingCycle: 'MONTHLY',
    defaultLatitude: DEOGARH_LAT,
    defaultLongitude: DEOGARH_LNG,
    skipMobileVerification: true,
    skipEmailVerification: true,
    testOtp: '1234',
  };
  if (config) await prisma.configuration.update({ where: { id: config.id }, data });
  else await prisma.configuration.create({ data });
}

async function ensureZone() {
  const existing = await prisma.zone.findFirst({ where: { title: 'Deogarh Town' } });
  if (existing) return;
  const d = 0.07;
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
}

// ---------------------------------------------------------------- main
async function main() {
  await ensureConfig();
  await ensureZone();
  const shopType = await getShopType();
  const { customer, address } = await ensureUsers();
  await wipeCommerceData();

  const cuisineCache = new Map<string, string>();
  const getCuisineId = async (name: string) => {
    const key = name.toLowerCase();
    if (cuisineCache.has(key)) return cuisineCache.get(key)!;
    const row =
      (await prisma.cuisine.findFirst({ where: { name } })) ??
      (await prisma.cuisine.create({ data: { name, description: `${name}`, shopTypeId: shopType.id } }));
    cuisineCache.set(key, row.id);
    return row.id;
  };

  let storeCount = 0;
  let foodCount = 0;
  let orderCount = 0;

  for (let i = 0; i < STORES.length; i++) {
    const s = STORES[i];
    const { lat, lng } = scatter(i);
    const owner = await prisma.user.upsert({
      where: { email: `${s.slug}-owner@localsell.in` },
      update: { userType: 'VENDOR' },
      create: {
        email: `${s.slug}-owner@localsell.in`,
        name: `${s.name} Owner`,
        password: await hashPassword('Vendor@123'),
        userType: 'VENDOR',
        emailIsVerified: true,
      },
    });

    const cuisineIds: string[] = [];
    for (const c of s.cuisines) cuisineIds.push(await getCuisineId(c));

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: s.name,
        slug: s.slug,
        description: s.tagline,
        image: STORE_PIC[s.slug],
        logo: STORE_PIC[s.slug],
        username: `${s.slug}@store.localsell.in`,
        password: await hashPassword('Store@123'),
        orderPrefix: s.slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase(),
        address: `${s.area}, Deogarh, Rajsamand, Rajasthan`,
        city: 'Deogarh',
        state: 'Rajasthan',
        postCode: '313331',
        phone: `+9198290${String(10000 + i * 137).slice(0, 5)}`,
        deliveryTime: s.deliveryTime,
        minimumOrder: s.minOrder,
        tax: 5,
        commissionRate: 20,
        latitude: lat,
        longitude: lng,
        shopTypeId: shopType.id,
        isActive: true,
        isAvailable: true,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        pickup: true,
        delivery: true,
        deliveryProvider: s.deliveryProvider,
        boundType: 'radius',
        circleBounds: { radius: 8000 } as Prisma.InputJsonValue,
        minDeliveryFee: 15,
        deliveryDistance: 10,
        deliveryFee: 25,
        openingTimes: openingTimes('09', '23') as Prisma.InputJsonValue,
        bussinessDetails: {
          bankName: 'Bank of Baroda',
          accountName: s.name,
          accountCode: 'BARB0DEOGAR',
          accountNumber: String(37010000000000 + i),
          taxRate: 5,
        } as Prisma.InputJsonValue,
        cuisines: { create: cuisineIds.map((cuisineId) => ({ cuisineId })) },
      },
    });
    storeCount++;

    // Self-delivery staff for the two SELF/BOTH stores.
    if (s.deliveryProvider !== 'PLATFORM') {
      await prisma.storeDeliveryAgent.createMany({
        data: [
          { restaurantId: restaurant.id, name: 'Ramesh (store rider)', phone: '+919829200001' },
          { restaurantId: restaurant.id, name: 'Dinesh (store rider)', phone: '+919829200002' },
        ],
      });
    }

    // First real variation, for the demo orders.
    let firstVariation: { id: string; price: number; foodTitle: string; foodId: string } | null = null;

    for (const cat of s.categories) {
      const category = await prisma.category.create({
        data: { restaurantId: restaurant.id, title: cat.title },
      });

      for (const f of cat.foods) {
        const variations = f.variations?.length
          ? f.variations
          : [{ title: 'Regular', price: f.price ?? 0 }];

        const food = await prisma.food.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: category.id,
            title: f.title,
            description: f.desc,
            image: f.image,
            images: [f.image] as Prisma.InputJsonValue,
            isActive: true,
            isCombo: !!f.combo,
            compareAtPrice: f.combo?.worth ?? null,
            variations: {
              create: variations.map((v) => ({
                title: v.title,
                price: v.price,
              })),
            },
          },
          include: { variations: true },
        });
        foodCount++;

        // Add-on groups → real Addon rows, linked to every variation of this food.
        if (f.addons?.length) {
          for (const g of f.addons) {
            const min = g.min ?? 0;
            const addon = await prisma.addon.create({
              data: {
                restaurantId: restaurant.id,
                title: g.title,
                quantityMinimum: min,
                quantityMaximum: Math.max(g.max, min),
                isRequired: min >= 1,
                options: {
                  create: g.options.map((o) => ({
                    title: o.title,
                    description: o.description ?? null,
                    price: o.price,
                  })),
                },
              },
            });
            await prisma.variationAddon.createMany({
              data: food.variations.map((v) => ({ variationId: v.id, addonId: addon.id })),
            });
          }
        }

        if (!firstVariation && food.variations[0]) {
          firstVariation = {
            id: food.variations[0].id,
            price: food.variations[0].price,
            foodTitle: food.title,
            foodId: food.id,
          };
        }
      }
    }

    // A few DELIVERED orders so ratings / earnings / reports have data.
    if (firstVariation) {
      const ratings = ratingsFor(s.rating);
      for (let k = 0; k < ratings.length; k++) {
        const qty = 1 + (k % 2);
        const food = firstVariation.price * qty;
        const delivery = 25;
        const tax = Math.round(food * 0.05);
        const total = food + delivery + tax;
        const daysAgo = k + 1;
        const order = await prisma.order.create({
          data: {
            orderId: `${restaurant.orderPrefix}-${1001 + k}`,
            userId: customer.id,
            restaurantId: restaurant.id,
            riderId: null,
            addressId: address.id,
            paymentMethod: k % 2 === 0 ? 'COD' : 'ONLINE',
            paymentStatus: 'PAID',
            orderStatus: 'DELIVERED',
            status: 'DELIVERED',
            deliveryMode: s.deliveryProvider === 'SELF' ? 'SELF' : 'PLATFORM',
            isPickedUp: false,
            orderAmount: total,
            paidAmount: total,
            deliveryCharges: delivery,
            taxationAmount: tax,
            orderDate: new Date(Date.now() - daysAgo * 86400000),
            deliveredAt: new Date(Date.now() - daysAgo * 86400000 + 3600000),
            items: {
              create: [
                {
                  foodId: firstVariation.foodId,
                  variationId: firstVariation.id,
                  title: `${firstVariation.foodTitle} (Regular)`,
                  price: firstVariation.price,
                  quantity: qty,
                },
              ],
            },
          },
        });
        orderCount++;
        await prisma.review.create({
          data: {
            orderId: order.id,
            restaurantId: restaurant.id,
            userId: customer.id,
            rating: ratings[k],
            description: ['Loved it', 'Fresh and hot', 'Good portion', 'Will order again', 'Tasty'][k],
          },
        });
      }
    }

    console.log(`  ✓ ${s.name}  —  ${s.categories.reduce((n, c) => n + c.foods.length, 0)} items, ${s.deliveryProvider} delivery`);
  }

  console.log(
    `\nDone. ${storeCount} stores, ${foodCount} menu items, ${orderCount} demo orders.\n` +
      `Customer app / web centre: Deogarh (${DEOGARH_LAT}, ${DEOGARH_LNG}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
