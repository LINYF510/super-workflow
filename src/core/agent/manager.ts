/**
 * Agent Manager
 * 
 * 智能体管理器，负责创建、删除、更新智能体
 */

import { AgentRepository } from '../../services/storage/index.js';
import type { Agent, CreateAgentInput, AgentStatus } from '../../types/index.js';

/** 最大智能体深度 */
const MAX_DEPTH = 5;

/**
 * AgentManager 类
 */
export class AgentManager {
  private agentRepo: AgentRepository;
  
  constructor() {
    this.agentRepo = new AgentRepository();
  }
  
  /**
   * 创建智能体
   */
  createAgent(input: CreateAgentInput): Agent {
    // 检查父级深度
    if (input.parentId) {
      const parentDepth = this.agentRepo.getAgentDepth(input.parentId);
      if (parentDepth >= MAX_DEPTH) {
        throw new Error(`Maximum agent depth (${MAX_DEPTH}) exceeded`);
      }
    }
    
    return this.agentRepo.create(input);
  }
  
  /**
   * 获取智能体
   */
  getAgent(id: string): Agent | null {
    return this.agentRepo.findById(id);
  }
  
  /**
   * 获取所有智能体
   */
  getAllAgents(): Agent[] {
    return this.agentRepo.findAll();
  }
  
  /**
   * 获取智能体树
   */
  getAgentTree(rootId?: string): Agent[] {
    return this.agentRepo.getAgentTree(rootId);
  }
  
  /**
   * 更新智能体
   */
  updateAgent(id: string, updates: Partial<Agent>): Agent | null {
    return this.agentRepo.update(id, updates);
  }
  
  /**
   * 删除智能体
   */
  deleteAgent(id: string): boolean {
    return this.agentRepo.delete(id);
  }
  
  /**
   * 更新智能体状态
   */
  updateStatus(id: string, status: AgentStatus): Agent | null {
    return this.agentRepo.updateStatus(id, status);
  }
  
  /**
   * 获取子智能体
   */
  getChildren(parentId: string): Agent[] {
    return this.agentRepo.findByParentId(parentId);
  }
  
  /**
   * 获取按状态分组的智能体
   */
  getAgentsByStatus(): Record<AgentStatus, Agent[]> {
    const agents = this.getAllAgents();
    return {
      active: agents.filter((a) => a.status === 'active'),
      idle: agents.filter((a) => a.status === 'idle'),
      terminated: agents.filter((a) => a.status === 'terminated'),
    };
  }
  
  /**
   * 添加技能到智能体
   */
  addSkill(agentId: string, skill: string): Agent | null {
    return this.agentRepo.addSkill(agentId, skill);
  }
  
  /**
   * 从智能体移除技能
   */
  removeSkill(agentId: string, skill: string): Agent | null {
    return this.agentRepo.removeSkill(agentId, skill);
  }
  
  /**
   * 设置工作流路径
   */
  setWorkflowPath(agentId: string, path: string): Agent | null {
    return this.agentRepo.setWorkflowPath(agentId, path);
  }
  
  /**
   * 激活智能体
   */
  activateAgent(id: string): Agent | null {
    return this.updateStatus(id, 'active');
  }
  
  /**
   * 停用智能体
   */
  deactivateAgent(id: string): Agent | null {
    return this.updateStatus(id, 'idle');
  }
  
  /**
   * 终止智能体及其子智能体
   */
  terminateAgent(id: string): void {
    // 先终止子智能体
    const children = this.getChildren(id);
    for (const child of children) {
      this.terminateAgent(child.id);
    }
    
    // 终止当前智能体
    this.updateStatus(id, 'terminated');
  }
}
