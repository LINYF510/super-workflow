/**
 * Task - 任务类型定义
 * 
 * 任务是智能体执行的工作单元
 */

/** 任务状态 */
export type TaskStatus = 
  | 'pending'    // 等待执行
  | 'running'    // 执行中
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'cancelled'  // 已取消
  | 'paused';    // 已暂停

/** 任务优先级 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

/** 任务定义 */
export interface Task {
  /** 唯一标识 */
  id: string;
  /** 所属智能体 ID */
  agentId: string;
  /** 父任务 ID（子任务时） */
  parentTaskId: string | null;
  /** 任务标题 */
  title: string;
  /** 任务描述 */
  description: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 优先级 */
  priority: TaskPriority;
  /** 任务输入 */
  input: Record<string, unknown>;
  /** 任务输出 */
  output: Record<string, unknown> | null;
  /** 错误信息 */
  error: string | null;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 开始时间 */
  startedAt: Date | null;
  /** 完成时间 */
  completedAt: Date | null;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/** 创建任务的输入参数 */
export interface CreateTaskInput {
  agentId: string;
  parentTaskId?: string;
  title: string;
  description: string;
  priority?: TaskPriority;
  input?: Record<string, unknown>;
  maxRetries?: number;
}

/** 任务进度 */
export interface TaskProgress {
  taskId: string;
  currentStep: number;
  totalSteps: number;
  percentage: number;
  message: string;
}

/** 任务过滤器 */
export interface TaskFilter {
  agentId?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority;
  parentId?: string | null;
  createdAfter?: Date;
  createdBefore?: Date;
}

/** 任务排序 */
export interface TaskSort {
  field: 'createdAt' | 'priority' | 'status';
  order: 'asc' | 'desc';
}
