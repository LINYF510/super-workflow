/**
 * Workflow Parser
 * 
 * 解析 YAML 工作流定义
 */

import YAML from 'yaml';
import type { Workflow, WorkflowStep, WorkflowInput, WorkflowOutput, WorkflowErrorHandling, StepAction, SubAgentDefinition } from '../../types/index.js';

/** 解析后的工作流 */
export interface ParsedWorkflow extends Workflow {
  /** 原始 YAML 内容 */
  raw: string;
  /** 解析时间 */
  parsedAt: Date;
}

/**
 * 解析 YAML 工作流字符串
 */
export function parseWorkflow(yamlContent: string): ParsedWorkflow {
  const parsed = YAML.parse(yamlContent);
  
  // 验证必需字段
  if (!parsed.id) {
    throw new Error('Workflow must have an "id" field');
  }
  if (!parsed.name) {
    throw new Error('Workflow must have a "name" field');
  }
  if (!parsed.steps || !Array.isArray(parsed.steps)) {
    throw new Error('Workflow must have a "steps" array');
  }
  
  // 构建工作流对象
  const workflow: ParsedWorkflow = {
    id: parsed.id,
    name: parsed.name,
    version: parsed.version ?? '1.0.0',
    description: parsed.description,
    triggers: parsed.triggers ?? [],
    inputs: parseInputs(parsed.inputs),
    outputs: parseOutputs(parsed.outputs),
    steps: parseSteps(parsed.steps),
    errorHandling: parseErrorHandling(parsed.error_handling),
    raw: yamlContent,
    parsedAt: new Date(),
  };
  
  // 验证工作流
  validateWorkflow(workflow);
  
  return workflow;
}

/**
 * 解析输入参数
 */
function parseInputs(inputs: unknown): WorkflowInput[] {
  if (!inputs || !Array.isArray(inputs)) {
    return [];
  }
  
  return inputs.map((input) => ({
    name: input.name,
    type: input.type ?? 'string',
    required: input.required ?? false,
    description: input.description,
    default: input.default,
  }));
}

/**
 * 解析输出参数
 */
function parseOutputs(outputs: unknown): WorkflowOutput[] {
  if (!outputs || !Array.isArray(outputs)) {
    return [];
  }
  
  return outputs.map((output) => ({
    name: output.name,
    type: output.type ?? 'string',
    description: output.description,
  }));
}

/** 原始步骤类型（YAML 解析后） */
interface RawStep {
  id: string;
  name?: string;
  action?: string;
  skill?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  condition?: string;
  on_true?: string;
  on_false?: string;
  next?: string;
  on_failure?: string;
  agents?: Array<{ role: string; tasks: string[]; skills?: string[] }>;
  wait_for_completion?: boolean;
  to?: string;
  message_type?: string;
  content?: string;
  sources?: string[];
  parallel?: string[];
}

/** 原始错误处理配置类型 */
interface RawErrorHandling {
  retry_count?: number;
  retry_delay?: number;
  fallback?: string;
  escalation_threshold?: number;
}

/**
 * 解析步骤
 */
function parseSteps(steps: unknown[]): WorkflowStep[] {
  return steps.map((step) => {
    const s = step as RawStep;
    const result: WorkflowStep = {
      id: s.id,
      name: s.name ?? s.id,
      action: (s.action ?? 'invoke_skill') as StepAction,
    };
    
    // Only add optional properties if they have values
    if (s.skill !== undefined) result.skill = s.skill;
    if (s.input !== undefined) result.input = s.input as Record<string, string>;
    if (s.output !== undefined) result.output = s.output as Record<string, string>;
    if (s.condition !== undefined) result.condition = s.condition;
    if (s.on_true !== undefined) result.onTrue = s.on_true;
    if (s.on_false !== undefined) result.onFalse = s.on_false;
    if (s.next !== undefined) result.next = s.next;
    if (s.on_failure !== undefined) result.onFailure = s.on_failure as 'retry' | 'skip' | 'report_to_parent';
    if (s.agents !== undefined) result.agents = s.agents as SubAgentDefinition[];
    if (s.wait_for_completion !== undefined) result.waitForCompletion = s.wait_for_completion;
    if (s.to !== undefined) result.to = s.to;
    if (s.message_type !== undefined) result.messageType = s.message_type;
    if (s.content !== undefined) result.content = s.content;
    if (s.sources !== undefined) result.sources = Array.isArray(s.sources) ? s.sources.join(',') : s.sources;
    if (s.parallel !== undefined) result.parallel = s.parallel as string[];
    
    return result;
  });
}

/**
 * 解析错误处理配置
 */
function parseErrorHandling(config: unknown): WorkflowErrorHandling {
  if (!config) {
    return {
      retryCount: 3,
      fallback: 'report_to_parent',
      escalationThreshold: 2,
    };
  }
  
  const c = config as RawErrorHandling;
  const fallbackValue = c.fallback ?? 'report_to_parent';
  const result: WorkflowErrorHandling = {
    retryCount: c.retry_count ?? 3,
    fallback: (['skip', 'report_to_parent', 'terminate'].includes(fallbackValue)
      ? fallbackValue
      : 'report_to_parent') as 'skip' | 'report_to_parent' | 'terminate',
    escalationThreshold: c.escalation_threshold ?? 2,
  };
  
  // Only add retryDelay if it has a value
  if (c.retry_delay !== undefined) {
    result.retryDelay = c.retry_delay;
  }
  
  return result;
}

/**
 * 验证工作流
 */
function validateWorkflow(workflow: ParsedWorkflow): void {
  // 检查步骤 ID 唯一性
  const stepIds = new Set<string>();
  for (const step of workflow.steps) {
    if (stepIds.has(step.id)) {
      throw new Error(`Duplicate step id: ${step.id}`);
    }
    stepIds.add(step.id);
  }
  
  // 检查步骤引用是否存在
  for (const step of workflow.steps) {
    if (step.next && !stepIds.has(step.next)) {
      throw new Error(`Step ${step.id} references non-existent next step: ${step.next}`);
    }
    if (step.onTrue && !stepIds.has(step.onTrue)) {
      throw new Error(`Step ${step.id} references non-existent on_true step: ${step.onTrue}`);
    }
    if (step.onFalse && !stepIds.has(step.onFalse)) {
      throw new Error(`Step ${step.id} references non-existent on_false step: ${step.onFalse}`);
    }
  }
}

/**
 * 从文件加载工作流
 */
export async function loadWorkflowFromFile(filePath: string): Promise<ParsedWorkflow> {
  const { readFileSync } = await import('fs');
  const content = readFileSync(filePath, 'utf-8');
  return parseWorkflow(content);
}
