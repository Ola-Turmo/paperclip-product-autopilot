import * as esbuild from 'esbuild';

const workerBuild = await esbuild.build({
  entryPoints: ['src/worker/index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/worker/index.js',
  format: 'esm',
  target: 'node18',
  external: ['@paperclipai/*', 'node:*', 'react', 'react-dom'],
  sourcemap: true,
  logLevel: 'warning',
});

if (workerBuild.errors.length > 0) {
  console.error('Worker build failed:', workerBuild.errors);
  process.exit(1);
}

const uiBuild = await esbuild.build({
  entryPoints: ['src/ui/index.tsx'],
  bundle: true,
  outfile: 'dist/ui/index.js',
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
  console.error('UI build failed:', uiBuild.errors);
  process.exit(1);
}

console.log('Build complete: worker + ui bundles');
