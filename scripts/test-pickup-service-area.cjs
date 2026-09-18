const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-api/node_modules/typescript'));
function load(file, dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, { exports, require: (name) => dependencies[name] || {} });
  return exports;
}
const geo = load('localsell-api/src/utils/geo.ts');
function setup(latitude, longitude, deliveryDistance = 60) {
  const restaurant = { id: 'store', name: 'Indore store', latitude: 22.7196, longitude: 75.8577,
    deliveryDistance, isActive: true, minimumOrder: 0 };
  const address = { id: 'address', latitude, longitude };
  let writes = 0;
  const prisma = {
    restaurant: { findUnique: async () => restaurant },
    address: { findUnique: async () => address, findFirst: async () => address },
    order: {
      findUnique: async () => ({ id: 'order', userId: 'user', restaurantId: 'store',
        addressId: 'address', orderStatus: 'PENDING', isPickedUp: false }),
      create: async () => { writes++; throw Error('Unexpected order creation'); },
      update: async () => { writes++; throw Error('Unexpected order update'); },
    },
    configuration: { findFirst: async () => ({}) },
  };
  const { orderResolvers } = load('localsell-api/src/graphql/resolvers/order.resolvers.ts', {
    '../../prisma/client': { prisma },
    '../../middleware/auth': { requireAuth: () => ({ id: 'user' }) },
    '../../utils/errors': { userInputError: (message) => Error(message) },
    '../../utils/geo': geo,
    '../../services/order.service': { buildOrderItems: async () => ({ itemsData: [], itemsTotal: 100, lines: [] }) },
    '../../services/pricing.service': {
      computeGst: () => ({ taxationAmount: 0 }), computeDeliveryFee: () => 25,
    },
  });
  return { orderResolvers, writes: () => writes };
}
const args = { restaurant: 'store', orderInput: [], paymentMethod: 'COD',
  address: { _id: 'address' }, isPickedUp: true };
test('Rajasthan pickup is rejected by preview, placement and delivery-to-pickup edits', async () => {
  const { orderResolvers: r, writes } = setup(25.525, 73.908);
  await assert.rejects(r.Query.orderPricePreview(null, args, {}), /outside.*pickup service area/);
  await assert.rejects(r.Mutation.placeOrder(null, args, {}), /outside.*pickup service area/);
  await assert.rejects(r.Mutation.modifyOrder(null, { id: 'order', isPickedUp: true }, {}), /outside.*pickup service area/);
  assert.equal(writes(), 0);
});
test('nearby pickup remains available without a delivery fee', async () => {
  const { orderResolvers: r } = setup(22.72, 75.86);
  const preview = await r.Query.orderPricePreview(null, args, {});
  assert.equal(preview.deliveryCharges, 0);
  assert.equal(preview.orderAmount, 100);
});
test('configured radius and default radius apply to pickup', async () => {
  const near = setup(22.75, 75.86, 1).orderResolvers;
  await assert.rejects(near.Query.orderPricePreview(null, args, {}), /pickup service area/);
  const far = setup(25.525, 73.908, null).orderResolvers;
  await assert.rejects(far.Query.orderPricePreview(null, args, {}), /pickup service area/);
});
test('invalid and missing coordinates cannot bypass the restriction', async () => {
  for (const latitude of [null, NaN, 100]) {
    const { orderResolvers: r } = setup(latitude, 75.86);
    await assert.rejects(r.Mutation.placeOrder(null, args, {}), /Unable to verify/);
  }
});
test('delivery still rejects far addresses and charges nearby orders', async () => {
  const delivery = { ...args, isPickedUp: false };
  await assert.rejects(setup(25.525, 73.908).orderResolvers.Mutation.placeOrder(null, delivery, {}), /delivery area/);
  const preview = await setup(22.72, 75.86).orderResolvers.Query.orderPricePreview(null, delivery, {});
  assert.equal(preview.deliveryCharges, 25);
});
