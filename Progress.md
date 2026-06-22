# Progress.md

开发过程中遇到的 bug 与解决方法记录。

## 1. vue-tsc 报 "Cannot find module './App.vue'"

**现象**：写好 `src/main.ts`（`import App from './App.vue'`）和路由后，运行 `bun run type-check` 报：

```
src/main.ts(3,17): error TS2307: Cannot find module './App.vue' or its corresponding type declarations.
src/router/index.ts: Cannot find module '@/views/ClientView.vue' ...
```

文件明明存在，TS 却说不认识 `.vue`。

**原因**：`env.d.ts` 里只有 `/// <reference types="vite/client" />`。在这个版本的 `@vue/tsconfig` + `vue-tsc` 组合下，`vite/client` 并未提供 `.vue` 的模块声明（或者说该声明没被正确加载），所以 TypeScript 不知道 `.vue` 文件应当被当成一个 Vue 组件模块来导入。

**解决**：在 `env.d.ts` 里显式补一个 `.vue` 模块声明：

```ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

补上后 `bun run type-check` 通过。

**教训**：空模板里 `env.d.ts` 看起来"应该够用"，但不同版本组合下 `.vue` 声明并不一定自动生效，类型检查时报错时优先怀疑这里。

---

## 2. vitest 默认环境没有 localStorage，dataService 单测报错

**现象**：最初给 `dataService` 写单测时直接用 `localStorage.clear()`，运行报 `localStorage is not defined`。

**原因**：vitest 默认运行在 node 环境，没有 DOM，自然没有 `localStorage`。常见的做法是装 `jsdom` 或 `happy-dom` 并在 vitest 配置里指定 `environment: 'jsdom'`。但本项目 `package.json` 里没有这两个依赖，再装一个 DOM 环境只为了测一个 localStorage 读写，成本不划算。

**解决**：在测试文件里用一个最小内存实现 mock 掉全局 `localStorage`：

```ts
function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value) }),
    clear: () => store.clear(),
    _store: store,
  }
}
// beforeEach 里
vi.stubGlobal('localStorage', storage)
```

`dataService` 只用到 `getItem`/`setItem`，这个 mock 完全够用，且测试跑在 node 环境更快。

**教训**：测试所需的浏览器 API 不一定要拉一个完整 DOM 环境，针对被测代码用到的部分做最小 mock 往往更轻、更快。

---

## 3. 中文姓名排序结果和直觉不一致

**现象**：`formStore.test.ts` 的"按姓名排序"用例一开始写的期望是 `['张三', '李四', '王五']`，结果实际返回 `['李四', '王五', '张三']`，测试失败。

**原因**：`sortSubmissions` 用的是 `String.prototype.localeCompare`，它按本地化（拼音）规则排序，中文下顺序是 李 < 王 < 张，而不是按 Unicode 码点（那才会出现 张 < 李 < 王 之类）。这是**预期行为**——按拼音排序对中文用户更友好——错的是我对结果的预期。

**解决**：把测试期望改成正确的拼音顺序 `['李四', '王五', '张三']`，并补一条降序用例。代码不动。

**教训**：测试失败时先分清是"代码错了"还是"我的预期错了"。`localeCompare` 的中文排序行为容易踩直觉，记一笔。

---

## 4. `<details>` + `<summary>` 自定义展开状态不联动

**现象**：后台页"历史请求"用 `<details><summary>` 折叠，我在 `summary` 上写了 `@click.prevent` 并手动切换 `showHistory`，但点开后三角箭头不变、再次点击行为别扭。

**原因**：`@click.prevent` 阻止了 `<details>` 原生的 open/close 切换，而我没把内部 `open` 属性和 `showHistory` 绑定，导致 DOM 的 `open` 状态和我的 `showHistory` 状态各管各的、不同步。

**解决**：给 `<details>` 加 `:open="showHistory"`，让原生展开状态完全由 `showHistory` 驱动；`summary` 仍用 `@click.prevent` 阻止原生切换，改由 `showHistory = !showHistory` 单点控制：

```html
<details :open="showHistory">
  <summary @click.prevent="showHistory = !showHistory">历史请求（{{ historyRequests.length }}）</summary>
  ...
</details>
```

这样 `showHistory` 成为唯一数据源，列表渲染（`v-if="showHistory && ..."`）和折叠状态永远一致。

**教训**：用了原生受控元素（details/summary、input 等）又想自己管状态时，一定要把元素的"受控属性"和自己的状态绑死，否则会出现两套状态打架。
