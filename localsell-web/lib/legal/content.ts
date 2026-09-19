export const LEGAL_ORIGIN = "https://localsell.in";
export const LEGAL_EMAIL = "contact@maekotech.com";
export const LEGAL_UPDATED = "19 September 2026";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};
export type LegalDocument = {
  title: string;
  path: string;
  description: string;
  summary: string[];
  sections: LegalSection[];
};

export const privacyPolicy: LegalDocument = {
  title: "Privacy Policy",
  path: "/privacy",
  description:
    "How Localsell uses your information when you browse, order, arrange deliveries or contact us, including on WhatsApp.",
  summary: [
    "We use your details to manage your account, deliver orders and help you.",
    "Stores, delivery partners and service providers receive information needed for their work.",
    "You can ask about your information, request deletion or contact us about messages.",
  ],
  sections: [
    {
      id: "who-we-are",
      title: "Who we are and what this covers",
      paragraphs: [
        "Localsell is a local shopping and delivery platform operated by Maekotech Solutions LLP, Deogarh, Rajasthan, India. In this policy, “we”, “us” and “our” mean the Localsell service operated by Maekotech Solutions LLP.",
        "This policy covers our website, customer app, store and rider services, and communications with us, including WhatsApp. A store, payment provider or WhatsApp may also have its own privacy policy for the services it provides directly.",
      ],
    },
    {
      id: "information",
      title: "Information we collect",
      paragraphs: [
        "The information involved depends on how you use Localsell. Browsing a store does not require the same information as delivering an order.",
      ],
      bullets: [
        "Account details: your name, phone number, email, profile details and sign-in information you provide.",
        "Orders and payments: items ordered, order history, delivery instructions, invoices, payment status, transaction references and refund records. Online payments are processed by the payment provider shown at checkout.",
        "Location: delivery addresses and, if you allow device location access, location used to find nearby stores or arrange delivery. Rider services may use location during deliveries for dispatch and order tracking.",
        "Support and communications: messages, attachments, reviews, complaints and communication preferences. WhatsApp communications can include your number, message content and delivery or read status.",
        "Technical information: device and browser information, IP address, usage events, error logs, cookies, local storage and notification tokens.",
        "Partner information: store or rider contact details, service details and identity, bank or business documents supplied for onboarding, verification and payouts.",
      ],
    },
    {
      id: "use",
      title: "Why we use your information",
      paragraphs: [
        "We use relevant information to provide the service you request, manage transactions and support, protect accounts and meet applicable legal duties. Where consent is required, we seek it for that use; optional device permissions can be changed in your device settings.",
      ],
      bullets: [
        "Create and verify accounts, including sending a sign-in code you request.",
        "Show relevant stores, process orders and payments, arrange delivery, issue invoices and handle refunds.",
        "Provide support and communicate about your account or orders.",
        "Verify partners, manage assignments and process settlements.",
        "Investigate misuse, troubleshoot errors, understand service usage and improve reliability.",
        "Keep records required for accounting, taxes, disputes and applicable law.",
      ],
    },
    {
      id: "sharing",
      title: "Who receives your information",
      paragraphs: [
        "Stores and assigned delivery partners receive information relevant to fulfilling your order, such as items, your name, delivery address, instructions and contact details. Support staff may access relevant records to resolve a problem.",
        "We use providers for hosting, storage, authentication, maps, notifications, payments and analytics. Depending on the feature, these include Google services, Firebase, Cashfree, Microsoft Clarity and Meta’s WhatsApp Business services. They process information for the functions they provide, under applicable terms and privacy policies.",
        "Information may also be disclosed where required by law, to respond to a lawful request, protect people or investigate fraud. If the business is transferred or reorganised, relevant information may be transferred subject to applicable safeguards and notice requirements. Providers may process information outside India, subject to applicable data-transfer requirements.",
      ],
    },
    {
      id: "whatsapp",
      title: "WhatsApp messages and your choices",
      paragraphs: [
        "When you request a WhatsApp sign-in code or communicate with Localsell on WhatsApp, your phone number and relevant message information are processed through WhatsApp Business services. Order communications may include confirmations, delivery updates, payment or refund status and invoices.",
        "Permission for WhatsApp communications should be specific to the messages you choose to receive. Agreeing to these policies or placing an order is not, by itself, consent to unrelated promotional messages.",
        "To ask us to stop WhatsApp messages, email contact@maekotech.com with the phone number concerned and your request. You can also block Localsell using WhatsApp’s controls. Replies to automated messages may not receive a support response; use email or Localsell’s Get help feature for assistance. Blocking messages does not cancel an order; check its status in Localsell.",
        "WhatsApp and Meta process information under their own terms and privacy policy. Do not send full card details, bank passwords, payment PINs or identity documents in a WhatsApp chat.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies, analytics and device permissions",
      paragraphs: [
        "Cookies and browser storage support features such as sign-in, preferences and cart-related activity. Localsell also uses Microsoft Clarity to understand website interactions, including usage analytics and session recordings.",
        "You can manage cookies and site storage in your browser and location, camera and notification permissions in your device settings. Blocking storage or withdrawing a permission may affect the feature that relies on it. You can enter a delivery address manually when you do not want to share device location.",
      ],
    },
    {
      id: "retention",
      title: "Keeping and protecting your information",
      paragraphs: [
        "Information is kept for as long as needed for its purpose, including providing the service, maintaining financial records, resolving disputes, preventing fraud and complying with law. Different records may need different retention periods. Closing an account does not always require immediate deletion of invoices, transaction records or records needed for a legal matter.",
        "We use access controls and technical protections to reduce unauthorised access and misuse. No online service or method of transmission is completely secure. Keep account credentials and verification codes private and contact us if you suspect misuse.",
      ],
    },
    {
      id: "your-choices",
      title: "Your information and your rights",
      paragraphs: [
        "You can update available account details in your profile. You can also email contact@maekotech.com to request access to, correction of or deletion of your information, withdraw consent for an optional use, or raise a privacy complaint. Rights and exceptions depend on the law applicable to your request.",
        "Explain your request and provide the account email or phone number so we can locate relevant records. We may need to verify your identity before disclosing or changing information. Do not email a password, OTP or full payment-card number.",
        "We will assess your request, explain any information we must retain and respond within the time required by applicable law. If you are not satisfied, ask us to review your complaint; you may also use the applicable regulatory or legal complaint channels.",
      ],
    },
    {
      id: "children",
      title: "Children and account use",
      paragraphs: [
        "Localsell ordering accounts are intended for adults aged 18 or older. A parent or guardian should place orders for a child using their own account. If you believe a child has provided personal information without appropriate permission, contact us so we can investigate and take appropriate action.",
      ],
    },
    {
      id: "changes",
      title: "Updates to this policy",
      paragraphs: [
        "We may update this policy as our services or legal requirements change. The updated date appears at the top. Where required, we will provide additional notice or request consent for a new use of information.",
      ],
    },
  ],
};

export const termsConditions: LegalDocument = {
  title: "Terms & Conditions",
  path: "/terms",
  description:
    "Simple terms for using Localsell, placing orders, paying, receiving deliveries and getting help, including WhatsApp communications.",
  summary: [
    "Check the store, items, address and final price before placing an order.",
    "Delivery times are estimates. Cancellation and refund options depend on the order’s stage and the issue.",
    "Contact us if something goes wrong. These terms do not remove your legal consumer rights.",
  ],
  sections: [
    {
      id: "about",
      title: "About Localsell and these terms",
      paragraphs: [
        "Localsell is operated by Maekotech Solutions LLP, Deogarh, Rajasthan, India. These terms apply when you use our website or customer app, place orders or communicate with us about the service. Read them before using Localsell. If you do not agree, do not place an order or use an account.",
        "Localsell connects customers with local restaurants, stores and delivery services. The seller shown for an order supplies the listed goods. Localsell facilitates discovery, ordering, payment, delivery coordination and support, as available. Store and rider commercial arrangements may also be governed by separate agreements.",
      ],
    },
    {
      id: "account",
      title: "Your account and responsibilities",
      paragraphs: [
        "You must be at least 18 and legally able to enter into a contract to create an ordering account. Provide accurate contact and delivery details, keep sign-in codes private and use only payment methods you are authorised to use.",
        "Tell us promptly if you suspect someone else is using your account. Do not place fraudulent orders, misuse discounts, harass others, submit unlawful content, interfere with the service or try to access another person’s information.",
      ],
    },
    {
      id: "orders",
      title: "Products, availability and confirmation",
      paragraphs: [
        "Read the description, quantity, price and store-specific information before ordering. Images are illustrative, and stock, preparation and availability can change. An order acknowledgement means we received your request; check the order status for store acceptance or confirmation.",
        "If an item becomes unavailable or an order cannot be fulfilled, we may contact you about available options or cancel affected items or the order. Any applicable payment adjustment or refund depends on what was paid and supplied, subject to your legal rights.",
        "For food allergies, ingredients or dietary restrictions, check directly with the store before ordering. A note in delivery instructions is not confirmation that a store can safely meet a dietary requirement.",
      ],
    },
    {
      id: "prices",
      title: "Prices, payment and offers",
      paragraphs: [
        "Review the final checkout total, including item prices, applicable taxes, delivery charges, other disclosed fees and discounts. Pay using an available checkout option. Cash on delivery, if offered, must be paid as instructed for the order.",
        "Online payments are handled by the provider shown at checkout. A bank debit alone does not establish that an order is confirmed; check Localsell and contact support if payment and order status do not match.",
        "Offers may have expiry dates, minimum order values, usage limits or store restrictions. The conditions displayed with an offer apply. Refunds account for the amount actually paid after discounts.",
      ],
    },
    {
      id: "delivery",
      title: "Delivery and receiving your order",
      paragraphs: [
        "Delivery is subject to service availability at your address. Arrival times are estimates and can change because of preparation time, traffic, weather, stock or other operational issues.",
        "Give a complete address and a reachable phone number, and be available to receive the order. Incorrect details or an unreachable recipient may delay or prevent delivery. Any charge or cancellation consequence must be assessed against the circumstances and applicable law.",
        "Check your delivery when it arrives where reasonably possible. If an item is missing, damaged, incorrect or unsafe, contact support promptly with the order number and useful details or photos. Do not consume food you believe is unsafe.",
      ],
    },
    {
      id: "cancellations",
      title: "Cancellations, returns and refunds",
      paragraphs: [
        "Use the cancellation option if available, or contact support as soon as you need to cancel. Cancellation may be limited once a store accepts or prepares the order, or delivery is underway. We will assess the order stage and explain the applicable outcome.",
        "Prepared food and perishable products generally cannot be returned simply because you changed your mind. This does not remove rights where goods are defective, unsafe, incorrect, missing or not as described.",
        "If an order is cancelled, not delivered or has a reported problem, support will review it and determine the appropriate remedy, such as a replacement or a full or partial refund, subject to applicable law. Reporting promptly helps us investigate but does not shorten statutory rights.",
        "For an approved refund, the amount and payment route will be communicated for the case. Processing time depends on the payment provider and bank. Keep the order and payment reference and contact support if an expected refund has not arrived. Do not share your banking password, payment PIN or OTP to obtain a refund.",
      ],
    },
    {
      id: "whatsapp",
      title: "WhatsApp and other communications",
      paragraphs: [
        "Localsell may use available channels for requested sign-in codes, order confirmations, delivery updates, invoices, payment or refund information and support. WhatsApp communications are also subject to WhatsApp’s terms and your communication permissions.",
        "Accepting these terms does not automatically opt you in to unrelated promotional WhatsApp messages. Email contact@maekotech.com about your communication preferences or block Localsell in WhatsApp. Use email or Get help for support; automated WhatsApp replies may not be monitored for assistance.",
        "A WhatsApp message is not a replacement for checking order or payment status in Localsell. Stopping messages does not cancel a confirmed order or remove payment obligations for goods supplied. We will not ask you to send a payment PIN or bank password in chat.",
      ],
    },
    {
      id: "content",
      title: "Reviews, content and service access",
      paragraphs: [
        "Reviews and content you submit should reflect your experience and must not contain unlawful material, another person’s private information or misleading claims. You allow Localsell to use that content as needed to display it, operate the service and investigate related issues.",
        "Localsell branding, software and other protected content belong to their respective owners. You may use the service for its intended purpose, but may not copy or misuse protected material without permission.",
        "We may restrict access or remove content to address misuse, fraud, security risks or legal requirements. Contact support if you believe a restriction is mistaken. Restrictions do not remove valid refund claims or other rights relating to an existing order.",
      ],
    },
    {
      id: "responsibility",
      title: "Service limitations and your legal rights",
      paragraphs: [
        "We work to keep Localsell available and information accurate, but outages, mistakes and third-party interruptions can occur. Sellers are responsible for the goods they supply, and each provider remains responsible for its obligations under applicable law.",
        "To the extent permitted by law, Localsell does not accept responsibility for indirect losses that could not reasonably have been anticipated from using the service. Nothing in these terms excludes liability that cannot lawfully be excluded, limits mandatory consumer protections, or prevents you from seeking a remedy available under law.",
      ],
    },
    {
      id: "law",
      title: "Questions, complaints and applicable law",
      paragraphs: [
        "These terms are governed by applicable Indian law. Contact us with your order number and a description of the problem so we can investigate. You retain the right to approach a competent consumer forum, regulator or court under applicable law; contacting support is not a waiver of those rights.",
        "For privacy questions, read our Privacy Policy. For commercial questions relating to store or rider accounts, the relevant partner agreement may contain additional terms.",
      ],
    },
    {
      id: "changes",
      title: "Changes to these terms",
      paragraphs: [
        "We may revise these terms as the service changes. The date at the top identifies the current version, and additional notice will be given where required. Changes do not retrospectively remove rights relating to an order already placed.",
      ],
    },
  ],
};
