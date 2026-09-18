const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-web/node_modules/typescript'));
const React = require(path.join(root, 'localsell-web/node_modules/react'));
const { renderToStaticMarkup } = require(path.join(root, 'localsell-web/node_modules/react-dom/server'));
const file = 'localsell-web/lib/ui/screens/protected/order/checkout/index.tsx';
const source = fs.readFileSync(path.join(root, file), 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const screen = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'OrderCheckoutScreen');
const jsx = screen.body.statements.find(n => ts.isReturnStatement(n)).expression.getText(ast);
const code = ts.transpileModule(`(${jsx})`, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2020 } }).outputText;
const translations = JSON.parse(fs.readFileSync(path.join(root, 'localsell-web/locales/en.json'), 'utf8'));
function fixture(overrides = {}) {
  const state = {
    React, styles: new Proxy({}, { get: (_, key) => key }),
    t: key => translations[key] || key,
    BackButton: () => React.createElement('a', { href: '#' }, 'Back'),
    FontAwesomeIcon: () => null, InfoSvg: () => null,
    Image: ({ src, ...props }) => React.createElement('img', { ...props, src: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50"%3E%3Crect width="50" height="50" rx="10" fill="%23e2e8f0"/%3E%3C/svg%3E' }),
    Divider: () => React.createElement('hr'),
    Message: ({ text }) => React.createElement('span', null, text),
    BrandLoader: () => React.createElement('span', null, 'Loading'),
    UserAddressComponent: () => null,
    faBicycle: {}, faStore: {}, faMinus: {}, faPlus: {}, faMap: {}, faMoneyBillWave: {}, faCreditCard: {},
    availableCoupons: [], applyCouponCode: () => {}, openExtra: 'promo',
    authToken: 'test-session', profile: { name: 'Test customer' }, paymentChoice: '', IS_CASHFREE_ENABLED: true,
    confirmedAddressKey: '', activeStep: 'address', pricePreviewData: { orderPricePreview: { orderAmount: 405 } },
    openLogin: () => {}, orderItemCount: 1, showRoute: false, isLoaded: false, isPickUp: false, deliveryType: 'Delivery',
    finalRestaurantData: { restaurant: { name: 'Neighbourhood store' } },
    cart: [{ quantity: 1 }],
    pricedCart: [{ _id: 'item', key: 'item', foodTitle: 'Olive Oil (Pure)', price: 380, quantity: 1 }],
    pricePreviewError: null, pricePreviewLoading: false, loadingOrderMutation: false,
    userAddress: { deliveryAddress: 'Vaishali Nagar, Indore' },
    shouldLeaveAtDoor: false, orderInstructions: '', recipientPhone: '',
    filteredPaymentMethods: [{ value: 'COD', label: 'Cash' }, { value: 'CASHFREE', label: 'Online (UPI / Card / Netbanking)' }],
    paymentMethod: 'COD', CURRENCY_SYMBOL: '₹', CURRENCY: 'INR',
    isCouponApplied: false, couponLoading: false, couponText: '',
    selectedTip: '', showCustomTip: false,
    tipData: { tips: { tipVariations: ['10', '20', '50', 'Other'] } },
    distance: '0.89', deliveryCharges: 25, taxValue: 0, showInclusiveTaxCaption: true,
    calculatePrice: () => '380.00', calculateTotal: () => '405.00', taxCalculation: () => '0',
    isUserAddressModalOpen: false,
    onPlaceOrder: () => {}, onApplyCoupon: () => {}, updateItemQuantity: () => {},
    ...overrides,
  };
  for (const name of ['activeStep', 'confirmedAddressKey', 'showRoute', 'isPickUp', 'deliveryType', 'selectedTip', 'showCustomTip', 'recipientPhone', 'paymentMethod', 'isCouponApplied', 'couponText', 'isUserAddressModalOpen', 'isAddressSelectedOnce', 'shouldLeaveAtDoor', 'openExtra']) {
    state['set' + name[0].toUpperCase() + name.slice(1)] = value => { state[name] = value; };
  }
  const computed = ['paymentMethod', 'pricePreview', 'addressKey', 'addressConfirmed', 'addressStepOpen', 'canConfirmAddress'];
  const expressions = computed.map(name => {
    const declaration = screen.body.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(ast) === name);
    return [name, declaration.initializer.getText(ast)];
  });
  return { state, tree: () => {
    for (const [name, expression] of expressions) state[name] = vm.runInNewContext(expression, state);
    return vm.runInNewContext(code, state);
  } };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
test('promo and tips precede one shared bill; map and optional fields start collapsed', () => {
  const html = renderToStaticMarkup(fixture().tree());
  assert.ok(html.indexOf('id="checkout-promo"') < html.indexOf('id="price-summary"'));
  assert.ok(html.indexOf('id="checkout-tip"') < html.indexOf('id="price-summary"'));
  assert.equal((html.match(/id="price-summary"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="checkout-route"|<details[^>]*open/);
  assert.match(html, /class="mobileBar"/);
});
test('pickup hides tips and clears the selected courier tip', () => {
  const f = fixture({ selectedTip: '20' });
  const pickup = nodes(f.tree()).find(n => n.type === 'button' && n.props.onClick?.toString().includes('setIsPickUp(true)'));
  pickup.props.onClick();
  assert.equal(f.state.selectedTip, '');
  assert.equal(f.state.isPickUp, true);
  assert.doesNotMatch(renderToStaticMarkup(f.tree()), /id="checkout-tip"/);
});
test('tip buttons and custom input set numeric amounts; no-tip resets them', () => {
  // Promo/tip now live inside the Payment details step (only shown once the
  // address is confirmed), not as an always-visible aside panel.
  const f = fixture();
  const confirm = nodes(f.tree()).find(n => n.type === 'button' && n.props.onClick?.toString().includes('setConfirmedAddressKey'));
  confirm.props.onClick();
  const tip = nodes(f.tree()).find(n => n.type === 'button' && Array.isArray(n.props.children) && n.props.children.includes('20'));
  tip.props.onClick();
  assert.equal(f.state.selectedTip, '20');
  const other = nodes(f.tree()).find(n => n.type === 'button' && n.props.children === 'Other');
  other.props.onClick();
  const input = nodes(f.tree()).find(n => n.type === 'input' && n.props.type === 'number');
  input.props.onChange({ target: { value: '35' } });
  assert.equal(f.state.selectedTip, '35');
  input.props.onChange({ target: { value: '-1' } });
  assert.equal(f.state.selectedTip, '');
});
test('all order actions remain blocked on pending or failed service checks and empty carts', () => {
  for (const overrides of [{ pricePreviewLoading: true }, { pricePreviewError: { message: 'Outside service area' } }, { cart: [] }, { userAddress: null }, { loadingOrderMutation: true }]) {
    const f = fixture(overrides);
    const actions = nodes(f.tree()).filter(n => n.type === 'button' && n.props.onClick === f.state.onPlaceOrder);
    assert.equal(actions.length, 2);
    assert.ok(actions.every(n => n.props.disabled));
  }
});
test('promo submission supports Enter and cannot repeat during validation', () => {
  let applied = 0;
  const f = fixture({ couponText: 'SAVE10', onApplyCoupon: () => applied++ });
  let confirm = nodes(f.tree()).find(n => n.type === 'button' && n.props.onClick?.toString().includes('setConfirmedAddressKey'));
  confirm.props.onClick();
  const input = nodes(f.tree()).find(n => n.type === 'input' && n.props.value === 'SAVE10');
  input.props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.equal(applied, 1);
  const loading = fixture({ couponLoading: true });
  confirm = nodes(loading.tree()).find(n => n.type === 'button' && n.props.onClick?.toString().includes('setConfirmedAddressKey'));
  confirm.props.onClick();
  const button = nodes(loading.tree()).find(n => n.type === 'button' && n.props.onClick === loading.state.onApplyCoupon);
  assert.equal(button.props.disabled, true);
});
if (process.env.CHECKOUT_FIXTURE) {
  const html = renderToStaticMarkup(fixture().tree());
  const css = fs.readFileSync(path.join(root, 'localsell-web/lib/ui/screens/protected/order/checkout/checkout.module.css'), 'utf8').replaceAll(':global(html.dark)', 'html.dark');
  fs.writeFileSync(path.join(root, '.tmp/checkout-preview.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="checkout-tailwind.css"><style>:root{--primary-color:#1c5bc7;--secondary-color:#182f41}body{margin:0;font-family:Arial,sans-serif}header.site{padding:22px 6%;border-bottom:1px solid #e2e8f0;color:#182f41;font-weight:bold}${css}</style><header class="site">LocalSell</header>${html}`);
}

test('guest sees login first, locked address/payment steps, and an enabled login action', () => {
  let opened = 0;
  const f = fixture({ authToken: '', openLogin: () => opened++ });
  const tree = f.tree();
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Log in to continue/);
  assert.doesNotMatch(html, /You must be logged in|id="checkout-address-content"|id="checkout-payment-content"/);
  const login = nodes(tree).find(n => n.type === 'button' && n.props.onClick === f.state.openLogin);
  login.props.onClick();
  assert.equal(opened, 1);
  const action = nodes(tree).find(n => n.type === 'button' && n.props.onClick === f.state.onPlaceOrder);
  assert.equal(!!action.props.disabled, false);
  const queryCall = screen.body.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(ast).includes('pricePreviewData')).initializer;
  const skip = queryCall.arguments[1].properties.find(n => n.name?.getText(ast) === 'skip').initializer.getText(ast);
  assert.equal(vm.runInNewContext(skip, { ...f.state, restaurantId: 'store' }), true);
});
test('confirmed address opens payment with online selected, changed address requires reconfirmation', () => {
  const f = fixture();
  const confirm = nodes(f.tree()).find(n => n.type === 'button' && n.props.onClick?.toString().includes('setConfirmedAddressKey'));
  assert.equal(confirm.props.disabled, false);
  confirm.props.onClick();
  const tree = f.tree();
  assert.equal(f.state.addressConfirmed, true);
  assert.equal(f.state.activeStep, 'payment');
  const online = nodes(tree).find(n => n.type === 'input' && n.props.id === 'payment-CASHFREE');
  assert.equal(online.props.checked, true);
  assert.doesNotMatch(renderToStaticMarkup(tree), /id="checkout-address-content"/);
  f.state.userAddress = { deliveryAddress: 'Changed address' };
  f.tree();
  assert.equal(f.state.addressConfirmed, false);
  assert.equal(f.state.addressStepOpen, true);
});
test('payment defaults to cash only when online is unavailable; explicit cash selection is retained', () => {
  const f = fixture({ IS_CASHFREE_ENABLED: false });
  f.tree();
  assert.equal(f.state.paymentMethod, 'COD');
  f.state.IS_CASHFREE_ENABLED = true;
  f.tree();
  assert.equal(f.state.paymentMethod, 'CASHFREE');
  f.state.paymentChoice = 'COD';
  f.tree();
  assert.equal(f.state.paymentMethod, 'COD');
});
test('all locale keys satisfy next-intl namespace rules and recipient text uses the stable key', () => {
  const visit = obj => Object.entries(obj).forEach(([key, value]) => {
    assert.ok(!key.includes('.'), `Invalid translation key: ${key}`);
    if (value && typeof value === 'object') visit(value);
  });
  for (const file of fs.readdirSync(path.join(root, 'localsell-web/locales')).filter(f => f.endsWith('.json'))) {
    visit(JSON.parse(fs.readFileSync(path.join(root, 'localsell-web/locales', file), 'utf8')));
  }
  assert.ok(translations.checkout_recipient_help);
  assert.match(source, /t\("checkout_recipient_help"\)/);
});
