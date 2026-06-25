<script setup lang="ts">
// 客户端页面：输入提交、查看本人提交记录、请求删除、请求修改
import { computed, reactive, ref } from 'vue'
import { useFormStore } from '@/stores/formStore'
import { formatTime, statusText } from '@/utils/format'
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
  newName?: string
  newContent?: string
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
  /** 带重命名的解构赋值 */
  const { type, reason, newName: rawName, newContent: rawContent } = requestModal
  const newName = rawName?.trim()
  const newContent = rawContent?.trim()

  if (type === 'modify') {
    // 1. 只有当用户输入了纯空格等无效字符时，才提示不能为空白
    if ((rawName && !newName) || (rawContent && !newContent)) {
      requestMsg.value = '新姓名和新内容不能为空白'
      return
    }

    // 2. 若未做任何有效修改，提示至少修改一项
    if (!newName && !newContent) {
      requestMsg.value = '请至少修改姓名或内容中的一项'
      return
    }
  }

  // 3. 合并 createRequest 调用，利用展开运算符动态附加 modify 时的字段
  store.createRequest({
    submissionId: sub.id,
    type,
    reason,
    ...(type === 'modify' && { newName, newContent }) // 非常巧妙的写法：仅在 type === 'modify' 时才展开 newName/newContent
  })

  requestMsg.value =
    requestModal.type === 'delete' ? '删除请求已提交，等待后台处理' : '修改请求已提交，等待后台处理'
  closeRequestModal()
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
                <button class="btn btn--sm btn--danger" @click="openDeleteRequest(s)">
                  请求删除
                </button>
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
          <button class="btn btn--primary" @click="submitRequest">提交请求</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/*
 * 公共样式（.card / .btn / .table / .tag / .modal …）已提取到
 * src/assets/styles/base.css，由 main.ts 全局引入（见 §2.1）。
 * 这里只保留 ClientView 特有的容器布局。
 */
.client {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
