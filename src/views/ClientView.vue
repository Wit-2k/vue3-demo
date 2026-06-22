<script setup lang="ts">
// 客户端页面：输入提交、查看本人提交记录、请求删除、请求修改
import { computed, reactive, ref } from 'vue'
import { useFormStore } from '@/stores/formStore'
import type { Submission } from '@/types'

const store = useFormStore()

// ---------- 1. 输入 + 提交 ----------
const form = reactive({ name: '', content: '' })
const submitMsg = ref('')

function handleSubmit() {
  if (!form.name.trim() || !form.content.trim()) {
    submitMsg.value = '姓名和内容都不能为空'
    return
  }
  store.submitForm(form.name, form.content)
  submitMsg.value = '提交成功'
  form.name = ''
  form.content = ''
}

// ---------- 2. 查看提交记录 ----------
// 输入要查询的姓名，展示该姓名的所有提交。
const queryName = ref('')
const queried = ref(false)
const mySubmissions = computed<Submission[]>(() =>
  queried.value ? store.getMySubmissions(queryName.value) : [],
)

// ---------- 3 & 4. 请求删除 / 请求修改 ----------
// 用一个弹层承载两种请求，type 区分。
const requestModal = reactive<{
  open: boolean
  type: 'delete' | 'modify'
  submission: Submission | null
  newName: string
  newContent: string
  reason: string
}>({
  open: false,
  type: 'delete',
  submission: null,
  newName: '',
  newContent: '',
  reason: '',
})

function openDeleteRequest(sub: Submission) {
  requestModal.type = 'delete'
  requestModal.submission = sub
  requestModal.reason = ''
  requestModal.open = true
}

function openModifyRequest(sub: Submission) {
  requestModal.type = 'modify'
  requestModal.submission = sub
  // 默认带出当前值，方便微调
  requestModal.newName = sub.name
  requestModal.newContent = sub.content
  requestModal.reason = ''
  requestModal.open = true
}

function closeRequestModal() {
  requestModal.open = false
  requestModal.submission = null
}

const requestMsg = ref('')

function submitRequest() {
  const sub = requestModal.submission
  if (!sub) return
  if (!requestModal.reason.trim()) {
    requestMsg.value = '请填写原因'
    return
  }
  if (requestModal.type === 'modify') {
    if (!requestModal.newName.trim() || !requestModal.newContent.trim()) {
      requestMsg.value = '新姓名和新内容不能为空'
      return
    }
  }

  store.createRequest({
    submissionId: sub.id,
    type: requestModal.type,
    reason: requestModal.reason,
    newName: requestModal.type === 'modify' ? requestModal.newName : undefined,
    newContent:
      requestModal.type === 'modify' ? requestModal.newContent : undefined,
  })

  requestMsg.value =
    requestModal.type === 'delete' ? '删除请求已提交，等待后台处理' : '修改请求已提交，等待后台处理'
  closeRequestModal()
}

// ---------- 辅助 ----------
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function statusText(s: Submission): string {
  return s.status === 'active' ? '生效中' : '已删除'
}
</script>

<template>
  <section class="client">
    <h2>客户端 · 填写表单</h2>

    <!-- 1. 输入 + 提交 -->
    <div class="card">
      <h3>提交表单</h3>
      <div class="field">
        <label>姓名</label>
        <input v-model="form.name" placeholder="请输入姓名" />
      </div>
      <div class="field">
        <label>内容</label>
        <textarea v-model="form.content" placeholder="请输入内容" rows="3" />
      </div>
      <button class="btn btn--primary" @click="handleSubmit">提交</button>
      <p v-if="submitMsg" class="msg">{{ submitMsg }}</p>
    </div>

    <!-- 2. 查看提交记录 -->
    <div class="card">
      <h3>查看我的提交记录</h3>
      <div class="field field--inline">
        <input v-model="queryName" placeholder="输入你的姓名查询" />
        <button class="btn" @click="queried = true">查询</button>
      </div>

      <table v-if="mySubmissions.length" class="table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>内容</th>
            <th>提交时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in mySubmissions" :key="s.id">
            <td>{{ s.name }}</td>
            <td>{{ s.content }}</td>
            <td>{{ formatTime(s.createdAt) }}</td>
            <td>
              <span :class="['tag', s.status === 'active' ? 'tag--ok' : 'tag--del']">
                {{ statusText(s) }}
              </span>
            </td>
            <td>
              <template v-if="s.status === 'active'">
                <button class="btn btn--sm" @click="openModifyRequest(s)">请求修改</button>
                <button class="btn btn--sm btn--danger" @click="openDeleteRequest(s)">请求删除</button>
              </template>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="queried" class="muted">没有找到「{{ queryName }}」的提交记录</p>
    </div>

    <!-- 请求弹层（删除 / 修改共用） -->
    <div v-if="requestModal.open" class="modal-mask" @click.self="closeRequestModal">
      <div class="modal">
        <h3>{{ requestModal.type === 'delete' ? '请求删除' : '请求修改' }}</h3>
        <p class="muted" v-if="requestModal.submission">
          目标提交：{{ requestModal.submission.name }} - {{ requestModal.submission.content }}
        </p>

        <template v-if="requestModal.type === 'modify'">
          <div class="field">
            <label>新姓名</label>
            <input v-model="requestModal.newName" />
          </div>
          <div class="field">
            <label>新内容</label>
            <textarea v-model="requestModal.newContent" rows="3" />
          </div>
        </template>

        <div class="field">
          <label>原因</label>
          <input v-model="requestModal.reason" placeholder="请说明原因" />
        </div>

        <p v-if="requestMsg" class="msg">{{ requestMsg }}</p>

        <div class="modal__actions">
          <button class="btn" @click="closeRequestModal">取消</button>
          <button class="btn btn--primary" @click="submitRequest">
            提交请求
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.client {
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

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.field label {
  font-size: 14px;
  color: #374151;
}

.field input,
.field textarea {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font: inherit;
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

.msg {
  margin: 8px 0 0;
  color: #2563eb;
  font-size: 14px;
}

.muted {
  color: #9ca3af;
  font-size: 14px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
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

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  width: 420px;
  max-width: 90vw;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
