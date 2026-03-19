/**
 * AgentTree - 智能体树
 * 
 * 管理智能体的层级结构，支持递归创建和遍历
 */

import type { Agent, CreateAgentInput } from '../../types/index.js';
import { AgentRepository } from '../../services/storage/index.js';
import type { RoleDefinition } from '../../services/iflow/types.js';

/** 树节点 */
export interface AgentNode {
  /** 智能体 */
  agent: Agent;
  /** 子节点 */
  children: AgentNode[];
  /** 父节点 */
  parent: AgentNode | null;
}

/**
 * AgentTree 类
 * 
 * 管理智能体的树形结构
 */
export class AgentTree {
  private agentRepo: AgentRepository;
  private nodeMap: Map<string, AgentNode>;
  private rootNodes: AgentNode[];

  constructor() {
    this.agentRepo = new AgentRepository();
    this.nodeMap = new Map();
    this.rootNodes = [];
    this.loadFromStorage();
  }

  /**
   * 从存储加载智能体树
   */
  private loadFromStorage(): void {
    const agents = this.agentRepo.findAll();
    
    // 先创建所有节点
    for (const agent of agents) {
      const node: AgentNode = {
        agent,
        children: [],
        parent: null,
      };
      this.nodeMap.set(agent.id, node);
    }
    
    // 建立父子关系
    for (const agent of agents) {
      const node = this.nodeMap.get(agent.id)!;
      if (agent.parentId) {
        const parentNode = this.nodeMap.get(agent.parentId);
        if (parentNode) {
          node.parent = parentNode;
          parentNode.children.push(node);
        }
      } else {
        this.rootNodes.push(node);
      }
    }
  }

  /**
   * 创建智能体节点
   */
  createAgent(input: CreateAgentInput): AgentNode {
    // 检查深度限制
    if (input.parentId) {
      if (!this.agentRepo.canCreateChild(input.parentId)) {
        throw new Error(`Maximum agent depth (${AgentRepository.MAX_DEPTH}) exceeded`);
      }
    }

    const agent = this.agentRepo.create(input);
    const node: AgentNode = {
      agent,
      children: [],
      parent: null,
    };

    // 建立父子关系
    if (input.parentId) {
      const parentNode = this.nodeMap.get(input.parentId);
      if (parentNode) {
        node.parent = parentNode;
        parentNode.children.push(node);
      }
    } else {
      this.rootNodes.push(node);
    }

    this.nodeMap.set(agent.id, node);
    return node;
  }

  /**
   * 递归创建子树
   */
  createSubtree(
    parentId: string,
    roles: RoleDefinition[],
    generateSystemPrompt?: (role: RoleDefinition) => Promise<string>
  ): AgentNode[] {
    const parentDepth = this.getDepth(parentId);
    
    if (parentDepth >= AgentRepository.MAX_DEPTH) {
      throw new Error(`Maximum agent depth (${AgentRepository.MAX_DEPTH}) exceeded`);
    }

    const createdNodes: AgentNode[] = [];
    
    // 先创建没有 parent 引用的角色（根角色）
    const rootRoles = roles.filter(r => !r.parent);
    for (const role of rootRoles) {
      const node = this.createAgentFromRole(role, parentId, generateSystemPrompt);
      createdNodes.push(node);
    }

    // 然后创建有 parent 引用的角色
    const childRoles = roles.filter(r => r.parent);
    const roleToNode = new Map<string, AgentNode>();
    
    // 建立 role name 到 node 的映射
    for (const node of createdNodes) {
      roleToNode.set(node.agent.name, node);
    }

    // 按层级创建
    let remaining = [...childRoles];
    let maxIterations = roles.length; // 防止无限循环
    while (remaining.length > 0 && maxIterations > 0) {
      maxIterations--;
      
      const stillRemaining: RoleDefinition[] = [];
      for (const role of remaining) {
        const parentRole = role.parent!;
        const parentNode = roleToNode.get(parentRole);
        
        if (parentNode) {
          // 检查深度限制
          if (parentNode.agent.depth >= AgentRepository.MAX_DEPTH) {
            continue; // 跳过超过深度限制的角色
          }
          
          const node = this.createAgentFromRole(role, parentNode.agent.id, generateSystemPrompt);
          createdNodes.push(node);
          roleToNode.set(role.name, node);
        } else {
          stillRemaining.push(role);
        }
      }
      
      if (stillRemaining.length === remaining.length) {
        // 无法继续创建，存在循环引用或未找到父角色
        break;
      }
      remaining = stillRemaining;
    }

    return createdNodes;
  }

  /**
   * 从角色定义创建智能体
   */
  private createAgentFromRole(
    role: RoleDefinition,
    parentId: string,
    _generateSystemPrompt?: (role: RoleDefinition) => Promise<string>
  ): AgentNode {
    const input: CreateAgentInput = {
      name: role.name,
      role: role.name.toLowerCase().replace(/\s+/g, '-'),
      parentId,
      responsibilities: role.responsibilities,
    };

    // 只在有值时添加可选属性
    if (role.systemPrompt) {
      input.systemPrompt = role.systemPrompt;
    }
    if (role.requiredSkills && role.requiredSkills.length > 0) {
      input.skills = role.requiredSkills;
    }

    return this.createAgent(input);
  }

  /**
   * 查找智能体节点
   */
  findNode(id: string): AgentNode | null {
    return this.nodeMap.get(id) ?? null;
  }

  /**
   * 查找智能体
   */
  findAgent(id: string): Agent | null {
    return this.nodeMap.get(id)?.agent ?? null;
  }

  /**
   * 获取层级深度
   */
  getDepth(id: string): number {
    const node = this.nodeMap.get(id);
    return node?.agent.depth ?? 0;
  }

  /**
   * 获取所有下属
   */
  getDescendants(id: string): AgentNode[] {
    const node = this.nodeMap.get(id);
    if (!node) return [];

    const descendants: AgentNode[] = [];
    const collect = (n: AgentNode) => {
      for (const child of n.children) {
        descendants.push(child);
        collect(child);
      }
    };
    collect(node);
    return descendants;
  }

  /**
   * 获取上级链
   */
  getAncestors(id: string): AgentNode[] {
    const node = this.nodeMap.get(id);
    if (!node) return [];

    const ancestors: AgentNode[] = [];
    let current = node.parent;
    while (current) {
      ancestors.push(current);
      current = current.parent;
    }
    return ancestors;
  }

  /**
   * 获取直接子节点
   */
  getChildren(id: string): AgentNode[] {
    const node = this.nodeMap.get(id);
    return node?.children ?? [];
  }

  /**
   * 获取根节点
   */
  getRootNodes(): AgentNode[] {
    return [...this.rootNodes];
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): AgentNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * 更新节点
   */
  updateNode(id: string, updates: Partial<Agent>): AgentNode | null {
    const node = this.nodeMap.get(id);
    if (!node) return null;

    const updated = this.agentRepo.update(id, updates);
    if (updated) {
      node.agent = updated;
      return node;
    }
    return null;
  }

  /**
   * 删除节点及其子树
   */
  deleteNode(id: string): boolean {
    const node = this.nodeMap.get(id);
    if (!node) return false;

    // 递归删除子节点
    const deleteRecursive = (n: AgentNode) => {
      for (const child of [...n.children]) {
        deleteRecursive(child);
      }
      this.nodeMap.delete(n.agent.id);
    };

    // 从父节点移除
    if (node.parent) {
      const index = node.parent.children.indexOf(node);
      if (index >= 0) {
        node.parent.children.splice(index, 1);
      }
    } else {
      const index = this.rootNodes.indexOf(node);
      if (index >= 0) {
        this.rootNodes.splice(index, 1);
      }
    }

    // 递归删除
    deleteRecursive(node);

    // 从存储删除
    return this.agentRepo.delete(id);
  }

  /**
   * 树形打印
   */
  printTree(rootId?: string): string {
    const lines: string[] = [];
    
    const print = (node: AgentNode, prefix: string = '', isLast: boolean = true) => {
      const connector = isLast ? '└── ' : '├── ';
      const status = node.agent.status === 'active' ? '✓' : 
                     node.agent.status === 'idle' ? '○' : '✗';
      lines.push(`${prefix}${connector}${status} ${node.agent.name} (depth: ${node.agent.depth})`);
      
      const childPrefix = prefix + (isLast ? '    ' : '│   ');
      node.children.forEach((child, index) => {
        print(child, childPrefix, index === node.children.length - 1);
      });
    };

    if (rootId) {
      const rootNode = this.nodeMap.get(rootId);
      if (rootNode) {
        lines.push(`${rootNode.agent.name} (depth: ${rootNode.agent.depth})`);
        rootNode.children.forEach((child, index) => {
          print(child, '', index === rootNode.children.length - 1);
        });
      }
    } else {
      this.rootNodes.forEach((rootNode, index) => {
        if (index > 0) lines.push('');
        lines.push(`${rootNode.agent.name} (depth: ${rootNode.agent.depth})`);
        rootNode.children.forEach((child, childIndex) => {
          print(child, '', childIndex === rootNode.children.length - 1);
        });
      });
    }

    return lines.join('\n');
  }

  /**
   * 统计信息
   */
  getStats(): {
    totalAgents: number;
    rootAgents: number;
    maxDepth: number;
    byStatus: Record<string, number>;
    byDepth: Record<number, number>;
  } {
    const byStatus: Record<string, number> = {};
    const byDepth: Record<number, number> = {};
    let maxDepth = 0;

    for (const node of this.nodeMap.values()) {
      // 统计状态
      const status = node.agent.status;
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      
      // 统计深度
      const depth = node.agent.depth;
      byDepth[depth] = (byDepth[depth] ?? 0) + 1;
      maxDepth = Math.max(maxDepth, depth);
    }

    return {
      totalAgents: this.nodeMap.size,
      rootAgents: this.rootNodes.length,
      maxDepth,
      byStatus,
      byDepth,
    };
  }
}
