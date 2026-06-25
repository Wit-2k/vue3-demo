import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ClientView from '../ClientView.vue'

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

describe('ClientView', () => {
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

  it('姓名和内容都为空时提交，显示错误提示且不新增记录', async () => {
    const wrapper = mount(ClientView)
    await wrapper.find('.btn--primary').trigger('click')

    expect(wrapper.find('.msg').text()).toBe('姓名和内容都不能为空')
    expect(wrapper.findAll('table tr').length).toBe(0)
  })

  it('填写姓名+内容后提交，显示成功提示并新增一行记录', async () => {
    const wrapper = mount(ClientView)

    // 第一个 input 是姓名，textarea 是内容
    await wrapper.find('input').setValue('张三')
    await wrapper.find('textarea').setValue('你好')
    await wrapper.find('.btn--primary').trigger('click')

    // 提交成功提示
    expect(wrapper.find('.msg').text()).toBe('提交成功')
    // 表单被清空
    expect(wrapper.find('input').element.value).toBe('')

    // 输入姓名查询，应能看到刚提交的记录
    const inputs = wrapper.findAll('input')
    // 查询输入框是第二个 input
    await inputs[1]!.setValue('张三')
    await wrapper.find('.field--inline .btn').trigger('click')

    // 表格 tbody 应有一行
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('张三')
    expect(rows[0]!.text()).toContain('你好')
    expect(rows[0]!.text()).toContain('生效中')
  })

  it('查询不存在的姓名时显示空提示', async () => {
    const wrapper = mount(ClientView)
    const inputs = wrapper.findAll('input')
    await inputs[1]!.setValue('不存在')
    await wrapper.find('.field--inline .btn').trigger('click')

    expect(wrapper.text()).toContain('没有找到「不存在」的提交记录')
  })
})
