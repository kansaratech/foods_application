/* eslint-disable */
/**
 * Validates every GraphQL operation in the generated Postman collections against
 * the backend schema (parse + validate, no DB needed).
 *
 * Run:  node postman/validate.js
 */
require('ts-node/register/transpile-only');
const fs = require('fs');
const path = require('path');
const { buildSchema, parse, validate, print } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { typeDefs } = require('../src/graphql/typeDefs');

const schema = makeExecutableSchema({ typeDefs, resolvers: {} });

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.postman_collection.json'));

let total = 0;
let failed = 0;

function walk(items, trail) {
  for (const it of items) {
    if (it.item) {
      walk(it.item, trail.concat(it.name));
      continue;
    }
    if (!it.request || it.request.method !== 'POST') continue;
    let body;
    try {
      body = JSON.parse(it.request.body.raw);
    } catch (e) {
      console.log(`✗ ${trail.join(' / ')} / ${it.name} — body is not JSON`);
      failed++;
      total++;
      continue;
    }
    total++;
    try {
      const doc = parse(body.query);
      const errors = validate(schema, doc);
      if (errors.length) {
        failed++;
        console.log(`✗ ${trail.join(' / ')} / ${it.name}`);
        for (const err of errors) console.log(`    ${err.message}`);
      }
    } catch (e) {
      failed++;
      console.log(`✗ ${trail.join(' / ')} / ${it.name} — ${e.message}`);
    }
  }
}

for (const f of files) {
  const col = JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
  console.log(`\n=== ${f} ===`);
  walk(col.item, [f.replace('.postman_collection.json', '')]);
}

console.log(`\n${total - failed}/${total} operations valid` + (failed ? ` — ${failed} FAILED` : ' — all good'));
process.exit(failed ? 1 : 0);
