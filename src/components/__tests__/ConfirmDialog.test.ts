import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '../ConfirmDialog.vue'

// ConfirmDialog 用 <Teleport to="body">，渲染内容会挂到 document.body 上，
// 所以断言时要到 document.body 里找。每个用例结束后清空 body，避免互相干扰。

afterEach(() => {
  document.body.innerHTML = ''
})

function mountDialog(props: Record<string, unknown>) {
  return mount(ConfirmDialog, { props: { title: '确认', message: 'msg', ...props } })
}

describe('ConfirmDialog', () => {
  it('open=false 时不渲染弹层', () => {
    mountDialog({ open: false })
    expect(document.body.querySelector('.modal')).toBeNull()
  })

  it('open=true 时渲染标题与消息', () => {
    mountDialog({ open: true, title: '确认删除', message: '此操作不可撤销' })
    const modal = document.body.querySelector('.modal')!
    expect(modal.querySelector('h3')!.textContent).toBe('确认删除')
    expect(modal.textContent).toContain('此操作不可撤销')
  })

  it('点击确认按钮触发 confirm 事件', async () => {
    const wrapper = mountDialog({ open: true })
    const buttons = document.body.querySelectorAll('button')
    // 最后一个按钮是确认（btn--danger）
    await buttons[buttons.length - 1]!.click()
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('点击取消按钮触发 cancel 事件', async () => {
    const wrapper = mountDialog({ open: true })
    const buttons = document.body.querySelectorAll('button')
    // 第一个按钮是取消
    await buttons[0]!.click()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('点击遮罩（.self）触发 cancel', async () => {
    const wrapper = mountDialog({ open: true })
    const mask = document.body.querySelector('.modal-mask')!
    await mask.click()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('使用自定义按钮文案', () => {
    mountDialog({
      open: true,
      confirmText: '同意删除',
      cancelText: '再想想',
    })
    const texts = Array.from(document.body.querySelectorAll('button')).map((b) => b.textContent)
    expect(texts).toContain('再想想')
    expect(texts).toContain('同意删除')
  })
})
