import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

// Resolves the installed location of a package the same way Node itself
// would from this file, so the alias below is correct regardless of where
// npm actually placed the package (this is an npm workspace - dependencies
// can be hoisted to the repository root instead of frontend/node_modules)
// and regardless of operating system. No path is hardcoded.
//
// `require.resolve('events')` cannot be used directly here: Node treats
// `events` as a built-in core module name and always resolves it to that
// core module first, never reaching into node_modules, even though an
// npm package of the same name is installed. Resolving `events/package.json`
// instead does not collide with any core module, so it correctly finds the
// installed npm package's location; its `main` field gives the real entry
// file.
const require = createRequire(import.meta.url);
const eventsPackageJsonPath = require.resolve('events/package.json');
const eventsPackage = require('events/package.json');
const eventsEntry = path.join(path.dirname(eventsPackageJsonPath), eventsPackage.main);

export default defineConfig({
  // Midnight's ledger package ships WASM bindings that need explicit Vite
  // support; wasm() handles loading them. Vite's default build target
  // already supports the top-level await their ESM wrapper uses.
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      // The private-state provider's storage backend (abstract-level, via
      // browser-level) uses Node's built-in `events` module for its
      // EventEmitter base class. Vite does not polyfill Node built-ins by
      // default, so without this alias the bare `events` import resolves
      // to an empty external stub and `class extends EventEmitter` fails
      // at runtime. Aliasing to the resolved absolute path (rather than
      // the bare specifier `events`, which is a no-op self-reference)
      // guarantees esbuild/Rollup use the real installed package.
      events: eventsEntry
    }
  },
  build: {
    target: 'esnext'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
});
