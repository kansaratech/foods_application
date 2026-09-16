const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const file = path.join(__dirname, '../lib/ui/screens/protected/resturant-store/restaurant/menu-data.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, mod, mod.exports);
const { filterMenu, countMenuItems } = mod.exports;
const categories = [
 { _id: 'pizza-a', title: 'Pizzas', foods: [{ _id: '1', title: 'Margherita', description: 'Fresh basil' }] },
 { _id: 'pizza-b', title: 'Pizzas', foods: [{ _id: '2', title: 'Farmhouse', description: 'Peppers' }] },
 { _id: 'rice', title: 'Rice', foods: [{ _id: '3', title: 'Pulao', description: 'Fresh vegetables' }] },
];
test('duplicate category titles filter independently by ID', () => {
 assert.deepEqual(filterMenu(categories, 'pizza-b', '').map(c => c.foods[0]._id), ['2']);
});
test('category-name search retains items in the matching category', () => {
 assert.equal(countMenuItems(filterMenu(categories, '', ' PIZZAS ')), 2);
});
test('title/description search stays inside the selected category', () => {
 assert.equal(countMenuItems(filterMenu(categories, 'rice', 'fresh')), 1);
 assert.equal(countMenuItems(filterMenu(categories, 'rice', 'Margherita')), 0);
});
test('clearing search preserves category; All items restores menu', () => {
 assert.equal(filterMenu(categories, 'rice', '')[0]._id, 'rice');
 assert.equal(countMenuItems(filterMenu(categories, '', '')), 3);
});
test('popular duplicates count only once', () => {
 assert.equal(countMenuItems([{ _id: 'popular-deals', title: 'Popular', foods: categories[0].foods }, ...categories]), 3);
});
test('no results and no mutation of API data', () => {
 const before = JSON.stringify(categories);
 assert.deepEqual(filterMenu(categories, '', 'unavailable'), []);
 assert.equal(JSON.stringify(categories), before);
});
