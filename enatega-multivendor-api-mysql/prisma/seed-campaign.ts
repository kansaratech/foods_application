/**
 * Padharo — demo "Festive Week" campaign seed.
 *
 * One global 20% coupon, a scheduled banner for each storefront placement
 * (HOME / STORE / LANDING), and a "Festive Special" badge on a couple of dishes.
 * Idempotent — re-running just refreshes the 14-day window.
 *
 * Run on its own:   npm run seed:campaign
 * Also runs at the tail of:   npm run seed:deogarh
 */
import { PrismaClient } from '@prisma/client';

const U = (id: string, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export async function seedFestivalCampaign(prisma: PrismaClient): Promise<void> {
  const now = Date.now();
  const startDate = new Date(now - 1 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now + 14 * 24 * 60 * 60 * 1000);

  // Global coupon — `title` is the code.
  const existingCoupon = await prisma.coupon.findFirst({
    where: { title: 'FESTIVE20', restaurantId: null },
  });
  if (existingCoupon) {
    await prisma.coupon.update({
      where: { id: existingCoupon.id },
      data: { discount: 20, enabled: true, lifeTimeActive: false, startDate, endDate },
    });
  } else {
    await prisma.coupon.create({
      data: { title: 'FESTIVE20', discount: 20, enabled: true, lifeTimeActive: false, startDate, endDate },
    });
  }

  // One banner per storefront placement.
  const banners = [
    {
      placement: 'HOME',
      title: 'Deogarh Festive Week',
      description: 'Sweets, thalis & chaat — 20% off across town',
      file: U('1601050690597-df0568f70950'),
    },
    {
      placement: 'STORE',
      title: 'Festive Week is on',
      description: 'Use code FESTIVE20 at checkout for 20% off',
      file: U('1631452180519-c014fe946bc7'),
    },
    {
      placement: 'LANDING',
      title: 'Padharo Festive Week',
      description: 'Order your festival feast from Deogarh — 20% off',
      file: U('1606491956689-2ea866880c84'),
    },
  ];

  for (const b of banners) {
    const data = {
      title: b.title,
      description: b.description,
      file: b.file,
      action: 'Navigate Specific Page',
      screen: 'Near By Restaurants',
      placement: b.placement,
      priority: 10,
      couponCode: 'FESTIVE20',
      isActive: true,
      startDate,
      endDate,
    };
    const existing = await prisma.banner.findFirst({
      where: { title: b.title, placement: b.placement },
    });
    if (existing) {
      await prisma.banner.update({ where: { id: existing.id }, data });
    } else {
      await prisma.banner.create({ data });
    }
  }

  // "Festive Special" badge on a couple of dishes.
  const badgeTitles = ['Deogarh Special Thali', 'Mawa Kachori (2 pcs)'];
  let badged = 0;
  for (const title of badgeTitles) {
    const res = await prisma.food.updateMany({ where: { title }, data: { badge: 'Festive Special' } });
    badged += res.count;
  }

  console.log(`Festival campaign seeded: FESTIVE20 coupon + ${banners.length} banners + ${badged} badged dishes.`);
}

// Standalone runner — only when this file is executed directly.
if (require.main === module) {
  const prisma = new PrismaClient();
  seedFestivalCampaign(prisma)
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
