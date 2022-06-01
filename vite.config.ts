import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es','umd'],
      name: 'lazyload'
    },
    rollupOptions: {
      external: /^lit/
    }
  }
})
