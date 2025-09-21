import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  input: 'src/cli.ts',
  output: {
    dir: 'dist',
    format: 'cjs',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
  },
  external: [
    'node:fs',
    'node:path',
    'node:url',
    'node:child_process',
    'node:crypto',
    'node:os',
    'node:readline',
    'node:stream',
    'node:util',
    '@modelcontextprotocol/sdk',
    '@gitbeaker/node',
    '@octokit/rest',
    'boxen',
    'chalk',
    'cli-table3',
    'ora',
    'simple-git',
    'yaml',
  ],
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
});