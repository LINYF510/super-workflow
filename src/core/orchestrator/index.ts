/**
 * Orchestrator - 主智能体
 * 
 * 系统入口点，负责理解需求、分析行业、分配任务
 * 使用 iFlow SDK 提供 AI 能力
 */

import type { Agent, CreateAgentInput } from '../../types/index.js';
import { AICapabilityProvider, getAICapabilityProvider } from '../../services/iflow/index.js';
import { AgentManager } from '../agent/manager.js';
import { MessageBus } from '../communication/bus.js';
import { analyzeRequirements, setAIProvider } from './analyzer.js';
import { dispatchTasks } from './dispatcher.js';

/** Orchestrator 配置 */
export interface OrchestratorConfig {
  /** 项目名称 */
  projectName: string;
  /** 项目描述 */
  projectDescription?: string;
  /** 最大智能体深度 */
  maxDepth?: number;
  /** 是否自动安装 skills */
  autoInstallSkills?: boolean;
  /** AI 提供者配置 */
  aiConfig?: {
    timeout?: number;
    logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
}

/** 分析结果 */
export interface AnalysisResult {
  /** 识别的行业领域 */
  industry: string;
  /** 识别的职位角色 */
  roles: RoleDefinition[];
  /** 组织架构建议 */
  orgStructure: OrgStructure;
  /** 建议的工作流 */
  suggestedWorkflows: string[];
}

/** 角色定义 */
export interface RoleDefinition {
  id?: string;
  name: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  optionalSkills?: string[];
  skills?: string[];
  parent?: string;
  /** AI 生成的角色上下文 */
  systemPrompt?: string;
}

/** 组织架构 */
export interface OrgStructure {
  name: string;
  roles: RoleDefinition[];
  reportingLines: Array<{ from: string; to: string | null }>;
}

/**
 * Orchestrator 类
 */
export class Orchestrator {
  private agentManager: AgentManager;
  private messageBus: MessageBus;
  private aiProvider: AICapabilityProvider;
  private config: OrchestratorConfig;
  private orchestratorAgent: Agent | null = null;
  
  constructor(config: OrchestratorConfig) {
    this.config = {
      maxDepth: 5,
      autoInstallSkills: true,
      ...config,
    };
    this.agentManager = new AgentManager();
    this.messageBus = new MessageBus();
    
    // 初始化 AI 提供者
    const aiConfig: { timeout?: number; logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' } = {};
    if (config.aiConfig?.timeout !== undefined) {
      aiConfig.timeout = config.aiConfig.timeout;
    }
    if (config.aiConfig?.logLevel !== undefined) {
      aiConfig.logLevel = config.aiConfig.logLevel;
    }
    this.aiProvider = getAICapabilityProvider(aiConfig);
    setAIProvider(this.aiProvider);
  }
  
  /**
   * 初始化 Orchestrator
   */
  async initialize(): Promise<Agent> {
    // 连接 AI 提供者
    await this.aiProvider.connect();
    
    // 创建主智能体
    const input: CreateAgentInput = {
      name: '主智能体',
      role: 'orchestrator',
      depth: 0,
      responsibilities: [
        '理解项目需求',
        '分析行业领域',
        '设计组织架构',
        '分配任务给子智能体',
        '监控执行进度',
      ],
      skills: ['brainstorming', 'requirements-analysis'],
      metadata: {
        projectName: this.config.projectName,
        projectDescription: this.config.projectDescription,
      },
    };
    
    this.orchestratorAgent = this.agentManager.createAgent(input);
    return this.orchestratorAgent;
  }
  
  /**
   * 分析项目需求
   */
  async analyzeProject(description: string): Promise<AnalysisResult> {
    if (!this.orchestratorAgent) {
      throw new Error('Orchestrator not initialized');
    }
    
    // 调用分析器（使用 AI 能力）
    const result = await analyzeRequirements(description);
    
    // 更新主智能体元数据
    this.agentManager.updateAgent(this.orchestratorAgent.id, {
      metadata: {
        ...this.orchestratorAgent.metadata,
        analysisResult: result,
      },
    });
    
    return result;
  }
  
  /**
   * 创建组织架构
   */
  async createOrganization(analysis: AnalysisResult): Promise<Agent[]> {
    if (!this.orchestratorAgent) {
      throw new Error('Orchestrator not initialized');
    }
    
    const createdAgents: Agent[] = [];
    const agentMap = new Map<string, Agent>();
    
    // 先创建根级智能体（没有 parent 的）
    const rootRoles = analysis.orgStructure.roles.filter(r => !r.parent);
    for (const role of rootRoles) {
      const agent = await this.createAgentFromRole(role, this.orchestratorAgent.id);
      createdAgents.push(agent);
      agentMap.set(role.name, agent);
    }
    
    // 然后创建子级智能体
    const childRoles = analysis.orgStructure.roles.filter(r => r.parent);
    for (const role of childRoles) {
      const parentAgent = agentMap.get(role.parent!);
      const parentId = parentAgent ? parentAgent.id : this.orchestratorAgent.id;
      const agent = await this.createAgentFromRole(role, parentId);
      createdAgents.push(agent);
      agentMap.set(role.name, agent);
    }
    
    return createdAgents;
  }
  
  /**
   * 从角色定义创建智能体
   */
  private async createAgentFromRole(role: RoleDefinition, parentId: string): Promise<Agent> {
    // 如果角色没有 systemPrompt，使用 AI 生成
    let systemPrompt = role.systemPrompt;
    if (!systemPrompt) {
      try {
        systemPrompt = await this.generateRolePrompt(role);
      } catch (error) {
        console.warn(`Failed to generate system prompt for ${role.name}:`, error);
        systemPrompt = this.buildDefaultRolePrompt(role);
      }
    }
    
    const input: CreateAgentInput = {
      name: role.name,
      role: role.name.toLowerCase().replace(/\s+/g, '-'),
      parentId,
      systemPrompt,
      responsibilities: role.responsibilities,
      skills: role.requiredSkills,
    };
    
    return this.agentManager.createAgent(input);
  }
  
  /**
   * 使用 AI 生成角色上下文
   */
  private async generateRolePrompt(role: RoleDefinition): Promise<string> {
    const context = {
      projectName: this.config.projectName,
      projectDescription: this.config.projectDescription,
    };
    
    const result = await this.aiProvider.executeWithRole(
      {
        id: role.name.toLowerCase().replace(/\s+/g, '-'),
        name: role.name,
        description: role.description,
        responsibilities: role.responsibilities,
        requiredSkills: role.requiredSkills,
        skills: [...role.requiredSkills, ...(role.optionalSkills ?? [])],
      },
      '生成你的角色上下文描述，包括你的职责、工作方式和与其他角色的协作关系。',
      { agentId: 'orchestrator', summary: JSON.stringify(context) }
    );
    
    return result;
  }
  
  /**
   * 构建默认角色上下文
   */
  private buildDefaultRolePrompt(role: RoleDefinition): string {
    return `你是 ${role.name}，负责 ${role.description}。

你的职责包括：
${role.responsibilities.map(r => `- ${r}`).join('\n')}

你需要掌握的技能：${role.requiredSkills.join('、')}

请根据分配给你的任务，运用你的专业技能完成工作。`;
  }
  
  /**
   * 分配任务
   */
  async assignTask(agentId: string, taskDescription: string): Promise<string> {
    if (!this.orchestratorAgent) {
      throw new Error('Orchestrator not initialized');
    }
    
    return dispatchTasks({
      orchestratorId: this.orchestratorAgent.id,
      targetAgentId: agentId,
      description: taskDescription,
      messageBus: this.messageBus,
    });
  }
  
  /**
   * 获取主智能体
   */
  getOrchestratorAgent(): Agent | null {
    return this.orchestratorAgent;
  }
  
  /**
   * 获取所有智能体
   */
  getAllAgents(): Agent[] {
    return this.agentManager.getAllAgents();
  }
  
  /**
   * 获取智能体树
   */
  getAgentTree(): Agent[] {
    if (!this.orchestratorAgent) {
      return [];
    }
    return this.agentManager.getAgentTree(this.orchestratorAgent.id);
  }
  
  /**
   * 获取 AI 提供者
   */
  getAIProvider(): AICapabilityProvider {
    return this.aiProvider;
  }
  
  /**
   * 关闭 Orchestrator
   */
  async shutdown(): Promise<void> {
    this.messageBus.shutdown();
    await this.aiProvider.disconnect();
  }
}
