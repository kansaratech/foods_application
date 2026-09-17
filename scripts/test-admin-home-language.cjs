const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../localsell-admin');
const dependency = (name) => require(require.resolve(name, { paths: [root] }));
const ts = dependency('typescript');
const React = dependency('react');
const { renderToStaticMarkup } = dependency('react-dom/server');
const { createTranslator } = dependency('next-intl');
const file = path.join(root, 'lib/ui/screens/super-admin/home/index.tsx');
const source = fs.readFileSync(file, 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const LayoutContext = React.createContext({ isSuperAdminSidebarVisible: true });
function render(locale) {
  const messages = JSON.parse(fs.readFileSync(path.join(root, `locales/${locale}.json`), 'utf8'));
  const translator = createTranslator({ locale, messages, namespace: 'home_dashboard', onError: (error) => { throw error; } });
  const component = (props) => React.createElement('div', null, props.children);
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name === 'next-intl') return { useTranslations: () => translator, useLocale: () => locale };
      if (name === 'next/dynamic') return () => component;
      if (name === 'next/navigation') return { useRouter: () => ({ push() {} }) };
      if (name === '@apollo/client') return { useQuery: () => ({ data: {
        adminOpsSnapshot: { totalStores: 2, activeStores: 1, unbilledCommission: 20, waitlistUnnotified: 1 },
        pendingStoreDocuments: { total: 1 },
        storePerformance: { rows: [{ _id: 'one', name: 'Sample Store', orders: 5, gmv: 500, cancelRate: 0 }] },
      } }) };
      if (name.endsWith('layout.context')) return { LayoutContext };
      if (name.endsWith('useUser')) return { useUserContext: () => ({ user: { name: 'Test Admin' } }) };
      if (name.endsWith('/calendar')) return { dateString: (date) => date.toISOString().slice(0, 10), dateValue: (date) => new Date(date) };
      if (name.endsWith('segmented-control')) return (props) => React.createElement('div', null, props.options.map(props.renderLabel).join(' | '));
      if (name.startsWith('@/lib/ui/')) return component;
      if (name === '@fortawesome/react-fontawesome') return { FontAwesomeIcon: () => null };
      if (name.startsWith('@fortawesome/') || name === '@/lib/api/graphql') return {};
      return dependency(name);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}
test('dashboard renders Hindi labels, filters, empty states and dynamic messages', () => {
  const html = render('hi');
  for (const expected of ['वापसी पर स्वागत है', 'कुल बिक्री', 'पिछले 7 दिन', 'राजस्व', 'शीर्ष स्टोर', 'ध्यान देने की आवश्यकता', 'इस अवधि में अभी कोई गतिविधि नहीं है', '5 ऑर्डर']) {
    assert.ok(html.includes(expected), expected);
  }
  for (const english of ['Gross sales', 'Welcome back', 'Last 7 days', 'Attention needed', ' orders ·']) {
    assert.ok(!html.includes(english), english);
  }
});
test('English remains available after rendering Hindi', () => {
  render('hi');
  const html = render('en');
  assert.ok(html.includes('Gross sales'));
  assert.ok(html.includes('Welcome back, Test Admin'));
  assert.ok(html.includes('Last 7 days'));
});
test('all locale files provide the dashboard keys without corrupted Hindi text', () => {
  const en = JSON.parse(fs.readFileSync(path.join(root, 'locales/en.json'), 'utf8')).home_dashboard;
  for (const file of fs.readdirSync(path.join(root, 'locales')).filter((name) => name.endsWith('.json'))) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, 'locales', file), 'utf8')).home_dashboard;
    assert.deepEqual(Object.keys(messages), Object.keys(en), file);
    if (file === 'hi.json') for (const value of Object.values(messages)) assert.match(value, /[\u0900-\u097f]/);
  }
});
