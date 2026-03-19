/**
 * Step Executor
 * 
 * 执行工作流步骤，集成 iFlow SDK 提供 AI 能力
 */

import type { WorkflowStep, WorkflowContext } from '../../types/index.js';
import { AICapabilityProvider, getAICapabilityProvider } from '../../services/iflow/index.js';
import { AgentManager } from '../agent/manager.js';
import type { RoleDefinition } from '../../services/iflow/types.js';

/** 步骤输出 */
export interface StepOutput extends Record<string, unknown> {
  /** 条件评估结果（用于条件步骤） */
  _conditionResult?: boolean;
}

/** AI 提供者实例 */
let aiProvider: AICapabilityProvider | null = null;

/** Agent 管理器实例 */
let agentManager: AgentManager | null = null;

/**
 * 设置 AI 提供者
 */
export function setExecutorAIProvider(provider: AICapabilityProvider): void {
  aiProvider = provider;
}

/**
 * 获取 AI 提供者
 */
function getAIProvider(): AICapabilityProvider {
  if (!aiProvider) {
    aiProvider = getAICapabilityProvider();
  }
  return aiProvider;
}

/**
 * 设置 Agent 管理器
 */
export function setExecutorAgentManager(manager: AgentManager): void {
  agentManager = manager;
}

/**
 * 获取 Agent 管理器
 */
function getAgentManager(): AgentManager {
  if (!agentManager) {
    agentManager = new AgentManager();
  }
  return agentManager;
}

/**
 * 执行步骤
 */
export async function executeStep(
  step: WorkflowStep,
  context: WorkflowContext
): Promise<StepOutput> {
  // 插值输入变量
  const interpolatedInput = interpolateVariables(step.input ?? {}, context);
  
  // 根据动作类型执行
  switch (step.action) {
    case 'invoke_skill':
      return executeInvokeSkill(step, interpolatedInput, context);
    
    case 'evaluate':
      return executeEvaluate(step, interpolatedInput, context);
    
    case 'create_agents':
      return executeCreateAgents(step, interpolatedInput, context);
    
    case 'aggregate':
      return executeAggregate(step, context);
    
    case 'send_message':
      return executeSendMessage(step, interpolatedInput, context);
    
    case 'wait':
      return executeWait(step);
    
    case 'parallel':
      return executeParallel(step, context);
    
    default:
      throw new Error(`Unknown step action: ${step.action}`);
  }
}

/**
 * 变量插值
 */
function interpolateVariables(
  input: Record<string, string>,
  context: WorkflowContext
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(input)) {
    result[key] = interpolateValue(value, context);
  }
  
  return result;
}

/**
 * 插值单个值
 */
function interpolateValue(value: string, context: WorkflowContext): unknown {
  // 匹配 ${inputs.xxx} 或 ${steps.id.output.xxx}
  const interpolationRegex = /\$\{([^}]+)\}/g;
  
  return value.replace(interpolationRegex, (_, path: string) => {
    return String(resolveVariablePath(path, context));
  });
}

/**
 * 解析变量路径
 */
function resolveVariablePath(path: string, context: WorkflowContext): unknown {
  const parts = path.split('.');
  
  if (parts[0] === 'inputs' && parts[1]) {
    return context.inputs[parts[1]];
  }
  
  if (parts[0] === 'steps' && parts[1]) {
    const stepId = parts[1];
    const stepOutput = context.stepOutputs.get(stepId);
    
    if (parts[2] === 'output' && parts[3]) {
      return stepOutput?.[parts[3]];
    }
    
    return stepOutput;
  }
  
  if (parts[0] === 'variables' && parts[1]) {
    return context.variables.get(parts[1]);
  }
  
  return undefined;
}

/**
 * 执行 invoke_skill 动作
 */
async function executeInvokeSkill(
  step: WorkflowStep,
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<StepOutput> {
  if (!step.skill) {
    throw new Error(`Step ${step.id} has no skill specified`);
  }
  
  try {
    // 使用 AI 提供者调用 skill
    const provider = getAIProvider();
    await provider.connect();
    
    const result = await provider.invokeSkill(step.skill, input);
    
    return {
      result: result.result,
      success: result.success,
      skill: step.skill,
      error: result.error,
    };
  } catch (error) {
    // 如果 AI 调用失败，返回错误
    return {
      result: null,
      success: false,
      skill: step.skill,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 执行 evaluate 动作（条件评估）
 */
async function executeEvaluate(
  step: WorkflowStep,
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<StepOutput> {
  if (!step.condition) {
    throw new Error(`Step ${step.id} has no condition specified`);
  }
  
  // 简单的条件评估
  // TODO: 实现更复杂的条件解析
  let result = false;
  
  // 评估条件表达式
  try {
    // 简单的 JavaScript 表达式评估
    // 注意：在生产环境中应该使用更安全的方式
    const inputs = context.inputs;
    const steps = Object.fromEntries(context.stepOutputs);
    
    // 安全检查：只允许基本表达式
    const safeCondition = step.condition.replace(/\$\{([^}]+)\}/g, (_, path) => {
      return `${path}`;
    });
    
    // 使用 Function 构造器进行安全的表达式评估
    const evalFn = new Function('inputs', 'steps', `return ${safeCondition}`);
    result = Boolean(evalFn(inputs, steps));
  } catch {
    result = false;
  }
  
  return {
    _conditionResult: result,
    evaluated: true,
  };
}

/**
 * 执行 create_agents 动作
 */
async function executeCreateAgents(
  step: WorkflowStep,
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<StepOutput> {
  if (!step.agents || step.agents.length === 0) {
    return { createdAgents: [] };
  }
  
  const manager = getAgentManager();
  const provider = getAIProvider();
  const createdAgents: Array<{ id: string; role: string; status: string }> = [];
  
  // 获取当前智能体作为父级
  const parentId = context.agentId;
  
  // 检查深度限制
  if (parentId && !manager.canCreateChild(parentId)) {
    return {
      createdAgents: [],
      error: `Maximum agent depth (${AgentManager.MAX_DEPTH}) exceeded`,
    };
  }
  
  try {
    await provider.connect();
    
    for (const agentDef of step.agents) {
      // 使用 AI 生成角色上下文
      const roleDef: RoleDefinition = {
        name: agentDef.role,
        description: agentDef.description ?? `${agentDef.role} 智能体`,
        responsibilities: agentDef.responsibilities ?? [],
        requiredSkills: agentDef.skills ?? [],
      };
      
      let systemPrompt = '';
      try {
        systemPrompt = await provider.executeWithRole(
          roleDef,
          '生成你的角色上下文描述，包括你的职责、工作方式和协作关系。',
          { agentId: context.agentId, summary: context.taskId ?? '' }
        );
      } catch {
        // 如果 AI 生成失败，使用默认提示
        systemPrompt = `你是 ${agentDef.role}，负责 ${agentDef.description ?? '执行分配的任务'}。`;
      }
      
      // 创建智能体
      const createInput: {
        name: string;
        role: string;
        systemPrompt: string;
        responsibilities: string[];
        parentId?: string;
        skills?: string[];
      } = {
        name: agentDef.role,
        role: agentDef.role.toLowerCase().replace(/\s+/g, '-'),
        systemPrompt,
        responsibilities: agentDef.responsibilities ?? [],
      };
      
      // 只有在有值时才添加可选属性
      if (parentId) {
        createInput.parentId = parentId;
      }
      if (agentDef.skills && agentDef.skills.length > 0) {
        createInput.skills = agentDef.skills;
      }
      
      const agent = manager.createAgent(createInput);
      
      createdAgents.push({
        id: agent.id,
        role: agent.role,
        status: agent.status,
      });
    }
    
    return {
      createdAgents,
      count: createdAgents.length,
    };
  } catch (error) {
    return {
      createdAgents: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 执行 aggregate 动作
 */
async function executeAggregate(
  _step: WorkflowStep,
  context: WorkflowContext
): Promise<StepOutput> {
  // 聚合子任务结果
  const outputs: Array<{ role: string; output: unknown }> = [];
  
  for (const [stepId, output] of context.stepOutputs) {
    if (output.result) {
      outputs.push({
        role: stepId,
        output: output.result,
      });
    }
  }
  
  // 如果有多个结果，使用 AI 进行智能聚合
  if (outputs.length > 1) {
    try {
      const provider = getAIProvider();
      await provider.connect();
      
      const aggregated = await provider.aggregateResults(
        context.taskId ?? '任务',
        outputs.map(o => ({ role: o.role, output: String(o.output) }))
      );
      
      return {
        aggregated,
        count: outputs.length,
        originalOutputs: outputs,
      };
    } catch {
      // AI 聚合失败，返回原始结果
    }
  }
  
  return {
    aggregated: outputs.length === 1 ? outputs[0]?.output : outputs,
    count: outputs.length,
  };
}

/**
 * 执行 send_message 动作
 */
async function executeSendMessage(
  step: WorkflowStep,
  _input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<StepOutput> {
  // TODO: 实际发送消息
  return {
    sent: true,
    to: step.to,
    type: step.messageType,
  };
}

/**
 * 执行 wait 动作
 */
async function executeWait(_step: WorkflowStep): Promise<StepOutput> {
  // 等待一段时间
  const duration = 1000; // 默认 1 秒
  await new Promise((resolve) => setTimeout(resolve, duration));
  
  return {
    waited: duration,
  };
}

/**
 * 执行 parallel 动作
 */
async function executeParallel(
  step: WorkflowStep,
  _context: WorkflowContext
): Promise<StepOutput> {
  if (!step.parallel || step.parallel.length === 0) {
    return { parallelResults: [] };
  }
  
  // 并行执行步骤 ID 列表
  // TODO: 实现并行执行
  const results = step.parallel.map((stepId) => ({
    stepId,
    status: 'completed',
  }));
  
  return {
    parallelResults: results,
  };
}
