import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AdminView from '../AdminView.vue'
import { useFormStore } from '@/stores/formStore'

// 内存版 localStorage，供 dataService 使用（与 formStore.test.ts 同思路）。
function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    clear: () => store.clear(),
  }
}

describe('AdminView', () => {
  const storage = createMemoryStorage()

  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('localStorage', storage)
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('渲染预置的提交记录与状态标签', async () => {
    const store = useFormStore()
    store.submitForm('张三', '你好')
    const wrapper = mount(AdminView)
    await wrapper.vm.$nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('张三')
    expect(rows[0]!.text()).toContain('生效中')
  })

  it('同意删除请求时先弹二次确认，确认后 submission 变 deleted', async () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', '你好')
    store.createRequest({ submissionId: sub.id, type: 'delete', reason: '写错了' })

    const wrapper = mount(AdminView)
    await wrapper.vm.$nextTick()

    // 确认前不应有弹层
    expect(document.body.querySelector('.modal')).toBeNull()

    // 点击"同意"
    const approveBtn = wrapper.find('.request__actions .btn--primary')
    await approveBtn.trigger('click')

    // 应弹出 ConfirmDialog
    const modal = document.body.querySelector('.modal')!
    expect(modal).toBeTruthy()
    expect(modal.textContent).toContain('确定要同意删除')

    // 点击确认按钮（btn--danger，即最后一个按钮）
    const buttons = modal.querySelectorAll('button')
    await buttons[buttons.length - 1]!.click()

    // submission 应变为 deleted
    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.status).toBe('deleted')
    // 请求状态变为 approved
    const req = store.requests.find((r) => r.id === store.requests[0]!.id)!
    expect(req.status).toBe('approved')
  })

  it('同意修改请求不弹确认，直接生效', async () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', '旧')
    store.createRequest({
      submissionId: sub.id,
      type: 'modify',
      reason: '笔误',
      newName: '李四',
      newContent: '新',
    })

    const wrapper = mount(AdminView)
    await wrapper.vm.$nextTick()

    await wrapper.find('.request__actions .btn--primary').trigger('click')

    // modify 不应弹确认
    expect(document.body.querySelector('.modal')).toBeNull()

    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.name).toBe('李四')
    expect(updated.content).toBe('新')
  })

  it('拒绝请求不改变 submission', async () => {
    const store = useFormStore()
    const sub = store.submitForm('张三', '保留')
    store.createRequest({
      submissionId: sub.id,
      type: 'modify',
      reason: 'x',
      newName: '不改',
      newContent: '不改',
    })

    const wrapper = mount(AdminView)
    await wrapper.vm.$nextTick()

    await wrapper.find('.request__actions .btn--danger').trigger('click')

    const updated = store.submissions.find((s) => s.id === sub.id)!
    expect(updated.name).toBe('张三')
    expect(updated.content).toBe('保留')
    expect(store.requests[0]!.status).toBe('rejected')
  })
})
