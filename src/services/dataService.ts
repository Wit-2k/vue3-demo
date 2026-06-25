// 数据持久化层：把 submissions / requests 以 JSON 字符串存入 localStorage。
// 不引入数据库，纯前端持久化。

import type { ChangeRequest, Submission } from '@/types';

/** localStorage 中存储提交记录的键名 */
const SUBMISSIONS_KEY = 'demo_submissions';
const REQUESTS_KEY = 'demo_requests';

/**
 * 从 localStorage 读取并反序列化。key 不存在或解析失败时返回空数组，
 * 保证调用方拿到的永远是合法数组，不会抛错。
 */
function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    // 数据损坏（手动篡改 / 旧版本格式）时，降级为空数据，避免整页崩溃
    return [];
  }
}

/** 序列化后写入 localStorage。 */
function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/** 数据服务对象，提供对 submissions / requests 的读写接口。 */
export const dataService = {
  getSubmissions(): Submission[] {
    return read<Submission>(SUBMISSIONS_KEY);
  },
  saveSubmissions(list: Submission[]): void {
    write(SUBMISSIONS_KEY, list);
  },
  getRequests(): ChangeRequest[] {
    return read<ChangeRequest>(REQUESTS_KEY);
  },
  saveRequests(list: ChangeRequest[]): void {
    write(REQUESTS_KEY, list);
  },
};
