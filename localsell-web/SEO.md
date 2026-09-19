# LocalSell search metadata

The public origin is `https://localsell.in`. Existing `/privacy` and `/terms`
remain canonical. UI branding, header and page spacing are not changed by SEO.

## Implemented

- Unique title, description, canonical URL, Open Graph and Twitter metadata for
  the homepage, discovery, restaurants, stores, rider and business signup pages,
  and both legal pages.
- Public store titles, descriptions, images and canonical URLs come from actual
  approved, active catalog records. Unknown or inactive stores use `noindex`.
  Lookup failure leaves the screen available with conservative noindex metadata;
  check API connectivity if a valid store is unexpectedly noindex.
- Shop-type metadata is indexable when the type has active public stores.
- `sitemap.xml` contains canonical public pages, approved active stores and their
  shop types. It refreshes hourly; catalog queries cache for five minutes. No
  invented modification dates or personal account/order URLs are included.
- `robots.txt` advertises the sitemap and allows public assets/pages. Private
  routes remain crawlable so bots can read their noindex directives; actual
  access control continues to come from the existing authentication guards.
- Login, account, order/payment, search, category-result, map and error routes
  carry noindex metadata and X-Robots-Tag headers.
- Organization/WebSite markup on the homepage; WebPage/CollectionPage and
  BreadcrumbList markup on public pages. No invented ratings, prices or reviews.
- `/social-image` returns a cacheable 1200 x 630 branded PNG using the existing
  logo. Real store photos override it for individual store previews when valid.
- Optional Google and Bing site ownership verification from server environment.

Metadata helpers: `lib/seo/metadata.ts`; catalog queries: `lib/seo/catalog.ts`.
`SEO_API_URL` optionally overrides `NEXT_PUBLIC_SERVER_URL` for server-to-server
public GraphQL reads. It can be the API base URL or its `/graphql` endpoint.
The public API must be reachable from the web deployment. No credentials or user
cookies are sent by SEO lookups.

## Deployment and search engine setup

1. Deploy the updated web application to the production domain.
2. Add the real verification values from your accounts as
   `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION`, then redeploy.
   DNS verification can also be used; these values are optional.
3. Submit `https://localsell.in/sitemap.xml` in Google Search Console and Bing
   Webmaster Tools. Use URL Inspection for the homepage and important store
   pages. These account actions have not been performed by this code change.
4. Test structured data with Google's Rich Results Test and inspect crawling,
   indexing and Core Web Vitals after deployment.
5. Keep real store names, descriptions, addresses, photos and menus accurate.
   Product/listing content still uses the existing client-side data screens;
   server-rendered metadata does not turn all menus into server-rendered HTML.

English and Hindi currently share URLs through the locale cookie. No fabricated
language-specific URLs or hreflang variants are advertised. If separate locale
routes are introduced, add matching translated metadata and hreflang then.

SEO supports discovery and eligibility; it cannot promise immediate indexing,
first position or a particular rich result. Keyword stuffing and obsolete
`meta keywords`/`revisit-after` tags are intentionally not added.

## Verify locally

With the web app running:

```sh
node scripts/check-web-seo.cjs http://localhost:3000
```

Run this command from the repository root. It checks actual HTTP metadata,
sitemap exclusions, structured data, private-page noindex and preview dimensions.

References used:
- https://developers.google.com/search/docs/essentials
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
