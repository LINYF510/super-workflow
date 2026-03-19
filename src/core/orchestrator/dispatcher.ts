/**
 * Task Dispatcher
 * 
 * 将任务分配给智能体
 */

import type { MessageBus } from '../communication/bus.js';
import { TaskRepository, AgentRepository } from '../../services/storage/index.js';
import type { CreateTaskInput, TaskStatus } from '../../types/index.js';
import { AICapabilityProvider } from '../../services/iflow/index.js';

/** 分配任务参数 */
export interface DispatchParams {
  orchestratorId: string;
  targetAgentId: string;
  description: string;
  messageBus: MessageBus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 分配任务
 */
export async function dispatchTasks(params: DispatchParams): Promise<string> {
  const { orchestratorId, targetAgentId, description, messageBus, priority: inputPriority } = params;
  const priority = inputPriority ?? 'medium';
  
  // 创建任务
  const taskRepo = new TaskRepository();
  const taskInput: CreateTaskInput = {
    agentId: targetAgentId,
    title: extractTitle(description),
    description,
    priority,
    input: {
      source: 'orchestrator',
      orchestratorId,
    },
  };
  
  const task = taskRepo.create(taskInput);
  
  // 更新任务状态为 running
  taskRepo.update(task.id, { status: 'running' as TaskStatus });
  
  // 发送任务分配消息
  await messageBus.send({
    fromAgent: orchestratorId,
    toAgent: targetAgentId,
    type: 'task_assign',
    priority: priority === 'critical' ? 'urgent' : priority === 'high' ? 'high' : 'normal',
    content: {
      taskId: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
    },
    requiresResponse: true,
  });
  
  // 异步执行任务
  executeTask(task.id, targetAgentId, description).catch(error => {
    console.error(`Task ${task.id} execution failed:`, error);
    taskRepo.update(task.id, { 
      status: 'failed' as TaskStatus, 
      error: error instanceof Error ? error.message : String(error) 
    });
  });
  
  return task.id;
}

/**
 * 执行任务
 */
async function executeTask(taskId: string, agentId: string, description: string): Promise<void> {
  const taskRepo = new TaskRepository();
  const agentRepo = new AgentRepository();
  
  try {
    // 获取智能体信息
    const agent = agentRepo.findById(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // 连接 AI 服务
    const aiProvider = new AICapabilityProvider();
    await aiProvider.connect();
    
    // 构建角色定义
    const roleDef = {
      id: agent.role,
      name: agent.name,
      description: agent.role,
      responsibilities: agent.responsibilities,
      requiredSkills: agent.skills,
      skills: agent.skills,
      ...(agent.systemPrompt ? { systemPrompt: agent.systemPrompt } : {}),
    };
    
    // 执行任务
    const result = await aiProvider.executeWithRole(
      roleDef,
      description,
      { agentId, summary: `Task: ${description}` }
    );
    
    // 更新任务状态
    taskRepo.update(taskId, { 
      status: 'completed' as TaskStatus,
      output: { result }
    });
    
    await aiProvider.disconnect();
    
  } catch (error) {
    taskRepo.update(taskId, { 
      status: 'failed' as TaskStatus, 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * 从描述中提取标题
 */
function extractTitle(description: string): string {
  // 取第一行或前 50 个字符作为标题
  const firstLine = description.split('\n')[0] ?? '';
  if (firstLine.length <= 50) {
    return firstLine || 'Untitled Task';
  }
  return firstLine.substring(0, 47) + '...';
}

/**
 * 批量分配任务
 */
export async function dispatchBatch(
  orchestratorId: string,
  assignments: Array<{ agentId: string; description: string; priority?: 'low' | 'medium' | 'high' | 'critical' }>,
  messageBus: MessageBus
): Promise<string[]> {
  const taskIds: string[] = [];
  
  for (const assignment of assignments) {
    const dispatchParams: DispatchParams = {
      orchestratorId,
      targetAgentId: assignment.agentId,
      description: assignment.description,
      messageBus,
      priority: assignment.priority ?? 'medium',
    };
    const taskId = await dispatchTasks(dispatchParams);
    taskIds.push(taskId);
  }
  
  return taskIds;
}
