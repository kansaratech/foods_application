/**
 * LocalSell — config-driven marketplace seed.
 *
 *   1. edit  prisma/seed-data.json
 *   2. run   npm run seed
 *
 * This WIPES every data table (users, stores, menus, orders, commission /
 * payout / rider-cash ledgers, reviews, riders, customers, zones, cuisines,
 * the Configuration row) and rebuilds the whole marketplace from the JSON.
 *
 * The one thing it keeps: infra secrets already on the Configuration row —
 * Google Maps / Stripe / PayPal / SMTP / Sentry / Cloudinary / Firebase keys —
 * are read back before the wipe and merged into the fresh Configuration so a
 * reseed never loses your API keys. Everything else is defined by the JSON.
 *
 * Logins after a default seed:
 *   Admin     admin@localsell.in / Admin@123
 *   Vendor    <store-slug>-owner@localsell.in / Vendor@123
 *   Store app <store-slug>@store.localsell.in / Store@123
 *   Customer  customer@localsell.in / Customer@123
 *   Rider     rider1 / Rider@123
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/services/auth.service';
import {
  resolveCommissionRate,
  orderFoodSubtotal,
  isCommissionSelfCollected,
} from '../src/utils/commission';

const prisma = new PrismaClient();

// ---------------------------------------------------------------- config types
type Opt = { title: string; price: number; description?: string };
type AddonGroup = { title: string; min?: number; max: number; options: Opt[] };
type FoodSeed = {
  title: string;
  desc: string;
  image?: string;
  price?: number;
  variations?: Opt[];
  addons?: Array<string | AddonGroup>;
  combo?: { worth: number };
  badge?: string;
};
type CatSeed = { title: string; foods: FoodSeed[] };
type StoreSeed = {
  name: string;
  slug: string;
  tagline?: string;
  area?: string;
  /** shopType slug (e.g. "restaurant", "grocery"). Defaults to "restaurant". */
  shopType?: string;
  image?: string;
  cuisines?: string[];
  deliveryTime?: number;
  minOrder?: number;
  salesTax?: number;
  commissionRate?: number;
  rating?: number;
  deliveryProvider?: 'PLATFORM' | 'SELF' | 'BOTH';
  deliveryRadiusKm?: number;
  hours?: { open: string; close: string };
  storeLogin?: { username: string; password: string };
  deliveryAgents?: Array<{ name: string; phone?: string }>;
  categories: CatSeed[];
};
type VendorSeed = { name: string; email: string; password: string; stores: StoreSeed[] };

type SeedConfig = {
  marketplace: {
    town: string;
    district?: string;
    state?: string;
    postCode?: string;
    center: { lat: number; lng: number };
    storeSpreadKm?: number;
  };
  configuration: Record<string, unknown>;
  shopTypes: Array<{ name: string; slug: string }>;
  zones: Array<{ title: string; description?: string; radiusKm?: number; boundary?: unknown }>;
  admin: { email: string; name: string; password: string };
  customers: Array<{
    email: string;
    name: string;
    phone?: string;
    password: string;
    address?: { label: string; line: string; details?: string; lat: number; lng: number };
  }>;
  riders: Array<{
    username: string;
    name: string;
    phone?: string;
    email?: string;
    password: string;
    vehicleType?: string;
    available?: boolean;
    zone?: string;
  }>;
  demoOrders?: { enabled?: boolean; perStoreDeliveredOrders?: number };
  images?: Record<string, string>;
  addonGroups?: Record<string, AddonGroup>;
  vendors: VendorSeed[];
  coupons?: Array<{
    title: string;
    discount: number;
    enabled?: boolean;
    lifeTimeActive?: boolean;
    startDate?: string;
    endDate?: string;
    storeSlug?: string;
  }>;
  banners?: Array<{
    title?: string;
    description?: string;
    placement?: string;
    priority?: number;
    couponCode?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }>;
};

// ---------------------------------------------------------------- helpers
const CONFIG_PATH = join(__dirname, 'seed-data.json');
const cfg: SeedConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

const CENTER = cfg.marketplace.center;
const KM = 1 / 111; // ~degrees per km

/** Operational Configuration fields the JSON owns — everything else on the row
 *  (API keys, SMTP, payment secrets…) is preserved across a reseed. */
const CONFIG_OPERATIONAL_KEYS = [
  'currency', 'currencySymbol', 'deliveryRate', 'defaultCommissionRate',
  'commissionBillingCycle', 'riderCashLimit', 'platformLegalName', 'platformAddress',
  'platformGstin', 'skipEmailVerification', 'skipMobileVerification', 'skipWhatsAppOTP',
  'testOtp', 'termsAndConditions', 'privacyPolicy', 'defaultLatitude', 'defaultLongitude',
  'costType', 'isPaidVersion', 'enableCustomerDemoMode',
  // SMTP: JSON owns the non-secret parts; emailPassword comes from env
  // (SMTP_PASSWORD) or is kept from the existing row — never from the JSON.
  'enableEmail', 'email', 'emailName', 'smtpHost', 'smtpPort', 'smtpSecure',
  'smtpUser', 'formEmail',
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const openingTimes = (o: string, c: string) =>
  DAYS.map((day) => ({ day, times: [{ startTime: [o, '00'], endTime: [c, '00'] }] }));

function scatter(i: number, spreadKm: number): { lat: number; lng: number } {
  const golden = 2.399963;
  const r = (0.4 + (i % 4) * 0.35) * spreadKm * KM;
  const a = i * golden;
  return { lat: CENTER.lat + r * Math.cos(a), lng: CENTER.lng + r * Math.sin(a) };
}

function squareBoundary(radiusKm: number): Prisma.InputJsonValue {
  const d = radiusKm * KM;
  return [[
    [CENTER.lng - d, CENTER.lat - d],
    [CENTER.lng + d, CENTER.lat - d],
    [CENTER.lng + d, CENTER.lat + d],
    [CENTER.lng - d, CENTER.lat + d],
    [CENTER.lng - d, CENTER.lat - d],
  ]] as Prisma.InputJsonValue;
}

function ratingsFor(target: number, n: number): number[] {
  const base = Math.min(5, Math.max(1, Math.floor(target)));
  const bump = Math.round((target - base) * n);
  return Array.from({ length: n }, (_, i) => Math.min(5, i < bump ? base + 1 : base));
}

const resolveImage = (key?: string): string | null => {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  return cfg.images?.[key] ?? null;
};

const resolveAddon = (a: string | AddonGroup): AddonGroup => {
  if (typeof a === 'string') {
    const g = cfg.addonGroups?.[a];
    if (!g) throw new Error(`addonGroups["${a}"] not found in seed-data.json`);
    return g;
  }
  return a;
};

// ---------------------------------------------------------------- wipe
async function wipeEverything(): Promise<Record<string, unknown> | null> {
  const existingConfig = await prisma.configuration.findFirst();

  const rows = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT TABLE_NAME as name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`;
  const tables = rows.map((r) => r.name).filter((n) => n !== '_prisma_migrations');

  // One transaction, one connection: the FK-check toggle has to stay in scope
  // for every DELETE. DELETE (not TRUNCATE) so it's transactional — nothing is
  // half-wiped if a later statement fails.
  await prisma.$transaction([
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0'),
    ...tables.map((t) => prisma.$executeRawUnsafe(`DELETE FROM \`${t}\``)),
    prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1'),
  ]);
  console.log(`  · cleared ${tables.length} tables`);

  return existingConfig as unknown as Record<string, unknown> | null;
}

// ---------------------------------------------------------------- rebuild
async function seedConfiguration(preserved: Record<string, unknown> | null) {
  const kept: Record<string, unknown> = {};
  if (preserved) {
    for (const [k, v] of Object.entries(preserved)) {
      if (k === 'id' || k === 'customerDemoZoneId') continue;
      if (CONFIG_OPERATIONAL_KEYS.includes(k)) continue;
      kept[k] = v;
    }
  }
  const fromJson: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg.configuration)) {
    if (k.startsWith('_')) continue; // JSON comment keys
    fromJson[k] = v;
  }
  if (fromJson.defaultLatitude == null) fromJson.defaultLatitude = CENTER.lat;
  if (fromJson.defaultLongitude == null) fromJson.defaultLongitude = CENTER.lng;

  // SMTP password: env wins, else keep whatever was already on the row. Never
  // from the JSON (it isn't there).
  const smtpPass = process.env.SMTP_PASSWORD?.trim();
  if (smtpPass) fromJson.emailPassword = smtpPass;

  await prisma.configuration.create({ data: { ...kept, ...fromJson } as Prisma.ConfigurationCreateInput });
  const emailReady =
    !!(fromJson.enableEmail && fromJson.smtpHost && (fromJson.emailPassword || kept.emailPassword));
  console.log(
    `  · Configuration rebuilt${Object.keys(kept).length ? ` (kept ${Object.keys(kept).length} infra fields)` : ''}` +
      ` — email ${emailReady ? 'ready' : 'NOT configured (set SMTP_PASSWORD)'}`,
  );
}

async function main() {
  console.log(`LocalSell seed — ${cfg.marketplace.town} (${CENTER.lat}, ${CENTER.lng})`);

  console.log('\n=== Wipe ===');
  const preservedConfig = await wipeEverything();

  console.log('\n=== Platform ===');
  await seedConfiguration(preservedConfig);

  const shopTypeBySlug = new Map<string, string>();
  for (const st of cfg.shopTypes) {
    const row = await prisma.shopType.create({ data: { name: st.name, slug: st.slug } });
    shopTypeBySlug.set(st.slug, row.id);
  }
  const restaurantShopTypeId =
    shopTypeBySlug.get('restaurant') ?? Array.from(shopTypeBySlug.values())[0];
  const shopTypeIdFor = (slug?: string) =>
    (slug && shopTypeBySlug.get(slug)) || restaurantShopTypeId;
  console.log(`  · ${cfg.shopTypes.length} shop types`);

  const zoneByTitle = new Map<string, string>();
  for (const z of cfg.zones) {
    const row = await prisma.zone.create({
      data: {
        title: z.title,
        description: z.description ?? null,
        boundary: (z.boundary as Prisma.InputJsonValue) ?? squareBoundary(z.radiusKm ?? 7),
      },
    });
    zoneByTitle.set(z.title, row.id);
  }
  console.log(`  · ${cfg.zones.length} delivery zones`);

  const cuisineIdByName = new Map<string, string>();
  const getCuisineId = async (name: string, shopTypeSlug?: string) => {
    const key = name.toLowerCase();
    if (cuisineIdByName.has(key)) return cuisineIdByName.get(key)!;
    const row = await prisma.cuisine.create({
      data: {
        name,
        description: name,
        shopTypeId: shopTypeIdFor(shopTypeSlug),
      },
    });
    cuisineIdByName.set(key, row.id);
    return row.id;
  };

  console.log('\n=== People ===');
  await prisma.user.create({
    data: {
      email: cfg.admin.email,
      name: cfg.admin.name,
      password: await hashPassword(cfg.admin.password),
      userType: 'ADMIN',
      emailIsVerified: true,
    },
  });
  console.log(`  · admin: ${cfg.admin.email}`);

  const firstCustomer: { id: string; addressId: string | null } = { id: '', addressId: null };
  for (const c of cfg.customers) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        name: c.name,
        phone: c.phone ?? null,
        password: await hashPassword(c.password),
        userType: 'CUSTOMER',
        emailIsVerified: true,
        phoneIsVerified: !!c.phone,
      },
    });
    let addressId: string | null = null;
    if (c.address) {
      const addr = await prisma.address.create({
        data: {
          userId: user.id,
          label: c.address.label,
          deliveryAddress: c.address.line,
          details: c.address.details ?? null,
          latitude: c.address.lat,
          longitude: c.address.lng,
          selected: true,
        },
      });
      addressId = addr.id;
    }
    if (!firstCustomer.id) {
      firstCustomer.id = user.id;
      firstCustomer.addressId = addressId;
    }
  }
  console.log(`  · ${cfg.customers.length} customer(s)`);

  let firstRiderId = '';
  for (const r of cfg.riders) {
    const user = await prisma.user.create({
      data: {
        username: r.username,
        email: r.email ?? null,
        name: r.name,
        phone: r.phone ?? null,
        password: await hashPassword(r.password),
        userType: 'RIDER',
        emailIsVerified: true,
        phoneIsVerified: !!r.phone,
      },
    });
    if (!firstRiderId) firstRiderId = user.id;
    await prisma.riderProfile.create({
      data: {
        userId: user.id,
        vehicleType: r.vehicleType ?? 'MOTORCYCLE',
        available: r.available ?? true,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        zoneId: r.zone ? zoneByTitle.get(r.zone) ?? null : null,
        latitude: CENTER.lat,
        longitude: CENTER.lng,
      },
    });
  }
  console.log(`  · ${cfg.riders.length} rider(s)`);

  console.log('\n=== Stores ===');
  let storeIndex = 0;
  let storeCount = 0;
  let foodCount = 0;
  let orderCount = 0;
  const spreadKm = cfg.marketplace.storeSpreadKm ?? 1.5;
  const demoEnabled = cfg.demoOrders?.enabled ?? true;
  const demoN = cfg.demoOrders?.perStoreDeliveredOrders ?? 5;

  for (const vendor of cfg.vendors) {
    const owner = await prisma.user.create({
      data: {
        email: vendor.email,
        name: vendor.name,
        password: await hashPassword(vendor.password),
        userType: 'VENDOR',
        emailIsVerified: true,
      },
    });

    for (const s of vendor.stores) {
      const { lat, lng } = scatter(storeIndex++, spreadKm);
      const cuisineIds: string[] = [];
      for (const cName of s.cuisines ?? [])
        cuisineIds.push(await getCuisineId(cName, s.shopType));

      const restaurant = await prisma.restaurant.create({
        data: {
          ownerId: owner.id,
          name: s.name,
          slug: s.slug,
          description: s.tagline ?? null,
          image: resolveImage(s.image),
          logo: resolveImage(s.image),
          username: s.storeLogin?.username ?? `${s.slug}@store.localsell.in`,
          password: await hashPassword(s.storeLogin?.password ?? 'Store@123'),
          orderPrefix: s.slug.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || 'STR',
          address: `${s.area ? s.area + ', ' : ''}${cfg.marketplace.town}${cfg.marketplace.district ? ', ' + cfg.marketplace.district : ''}${cfg.marketplace.state ? ', ' + cfg.marketplace.state : ''}`,
          city: cfg.marketplace.town,
          state: cfg.marketplace.state ?? null,
          postCode: cfg.marketplace.postCode ?? null,
          phone: `+9198290${String(10000 + storeIndex * 137).slice(0, 5)}`,
          deliveryTime: s.deliveryTime ?? 30,
          minimumOrder: s.minOrder ?? 0,
          tax: s.salesTax ?? 5,
          commissionRate: s.commissionRate ?? Number(cfg.configuration.defaultCommissionRate ?? 20),
          latitude: lat,
          longitude: lng,
          shopTypeId: shopTypeIdFor(s.shopType),
          isActive: true,
          isAvailable: true,
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          pickup: true,
          delivery: true,
          deliveryProvider: s.deliveryProvider ?? 'PLATFORM',
          boundType: 'radius',
          circleBounds: { radius: (s.deliveryRadiusKm ?? 10) * 1000 } as Prisma.InputJsonValue,
          minDeliveryFee: 15,
          deliveryDistance: s.deliveryRadiusKm ?? 10,
          deliveryFee: 25,
          openingTimes: openingTimes(s.hours?.open ?? '09', s.hours?.close ?? '23') as Prisma.InputJsonValue,
          bussinessDetails: {
            bankName: 'Bank of Baroda',
            accountName: s.name,
            accountCode: 'BARB0DEOGAR',
            accountNumber: String(37010000000000 + storeIndex),
            taxRate: s.salesTax ?? 5,
          } as Prisma.InputJsonValue,
          cuisines: { create: cuisineIds.map((cuisineId) => ({ cuisineId })) },
        },
      });
      storeCount++;

      if (s.deliveryAgents?.length) {
        await prisma.storeDeliveryAgent.createMany({
          data: s.deliveryAgents.map((a) => ({
            restaurantId: restaurant.id,
            name: a.name,
            phone: a.phone ?? null,
          })),
        });
      }

      let firstVariation: {
        id: string; price: number; foodId: string; foodTitle: string; variationTitle: string;
      } | null = null;

      for (const cat of s.categories) {
        const category = await prisma.category.create({
          data: { restaurantId: restaurant.id, title: cat.title },
        });

        for (const f of cat.foods) {
          const variations = f.variations?.length
            ? f.variations
            : [{ title: 'Regular', price: f.price ?? 0 }];
          const img = resolveImage(f.image);

          const food = await prisma.food.create({
            data: {
              restaurantId: restaurant.id,
              categoryId: category.id,
              title: f.title,
              description: f.desc,
              image: img,
              images: (img ? [img] : []) as Prisma.InputJsonValue,
              badge: f.badge ?? null,
              isActive: true,
              isCombo: !!f.combo,
              compareAtPrice: f.combo?.worth ?? null,
              variations: { create: variations.map((v) => ({ title: v.title, price: v.price })) },
            },
            include: { variations: true },
          });
          foodCount++;

          for (const rawGroup of f.addons ?? []) {
            const g = resolveAddon(rawGroup);
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

          if (!firstVariation && food.variations[0]) {
            firstVariation = {
              id: food.variations[0].id,
              price: food.variations[0].price,
              foodId: food.id,
              foodTitle: food.title,
              variationTitle: food.variations[0].title,
            };
          }
        }
      }

      if (demoEnabled && demoN > 0 && firstVariation && firstCustomer.id) {
        const ratings = ratingsFor(s.rating ?? 4.3, demoN);
        const self = (s.deliveryProvider ?? 'PLATFORM') === 'SELF';
        const agent = self
          ? await prisma.storeDeliveryAgent.findFirst({ where: { restaurantId: restaurant.id } })
          : null;
        const rate = resolveCommissionRate(
          restaurant.commissionRate,
          Number(cfg.configuration.defaultCommissionRate ?? 20),
        );

        for (let k = 0; k < demoN; k++) {
          const qty = 1 + (k % 2);
          const food = firstVariation.price * qty;
          const delivery = 25;
          const tip = k % 3 === 0 ? 10 : 0;
          const tax = Math.round(food * ((s.salesTax ?? 5) / 100));
          const total = food + delivery + tip + tax;
          const isCod = k % 2 === 0;
          const daysAgo = k + 1;
          const deliveredAt = new Date(Date.now() - daysAgo * 86400000 + 3600000);
          const order = await prisma.order.create({
            data: {
              orderId: `${restaurant.orderPrefix}-${1001 + k}`,
              userId: firstCustomer.id,
              restaurantId: restaurant.id,
              riderId: self ? null : firstRiderId || null,
              storeDeliveryAgentId: agent?.id ?? null,
              addressId: firstCustomer.addressId,
              paymentMethod: isCod ? 'COD' : 'ONLINE',
              paymentStatus: 'PAID',
              orderStatus: 'DELIVERED',
              status: 'DELIVERED',
              deliveryMode: self ? 'SELF' : 'PLATFORM',
              deliveryConfirmedBy: 'OTP',
              isPickedUp: false,
              orderAmount: total,
              paidAmount: total,
              deliveryCharges: delivery,
              tipping: tip,
              taxationAmount: tax,
              orderDate: new Date(Date.now() - daysAgo * 86400000),
              deliveredAt,
              items: {
                create: [{
                  foodId: firstVariation.foodId,
                  variationId: firstVariation.id,
                  title: `${firstVariation.foodTitle} (${firstVariation.variationTitle})`,
                  price: firstVariation.price,
                  quantity: qty,
                }],
              },
            },
          });
          orderCount++;

          // commission ledger — mirrors what finalizeDelivery() writes on a real
          // DELIVERED. selfCollected: online + COD-fleet keep it via the money
          // flow; COD-SELF (store holds the cash) is the one that gets invoiced.
          const foodSubtotal = Math.max(0, orderFoodSubtotal(order));
          await prisma.commissionRecord.create({
            data: {
              orderId: order.id,
              orderNumber: order.orderId,
              restaurantId: restaurant.id,
              vendorId: owner.id,
              foodSubtotal,
              commissionRate: rate,
              commissionAmount: Math.round(foodSubtotal * (rate / 100) * 100) / 100,
              paymentMethod: order.paymentMethod,
              isPickedUp: false,
              selfCollected: isCommissionSelfCollected(order),
              orderDeliveredAt: deliveredAt,
            },
          });

          // rider COD cash — rider owes the full order amount (deposits 100%)
          if (isCod && order.riderId) {
            await prisma.riderCashEntry.create({
              data: {
                orderId: order.id,
                orderNumber: order.orderId,
                riderId: order.riderId,
                collectedTotal: total,
                riderKeeps: delivery + tip,
                owedToPlatform: total,
                deliveredAt,
              },
            });
          }

          await prisma.review.create({
            data: {
              orderId: order.id,
              restaurantId: restaurant.id,
              userId: firstCustomer.id,
              rating: ratings[k],
              description: ['Loved it', 'Fresh and hot', 'Good portion', 'Will order again', 'Tasty'][k % 5],
            },
          });
        }
      }

      const items = s.categories.reduce((n, c) => n + c.foods.length, 0);
      console.log(`  ✓ ${s.name} — ${items} items, ${s.deliveryProvider ?? 'PLATFORM'} delivery`);
    }
  }

  // Settle the demo riders' COD cash — these are historical delivered orders,
  // so their cash has "already been deposited". Leaves outstanding = 0 so the
  // cash-limit gate doesn't block fresh test orders.
  let settledRiders = 0;
  for (const r of await prisma.riderProfile.findMany({ select: { userId: true } })) {
    const open = await prisma.riderCashEntry.findMany({
      where: { riderId: r.userId, remittanceId: null },
    });
    if (!open.length) continue;
    const amount = open.reduce((n, e) => n + e.owedToPlatform, 0);
    const rem = await prisma.riderCashRemittance.create({
      data: {
        riderId: r.userId,
        amount: Math.round(amount * 100) / 100,
        entryCount: open.length,
        method: 'upi',
        reference: 'SEED-SETTLED',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
    await prisma.riderCashEntry.updateMany({
      where: { id: { in: open.map((e) => e.id) } },
      data: { remittanceId: rem.id },
    });
    settledRiders++;
  }
  if (settledRiders) console.log(`  · settled demo COD cash for ${settledRiders} rider(s)`);

  console.log('\n=== Extras ===');
  const restBySlug = new Map<string, string>();
  for (const v of cfg.vendors) for (const s of v.stores) {
    const row = await prisma.restaurant.findUnique({ where: { slug: s.slug } });
    if (row) restBySlug.set(s.slug, row.id);
  }
  for (const c of cfg.coupons ?? []) {
    await prisma.coupon.create({
      data: {
        title: c.title,
        discount: c.discount,
        enabled: c.enabled ?? true,
        lifeTimeActive: c.lifeTimeActive ?? false,
        startDate: c.startDate ? new Date(c.startDate) : null,
        endDate: c.endDate ? new Date(c.endDate) : null,
        restaurantId: c.storeSlug ? restBySlug.get(c.storeSlug) ?? null : null,
      },
    });
  }
  for (const b of cfg.banners ?? []) {
    await prisma.banner.create({
      data: {
        title: b.title ?? null,
        description: b.description ?? null,
        placement: b.placement ?? 'HOME',
        priority: b.priority ?? 0,
        couponCode: b.couponCode ?? null,
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        isActive: b.isActive ?? true,
      },
    });
  }
  console.log(`  · ${cfg.coupons?.length ?? 0} coupon(s), ${cfg.banners?.length ?? 0} banner(s)`);

  console.log(
    `\n✅ Done — ${storeCount} stores, ${foodCount} menu items, ${orderCount} demo orders.\n` +
      `   Admin:    ${cfg.admin.email} / (see seed-data.json)\n` +
      `   Vendor:   <slug>-owner@localsell.in / Vendor@123\n` +
      `   Store:    <slug>@store.localsell.in / Store@123\n` +
      `   Customer: ${cfg.customers[0]?.email ?? '—'}\n` +
      `   Rider:    ${cfg.riders[0]?.username ?? '—'} / (see seed-data.json)`,
  );
}

main()
  .catch((e) => {
    console.error('\n❌ seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
