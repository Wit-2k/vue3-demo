# demo

一个 Vue3 演示项目：客户端填写表单、后台查看与处理。使用 Vue Router 做页面跳转，使用 Pinia 管理状态，数据以 JSON 形式持久化到浏览器 localStorage，不引入任何数据库。

## 快速开始

前置：安装 [bun](https://bun.sh/)（也可用 npm/pnpm，但仓库的 lockfile 是 `bun.lock`，用 bun 最省事）。

```bash
# 1. 克隆
git clone https://github.com/Wit-2k/vue3-demo.git
cd vue3-demo

# 2. 安装依赖
bun install

# 3. 启动开发服务器
bun run dev
# 打开浏览器访问 http://localhost:5173
#   /client  客户端填表
#   /admin   后台管理
```

### 常用脚本

```bash
bun run dev        # 启动开发服务器（默认 http://localhost:5173，带 HMR）
bun run build      # 类型检查 + 生产构建（输出到 dist/）
bun run test       # 运行 vitest 单元测试（一次性）
bun run test:watch # 测试监听模式
bun run type-check # 仅运行 vue-tsc 类型检查
bun run preview    # 预览生产构建产物
```

> 注意：`bun run build` 内部用 `npm-run-all2` 调 `npm`，若你的环境只有 bun 没有 npm，会报 `'npm' is not recognized`。改用 `bun run build-only`（直接走 `vite build`）即可，或装一份 npm。

### 关于数据

- 所有数据存在**浏览器的 localStorage** 里（key 为 `demo_submissions` 和 `demo_requests`），不经过任何服务器。
- 因此数据是**按浏览器隔离**的：客户端提交的数据只在同一个浏览器里可见，后台也在同一个浏览器打开 `/admin` 才能看到。换浏览器、无痕窗口、清缓存都会丢数据——这是演示项目的预期行为。
- 想清空重来：浏览器 DevTools → Application → Local Storage → 删除 `demo_submissions` / `demo_requests` 两个 key，或直接 `localStorage.clear()`。

### 如何阅读代码

建议按数据流向阅读，从外到内再回到外：

1. `src/types.ts` —— 先看数据长什么样（`Submission`、`ChangeRequest`）。
2. `src/services/dataService.ts` —— 最底层，看数据怎么存取。
3. `src/stores/formStore.ts` —— 核心，所有业务规则都在这里的 action 里（提交、发起请求、处理请求、排序、直接编辑）。
4. `src/views/ClientView.vue` / `src/views/AdminView.vue` —— UI 层，调用 store 的 action，本身不含业务逻辑。
5. `src/router/index.ts` + `src/main.ts` + `src/App.vue` —— 装配层，把上面几部分串起来。

单测在对应的 `__tests__/` 目录下，按模块对照源码看即可。开发中踩到的坑见 `Progress.md`。

## 环境与脚本

- 包管理：[bun](https://bun.sh/)（也可用 npm/pnpm，但 lockfile 是 bun 的）
- Node 要求见 `package.json` 的 `engines`

## 业务说明

两个页面：

- **客户端** (`/client`)：
  1. 输入姓名 + 内容并提交；
  2. 按姓名查询本人提交记录（含状态）；
  3. 对生效中的提交发起「请求删除」；
  4. 对生效中的提交发起「请求修改」（填写新值 + 原因）。
  所有请求不直接改动数据，而是进入待后台处理队列。

- **后台** (`/admin`)：
  1. 查看全部提交列表；
  2. 点击表头按 姓氏 / 提交时间 / 更新时间 排序，可升/降序切换；
  3. 处理待处理请求：同意则执行（删除/修改），拒绝则仅记录；
  4. 可对单条提交直接行内编辑（不经过请求流程）；
  5. 历史请求可折叠查看。

## 代码结构

```
demo/
├─ index.html                  入口 HTML
├─ vite.config.ts              Vite 配置（@ 别名指向 src）
├─ package.json                依赖与脚本（vue / vue-router / pinia / vitest）
├─ 需求.md                      原始需求
├─ Progress.md                 开发过程记录的 bug 与解决方法
└─ src/
   ├─ main.ts                  应用入口：注册 Pinia + Router
   ├─ App.vue                  根组件：顶部导航 + <RouterView />
   ├─ types.ts                 全局类型：Submission / ChangeRequest 等
   ├─ router/
   │  └─ index.ts              路由表：/ → /client 重定向，/client、/admin
   ├─ services/
   │  ├─ dataService.ts        数据持久化层：localStorage 读写 + JSON 序列化
   │  └─ __tests__/
   │     └─ dataService.test.ts
   ├─ stores/
   │  ├─ formStore.ts          Pinia store：状态 + 所有业务 action（提交/请求/处理/排序/编辑）
   │  └─ __tests__/
   │     └─ formStore.test.ts
   └─ views/
      ├─ ClientView.vue        客户端页面（输入、查询、请求删除/修改）
      └─ AdminView.vue         后台页面（查看、排序、处理请求、直接编辑）
```

### 分层职责

1. **`types.ts`**：纯类型定义，无运行时逻辑。
2. **`services/dataService.ts`**：唯一与浏览器存储打交道的地方。提供 `getSubmissions / saveSubmissions / getRequests / saveRequests`，内部用 `JSON.parse`/`JSON.stringify`，对损坏数据降级返回空数组。换持久化方案（如换成后端 API）只需替换这一层。
3. **`stores/formStore.ts`**：Pinia setup store，持有 `submissions` 和 `requests` 两个 ref。每个修改数据的 action 在变更后立即调用 `dataService` 持久化，保证刷新不丢数据。所有页面通过这一个 store 共享状态。
4. **`views/`**：两个页面组件，只做 UI 和用户交互，业务逻辑全部委托给 store。

### 数据模型

见 `src/types.ts`：

- `Submission`：`id / name / content / createdAt / updatedAt / status('active'|'deleted')`
- `ChangeRequest`：`id / submissionId / type('delete'|'modify') / newName? / newContent? / reason / createdAt / status('pending'|'approved'|'rejected')`

## 测试

使用 vitest，聚焦业务逻辑层（service + store），视图层靠手动 `bun run dev` 验证：

- `dataService.test.ts`：6 个用例，覆盖存取、覆盖写入、空 key、损坏数据降级。
- `formStore.test.ts`：14 个用例，覆盖提交、查询、发起请求、approve/reject 各分支、防重复处理、直接编辑、排序、初始化恢复。

```bash
bun run test
```
