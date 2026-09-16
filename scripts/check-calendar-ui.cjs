// Prevent native date inputs and unthemed calendar imports from returning.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = process.cwd();
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const errors = [];
let scanned = 0;
function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.[jt]sx?$/.test(file)) continue;
    scanned++;
    const relative = path.relative(root, file).replaceAll('\\', '/');
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function report(node, message) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      errors.push(`${relative}:${line + 1} ${message}`);
    }
    function visit(node) {
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'type' && node.initializer) {
        const value = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (value && ts.isStringLiteral(value) && ['date', 'datetime-local', 'month', 'week'].includes(value.text)) report(node, 'Use the shared date input/calendar instead of a native date control.');
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const moduleName = node.moduleSpecifier.text;
        if (moduleName === 'primereact/calendar' && relative !== 'lib/ui/useable-components/date-input/calendar.tsx') report(node, 'Import the shared Calendar wrapper.');
        if (moduleName === 'react-native-calendars' && relative !== 'lib/ui/useable-components/calendar/index.tsx') {
          const bindings = node.importClause?.namedBindings;
          if (bindings && ts.isNamedImports(bindings) && bindings.elements.some(item => ['Calendar', 'CalendarList', 'Agenda'].includes((item.propertyName ?? item.name).text))) report(node, 'Import the themed Calendar wrapper.');
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
for (const dir of ['app', 'lib']) scan(path.join(root, dir));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Calendar UI check passed (${scanned} files scanned).`);
