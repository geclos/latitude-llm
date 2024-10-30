import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

export default defineConfig({
  input: 'src/workers/readMetadata.ts',
  output: {
    dir: 'public/workers',
    format: 'es',
    sourcemap: true,
  },
  treeshake: 'smallest',
  plugins: [
    typescript({
      tsconfig: './tsconfig.workers.json',
    }),
    nodeResolve(),
  ],
})
