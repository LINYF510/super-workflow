/**
 * Task Repository
 * 
 * 任务数据访问层
 */

import type { Task, TaskStatus, TaskPriority, CreateTaskInput, TaskFilter } from '../../../types/index.js';
import { BaseRepository } from './base.js';

/**
 * 任务 Repository
 */
export class TaskRepository extends BaseRepository<Task, CreateTaskInput> {
  protected tableName = 'tasks';
  
  protected columnMap: Record<keyof Task, string> = {
    id: 'id',
    agentId: 'agent_id',
    parentTaskId: 'parent_task_id',
    title: 'title',
    description: 'description',
    status: 'status',
    priority: 'priority',
    input: 'input',
    output: 'output',
    error: 'error',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    startedAt: 'started_at',
    completedAt: 'completed_at',
    retryCount: 'retry_count',
    maxRetries: 'max_retries',
  };
  
  protected rowToEntity(row: Record<string, unknown>): Task {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      parentTaskId: row.parent_task_id as string | null,
      title: row.title as string,
      description: row.description as string,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      input: JSON.parse(row.input as string) as Record<string, unknown>,
      output: row.output ? JSON.parse(row.output as string) : null,
      error: row.error as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      startedAt: row.started_at ? new Date(row.started_at as string) : null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      retryCount: row.retry_count as number,
      maxRetries: row.max_retries as number,
    };
  }
  
  protected entityToRow(entity: Partial<Task>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    
    if (entity.id !== undefined) row.id = entity.id;
    if (entity.agentId !== undefined) row.agent_id = entity.agentId;
    if (entity.parentTaskId !== undefined) row.parent_task_id = entity.parentTaskId;
    if (entity.title !== undefined) row.title = entity.title;
    if (entity.description !== undefined) row.description = entity.description;
    if (entity.status !== undefined) row.status = entity.status;
    if (entity.priority !== undefined) row.priority = entity.priority;
    if (entity.input !== undefined) row.input = JSON.stringify(entity.input);
    if (entity.output !== undefined) row.output = entity.output ? JSON.stringify(entity.output) : null;
    if (entity.error !== undefined) row.error = entity.error;
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt.toISOString();
    if (entity.updatedAt !== undefined) row.updated_at = entity.updatedAt.toISOString();
    if (entity.startedAt !== undefined) row.started_at = entity.startedAt?.toISOString() ?? null;
    if (entity.completedAt !== undefined) row.completed_at = entity.completedAt?.toISOString() ?? null;
    if (entity.retryCount !== undefined) row.retry_count = entity.retryCount;
    if (entity.maxRetries !== undefined) row.max_retries = entity.maxRetries;
    
    return row;
  }
  
  protected buildEntity(input: CreateTaskInput): Task {
    const now = new Date();
    return {
      id: this.generateId(),
      agentId: input.agentId,
      parentTaskId: input.parentTaskId ?? null,
      title: input.title,
      description: input.description,
      status: 'pending',
      priority: input.priority ?? 'medium',
      input: input.input ?? {},
      output: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: input.maxRetries ?? 3,
    };
  }
  
  /**
   * 按智能体查找任务
   */
  findByAgentId(agentId: string): Task[] {
    return this.findWhere({ agentId });
  }
  
  /**
   * 按状态查找任务
   */
  findByStatus(status: TaskStatus): Task[] {
    return this.findWhere({ status });
  }
  
  /**
   * 按父任务查找子任务
   */
  findByParentId(parentTaskId: string | null): Task[] {
    return this.findWhere({ parentTaskId });
  }
  
  /**
   * 按过滤器查找任务
   */
  findByFilter(filter: TaskFilter): Task[] {
    const conditions: Partial<Record<keyof Task, unknown>> = {};
    
    if (filter.agentId) conditions.agentId = filter.agentId;
    if (filter.parentId !== undefined) conditions.parentTaskId = filter.parentId;
    
    // 状态过滤
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      // 需要特殊处理多个状态
      if (statuses.length === 1) {
        conditions.status = statuses[0];
      }
    }
    
    let results = this.findWhere(conditions);
    
    // 多状态过滤
    if (filter.status && Array.isArray(filter.status) && filter.status.length > 1) {
      results = results.filter((t) => filter.status!.includes(t.status));
    }
    
    // 时间过滤
    if (filter.createdAfter) {
      results = results.filter((t) => t.createdAt >= filter.createdAfter!);
    }
    if (filter.createdBefore) {
      results = results.filter((t) => t.createdAt <= filter.createdBefore!);
    }
    
    return results;
  }
  
  /**
   * 开始任务
   */
  startTask(id: string): Task | null {
    return this.update(id, {
      status: 'running',
      startedAt: new Date(),
    });
  }
  
  /**
   * 完成任务
   */
  completeTask(id: string, output: Record<string, unknown>): Task | null {
    return this.update(id, {
      status: 'completed',
      output,
      completedAt: new Date(),
    });
  }
  
  /**
   * 任务失败
   */
  failTask(id: string, error: string): Task | null {
    const task = this.findById(id);
    if (!task) return null;
    
    const newRetryCount = task.retryCount + 1;
    const shouldRetry = newRetryCount < task.maxRetries;
    
    return this.update(id, {
      status: shouldRetry ? 'pending' : 'failed',
      error,
      retryCount: newRetryCount,
    });
  }
  
  /**
   * 取消任务
   */
  cancelTask(id: string): Task | null {
    return this.update(id, { status: 'cancelled' });
  }
  
  /**
   * 暂停任务
   */
  pauseTask(id: string): Task | null {
    return this.update(id, { status: 'paused' });
  }
  
  /**
   * 恢复任务
   */
  resumeTask(id: string): Task | null {
    return this.update(id, { status: 'running' });
  }
  
  /**
   * 获取运行中的任务
   */
  getRunningTasks(): Task[] {
    return this.findByStatus('running');
  }
  
  /**
   * 获取待处理任务
   */
  getPendingTasks(): Task[] {
    return this.findByStatus('pending');
  }
}
