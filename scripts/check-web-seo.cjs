// Read-only integration check against a running LocalSell web server.
// node scripts/check-web-seo.cjs [http://localhost:3000]
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:3000';

async function read(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1' },
    redirect: 'manual', signal: AbortSignal.timeout(120000),
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return { response, html: await response.text() };
}

function meta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/g) || [];
  const tag = tags.find(value => value.includes(`name="${name}"`) || value.includes(`property="${name}"`));
  return tag?.match(/content="([^"]*)"/)?.[1];
}

async function main() {
  const [{ html: robots }, { html: sitemap }] = await Promise.all([read('/robots.txt'), read('/sitemap.xml')]);
  assert.match(robots, /Sitemap: https:\/\/localsell\.in\/sitemap\.xml/);
  assert.match(robots, /Allow: \//);
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert(urls.includes('https://localsell.in/privacy'));
  assert(urls.includes('https://localsell.in/terms'));
  assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
  assert(urls.every(url => new URL(url).origin === 'https://localsell.in'), 'Wrong sitemap origin');
  assert(!urls.some(url => /\/(profile|order|auth|search|privacy-policy|terms-and-conditions)(\/|$)/.test(url)), 'Private or duplicate URL in sitemap');
  console.log(`PASS robots + sitemap (${urls.length} canonical URLs)`);

  for (const batch of [['/', '/privacy', '/terms'], ['/restaurants', '/store', '/discovery']]) {
    await Promise.all(batch.map(async path => {
      const { html } = await read(path);
      const canonical = `https://localsell.in${path === '/' ? '' : path}`;
      assert(html.includes(`rel="canonical" href="${canonical}"`), `${path}: canonical missing`);
      assert(meta(html, 'description')?.length > 60, `${path}: description missing`);
      assert.equal(meta(html, 'og:url'), canonical, `${path}: OG URL mismatch`);
      assert.equal(meta(html, 'og:image'), 'https://localsell.in/social-image', `${path}: image missing`);
      assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
      assert(!meta(html, 'robots')?.includes('noindex'), `${path}: unexpectedly noindex`);
      const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
      assert(schemas.length, `${path}: structured data missing`);
      assert(schemas.some(schema => schema['@graph']?.some(node => node['@type'] === 'BreadcrumbList')));
      if (path === '/') assert(schemas.some(schema => schema['@graph']?.some(node => node['@type'] === 'Organization')));
      console.log(`PASS ${path}: metadata + structured data`);
    }));
  }

  for (const path of ['/auth/login', '/profile', '/order/checkout']) {
    const { html, response } = await read(path);
    assert(meta(html, 'robots')?.includes('noindex'), `${path}: robots meta missing`);
    assert(response.headers.get('x-robots-tag')?.includes('noindex'), `${path}: robots header missing`);
    console.log(`PASS ${path}: private-page indexing protection`);
  }

  const merchant = urls.find(url => /\/(restaurant|store)\/[^/]+\/[^/]+$/.test(url));
  if (merchant) {
    const { html } = await read(new URL(merchant).pathname);
    assert.equal(meta(html, 'og:url'), merchant);
    assert(!meta(html, 'robots')?.includes('noindex'));
    assert(!html.includes('<title>Local Store |'), 'Store metadata did not load');
    console.log('PASS store metadata from the public catalog');
  } else console.log('NOTE no active store URLs available; catalog SEO needs a reachable public API.');

  const image = await fetch(`${base}/social-image`, { signal: AbortSignal.timeout(120000) });
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/png/);
  const png = Buffer.from(await image.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  console.log('PASS branded social image: 1200 x 630 PNG');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
