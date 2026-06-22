// 全局数据类型定义

/** 提交记录的状态：active=生效中，deleted=已删除 */
export type SubmissionStatus = 'active' | 'deleted'

/** 一条表单提交 */
export interface Submission {
  id: string
  name: string
  content: string
  /** 创建时间（时间戳，毫秒） */
  createdAt: number
  /** 最近一次修改时间（时间戳，毫秒） */
  updatedAt: number
  status: SubmissionStatus
}

/** 变更请求类型：delete=请求删除，modify=请求修改 */
export type RequestType = 'delete' | 'modify'

/** 变更请求的处理状态 */
export type RequestStatus = 'pending' | 'approved' | 'rejected'

/** 客户端发起的删除/修改请求，需后台处理 */
export interface ChangeRequest {
  id: string
  /** 关联的提交 id */
  submissionId: string
  type: RequestType
  /** modify 请求的新姓名 */
  newName?: string
  /** modify 请求的新内容 */
  newContent?: string
  /** 请求原因 */
  reason: string
  createdAt: number
  status: RequestStatus
}
