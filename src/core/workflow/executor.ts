/**
 * Step Executor
 * 
 * 执行工作流步骤
 */

import type { WorkflowStep, WorkflowContext } from '../../types/index.js';

/** 步骤输出 */
export interface StepOutput extends Record<string, unknown> {
  /** 条件评估结果（用于条件步骤） */
  _conditionResult?: boolean;
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
  
  // TODO: 实际调用 skill
  // 这里返回模拟结果
  return {
    result: {
      success: true,
      input,
      skill: step.skill,
    },
  };
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
  _context: WorkflowContext
): Promise<StepOutput> {
  if (!step.agents || step.agents.length === 0) {
    return { createdAgents: [] };
  }
  
  // TODO: 实际创建智能体
  const createdAgents = step.agents.map((agent) => ({
    role: agent.role,
    status: 'created',
  }));
  
  return {
    createdAgents,
    child_outputs: [],
  };
}

/**
 * 执行 aggregate 动作
 */
async function executeAggregate(
  _step: WorkflowStep,
  context: WorkflowContext
): Promise<StepOutput> {
  // 聚合子任务结果
  const outputs: unknown[] = [];
  
  for (const [, output] of context.stepOutputs) {
    if (output.result) {
      outputs.push(output.result);
    }
  }
  
  return {
    aggregated: outputs,
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
