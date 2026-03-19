/**
 * Message - 消息类型定义
 * 
 * 智能体之间的通信消息
 */

/** 消息类型 */
export type MessageType =
  | 'task_assign'       // 上级 → 下级：分配任务
  | 'task_accept'       // 下级 → 上级：接受任务
  | 'task_reject'       // 下级 → 上级：拒绝任务
  | 'progress_update'   // 下级 → 上级：进度汇报
  | 'help_request'      // 下级 → 上级/同级：请求协助
  | 'task_completed'    // 下级 → 上级：任务完成
  | 'intervention'      // 用户 → 任意：用户介入
  | 'query'             // 任意 → 任意：信息查询
  | 'response'          // 任意 → 任意：查询响应
  | 'status_update'     // 任意 → 任意：状态更新
  | 'error_report';     // 任意 → 上级：错误报告

/** 消息优先级 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/** 消息定义 */
export interface Message {
  /** 唯一标识 */
  id: string;
  /** 发送方智能体 ID */
  fromAgent: string;
  /** 接收方智能体 ID */
  toAgent: string;
  /** 消息类型 */
  type: MessageType;
  /** 优先级 */
  priority: MessagePriority;
  /** 消息内容 */
  content: Record<string, unknown>;
  /** 是否需要回复 */
  requiresResponse: boolean;
  /** 关联的任务 ID */
  taskId: string | null;
  /** 关联的消息 ID（回复时） */
  replyTo: string | null;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 已读时间 */
  readAt: Date | null;
}

/** 创建消息的输入参数 */
export interface CreateMessageInput {
  fromAgent: string;
  toAgent: string;
  type: MessageType;
  priority?: MessagePriority;
  content: Record<string, unknown>;
  requiresResponse?: boolean;
  taskId?: string;
  replyTo?: string;
}

/** 任务分配消息内容 */
export interface TaskAssignContent {
  taskId: string;
  title: string;
  description: string;
  priority: string;
  deadline?: Date;
}

/** 进度更新消息内容 */
export interface ProgressUpdateContent {
  taskId: string;
  status: string;
  progress: number;
  message: string;
}

/** 任务完成消息内容 */
export interface TaskCompletedContent {
  taskId: string;
  success: boolean;
  result: Record<string, unknown>;
  deliverables?: string[];
}

/** 消息过滤器 */
export interface MessageFilter {
  fromAgent?: string;
  toAgent?: string;
  type?: MessageType | MessageType[];
  taskId?: string;
  unread?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}
