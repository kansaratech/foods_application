const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-admin/node_modules/typescript'));
const React = require(path.join(root, 'localsell-admin/node_modules/react'));
const { renderToStaticMarkup } = require(path.join(root, 'localsell-admin/node_modules/react-dom/server'));
const { parse, buildASTSchema, graphql, defaultFieldResolver } = require(path.join(root, 'localsell-api/node_modules/graphql'));
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, { exports, React, require: (name) => dependencies[name] || {} });
  return exports;
}
const utils = load('localsell-admin/lib/ui/screens/super-admin/general/users/utils.ts');
const { USERS_TABLE_COLUMNS } = load('localsell-admin/lib/ui/useable-components/table/columns/user-columns.tsx', {
  '@/lib/ui/screens/super-admin/general/users/utils': utils,
});
const columns = USERS_TABLE_COLUMNS();
const contact = columns.find((column) => column.headerName === 'Contact');
const activity = columns.find((column) => column.headerName === 'Last active');
const render = (user) => renderToStaticMarkup(contact.body(user));

test('phone-only customers display the API number without a missing-email placeholder', () => {
  const html = render({ email: null, phone: '+919555252371' });
  assert.match(html, /dir="ltr"/);
  assert.match(html, />\+919555252371<\/span>/);
  assert.doesNotMatch(html, /\?|<small|No contact details/);
});
test('email-only and complete contact records retain their actual values', () => {
  assert.match(render({ email: 'customer@example.com', phone: null }), /customer@example.com/);
  const html = render({ email: 'customer@example.com', phone: '+919555252371' });
  assert.match(html, /customer@example.com/);
  assert.match(html, /\+919555252371/);
  assert.doesNotMatch(html, /\?/);
});
test('null, empty, whitespace and omitted contact details have one readable fallback', () => {
  for (const user of [{}, { email: null, phone: null }, { email: '', phone: '' }, { email: '  ', phone: '  ' }]) {
    assert.match(render(user), />No contact details<\/span>/);
    assert.doesNotMatch(render(user), /\?/);
  }
});
test('missing or invalid activity dates have a readable fallback', () => {
  for (const lastLogin of [null, undefined, '', 'invalid']) {
    assert.match(renderToStaticMarkup(activity.body({ lastLogin })), /Not available/);
  }
  assert.doesNotMatch(renderToStaticMarkup(activity.body({ lastLogin: String(Date.now()) })), /Not available/);
});
test('real admin GraphQL resolver preserves nullable contacts through to rendered UI', async () => {
  const rows = [
    { id: 'phone', email: null, phone: '+919555252371', lastLogin: null },
    { id: 'email', email: 'customer@example.com', phone: null, lastLogin: null },
    { id: 'missing', email: null, phone: null, lastLogin: null },
  ];
  const { adminResolvers } = load('localsell-api/src/graphql/resolvers/admin.resolvers.ts', {
    '../../prisma/client': { prisma: { user: { findMany: async ({ where }) => {
      assert.equal(where.userType, 'CUSTOMER');
      return rows;
    } } } },
    '../../middleware/auth': { requireRole: (context, roles) => {
      assert.ok(roles.includes('ADMIN'));
      if (context.role !== 'ADMIN') throw Error('Forbidden');
    } },
  });
  const { adminTypeDefs } = load('localsell-api/src/graphql/typeDefs/admin.ts');
  const type = parse(adminTypeDefs).definitions.find((node) => node.name?.value === 'AdminUser');
  const fields = ['_id', 'email', 'phone', 'lastLogin', 'registrationMethod'];
  // Use the actual API field types while isolating unrelated schema dependencies.
  const schema = buildASTSchema({ kind: 'Document', definitions: [
    { ...type, fields: type.fields.filter((field) => fields.includes(field.name.value)) },
    ...parse('type Query { users: [AdminUser!]! }').definitions,
  ] });
  const execute = (role) => graphql({ schema, source: '{ users { _id email phone lastLogin registrationMethod } }',
    contextValue: { role }, fieldResolver: (parent, args, context, info) => {
      const resolver = adminResolvers[info.parentType.name]?.[info.fieldName];
      return resolver ? resolver(parent, args, context, info) : defaultFieldResolver(parent, args, context, info);
    } });
  const result = await execute('ADMIN');
  assert.equal(result.errors, undefined);
  assert.equal(result.data.users[0].email, null);
  assert.equal(result.data.users[0].registrationMethod, 'phone');
  for (const user of result.data.users) assert.doesNotMatch(render(user), /\?/);
  assert.match(render(result.data.users[2]), /No contact details/);
  assert.match((await execute('CUSTOMER')).errors[0].message, /Forbidden/);
});
