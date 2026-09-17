const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-admin/node_modules/typescript'));
const yup = require(path.join(root, 'localsell-admin/node_modules/yup'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function evaluate(source, context) {
  return vm.runInNewContext(ts.transpileModule(source, {
    fileName: 'test.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
}
const schemaExports = {};
evaluate(read('localsell-admin/lib/utils/schema/rider.ts'), {
  exports: schemaExports,
  require: (name) => name === 'yup' ? yup : {},
});
const schema = schemaExports.RiderSchema.pick(['employmentType', 'assignedStore']);
test('store selection is required only for store-assigned riders', async () => {
  assert.equal(await schema.isValid({ employmentType: 'INDEPENDENT', assignedStore: null }), true);
  assert.equal(await schema.isValid({ employmentType: 'STORE_ASSIGNED', assignedStore: null }), false);
  assert.equal(await schema.isValid({ employmentType: 'STORE_ASSIGNED', assignedStore: { label: 'Store', code: '' } }), false);
  assert.equal(await schema.isValid({ employmentType: 'STORE_ASSIGNED', assignedStore: { label: 'Store', code: 'store-1' } }), true);
});
const source = read('localsell-api/src/graphql/resolvers/rider.resolvers.ts');
const helpers = source.slice(source.indexOf('function riderProfileWriteData'), source.indexOf('async function loadRiderProfile'));
const { write, validate } = evaluate(`${helpers}\n({ write: riderProfileWriteData, validate: validateRiderStore });`, {
  userInputError: (message) => new Error(message),
  prisma: { restaurant: { findUnique: async ({ where }) => where.id === 'store-1' ? { id: 'store-1' } : null } },
});
test('API rejects missing or deleted stores before a rider is saved', async () => {
  await assert.rejects(validate({ employmentType: 'STORE_ASSIGNED' }), /Select a store/);
  await assert.rejects(validate({ employmentType: 'STORE_ASSIGNED', assignedStoreId: 'deleted' }), /no longer exists/);
  await validate({ employmentType: 'STORE_ASSIGNED', assignedStoreId: 'store-1' });
  await validate({ employmentType: 'INDEPENDENT' });
});
test('drafts may omit a store but cannot save an invalid store', async () => {
  await validate({ employmentType: 'STORE_ASSIGNED' }, true);
  await assert.rejects(validate({ employmentType: 'STORE_ASSIGNED', assignedStoreId: 'deleted' }, true), /no longer exists/);
});
test('profile writes persist, clear and preserve assignments appropriately', () => {
  assert.equal(write({ employmentType: 'STORE_ASSIGNED', assignedStoreId: 'store-1' }).assignedStoreId, 'store-1');
  assert.equal(write({ employmentType: 'INDEPENDENT', assignedStoreId: 'store-1' }).assignedStoreId, null);
  assert.equal('assignedStoreId' in write({ name: 'Updated name' }), false);
  assert.equal(write({ name: 'Updated name' }).employmentType, undefined);
});

test('Store Name selector renders only for Store assigned and shows the saved selection', () => {
  const React = require(path.join(root, 'localsell-admin/node_modules/react'));
  const { renderToStaticMarkup } = require(path.join(root, 'localsell-admin/node_modules/react-dom/server'));
  const screen = read('localsell-admin/lib/ui/screens/super-admin/general/rider-registration/index.tsx');
  const ast = ts.createSourceFile('screen.tsx', screen, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isJsxExpression(node) && node.expression?.getText(ast).startsWith("values.employmentType === 'STORE_ASSIGNED' &&")) expression = node.expression.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression);
  const render = (employmentType) => renderToStaticMarkup(evaluate(`(${expression});`, {
    exports: {},
    require: (name) => require(require.resolve(name, { paths: [path.join(root, 'localsell-admin')] })),
    values: { employmentType, assignedStore: { label: 'Sample Store', code: 'store-1' } },
    storeOptions: [{ label: 'Sample Store', code: 'store-1' }],
    storesLoading: false, storesError: null, storesData: {},
    t: (value) => value, fieldError: () => undefined,
    CustomDropdownComponent: (props) => React.createElement('label', null, props.placeholder,
      React.createElement('select', { defaultValue: props.selectedItem?.code },
        props.options.map((option) => React.createElement('option', { key: option.code, value: option.code }, option.label)))),
  }));
  assert.equal(render('INDEPENDENT'), '');
  const assigned = render('STORE_ASSIGNED');
  assert.match(assigned, /Store Name \*/);
  assert.match(assigned, /value="store-1" selected=""/);
});
