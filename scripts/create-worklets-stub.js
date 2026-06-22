/**
 * Creates a no-op stub for react-native-worklets so that
 * react-native-reanimated/plugin (which re-exports it) can be loaded
 * by babel-preset-expo without failing in a Jest environment.
 *
 * Run automatically via package.json postinstall.
 */
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'node_modules', 'react-native-worklets');
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(
  path.join(dir, 'package.json'),
  JSON.stringify({ name: 'react-native-worklets', version: '0.0.0', main: 'index.js' }, null, 2),
);
fs.writeFileSync(path.join(dir, 'index.js'), 'module.exports = {};\n');
fs.writeFileSync(
  path.join(dir, 'plugin.js'),
  '// no-op Babel plugin stub\nmodule.exports = function () { return { visitor: {} }; };\n',
);

console.log('[postinstall] Created react-native-worklets stub');
