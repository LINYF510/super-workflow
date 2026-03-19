/**
 * Workflow - 工作流类型定义
 * 
 * 工作流定义智能体如何执行任务，包含步骤、依赖、skill 调用
 */

/** 步骤类型 */
export type StepAction =
  | 'invoke_skill'     // 调用 skill
  | 'evaluate'         // 条件评估
  | 'create_agents'    // 创建子智能体
  | 'aggregate'        // 聚合结果
  | 'send_message'     // 发送消息
  | 'wait'             // 等待
  | 'parallel';        // 并行执行

/** 工作流触发器 */
export type WorkflowTrigger =
  | 'task_assigned'
  | 'parent_request'
  | 'message_received'
  | 'scheduled'
  | 'manual';

/** 输入参数定义 */
export interface WorkflowInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object';
  required: boolean;
  description?: string;
  default?: unknown;
}

/** 输出参数定义 */
export interface WorkflowOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'object';
  description?: string;
}

/** 步骤定义 */
export interface WorkflowStep {
  /** 步骤 ID */
  id: string;
  /** 步骤名称 */
  name: string;
  /** 步骤类型 */
  action: StepAction;
  /** 使用的 skill（invoke_skill 时） */
  skill?: string;
  /** 输入参数（支持变量插值） */
  input?: Record<string, string>;
  /** 输出映射 */
  output?: Record<string, string>;
  /** 条件表达式（evaluate 时） */
  condition?: string;
  /** 条件为真时的下一步 */
  onTrue?: string;
  /** 条件为假时的下一步 */
  onFalse?: string;
  /** 下一步骤 ID */
  next?: string;
  /** 失败时的处理 */
  onFailure?: 'retry' | 'skip' | 'report_to_parent';
  /** 子智能体定义（create_agents 时） */
  agents?: SubAgentDefinition[];
  /** 是否等待子任务完成 */
  waitForCompletion?: boolean;
  /** 消息目标（send_message 时） */
  to?: string;
  /** 消息类型 */
  messageType?: string;
  /** 消息内容 */
  content?: string;
  /** 聚合来源（aggregate 时） */
  sources?: string;
  /** 并行步骤列表（parallel 时） */
  parallel?: string[];
}

/** 子智能体定义 */
export interface SubAgentDefinition {
  role: string;
  tasks: string[];
  skills?: string[];
}

/** 错误处理配置 */
export interface WorkflowErrorHandling {
  retryCount: number;
  retryDelay?: number;
  fallback: 'skip' | 'report_to_parent' | 'terminate';
  escalationThreshold: number;
}

/** 工作流定义 */
export interface Workflow {
  /** 工作流 ID */
  id: string;
  /** 工作流名称 */
  name: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description?: string;
  /** 触发器 */
  triggers: WorkflowTrigger[];
  /** 输入参数 */
  inputs: WorkflowInput[];
  /** 输出参数 */
  outputs: WorkflowOutput[];
  /** 步骤列表 */
  steps: WorkflowStep[];
  /** 错误处理 */
  errorHandling: WorkflowErrorHandling;
}

/** 工作流执行上下文 */
export interface WorkflowContext {
  /** 工作流 ID */
  workflowId: string;
  /** 任务 ID */
  taskId: string;
  /** 智能体 ID */
  agentId: string;
  /** 输入值 */
  inputs: Record<string, unknown>;
  /** 步骤输出 */
  stepOutputs: Map<string, Record<string, unknown>>;
  /** 当前步骤索引 */
  currentStepIndex: number;
  /** 变量存储 */
  variables: Map<string, unknown>;
}

/** 工作流执行状态 */
export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

/** 检查点 */
export interface Checkpoint {
  id: string;
  taskId: string;
  stepIndex: number;
  state: WorkflowContext;
  createdAt: Date;
  updatedAt: Date;
}
