/**
 * Agent Repository
 * 
 * 智能体数据访问层
 */

import type { Agent, AgentStatus, CreateAgentInput } from '../../../types/index.js';
import { BaseRepository } from './base.js';

/** 数据库行结构（用于文档目的） */
// @ts-expect-error - Reserved for documentation and future use
interface _AgentRow {
  id: string;
  name: string;
  role: string;
  parent_id: string | null;
  status: AgentStatus;
  workflow_path: string | null;
  skills: string;
  responsibilities: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

/**
 * 智能体 Repository
 */
export class AgentRepository extends BaseRepository<Agent, CreateAgentInput> {
  protected tableName = 'agents';
  
  protected columnMap: Record<keyof Agent, string> = {
    id: 'id',
    name: 'name',
    role: 'role',
    parentId: 'parent_id',
    status: 'status',
    workflowPath: 'workflow_path',
    skills: 'skills',
    responsibilities: 'responsibilities',
    metadata: 'metadata',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  
  protected rowToEntity(row: Record<string, unknown>): Agent {
    return {
      id: row.id as string,
      name: row.name as string,
      role: row.role as string,
      parentId: row.parent_id as string | null,
      status: row.status as AgentStatus,
      workflowPath: row.workflow_path as string | null,
      skills: JSON.parse(row.skills as string) as string[],
      responsibilities: JSON.parse(row.responsibilities as string) as string[],
      metadata: JSON.parse(row.metadata as string) as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
  
  protected entityToRow(entity: Partial<Agent>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    
    if (entity.id !== undefined) row.id = entity.id;
    if (entity.name !== undefined) row.name = entity.name;
    if (entity.role !== undefined) row.role = entity.role;
    if (entity.parentId !== undefined) row.parent_id = entity.parentId;
    if (entity.status !== undefined) row.status = entity.status;
    if (entity.workflowPath !== undefined) row.workflow_path = entity.workflowPath;
    if (entity.skills !== undefined) row.skills = JSON.stringify(entity.skills);
    if (entity.responsibilities !== undefined) row.responsibilities = JSON.stringify(entity.responsibilities);
    if (entity.metadata !== undefined) row.metadata = JSON.stringify(entity.metadata);
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt.toISOString();
    if (entity.updatedAt !== undefined) row.updated_at = entity.updatedAt.toISOString();
    
    return row;
  }
  
  protected buildEntity(input: CreateAgentInput): Agent {
    const now = new Date();
    return {
      id: this.generateId(),
      name: input.name,
      role: input.role,
      parentId: input.parentId ?? null,
      status: 'idle',
      workflowPath: null,
      skills: input.skills ?? [],
      responsibilities: input.responsibilities ?? [],
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }
  
  /**
   * 按状态查找智能体
   */
  findByStatus(status: AgentStatus): Agent[] {
    return this.findWhere({ status });
  }
  
  /**
   * 按父级查找子智能体
   */
  findByParentId(parentId: string | null): Agent[] {
    return this.findWhere({ parentId });
  }
  
  /**
   * 获取智能体树
   */
  getAgentTree(rootId?: string): Agent[] {
    const allAgents = this.findAll({ orderBy: 'created_at', orderDirection: 'ASC' });
    
    if (rootId) {
      // 只返回指定根节点及其子节点
      const result: Agent[] = [];
      const addChildren = (parentId: string) => {
        const children = allAgents.filter((a) => a.parentId === parentId);
        for (const child of children) {
          result.push(child);
          addChildren(child.id);
        }
      };
      
      const root = allAgents.find((a) => a.id === rootId);
      if (root) {
        result.push(root);
        addChildren(rootId);
      }
      return result;
    }
    
    return allAgents;
  }
  
  /**
   * 获取智能体深度
   */
  getAgentDepth(id: string): number {
    const agent = this.findById(id);
    if (!agent || !agent.parentId) {
      return 0;
    }
    return 1 + this.getAgentDepth(agent.parentId);
  }
  
  /**
   * 更新智能体状态
   */
  updateStatus(id: string, status: AgentStatus): Agent | null {
    return this.update(id, { status });
  }
  
  /**
   * 设置工作流路径
   */
  setWorkflowPath(id: string, path: string): Agent | null {
    return this.update(id, { workflowPath: path });
  }
  
  /**
   * 添加技能
   */
  addSkill(id: string, skill: string): Agent | null {
    const agent = this.findById(id);
    if (!agent) return null;
    
    const skills = [...new Set([...agent.skills, skill])];
    return this.update(id, { skills });
  }
  
  /**
   * 移除技能
   */
  removeSkill(id: string, skill: string): Agent | null {
    const agent = this.findById(id);
    if (!agent) return null;
    
    const skills = agent.skills.filter((s: string) => s !== skill);
    return this.update(id, { skills });
  }
}
