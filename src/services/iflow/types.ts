/**
 * iFlow Service Types
 *
 * iFlow SDK 相关类型定义
 */

import type { MessageType } from '@iflow-ai/iflow-cli-sdk';

/** 角色定义 - AI 生成的职位描述 */
export interface RoleDefinition {
  /** 角色标识 */
  id?: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description: string;
  /** 职责列表 */
  responsibilities: string[];
  /** 必需技能 */
  requiredSkills?: string[];
  /** 可选技能 */
  optionalSkills?: string[];
  /** 技能列表（别名，兼容旧代码） */
  skills?: string[];
  /** AI 角色上下文（系统提示词） */
  systemPrompt?: string;
  /** 上级角色名称 */
  parent?: string;
  /** 下级角色名称列表 */
  children?: string[];
}

/** 智能体上下文 */
export interface AgentContext {
  /** 智能体 ID */
  agentId: string;
  /** 任务 ID */
  taskId?: string;
  /** 上下文摘要 */
  summary: string;
  /** 历史记录 */
  history?: ConversationTurn[];
}

/** 对话轮次 */
export interface ConversationTurn {
  /** 角色 */
  role: 'user' | 'assistant';
  /** 内容 */
  content: string;
  /** 时间戳 */
  timestamp: Date;
}

/** Skill 输出 */
export interface SkillOutput {
  /** 是否成功 */
  success: boolean;
  /** 输出内容 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 原始响应 */
  rawResponse: string;
}

/** AI 能力提供者配置 */
export interface AICapabilityConfig {
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 日志级别 */
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  /** 工作目录 */
  cwd?: string;
}

/** 需求分析结果 */
export interface AnalysisResult {
  /** 识别的行业领域 */
  industry: string;
  /** 生成的角色定义列表 */
  roles: RoleDefinition[];
  /** 组织架构描述 */
  orgStructure: string;
  /** 建议的工作流 */
  suggestedWorkflows: string[];
}

/** 任务执行选项 */
export interface ExecutionOptions {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 超时时间 */
  timeout?: number;
}

/** iFlow 消息类型映射 */
export const MessageTypes = {
  ASSISTANT: 'assistant' as MessageType,
  TOOL_CALL: 'tool_call' as MessageType,
  PLAN: 'plan' as MessageType,
  TASK_FINISH: 'task_finish' as MessageType,
  ERROR: 'error' as MessageType,
} as const;
