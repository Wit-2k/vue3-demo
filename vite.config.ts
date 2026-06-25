import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 组件测试需要一个 DOM 环境，happy-dom 比 jsdom 更轻快。
    // 纯逻辑测试（dataService / formStore）也跑在这个环境下，没有副作用。
    environment: 'happy-dom',
  },
})
