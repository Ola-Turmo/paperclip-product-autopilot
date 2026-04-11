import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const workerBuild = await esbuild.build({
  entryPoints: [join(rootDir, 'src/worker/index.ts')],
  bundle: true,
  platform: 'node',
  outfile: join(rootDir, 'dist/worker/index.js'),
  format: 'esm',
  target: 'node18',
  external: ['@paperclipai/*', 'node:*', 'react', 'react-dom'],
  sourcemap: true,
  logLevel: 'warning',
});

if (workerBuild.errors.length > 0) {
  console.error('Worker build errors:', workerBuild.errors);
  process.exit(1);
}

const uiBuild = await esbuild.build({
  entryPoints: [join(rootDir, 'src/ui/index.tsx')],
  bundle: true,
  outfile: join(rootDir, 'dist/ui/index.js'),
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'react',
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx' },
  external: ['react', 'react-dom'],
  sourcemap: true,
  minify: false,
  logLevel: 'warning',
});

if (uiBuild.errors.length > 0) {
  console.error('UI build errors:', uiBuild.errors);
  process.exit(1);
}

console.log('Build complete: worker + ui bundles');
