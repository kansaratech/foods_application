const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-admin/node_modules/typescript'));
const yup = require(path.join(root, 'localsell-admin/node_modules/yup'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function evaluate(source, context = {}) {
  return vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
}
const phoneExports = {};
evaluate(read('localsell-admin/lib/utils/methods/phone.ts'), { exports: phoneExports });
const schemaExports = {};
evaluate(read('localsell-admin/lib/utils/schema/vendor.ts'), {
  exports: schemaExports,
  require: (name) => name === 'yup' ? yup : {
    ...phoneExports,
    isValidEmail: (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value || ''),
  },
});
const screen = read('localsell-admin/lib/ui/screens/super-admin/general/vendor-registration/index.tsx');
const helpers = screen.slice(screen.indexOf('function draftPhoneNumber'), screen.indexOf('export default function'));
const persist = screen.slice(screen.indexOf('  const persistDraft ='), screen.indexOf('  const persistPayoutDoc ='));

for (const phoneNumber of ['', '+91', '91', '+91 ', '   ']) {
  test(`empty draft (${JSON.stringify(phoneNumber)}) shows field errors without a mutation`, async () => {
    let mutations = 0;
    let step;
    const formik = {
      values: { firstName: '', lastName: '', email: '', phoneNumber, businessName: '', password: '', confirmPassword: '', sendSetupLink: false },
      errors: {}, touched: {},
      setErrors(errors) { this.errors = errors; },
      setTouched(touched) { this.touched = touched; },
      setFieldValue() {},
    };
    const save = evaluate(`${helpers}\n${persist}\npersistDraft;`, {
      ...phoneExports, ...schemaExports,
      setStep: (value) => { step = value; },
      saveVendorDraft: () => { mutations++; throw new Error('Unexpected mutation'); },
    });
    assert.equal(await save(formik), null);
    assert.equal(mutations, 0);
    assert.equal(step, 0);
    for (const field of ['firstName', 'lastName', 'email', 'phoneNumber', 'password', 'confirmPassword']) {
      assert.ok(formik.errors[field], field);
      assert.equal(formik.touched[field], true, field);
    }
    assert.equal(formik.errors.firstName, 'Required');
    assert.equal(formik.errors.password, 'Required');
  });
}

const backend = read('localsell-api/src/graphql/resolvers/admin.resolvers.ts');
const resolver = backend.slice(backend.indexOf('    saveVendorDraft: async'), backend.indexOf('    editVendor: async'));
const apiPhone = {};
evaluate(read('localsell-api/src/utils/phone.ts'), { exports: apiPhone });
function apiHarness() {
  const checked = [];
  const saved = [];
  const save = evaluate(`({${resolver}}).saveVendorDraft;`, {
    ...apiPhone,
    requireRole() {}, resolveBusinessTypeId: async () => undefined,
    resolveVendorGstFields: () => ({}),
    userInputError: (message) => new Error(message),
    assertPhoneFree: async (phone) => {
      checked.push(phone);
      if (phone === '+919876543210') throw new Error('This phone number is already registered to another account.');
    },
    hashPassword: async () => 'hashed', generateInvitePassword: () => 'generated',
    prisma: { user: { create: async ({ data }) => { saved.push(data); return data; } } },
  });
  return { save: (vendorInput) => save(null, { vendorInput }, {}), checked, saved };
}
test('API rejects country-code-only drafts before checking duplicates or creating rows', async () => {
  for (const phoneNumber of ['', '+91', '91']) {
    const api = apiHarness();
    await assert.rejects(api.save({ phoneNumber }), /Add at least a name/);
    assert.equal(api.checked.length, 0);
    assert.equal(api.saved.length, 0);
  }
});
test('API saves a partial name-only draft without storing the country code', async () => {
  const api = apiHarness();
  await api.save({ firstName: 'Test', phoneNumber: '+91' });
  assert.equal(api.saved.length, 1);
  assert.equal(api.saved[0].phone, undefined);
  assert.equal(api.saved[0].status, 'DRAFT');
});
test('API still rejects a real duplicate mobile number', async () => {
  const api = apiHarness();
  await assert.rejects(api.save({ firstName: 'Test', phoneNumber: '9876543210' }), /already registered/);
  assert.equal(api.saved.length, 0);
});
