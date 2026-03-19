/**
 * Checkpoint Repository
 * 
 * 检查点数据访问层
 */

import type { Checkpoint, WorkflowContext } from '../../../types/index.js';
import { BaseRepository } from './base.js';

/** 创建检查点输入 */
export interface CreateCheckpointInput {
  id?: string;
  taskId: string;
  stepIndex: number;
  state: WorkflowContext;
}

/**
 * 检查点 Repository
 */
export class CheckpointRepository extends BaseRepository<Checkpoint, CreateCheckpointInput> {
  protected tableName = 'checkpoints';
  
  protected columnMap: Record<keyof Checkpoint, string> = {
    id: 'id',
    taskId: 'task_id',
    stepIndex: 'step_index',
    state: 'state',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  
  protected rowToEntity(row: Record<string, unknown>): Checkpoint {
    return {
      id: row.id as string,
      taskId: row.task_id as string,
      stepIndex: row.step_index as number,
      state: JSON.parse(row.state as string) as WorkflowContext,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
  
  protected entityToRow(entity: Partial<Checkpoint>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    
    if (entity.id !== undefined) row.id = entity.id;
    if (entity.taskId !== undefined) row.task_id = entity.taskId;
    if (entity.stepIndex !== undefined) row.step_index = entity.stepIndex;
    if (entity.state !== undefined) row.state = JSON.stringify(entity.state, (_key, value) => {
      // 处理 Map 序列化
      if (value instanceof Map) {
        return { __type: 'Map', data: Array.from(value.entries()) };
      }
      return value;
    });
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt.toISOString();
    if (entity.updatedAt !== undefined) row.updated_at = entity.updatedAt.toISOString();
    
    return row;
  }
  
  protected buildEntity(input: CreateCheckpointInput): Checkpoint {
    const now = new Date();
    return {
      id: this.generateId(),
      taskId: input.taskId,
      stepIndex: input.stepIndex,
      state: input.state,
      createdAt: now,
      updatedAt: now,
    };
  }
  
  /**
   * 按任务查找检查点
   */
  findByTaskId(taskId: string): Checkpoint[] {
    return this.findWhere({ taskId });
  }
  
  /**
   * 获取任务的最新检查点
   */
  getLatestCheckpoint(taskId: string): Checkpoint | null {
    const checkpoints = this.findByTaskId(taskId);
    if (checkpoints.length === 0) return null;
    
    return checkpoints.reduce((latest, current) =>
      current.stepIndex > latest.stepIndex ? current : latest
    );
  }
  
  /**
   * 获取任务在指定步骤的检查点
   */
  getCheckpointByStep(taskId: string, stepIndex: number): Checkpoint | null {
    const checkpoints = this.findByTaskId(taskId);
    return checkpoints.find((c) => c.stepIndex === stepIndex) ?? null;
  }
  
  /**
   * 删除任务的所有检查点
   */
  deleteByTaskId(taskId: string): number {
    const checkpoints = this.findByTaskId(taskId);
    let deleted = 0;
    for (const checkpoint of checkpoints) {
      if (this.delete(checkpoint.id)) {
        deleted++;
      }
    }
    return deleted;
  }
  
  /**
   * 清理过期的检查点
   * @param taskId 任务 ID
   * @param keepLast 保留最后 N 个检查点
   */
  cleanupOldCheckpoints(taskId: string, keepLast = 3): number {
    const checkpoints = this.findByTaskId(taskId);
    
    if (checkpoints.length <= keepLast) {
      return 0;
    }
    
    // 按步骤索引排序
    checkpoints.sort((a, b) => b.stepIndex - a.stepIndex);
    
    // 删除旧的检查点
    const toDelete = checkpoints.slice(keepLast);
    let deleted = 0;
    for (const checkpoint of toDelete) {
      if (this.delete(checkpoint.id)) {
        deleted++;
      }
    }
    return deleted;
  }
}
