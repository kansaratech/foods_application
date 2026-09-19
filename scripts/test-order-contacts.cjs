const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'localsell-web/node_modules/typescript'));
const React = require(path.join(root, 'localsell-web/node_modules/react'));
const { renderToStaticMarkup } = require(path.join(root, 'localsell-web/node_modules/react-dom/server'));
const exportsObject = {};
const source = fs.readFileSync(path.join(root, 'localsell-web/lib/ui/screen-components/protected/order-tracking/components/order-contact-card.tsx'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS }}).outputText, { React, exports: exportsObject, require: () => new Proxy({}, { get: () => () => null }) });
const order = { orderStatus: 'PICKED', restaurant: { name: 'Test store', phone: '+91 90000 00001' }, rider: { _id: 'rider', name: 'Assigned rider', phone: '+91 (90000) 00002' } };
const render = changes => renderToStaticMarkup(React.createElement(exportsObject.default, { order: { ...order, ...changes } }));
test('active orders expose separate sanitized store and assigned rider dial links', () => {
 const html = render({}); assert.match(html, /href="tel:\+919000000001"/); assert.match(html, /href="tel:\+919000000002"/);
});
test('unassigned and missing numbers show useful fallback without broken links', () => {
 const html = render({ rider: null, restaurant: { name: 'Store', phone: null } }); assert.doesNotMatch(html, /href="tel:/); assert.match(html, /when a rider is assigned/);
 for (const value of ['javascript:alert(1)', '12', '++919000000000', 'not supplied']) assert.equal(exportsObject.phoneLink(value), null);
});
test('pickup excludes rider contact; completed and cancelled orders do not retain live contacts', () => {
 const html = render({ isPickedUp: true }); assert.match(html, /Call restaurant/); assert.doesNotMatch(html, /Call rider/);
 for (const orderStatus of ['DELIVERED','COMPLETED','CANCELLED']) assert.equal(render({ orderStatus }), '');
});
