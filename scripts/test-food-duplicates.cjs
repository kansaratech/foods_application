const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-api/node_modules/typescript'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function evaluate(source, context) {
  return vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
}
const api = read('localsell-api/src/graphql/resolvers/food.resolvers.ts');
const validation = api.slice(api.indexOf('async function assertUniqueFoodTitle'), api.indexOf('interface ComboItemInputArgs'));
const foods = [
  { id: 'one', restaurantId: 'store', title: '  Masala   Namkeen  ' },
  { id: 'two', restaurantId: 'other-store', title: 'Biscuit' },
];
const validate = evaluate(`${validation}\nassertUniqueFoodTitle;`, {
  userInputError: (message) => new Error(message),
  prisma: { food: { findMany: async ({ where }) => foods.filter((food) =>
    food.restaurantId === where.restaurantId && food.id !== where.id?.not),
  } },
});
test('rejects duplicate titles regardless of capitalization and whitespace', async () => {
  for (const title of ['Masala Namkeen', 'MASALA NAMKEEN', ' masala  namkeen ', 'Masala\tNamkeen']) {
    await assert.rejects(validate('store', title), /already exists in this store/);
  }
});
test('allows unchanged names on edit and identical names in another store', async () => {
  await validate('store', 'Masala Namkeen', 'one');
  await validate('other-store', 'Masala Namkeen');
  await validate('store', 'Biscuit');
});
test('rejects renaming another item to an existing name and blank titles', async () => {
  await assert.rejects(validate('store', 'Masala Namkeen', 'different-item'), /already exists/);
  await assert.rejects(validate('store', '  '), /Title is required/);
});

const screen = read('localsell-store/lib/ui/screen-components/home/menu/food-form-sheet.tsx');
const submit = screen.slice(screen.indexOf('    const handleSubmit ='), screen.indexOf('    const loading ='));
function formHarness(mutate, editingId = null) {
  const state = {
    submittingRef: { current: false }, uploading: false,
    title: 'Namkeen', description: '', variations: [{ title: 'Regular', price: 500 }],
    gstRatePercent: '', editingId, restaurantId: 'store', categoryId: 'category',
    subCategoryId: '', images: [], isActive: true,
    error: '', t: (text) => text,
    createFood: mutate, editFood: mutate,
  };
  state.setError = (error) => { state.error = error; };
  return { state, submit: evaluate(`${submit}\nhandleSubmit;`, state) };
}
for (const editingId of [null, 'existing-item']) {
  test(`mutation failure is visible in modal and permits retry (${editingId || 'create'})`, async () => {
    let calls = 0;
    const form = formHarness(async () => {
      calls++;
      if (calls === 1) throw new Error('A food item named "Namkeen" already exists in this store.');
    }, editingId);
    await form.submit();
    assert.match(form.state.error, /already exists/);
    assert.equal(form.state.submittingRef.current, false);
    assert.equal(form.state.title, 'Namkeen');
    form.state.title = 'Unique item';
    await form.submit();
    assert.equal(form.state.error, '');
    assert.equal(calls, 2);
  });
}
test('rapid repeated clicks send only one mutation', async () => {
  let finish;
  let calls = 0;
  const form = formHarness(() => { calls++; return new Promise((resolve) => { finish = resolve; }); });
  const first = form.submit();
  await form.submit();
  assert.equal(calls, 1);
  finish();
  await first;
  assert.equal(form.state.submittingRef.current, false);
});
