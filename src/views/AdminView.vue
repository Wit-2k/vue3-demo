<script setup lang="ts">
// 后台页面：查看、排序、处理请求、直接编辑提交
import { computed, reactive, ref } from 'vue'
import { useFormStore } from '@/stores/formStore'
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
const pendingRequests = computed<ChangeRequest[]>(() =>
  store.requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => b.createdAt - a.createdAt),
)

function findSubmission(id: string): Submission | undefined {
  return store.submissions.find((s) => s.id === id)
}

function approve(req: ChangeRequest) {
  store.resolveRequest(req.id, true)
}

function reject(req: ChangeRequest) {
  store.resolveRequest(req.id, false)
}

// 历史已处理请求（折叠展示，便于核对）
const showHistory = ref(false)
const historyRequests = computed<ChangeRequest[]>(() =>
  store.requests
    .filter((r) => r.status !== 'pending')
    .sort((a, b) => b.createdAt - a.createdAt),
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

// ---------- 辅助 ----------
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function statusText(s: Submission): string {
  return s.status === 'active' ? '生效中' : '已删除'
}

function requestTypeText(t: ChangeRequest['type']): string {
  return t === 'delete' ? '删除' : '修改'
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
            <th>姓名 <button class="sort-btn" @click="toggleSort('name')">排序{{ sortIndicator('name') }}</button></th>
            <th>内容</th>
            <th>提交时间 <button class="sort-btn" @click="toggleSort('createdAt')">排序{{ sortIndicator('createdAt') }}</button></th>
            <th>更新时间 <button class="sort-btn" @click="toggleSort('updatedAt')">排序{{ sortIndicator('updatedAt') }}</button></th>
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
        <div v-for="req in pendingRequests" :key="req.id" class="request">
          <div class="request__head">
            <span :class="['tag', req.type === 'delete' ? 'tag--del' : 'tag--warn']">
              {{ requestTypeText(req.type) }}请求
            </span>
            <span class="muted">{{ formatTime(req.createdAt) }}</span>
          </div>
          <div v-if="findSubmission(req.submissionId)">
            <p>
              目标提交：<strong>{{ findSubmission(req.submissionId)!.name }}</strong>
              - {{ findSubmission(req.submissionId)!.content }}
            </p>
            <template v-if="req.type === 'modify'">
              <p>新姓名：{{ req.newName }}</p>
              <p>新内容：{{ req.newContent }}</p>
            </template>
          </div>
          <p v-else class="muted">（关联的提交不存在）</p>
          <p>原因：{{ req.reason }}</p>
          <div class="request__actions">
            <button class="btn btn--sm btn--primary" @click="approve(req)">同意</button>
            <button class="btn btn--sm btn--danger" @click="reject(req)">拒绝</button>
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
            <tr v-for="r in historyRequests" :key="r.id">
              <td>{{ requestTypeText(r.type) }}</td>
              <td>{{ findSubmission(r.submissionId)?.name ?? '（已不存在）' }}</td>
              <td>{{ r.reason }}</td>
              <td>{{ formatTime(r.createdAt) }}</td>
              <td>
                <span :class="['tag', r.status === 'approved' ? 'tag--ok' : 'tag--del']">
                  {{ r.status === 'approved' ? '已同意' : '已拒绝' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  </section>
</template>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #fff;
}

.card h3 {
  margin: 0 0 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border: 1px solid #e5e7eb;
  padding: 8px;
  text-align: left;
  font-size: 14px;
}

.table th {
  background: #f9fafb;
  white-space: nowrap;
}

.sort-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #2563eb;
  font-size: 12px;
  padding: 0;
}

.btn {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font: inherit;
}

.btn:hover {
  background: #f3f4f6;
}

.btn:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

.btn--primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.btn--primary:hover {
  background: #1d4ed8;
}

.btn--danger {
  color: #dc2626;
  border-color: #dc2626;
}

.btn--sm {
  padding: 4px 8px;
  font-size: 13px;
  margin-right: 4px;
}

.muted {
  color: #9ca3af;
  font-size: 14px;
}

.tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.tag--ok {
  background: #dcfce7;
  color: #166534;
}

.tag--del {
  background: #fee2e2;
  color: #991b1b;
}

.tag--warn {
  background: #fef9c3;
  color: #854d0e;
}

.requests {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.request {
  border: 1px solid #e5e7eb;
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
  color: #2563eb;
}
</style>
