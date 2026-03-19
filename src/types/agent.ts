/**
 * Agent - 智能体类型定义
 * 
 * 智能体对应一个"职位"，拥有职责、workflow 和 skills
 */

/** 智能体状态 */
export type AgentStatus = 'active' | 'idle' | 'terminated';

/** 智能体角色 */
export interface AgentRole {
  /** 角色标识 */
  id: string;
  /** 角色名称 */
  name: string;
  /** 角色描述 */
  description: string;
  /** 必需技能 */
  requiredSkills: string[];
  /** 可选技能 */
  optionalSkills?: string[];
}

/** 智能体定义 */
export interface Agent {
  /** 唯一标识 */
  id: string;
  /** 智能体名称 */
  name: string;
  /** 角色/职位 */
  role: string;
  /** 上级智能体 ID */
  parentId: string | null;
  /** 层级深度（0 为根节点，最大 5） */
  depth: number;
  /** 当前状态 */
  status: AgentStatus;
  /** 工作流文件路径 */
  workflowPath: string | null;
  /** AI 角色上下文（动态生成的 system prompt） */
  systemPrompt: string | null;
  /** 已安装的 skills */
  skills: string[];
  /** 职责列表 */
  responsibilities: string[];
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 扩展元数据 */
  metadata: Record<string, unknown>;
}

/** 创建智能体的输入参数 */
export interface CreateAgentInput {
  name: string;
  role: string;
  parentId?: string;
  depth?: number;
  systemPrompt?: string;
  responsibilities?: string[];
  skills?: string[];
  metadata?: Record<string, unknown>;
}

/** 智能体树节点（用于树形展示） */
export interface AgentTreeNode {
  agent: Agent;
  children: AgentTreeNode[];
  depth: number;
}

/** 智能体配置文件 (YAML 格式) */
export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  parent: string | null;
  status: AgentStatus;
  responsibilities: string[];
  skills: string[];
  workflow: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}
