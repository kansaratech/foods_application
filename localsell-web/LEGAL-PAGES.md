# Localsell public legal pages

These routes are included in the Localsell web application. Deploy the updated
`localsell-web` application on `localsell.in` before using the production links.
Adding these files does not itself publish them or change Meta settings.

| Use | URL |
| --- | --- |
| Public Privacy Policy / Meta Privacy Policy URL | https://localsell.in/privacy |
| Public Terms / Meta Terms of Service URL | https://localsell.in/terms |
| Privacy Policy, WhatsApp section | https://localsell.in/privacy#whatsapp |
| Terms, WhatsApp section | https://localsell.in/terms#whatsapp |
| Privacy requests and deletion instructions | https://localsell.in/privacy#your-choices |

Use the full page URLs for Meta's policy fields. The section links are useful for
sharing specific information in a chat. No separate WhatsApp-only policy is
needed for the content implemented here. This does not guarantee Meta approval.

The pages use the website's existing layout, original Localsell logo, header,
fonts and footer. Their policy content is server-rendered and public; no sign-in
is required. They include canonical URLs, social-preview text, print styling,
mobile layouts, page navigation and contact@maekotech.com. Website footers and
the sign-in legal links point to these routes. The existing `/privacy` and `/terms`
routes serve the updated pages directly and are the canonical URLs. The longer
`/privacy-policy` and `/terms-and-conditions` paths render the same content as
compatibility aliases, with canonical metadata pointing to the original URLs.
They do not reverse-redirect, avoiding loops for browsers that cached an earlier
redirect from the short URLs.

## Maintaining the content

- Edit `lib/legal/content.ts`; shared layout and metadata are in
  `lib/legal/LegalPage.tsx`.
- The operator and city are taken from the existing Localsell footer:
  Maekotech Solutions LLP, Deogarh, Rajasthan, India. The contact email was
  supplied by the business owner. A full registered address and named grievance
  contact were not supplied; add verified details when available.
- Update the displayed date and its machine-readable `dateTime` together when
  publishing a revised policy.
- The native app currently loads its separate legal text from API configuration;
  this website change does not overwrite that database content. Keep that text
  aligned when publishing these policies.

## WhatsApp operational follow-up

The current webhook logs inbound messages; it does not implement automatic STOP
handling or route replies to support. These pages therefore direct users to
email support and WhatsApp's block controls rather than promise a STOP bot.
The team must monitor the published inbox and action preference/deletion
requests. Publication alone does not implement permission collection,
suppression of opted-out numbers, a deletion workflow or a cookie consent system.
Validate these operational processes before representing them as automated.

Meta's messaging policy requires opt-in for business-initiated contact and
honouring opt-out requests, including those received outside WhatsApp. Review
the existing notification consent/suppression flow before enabling campaigns.
The older claim in `LOCALSELL_WHATSAPP.md` that utility messages need no opt-in
must not be relied on.

References checked while drafting:
- https://business.whatsapp.com/policy
- https://www.whatsapp.com/legal/business-terms
- https://www.meity.gov.in/documents/act-and-policies

## Release check

After deploying, open each full URL in a signed-out/private browser, including on
a phone. Check that the content and support email appear, that the response is
HTTP 200, and that `/privacy` and `/terms` serve directly without redirects. Then enter the two full URLs into the
appropriate Meta app fields and share the same URLs with customers.
