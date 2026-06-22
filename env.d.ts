/// <reference types="vite/client" />

// 让 TS 识别 .vue 文件的导入
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
