const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

for (const app of ['localsell-web', 'localsell-admin', 'localsell-store']) {
  const root = path.resolve(__dirname, '..', app);
  const ts = require(path.join(root, 'node_modules/typescript'));
  const apollo = require(path.join(root, 'node_modules/@apollo/client'));
  function load(file, overrides = {}, clock = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(code, {
      exports, window: {}, setTimeout, clearTimeout, Date, ...clock,
      require: (name) => overrides[name] || require(require.resolve(name, { paths: [root] })),
    });
    return exports;
  }

  test(`${app}: no flash, concurrent requests, minimum duration, cancellation`, () => {
    let now = 0, id = 0;
    const timers = new Map();
    const activity = load('lib/utils/network-activity.ts', {}, {
      Date: { now: () => now },
      setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; },
      clearTimeout: (key) => timers.delete(key),
    }).createNetworkActivity();
    function advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      now = end;
    }
    const updates = [];
    const unsubscribe = activity.subscribe(() => updates.push(activity.getSnapshot()));
    const fast = activity.begin(); advance(100); fast(); advance(500);
    assert.equal(activity.getSnapshot(), false);
    assert.deepEqual(updates, []);
    const first = activity.begin(), second = activity.begin();
    advance(250); assert.equal(activity.getSnapshot(), true);
    first(); first(); advance(500); assert.equal(activity.getSnapshot(), true);
    second(); advance(0); assert.equal(activity.getSnapshot(), false);
    const third = activity.begin(); advance(250); third();
    advance(399); assert.equal(activity.getSnapshot(), true);
    const fourth = activity.begin(); advance(1); assert.equal(activity.getSnapshot(), true);
    fourth(); advance(0); assert.equal(activity.getSnapshot(), false);
    assert.deepEqual(updates, [true, false, true, false]);
    unsubscribe();
    assert.equal(timers.size, 0);
    assert.equal(activity.getServerSnapshot(), false);
  });

  test(`${app}: Apollo success, error, unsubscribe and subscriptions`, async () => {
    let pending = 0;
    const networkActivity = { begin: () => { pending++; let done = false; return () => { if (!done) { done = true; pending--; } }; } };
    const { networkActivityLink } = load('lib/utils/network-activity-link.ts', { './network-activity': { networkActivity } });
    const query = apollo.gql`query LoaderTest { ok }`;
    let sink;
    const link = apollo.ApolloLink.from([networkActivityLink, new apollo.ApolloLink(() => new apollo.Observable(observer => { sink = observer; }))]);
    let subscription = apollo.execute(link, { query }).subscribe({ next() {}, error() {} });
    assert.equal(pending, 1); sink.next({ data: { ok: true } }); sink.complete();
    await Promise.resolve(); assert.equal(pending, 0);
    subscription = apollo.execute(link, { query }).subscribe({ error() {} });
    sink.error(new Error('API failure')); await Promise.resolve(); assert.equal(pending, 0);
    subscription = apollo.execute(link, { query }).subscribe({});
    assert.equal(pending, 1); subscription.unsubscribe(); assert.equal(pending, 0);
    subscription = apollo.execute(link, { query, context: { silentLoading: true } }).subscribe({});
    assert.equal(pending, 0); subscription.unsubscribe();
    subscription = apollo.execute(link, { query: apollo.gql`subscription LiveTest { ok }` }).subscribe({});
    assert.equal(pending, 0); subscription.unsubscribe();
  });
}
