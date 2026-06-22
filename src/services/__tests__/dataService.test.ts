import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataService } from '../dataService'
import type { ChangeRequest, Submission } from '@/types'

// node 环境没有 localStorage，用一个最小内存实现替代真实 localStorage。
// dataService 只用到 getItem / setItem，这两个方法足够覆盖。
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

describe('dataService', () => {
  const storage = createMemoryStorage()

  beforeEach(() => {
    storage.clear()
    // 替换全局 localStorage，供 dataService 内部调用
    vi.stubGlobal('localStorage', storage)
  })

  it('key 不存在时返回空数组而不是抛错', () => {
    expect(dataService.getSubmissions()).toEqual([])
    expect(dataService.getRequests()).toEqual([])
  })

  it('能正确保存并读取 submissions', () => {
    const list: Submission[] = [
      {
        id: 's1',
        name: '张三',
        content: '你好',
        createdAt: 1000,
        updatedAt: 1000,
        status: 'active',
      },
      {
        id: 's2',
        name: '李四',
        content: '世界',
        createdAt: 2000,
        updatedAt: 3000,
        status: 'deleted',
      },
    ]
    dataService.saveSubmissions(list)

    expect(dataService.getSubmissions()).toEqual(list)
  })

  it('能正确保存并读取 requests', () => {
    const list: ChangeRequest[] = [
      {
        id: 'r1',
        submissionId: 's1',
        type: 'delete',
        reason: '写错了',
        createdAt: 5000,
        status: 'pending',
      },
      {
        id: 'r2',
        submissionId: 's2',
        type: 'modify',
        newName: '王五',
        newContent: '改后内容',
        reason: '笔误',
        createdAt: 6000,
        status: 'approved',
      },
    ]
    dataService.saveRequests(list)

    expect(dataService.getRequests()).toEqual(list)
  })

  it('覆盖写入时旧数据被替换', () => {
    dataService.saveSubmissions([
      {
        id: 'old',
        name: '旧',
        content: '旧内容',
        createdAt: 1,
        updatedAt: 1,
        status: 'active',
      },
    ])
    dataService.saveSubmissions([])

    expect(dataService.getSubmissions()).toEqual([])
  })

  it('数据损坏（非法 JSON）时降级为空数组', () => {
    storage._store.set('demo_submissions', '{这不是合法 JSON')
    expect(dataService.getSubmissions()).toEqual([])
  })

  it('数据不是数组时降级为空数组', () => {
    storage._store.set('demo_submissions', '{"a":1}')
    expect(dataService.getSubmissions()).toEqual([])
  })
})
