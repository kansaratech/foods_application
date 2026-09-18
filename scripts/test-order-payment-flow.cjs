const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-web/node_modules/typescript'));
const React = require(path.join(root, 'localsell-web/node_modules/react'));
const { renderToStaticMarkup } = require(path.join(root, 'localsell-web/node_modules/react-dom/server'));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const messages = JSON.parse(read('localsell-web/locales/en.json')).payment_panel;
function load(file, deps = {}) {
  const exports = {};
  const code = ts.transpileModule(read(file), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, React, console, require: name => deps[name] || {} });
  return exports;
}
const componentDir = 'localsell-web/lib/ui/screen-components/protected/order-tracking/components/';
const Card = load(componentDir + 'payment-status-card.tsx', {
  'next-intl': { useTranslations: () => key => messages[key] || key },
  'react-icons/fi': new Proxy({}, { get: () => () => null }),
}).default;
const Handover = load(componentDir + 'order-handover-card.tsx').default;
const render = props => renderToStaticMarkup(React.createElement(Card, {
  amount: 'INR 373.00', rechecking: false, startingRetry: false, feedback: '', canRetry: true,
  onCheck() {}, onRetry() {}, ...props,
}));
test('COD is clearly unpaid until the API records collection, and pickup uses collection wording', () => {
  const unpaid = render({ paymentMethod: 'COD', paymentStatus: 'PENDING' });
  assert.match(unpaid, /Pay on delivery/);
  assert.match(unpaid, /Amount due/);
  assert.doesNotMatch(unpaid, /Awaiting payment confirmation|Check payment status/);
  assert.match(render({ paymentMethod: 'COD', paymentStatus: 'PAID' }), /Payment successful/);
  assert.match(render({ paymentMethod: 'COD', paymentStatus: 'PENDING', isPickedUp: true }), /Pay at pickup/);
});
test('Cashfree distinguishes pending, failed, paid and refunded without false success', () => {
  for (const [status, label] of [['PENDING', 'Awaiting payment confirmation'], ['FAILED', 'Payment unsuccessful'], ['PAID', 'Payment successful'], ['REFUNDED', 'Payment refunded']]) {
    const html = render({ paymentMethod: 'CASHFREE', paymentStatus: status });
    assert.ok(html.includes(label));
    if (status === 'PAID' || status === 'REFUNDED') assert.doesNotMatch(html, /Try payment again/);
  }
  assert.match(render({ paymentMethod: 'CASHFREE', paymentStatus: 'PAID', refundStatus: 'SUCCESS' }), /Payment refunded/);
});
test('cancelled cash orders do not demand payment; cancelled online orders cannot retry', () => {
  assert.match(render({ paymentMethod: 'COD', paymentStatus: 'PENDING', orderStatus: 'CANCELLED', canRetry: false }), /No payment due/);
  assert.doesNotMatch(render({ paymentMethod: 'CASHFREE', paymentStatus: 'PENDING', orderStatus: 'CANCELLED', canRetry: false }), /Try payment again/);
  assert.match(render({ paymentMethod: 'CASHFREE', paymentStatus: 'PAID', orderStatus: 'CANCELLED', refundStatus: 'PROCESSING' }), /refund confirmation is still pending/);
});
test('OTP appears only during delivery and is explicitly separate from payment', () => {
  const base = { deliveryOtp: '2468', orderStatus: 'PICKED', paymentMethod: 'COD', paymentStatus: 'PENDING' };
  const html = renderToStaticMarkup(React.createElement(Handover, { order: base }));
  assert.match(html, /2468/);
  assert.match(html, /not payment/);
  for (const changes of [{ orderStatus: 'PENDING' }, { orderStatus: 'DELIVERED' }, { orderStatus: 'CANCELLED' }, { isPickedUp: true }]) {
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Handover, { order: { ...base, ...changes } })), /2468/);
  }
});
function api({ status = 'ACTIVE', sessionId = 'existing-session', lookupError = false, orderChanges = {} } = {}) {
  const order = { id: 'order', userId: 'user', paymentMethod: 'CASHFREE', paymentStatus: 'PENDING', refundStatus: 'NONE', orderStatus: 'PENDING', cashfreeOrderId: 'previous', orderAmount: 373, ...orderChanges };
  const calls = { created: 0, confirmed: 0, lookedUp: 0 };
  const { paymentResolvers } = load('localsell-api/src/graphql/resolvers/payment.resolvers.ts', {
    nanoid: { customAlphabet: () => () => 'id' },
    '../../middleware/auth': { requireAuth: () => ({ id: 'user' }) },
    '../../prisma/client': { prisma: {
      order: { findUnique: async () => order, update: async () => order },
      user: { findUnique: async () => ({ phone: '+919999999999' }) },
    } },
    '../../config/env': { env: { webClientUrl: 'http://localhost' } },
    '../../services/cashfree.service': {
      getCashfreeCredentials: async () => ({}),
      fetchCashfreeOrderStatus: async () => { calls.lookedUp++; if (lookupError) throw Error('offline'); return { orderStatus: status, paymentSessionId: sessionId }; },
      createCashfreeOrder: async () => { calls.created++; return { paymentSessionId: 'new-session', cfOrderId: 'new' }; },
    },
    '../../services/cashfree-confirm': { confirmCashfreeOrderPaid: async () => { calls.confirmed++; return { ...order, paymentStatus: 'PAID' }; } },
  });
  return { calls, create: () => paymentResolvers.Mutation.createCashfreePaymentSession(null, { orderId: 'order' }, {}), recheck: () => paymentResolvers.Mutation.recheckCashfreePayment(null, { orderId: 'order' }, {}) };
}
test('delayed paid webhook is reconciled before another payment can start', async () => {
  const f = api({ status: 'PAID' });
  assert.equal((await f.create()).success, false);
  assert.equal(f.calls.confirmed, 1);
  assert.equal(f.calls.created, 0);
});
test('active Cashfree session is reused; only expired sessions get a fresh attempt', async () => {
  const active = api();
  assert.equal((await active.create()).paymentSessionId, 'existing-session');
  assert.equal(active.calls.created, 0);
  const expired = api({ status: 'EXPIRED' });
  assert.equal((await expired.create()).paymentSessionId, 'new-session');
  assert.equal(expired.calls.created, 1);
});
test('uncertain, cancelled and refunded payments cannot create new sessions', async () => {
  for (const options of [{ lookupError: true }, { status: 'TERMINATION_REQUESTED' }, { orderChanges: { orderStatus: 'CANCELLED' } }, { orderChanges: { refundStatus: 'SUCCESS' } }]) {
    const f = api(options);
    assert.equal((await f.create()).success, false);
    assert.equal(f.calls.created, 0);
  }
  const refunded = api({ orderChanges: { refundStatus: 'SUCCESS', paymentStatus: 'PAID' } });
  assert.equal((await refunded.recheck()).paymentStatus, 'REFUNDED');
  assert.equal(refunded.calls.lookedUp, 0);
});
if (process.env.PAYMENT_FIXTURE) {
  const cases = [
    ['Cash on delivery', { paymentMethod: 'COD', paymentStatus: 'PENDING' }],
    ['Cashfree pending', { paymentMethod: 'CASHFREE', paymentStatus: 'PENDING' }],
    ['Cashfree paid', { paymentMethod: 'CASHFREE', paymentStatus: 'PAID' }],
    ['Cashfree failed', { paymentMethod: 'CASHFREE', paymentStatus: 'FAILED' }],
  ];
  fs.writeFileSync(path.join(root, '.tmp/payment-preview.html'), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="payment-tailwind.css"><style>:root{--primary-color:#1c5bc7}body{font-family:Arial;background:#f8fafc;padding:16px}.cases{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:20px}h1{font-size:24px;margin-bottom:16px}h2{margin:8px 0}</style><h1>Order payment states</h1><div class="cases">' + cases.map(([label, props]) => '<div><h2>'+label+'</h2>'+render(props)+'</div>').join('')+'</div>');
}

function renderOrderPage(view, changes = {}) {
  const src = read('localsell-web/lib/ui/screens/protected/order/tracking/index.tsx');
  const ast = ts.createSourceFile('screen.tsx', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'OrderTrackingScreen');
  const expression = fn.body.statements.find(ts.isReturnStatement).expression.getText(ast);
  const code = ts.transpileModule(`(${expression})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText;
  const order = { _id: 'sample', orderId: 'ORD-12345', orderStatus: 'ACCEPTED', paymentMethod: 'COD', paymentStatus: 'PENDING', orderAmount: 373, items: [{ title: 'Whole Wheat Atta (5 kg)', quantity: 1, price: 348, variation: { title: '5 kg' }, addons: [] }], deliveryCharges: 25, deliveryOtp: '2468', restaurant: { name: 'Local Kitchen', address: 'Indore' }, deliveryAddress: { deliveryAddress: 'Vaishali Nagar, Indore' }, ...changes };
  const context = {
    React, view, orderId: 'sample', mergedOrderDetails: order, orderTrackingDetails: order,
    styles: new Proxy({}, { get: (_, key) => key }),
    showConfetti: false, showRatingModal: false, hasUserReview: false, showChat: false, showMap: false,
    isOrderTrackingDetailsLoading: false, trackingError: null,
    RatingModal: () => null, setShowRatingModal() {}, handleSubmitRating() {},
    BackButton: () => React.createElement('a', { href: '#' }, 'Back'),
    Link: ({ children, ...props }) => React.createElement('a', props, children),
    OrderPaymentPanel: ({ orderTrackingDetails: order }) => React.createElement(Card, { ...order, amount: 'INR 373.00', canRetry: true, feedback: '', onCheck() {}, onRetry() {} }),
    OrderHandoverCard: Handover,
    TrackingStatusCard: () => React.createElement('section', { className: 'card' }, 'Order accepted - preparation in progress'),
    TrackingHelpCard: () => React.createElement('a', { href: '#' }, 'Get help with this order'),
    TrackingOrderDetails: changes.renderItems ? load(componentDir + 'tracking-order-details.tsx', {
      react: { ...React, default: React },
      '@/lib/ui/useable-components/safe-image': { default: props => React.createElement('img', props) },
      './cancelOrderModal': { default: () => null },
      './cancel-order-success-modal': { default: () => null },
      '@/lib/utils/methods/local-storage': { onUseLocalStorage() {} },
      '@/lib/context/configuration/configuration.context': { useConfig: () => ({ CURRENCY_SYMBOL: 'INR ' }) },
      'next-intl': { useTranslations: () => key => JSON.parse(read('localsell-web/locales/en.json'))[key] || key },
    }).default : () => React.createElement('div', null, 'Items and bill details'),
    setShowMap() {}, refetchTracking() {},
  };
  return renderToStaticMarkup(vm.runInNewContext(code, context));
}
test('confirmation and order details have distinct headings and payment precedes receipt/map', () => {
  const confirmation = renderOrderPage('confirmation');
  assert.match(confirmation, /Order confirmation/);
  assert.doesNotMatch(confirmation, /Items and bill details|id="order-map"/);
  const details = renderOrderPage('details');
  assert.match(details, /Order details &amp; tracking/);
  assert.ok(details.indexOf('Payment status') < details.indexOf('Items and bill details'));
  assert.ok(details.indexOf('2468') < details.indexOf('Items and bill details'));
  const pending = renderOrderPage('details', { orderStatus: 'PENDING', paymentMethod: 'CASHFREE' });
  assert.match(pending, /Order saved - payment not confirmed/);
});
if (process.env.PAYMENT_FIXTURE) {
  const css = read('localsell-web/lib/ui/screens/protected/order/tracking/tracking.module.css').replaceAll(':global(html.dark)', 'html.dark');
  for (const view of ['confirmation', 'details']) {
    const html = renderOrderPage(view, view === 'details' ? { renderItems: true, orderStatus: 'PENDING', paymentMethod: 'CASHFREE', paymentStatus: 'PAID' } : {});
    fs.writeFileSync(path.join(root, `.tmp/order-${view}-preview.html`), '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="payment-tailwind.css"><style>:root{--primary-color:#1c5bc7}body{font-family:Arial;background:#f8fafc}'+css+'</style>'+html);
  }
}

test('payment-only subscription updates refetch the full order even when order status is unchanged', () => {
  let subscriptionOptions;
  let refetches = 0;
  let polling = 0;
  const { default: useTracking } = load('localsell-web/lib/ui/screen-components/protected/order-tracking/services/useTracking.tsx', {
    react: { useRef: value => ({ current: value }), useEffect: effect => effect() },
    '@apollo/client': {
      useQuery: () => ({ data: { orderDetails: { _id: 'order', orderStatus: 'PENDING', paymentMethod: 'CASHFREE', paymentStatus: 'PENDING' } }, loading: false, refetch: () => refetches++, startPolling: () => polling++, stopPolling() {} }),
      useSubscription: (_query, options) => { subscriptionOptions = options; return {}; },
    },
  });
  useTracking({ orderId: 'order' });
  assert.equal(polling, 1);
  for (const paymentStatus of ['PENDING', 'PAID']) {
    subscriptionOptions.onSubscriptionData({ subscriptionData: { data: { subscriptionOrder: { _id: 'order', orderStatus: 'PENDING', paymentStatus } } } });
  }
  assert.equal(refetches, 2);
});
