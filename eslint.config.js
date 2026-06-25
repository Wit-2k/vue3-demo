// ESLint flat config（见 teaching/20-project-deficiencies.md §1.1）。
// 组合 Vue 官方推荐规则 + TS 规则，并关闭与 Prettier 冲突的格式化规则。

import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    // 全局忽略：构建产物、依赖、覆盖率报告都不检查
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**'],
  },

  // Vue 官方推荐规则集（essential 档：覆盖最常见的 Vue 错误）
  ...pluginVue.configs['flat/essential'],

  // Vue + TS 组合规则（自动读取 tsconfig）
  ...vueTsEslintConfig(),

  // 关闭与 Prettier 冲突的规则，把格式化交给 Prettier
  skipFormatting,
]
