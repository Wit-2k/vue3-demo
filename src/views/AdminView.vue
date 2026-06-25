<script setup lang="ts">
// 后台页面：查看、排序、处理请求、直接编辑提交
import { computed, reactive, ref } from 'vue'
import { useFormStore } from '@/stores/formStore'
import { formatTime, requestTypeText, statusText } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import type { ChangeRequest, Submission } from '@/types'

const store = useFormStore()

// ---------- 1 & 2. 查看 + 排序 ----------
type SortField = 'createdAt' | 'updatedAt' | 'name'
const sortField = ref<SortField>('createdAt')
const sortAsc = ref(true)

const sortedSubmissions = computed<Submission[]>(() =>
  store.sortSubmissions(sortField.value, sortAsc.value),
)

function toggleSort(field: SortField) {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortField.value = field
    sortAsc.value = true
  }
}

function sortIndicator(field: SortField): string {
  if (sortField.value !== field) return ''
  return sortAsc.value ? ' ▲' : ' ▼'
}

// ---------- 3. 处理请求 ----------
// submissionMap：把 submissions 数组转成 Map，按 id 做 O(1) 查找，
// 避免每次渲染都遍历整个数组（见 §5.1 / §10.3）。
const submissionMap = computed<Map<string, Submission>>(() => {
  const map = new Map<string, Submission>()
  for (const s of store.submissions) map.set(s.id, s)
  return map
})

/** 一条 pending 请求 + 它关联的 submission（可能不存在）。 */
interface PendingItem {
  req: ChangeRequest
  submission: Submission | undefined
}

const pendingRequests = computed<PendingItem[]>(() =>
  store.requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((req) => ({ req, submission: submissionMap.value.get(req.submissionId) })),
)

// 二次确认弹层：approve delete 这类不可撤销操作前先弹确认（见 §8.2）
const confirmState = reactive<{ open: boolean; reqId: string | null }>({
  open: false,
  reqId: null,
})

const confirmMessage = computed(() => {
  const reqId = confirmState.reqId
  if (!reqId) return ''
  const item = pendingRequests.value.find((it) => it.req.id === reqId)
  const sub = item?.submission
  const target = sub ? `「${sub.name}」` : '该提交'
  return `确定要同意删除${target}吗？此操作不可撤销。`
})

function approve(req: ChangeRequest) {
  if (req.type === 'delete') {
    // 删除不可撤销，先弹二次确认
    confirmState.reqId = req.id
    confirmState.open = true
    return
  }
  // modify 可直接执行
  store.resolveRequest(req.id, true)
}

function confirmApprove() {
  const reqId = confirmState.reqId
  confirmState.open = false
  confirmState.reqId = null
  if (reqId) store.resolveRequest(reqId, true)
}

function cancelConfirm() {
  confirmState.open = false
  confirmState.reqId = null
}

function reject(req: ChangeRequest) {
  store.resolveRequest(req.id, false)
}

// 历史已处理请求（折叠展示，便于核对）
const showHistory = ref(false)
const historyRequests = computed<PendingItem[]>(() =>
  store.requests
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((req) => ({ req, submission: submissionMap.value.get(req.submissionId) })),
)

// ---------- 直接编辑 ----------
const editing = reactive<{
  id: string | null
  name: string
  content: string
}>({ id: null, name: '', content: '' })

function startEdit(sub: Submission) {
  editing.id = sub.id
  editing.name = sub.name
  editing.content = sub.content
}

function cancelEdit() {
  editing.id = null
}

function saveEdit() {
  if (!editing.id) return
  if (!editing.name.trim() || !editing.content.trim()) return
  store.editSubmission(editing.id, {
    name: editing.name,
    content: editing.content,
  })
  editing.id = null
}
</script>

<template>
  <section class="admin">
    <h2>后台 · 管理提交</h2>

    <!-- 1 & 2. 查看 + 排序 -->
    <div class="card">
      <h3>提交列表（点击表头排序）</h3>
      <table v-if="sortedSubmissions.length" class="table">
        <thead>
          <tr>
            <th>
              姓名
              <button class="sort-btn" @click="toggleSort('name')">
                排序{{ sortIndicator('name') }}
              </button>
            </th>
            <th>内容</th>
            <th>
              提交时间
              <button class="sort-btn" @click="toggleSort('createdAt')">
                排序{{ sortIndicator('createdAt') }}
              </button>
            </th>
            <th>
              更新时间
              <button class="sort-btn" @click="toggleSort('updatedAt')">
                排序{{ sortIndicator('updatedAt') }}
              </button>
            </th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sortedSubmissions" :key="s.id">
            <template v-if="editing.id === s.id">
              <td><input v-model="editing.name" /></td>
              <td><input v-model="editing.content" /></td>
              <td colspan="3"></td>
              <td>
                <button class="btn btn--sm btn--primary" @click="saveEdit">保存</button>
                <button class="btn btn--sm" @click="cancelEdit">取消</button>
              </td>
            </template>
            <template v-else>
              <td>{{ s.name }}</td>
              <td>{{ s.content }}</td>
              <td>{{ formatTime(s.createdAt) }}</td>
              <td>{{ formatTime(s.updatedAt) }}</td>
              <td>
                <span :class="['tag', s.status === 'active' ? 'tag--ok' : 'tag--del']">
                  {{ statusText(s) }}
                </span>
              </td>
              <td>
                <button class="btn btn--sm" @click="startEdit(s)" :disabled="s.status === 'deleted'">
                  编辑
                </button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
      <p v-else class="muted">暂无提交记录</p>
    </div>

    <!-- 3. 处理请求 -->
    <div class="card">
      <h3>待处理请求</h3>
      <div v-if="pendingRequests.length" class="requests">
        <div v-for="item in pendingRequests" :key="item.req.id" class="request">
          <div class="request__head">
            <span :class="['tag', item.req.type === 'delete' ? 'tag--del' : 'tag--warn']">
              {{ requestTypeText(item.req.type) }}请求
            </span>
            <span class="muted">{{ formatTime(item.req.createdAt) }}</span>
          </div>
          <div v-if="item.submission">
            <p>
              目标提交：<strong>{{ item.submission.name }}</strong> - {{ item.submission.content }}
            </p>
            <template v-if="item.req.type === 'modify'">
              <p>新姓名：{{ item.req.newName }}</p>
              <p>新内容：{{ item.req.newContent }}</p>
            </template>
          </div>
          <p v-else class="muted">（关联的提交不存在）</p>
          <p>原因：{{ item.req.reason }}</p>
          <div class="request__actions">
            <button class="btn btn--sm btn--primary" @click="approve(item.req)">同意</button>
            <button class="btn btn--sm btn--danger" @click="reject(item.req)">拒绝</button>
          </div>
        </div>
      </div>
      <p v-else class="muted">没有待处理的请求</p>

      <details class="history" :open="showHistory">
        <summary @click.prevent="showHistory = !showHistory">
          历史请求（{{ historyRequests.length }}）
        </summary>
        <table v-if="showHistory && historyRequests.length" class="table">
          <thead>
            <tr>
              <th>类型</th>
              <th>目标</th>
              <th>原因</th>
              <th>时间</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in historyRequests" :key="item.req.id">
              <td>{{ requestTypeText(item.req.type) }}</td>
              <td>{{ item.submission?.name ?? '（已不存在）' }}</td>
              <td>{{ item.req.reason }}</td>
              <td>{{ formatTime(item.req.createdAt) }}</td>
              <td>
                <span :class="['tag', item.req.status === 'approved' ? 'tag--ok' : 'tag--del']">
                  {{ item.req.status === 'approved' ? '已同意' : '已拒绝' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>

    <!-- 删除请求的二次确认弹层（见 §8.2） -->
    <ConfirmDialog :open="confirmState.open" title="确认删除" :message="confirmMessage" confirm-text="同意删除"
      @confirm="confirmApprove" @cancel="cancelConfirm" />
  </section>
</template>

<style scoped>
/*
 * 公共样式（.card / .btn / .table / .tag …）已提取到
 * src/assets/styles/base.css，由 main.ts 全局引入（见 §2.1）。
 * 这里只保留 AdminView 特有的样式。
 */
.admin {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sort-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-primary);
  font-size: 12px;
  padding: 0;
}

.requests {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px;
  background: #fafafa;
}

.request__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.request p {
  margin: 4px 0;
  font-size: 14px;
}

.request__actions {
  margin-top: 8px;
}

.history {
  margin-top: 16px;
}

.history summary {
  cursor: pointer;
  font-size: 14px;
  color: var(--color-primary);
}
</style>
