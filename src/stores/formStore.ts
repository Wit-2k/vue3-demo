// 集中状态：submissions 与 requests 都在这里管理，
// 客户端 / 后台两个页面通过同一个 store 共享数据。
// 每次 state 变更后同步写回 localStorage，保证刷新不丢数据。

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { dataService } from '@/services/dataService';
import { generateId } from '@/utils/format';
import type { ChangeRequest, RequestType, Submission } from '@/types';

export const useFormStore = defineStore('form', () => {
  // 初始化时从 localStorage 读取，刷新页面后仍能恢复历史数据
  const submissions = ref<Submission[]>(dataService.getSubmissions());
  const requests = ref<ChangeRequest[]>(dataService.getRequests());

  /** 把 submissions 持久化到 localStorage。 */
  function persistSubmissions() {
    dataService.saveSubmissions(submissions.value);
  }
  function persistRequests() {
    dataService.saveRequests(requests.value);
  }

  // ---------- 客户端能力 ----------

  /** 提交一条新表单。返回新建的 submission。 */
  function submitForm(name: string, content: string): Submission {
    const now = Date.now();
    const sub: Submission = {
      id: generateId(),
      name: name.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };
    submissions.value.push(sub);
    persistSubmissions();
    return sub;
  }

  /** 查询某人的提交记录（按 name 精确匹配）。 */
  function getMySubmissions(name: string): Submission[] {
    const target = name.trim();
    return submissions.value.filter((s) => s.name === target);
  }

  /**
   * 发起一条变更请求。
   * - delete: 仅需 reason
   * - modify: 需 newName / newContent / reason
   */
  function createRequest(args: {
    submissionId: string;
    type: RequestType;
    reason: string;
    newName?: string;
    newContent?: string;
  }): ChangeRequest {
    const req: ChangeRequest = {
      id: generateId(),
      submissionId: args.submissionId,
      type: args.type,
      newName: args.newName?.trim(),
      newContent: args.newContent?.trim(),
      reason: args.reason.trim(),
      createdAt: Date.now(),
      status: 'pending',
    };
    requests.value.push(req);
    persistRequests();
    return req;
  }

  // ---------- 后台能力 ----------

  /**
   * 处理一条 pending 请求。
   * - approve delete: 把对应 submission 置为 deleted
   * - approve modify: 用新值覆盖对应 submission，刷新 updatedAt
   * - reject: 仅更新请求状态
   * 已处理过的请求（approved/rejected）不能再次处理。
   */
  function resolveRequest(requestId: string, approve: boolean): void {
    const req = requests.value.find((r) => r.id === requestId);
    if (!req) return;
    if (req.status !== 'pending') return;

    if (approve) {
      const sub = submissions.value.find((s) => s.id === req.submissionId);
      if (sub && sub.status === 'active') {
        if (req.type === 'delete') {
          sub.status = 'deleted';
        } else {
          // modify：仅当请求携带了新值时才覆盖，避免用 undefined 清空字段
          if (req.newName !== undefined) sub.name = req.newName;
          if (req.newContent !== undefined) sub.content = req.newContent;
        }
        sub.updatedAt = Date.now();
        persistSubmissions();
      }
      // 即便 submission 已不存在（被删/找不到），请求本身仍记为已处理
      req.status = 'approved';
    } else {
      req.status = 'rejected';
    }
    persistRequests();
  }

  /** 后台直接编辑某条提交的字段（不经过请求流程）。 */
  function editSubmission(id: string, patch: { name?: string; content?: string; }): void {
    const sub = submissions.value.find((s) => s.id === id);
    if (!sub) return;
    if (patch.name !== undefined) sub.name = patch.name.trim();
    if (patch.content !== undefined) sub.content = patch.content.trim();
    sub.updatedAt = Date.now();
    persistSubmissions();
  }

  // ---------- 排序 ----------

  /**
   * 按指定字段排序 submissions。
   * 支持：'createdAt' | 'updatedAt' | 'name'，升降序可切换。
   */
  function sortSubmissions(field: 'createdAt' | 'updatedAt' | 'name', asc: boolean): Submission[] {
    const sorted = [...submissions.value].sort((a, b) => {
      let cmp: number;
      if (field === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else {
        /** 按时间戳排序，大于0表示a在b之后，小于0表示a在b之前 */
        cmp = a[field] - b[field];
      }
      return asc ? cmp : -cmp;
    });
    return sorted;
  }

  return {
    submissions,
    requests,
    submitForm,
    getMySubmissions,
    createRequest,
    resolveRequest,
    editSubmission,
    sortSubmissions,
  };
});
