/* eslint-disable */
/**
 * Minimal live smoke-runner for the generated Postman collections. Not a full
 * Postman/newman replacement — it just runs each POST request top-to-bottom,
 * substitutes {{vars}}, applies the same id-capture logic the collections use,
 * and reports HTTP + GraphQL-error status.
 *
 * Run:  node postman/run.js [collectionFile ...]   (default: all 5)
 *       BASE_URL=http://localhost:4000 node postman/run.js admin
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const args = process.argv.slice(2);
const only = args.length
  ? args.map((a) => (a.endsWith('.json') ? a : `${a}.postman_collection.json`))
  : fs.readdirSync(__dirname).filter((f) => f.endsWith('.postman_collection.json'));

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function subst(str, scope) {
  return str.replace(/\{\{([^}]+)\}\}/g, (m, k) => (scope[k] !== undefined ? scope[k] : m));
}

async function runCollection(file) {
  const col = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  const scope = { baseUrl: BASE_URL, wsUrl: BASE_URL.replace(/^http/, 'ws'), token: '' };
  for (const v of col.variable || []) scope[v.key] = v.value || '';

  const results = { pass: 0, fail: 0, skip: 0 };
  console.log(`\n\x1b[1m=== ${col.info.name} ===\x1b[0m`);

  const flat = [];
  (function walk(items, trail) {
    for (const it of items) {
      if (it.item) walk(it.item, trail.concat(it.name));
      else flat.push({ it, trail });
    }
  })(col.item, []);

  for (const { it, trail } of flat) {
    if (!it.request || it.request.method !== 'POST') {
      results.skip++;
      continue;
    }
    const raw = subst(it.request.body.raw, scope);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      console.log(`  \x1b[31mFAIL\x1b[0m ${it.name} — bad JSON after substitution`);
      results.fail++;
      continue;
    }
    // token auth
    const authBearer = (it.request.auth && it.request.auth.type === 'noauth') ? null : scope.token;
    const headers = { 'Content-Type': 'application/json' };
    if (authBearer) headers.Authorization = `Bearer ${authBearer}`;

    let label = `${trail.slice(1).join(' / ')} / ${it.name}`.replace(/^ \/ /, '');
    try {
      const res = await fetch(`${scope.baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      const gqlErr = json.errors && json.errors.length ? json.errors[0].message : null;

      // apply captures from the test script (parse the [path,var] pairs back out)
      const exec = (it.event && it.event[0] && it.event[0].script.exec.join('\n')) || '';
      const capRe = /const v = body\.data\.([^;]+?); if \(v/g;
      let cm;
      while ((cm = capRe.exec(exec))) {
        // find matching set('name')
      }
      const setRe = /body\.data\.([\w.\[\]]+);[\s\S]*?pm\.collectionVariables\.set\('([^']+)'/g;
      let sm;
      while ((sm = setRe.exec(exec))) {
        const val = getPath(json, `data.${sm[1].replace(/\[(\d+)\]/g, '.$1')}`);
        if (val !== undefined && val !== null && val !== '') {
          scope[sm[2]] = typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
      }

      if (res.status === 200 && !gqlErr) {
        results.pass++;
        // console.log(`  \x1b[32mOK  \x1b[0m ${label}`);
      } else {
        results.fail++;
        console.log(`  \x1b[31mFAIL\x1b[0m ${label} — HTTP ${res.status}${gqlErr ? ` — ${gqlErr}` : ''}`);
      }
    } catch (e) {
      results.fail++;
      console.log(`  \x1b[31mERR \x1b[0m ${label} — ${e.message}`);
    }
  }

  console.log(
    `  \x1b[1m${results.pass} passed, ${results.fail} failed\x1b[0m (${results.skip} non-HTTP skipped)`
  );
  return results;
}

(async () => {
  let pass = 0;
  let fail = 0;
  for (const f of only) {
    const r = await runCollection(f);
    pass += r.pass;
    fail += r.fail;
  }
  console.log(`\n\x1b[1mTOTAL: ${pass} passed, ${fail} failed\x1b[0m`);
  process.exit(fail ? 1 : 0);
})();
