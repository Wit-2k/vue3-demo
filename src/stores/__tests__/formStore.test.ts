import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFormStore } from '../formStore'
import type { ChangeRequest, Submission } from '@/types'

// 内存版 localStorage，dataService 只用到 getItem / setItem
function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    clear: () => store.clear(),
    _store: store,
  }
}

describe('formStore', () => {
  const storage = createMemoryStorage()

  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('localStorage', storage)
  })

  // ---------- 提交表单 ----------

  it('submitForm 新增一条 active 记录并持久化', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', '你好')

    expect(sub.name).toBe('张三')
    expect(sub.content).toBe('你好')
    expect(sub.status).toBe('active')
    expect(sub.createdAt).toBe(sub.updatedAt)
    expect(store.submissions).toHaveLength(1)

    // 持久化：localStorage 里应有这条数据
    const raw = storage._store.get('demo_submissions')!
    expect(JSON.parse(raw)).toHaveLength(1)
  })

  it('submitForm 会 trim 首尾空白', () => {
    const store = useFormStore()
    store.submitForm('  张三  ', '  你好  ')
    expect(store.submissions[0]!.name).toBe('张三')
    expect(store.submissions[0]!.content).toBe('你好')
  })

  // ---------- 查询本人记录 ----------

  it('getMySubmissions 按姓名精确过滤', () => {
    const store = useFormStore()
    store.submitForm('张三', '1')
    store.submitForm('李四', '2')
    store.submitForm('张三', '3')

    expect(store.getMySubmissions('张三')).toHaveLength(2)
    expect(store.getMySubmissions('李四')).toHaveLength(1)
    expect(store.getMySubmissions('王五')).toHaveLength(0)
  })

  // ---------- 发起请求 ----------

  it('createRequest(delete) 创建一条 pending 删除请求', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'hi')
    const req = store.createRequest({
      submissionId: sub.id,
      type: 'delete',
      reason: '写错了',
    })

    expect(req.type).toBe('delete')
    expect(req.status).toBe('pending')
    expect(req.submissionId).toBe(sub.id)
    expect(store.requests).toHaveLength(1)
  })

  it('createRequest(modify) 携带新值并持久化', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'hi')
    store.createRequest({
      submissionId: sub.id,
      type: 'modify',
      reason: '笔误',
      newName: '李四',
      newContent: '改后',
    })

    expect(store.requests[0]!.newName).toBe('李四')
    expect(store.requests[0]!.newContent).toBe('改后')
    const raw = storage._store.get('demo_requests')!
    expect(JSON.parse(raw)).toHaveLength(1)
  })

  // ---------- 处理请求：approve delete ----------

  it('approve delete 请求后对应 submission 变为 deleted', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'hi')
    const req = store.createRequest({
      submissionId: sub.id,
      type: 'delete',
      reason: 'x',
    })

    const before = sub.updatedAt
    // 确保时间戳推进，验证 updatedAt 真的更新了
    const t = new Date(Date.now() + 10).getTime()
    vi.setSystemTime(t)
    store.resolveRequest(req.id, true)

    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.status).toBe('deleted')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
    expect(store.requests.find((r) => r.id === req.id)!.status).toBe('approved')
    vi.useRealTimers()
  })

  // ---------- 处理请求：approve modify ----------

  it('approve modify 请求后 submission 字段被覆盖', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'old')
    const req = store.createRequest({
      submissionId: sub.id,
      type: 'modify',
      reason: 'x',
      newName: '李四',
      newContent: 'new',
    })

    store.resolveRequest(req.id, true)

    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.name).toBe('李四')
    expect(updated.content).toBe('new')
    expect(store.requests.find((r) => r.id === req.id)!.status).toBe('approved')
  })

  // ---------- 处理请求：reject ----------

  it('reject 请求只更新状态，不改 submission', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'keep')
    const req = store.createRequest({
      submissionId: sub.id,
      type: 'modify',
      reason: 'x',
      newName: '不改',
      newContent: '不改',
    })

    store.resolveRequest(req.id, false)

    const unchanged = store.submissions.find((s) => s.id === sub.id)!
    expect(unchanged.name).toBe('张三')
    expect(unchanged.content).toBe('keep')
    expect(store.requests.find((r) => r.id === req.id)!.status).toBe('rejected')
  })

  // ---------- 防重复处理 ----------

  it('已处理的请求不能再次处理', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'hi')
    const req = store.createRequest({
      submissionId: sub.id,
      type: 'delete',
      reason: 'x',
    })

    store.resolveRequest(req.id, false) // reject
    // 再次尝试 approve，应被忽略
    store.resolveRequest(req.id, true)

    expect(store.submissions.find((s) => s.id === sub.id)!.status).toBe('active')
    // 状态停留在第一次的 rejected
    expect(store.requests.find((r) => r.id === req.id)!.status).toBe('rejected')
  })

  it('approve 不存在的请求不报错也不改变状态', () => {
    const store = useFormStore()
    expect(() => store.resolveRequest('不存在的id', true)).not.toThrow()
    expect(store.submissions).toHaveLength(0)
  })

  // ---------- 后台直接编辑 ----------

  it('editSubmission 直接修改字段并更新 updatedAt', () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', 'old')
    const before = sub.updatedAt

    const t = new Date(Date.now() + 10).getTime()
    vi.setSystemTime(t)
    store.editSubmission(sub.id, { name: '李四', content: 'new' })

    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.name).toBe('李四')
    expect(updated.content).toBe('new')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
    vi.useRealTimers()
  })

  // ---------- 排序 ----------

  it('sortSubmissions 按时间升降序正确', () => {
    const store = useFormStore()
    vi.setSystemTime(1000)
    store.submitForm('a', '1')
    vi.setSystemTime(2000)
    store.submitForm('b', '2')
    vi.setSystemTime(3000)
    store.submitForm('c', '3')
    vi.useRealTimers()

    const asc = store.sortSubmissions('createdAt', true)
    expect(asc.map((s) => s.name)).toEqual(['a', 'b', 'c'])

    const desc = store.sortSubmissions('createdAt', false)
    expect(desc.map((s) => s.name)).toEqual(['c', 'b', 'a'])
  })

  it('sortSubmissions 按姓名排序', () => {
    const store = useFormStore()
    store.submitForm('王五', '1')
    store.submitForm('张三', '2')
    store.submitForm('李四', '3')

    const asc = store.sortSubmissions('name', true)
    // localeCompare 按本地化拼音排序：李 < 王 < 张
    expect(asc.map((s) => s.name)).toEqual(['李四', '王五', '张三'])

    const desc = store.sortSubmissions('name', false)
    expect(desc.map((s) => s.name)).toEqual(['张三', '王五', '李四'])
  })

  // ---------- 初始化从 localStorage 恢复 ----------

  it('store 初始化时从 localStorage 恢复历史数据', () => {
    // 预置 localStorage 数据
    const seed: Submission[] = [
      {
        id: 'seed-1',
        name: '历史',
        content: '老数据',
        createdAt: 1,
        updatedAt: 1,
        status: 'active',
      },
    ]
    storage._store.set('demo_submissions', JSON.stringify(seed))
    storage._store.set(
      'demo_requests',
      JSON.stringify<ChangeRequest[]>([
        {
          id: 'seed-r1',
          submissionId: 'seed-1',
          type: 'delete',
          reason: '历史',
          createdAt: 2,
          status: 'pending',
        },
      ]),
    )

    const store = useFormStore()
    expect(store.submissions).toHaveLength(1)
    expect(store.submissions[0]!.name).toBe('历史')
    expect(store.requests).toHaveLength(1)
  })
})
