/**
 * Task Dispatcher
 * 
 * 将任务分配给智能体
 */

import type { MessageBus } from '../communication/bus.js';
import { TaskRepository } from '../../services/storage/index.js';
import type { CreateTaskInput } from '../../types/index.js';

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
  
  return task.id;
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
