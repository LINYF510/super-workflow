/**
 * Super Workflow - 类型定义入口
 * 
 * 统一导出所有类型定义
 */

// Agent types
export type {
  AgentStatus,
  AgentRole,
  Agent,
  CreateAgentInput,
  AgentTreeNode,
  AgentConfig,
} from './agent.js';

// Task types
export type {
  TaskStatus,
  TaskPriority,
  Task,
  CreateTaskInput,
  TaskProgress,
  TaskFilter,
  TaskSort,
} from './task.js';

// Workflow types
export type {
  StepAction,
  WorkflowTrigger,
  WorkflowInput,
  WorkflowOutput,
  WorkflowStep,
  SubAgentDefinition,
  WorkflowErrorHandling,
  Workflow,
  WorkflowContext,
  WorkflowExecutionStatus,
  Checkpoint,
} from './workflow.js';

// Message types
export type {
  MessageType,
  MessagePriority,
  Message,
  CreateMessageInput,
  TaskAssignContent,
  ProgressUpdateContent,
  TaskCompletedContent,
  MessageFilter,
} from './message.js';

// Skill types
export type {
  SkillSourceType,
  SkillInstallStatus,
  SkillMetadata,
  Skill,
  SkillLockEntry,
  SkillsLockFile,
  SkillSearchResult,
  SkillSearchFilter,
  SkillQualityScore,
  RoleSkillMapping,
  SkillInstallConfig,
  SkillQualityFilter,
} from './skill.js';

// iFlow types
export type {
  RoleDefinition,
  AgentContext,
  SkillOutput,
  AICapabilityConfig,
  AnalysisResult,
  ExecutionOptions,
  ConversationTurn,
} from './iflow.js';

export { MessageTypes } from './iflow.js';
