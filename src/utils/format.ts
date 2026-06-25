// 工具函数集合：把原本散落在 ClientView / AdminView / formStore 里的
// 重复辅助函数集中到这里，避免每个文件都复制一份（见 §4.1）。

import type { RequestType, Submission } from '@/types';

/** 把时间戳格式成本地可读字符串。 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/** 提交记录状态对应的中文文案。 */
export function statusText(s: Submission): string {
  return s.status === 'active' ? '生效中' : '已删除';
}

/** 变更请求类型对应的中文文案。 */
export function requestTypeText(t: RequestType): string {
  return t === 'delete' ? '删除' : '修改';
}

/** 生成唯一 id：时间戳 + 随机串，足以满足演示场景。 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
