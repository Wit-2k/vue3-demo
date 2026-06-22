# demo

一个 Vue3 演示项目：客户端填写表单、后台查看与处理。使用 Vue Router 做页面跳转，使用 Pinia 管理状态，数据以 JSON 形式持久化到浏览器 localStorage，不引入任何数据库。

## 环境与脚本

- 包管理：[bun](https://bun.sh/)（也可用 npm/pnpm，但 lockfile 是 bun 的）
- Node 要求见 `package.json` 的 `engines`

```bash
bun install        # 安装依赖
bun run dev        # 启动开发服务器（默认 http://localhost:5173）
bun run build      # 类型检查 + 生产构建
bun run test       # 运行 vitest 单元测试
bun run type-check # 仅运行 vue-tsc 类型检查
```

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
