/**
 * One-off data fixup: renames every seed/demo identifier still using an old
 * brand's domain to the current one. Safe to re-run — each step only touches
 * rows that still match the old domain, so running it twice is a no-op the
 * second time.
 *
 *   npm run rebrand:emails
 *
 * Covers:
 *   - User.email ending in @enatega.local / @padharo.local  -> @localsell.in
 *   - Restaurant.username ending in @store.padharo           -> @store.localsell.in
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD_EMAIL_DOMAINS = ['@enatega.local', '@padharo.local'];
const OLD_STORE_USERNAME_SUFFIX = '@store.padharo';
const NEW_EMAIL_DOMAIN = '@localsell.in';
const NEW_STORE_USERNAME_SUFFIX = '@store.localsell.in';

async function main() {
  let usersRenamed = 0;

  for (const oldDomain of OLD_EMAIL_DOMAINS) {
    const users = await prisma.user.findMany({
      where: { email: { endsWith: oldDomain } },
      select: { id: true, email: true },
    });
    for (const u of users) {
      if (!u.email) continue;
      const localPart = u.email.slice(0, -oldDomain.length);
      const newEmail = `${localPart}${NEW_EMAIL_DOMAIN}`;
      const clash = await prisma.user.findUnique({ where: { email: newEmail } });
      if (clash) {
        console.log(`  skip ${u.email} -> ${newEmail} (target email already exists)`);
        continue;
      }
      await prisma.user.update({ where: { id: u.id }, data: { email: newEmail } });
      console.log(`  ${u.email} -> ${newEmail}`);
      usersRenamed++;
    }
  }

  const stores = await prisma.restaurant.findMany({
    where: { username: { endsWith: OLD_STORE_USERNAME_SUFFIX } },
    select: { id: true, username: true },
  });
  let storesRenamed = 0;
  for (const s of stores) {
    if (!s.username) continue;
    const localPart = s.username.slice(0, -OLD_STORE_USERNAME_SUFFIX.length);
    const newUsername = `${localPart}${NEW_STORE_USERNAME_SUFFIX}`;
    const clash = await prisma.restaurant.findUnique({ where: { username: newUsername } });
    if (clash) {
      console.log(`  skip ${s.username} -> ${newUsername} (target username already exists)`);
      continue;
    }
    await prisma.restaurant.update({ where: { id: s.id }, data: { username: newUsername } });
    console.log(`  ${s.username} -> ${newUsername}`);
    storesRenamed++;
  }

  console.log(`\nDone: ${usersRenamed} user email(s), ${storesRenamed} store username(s) renamed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
