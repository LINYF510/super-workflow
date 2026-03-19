/**
 * Orchestrator - 主智能体
 * 
 * 系统入口点，负责理解需求、分析行业、分配任务
 */

import type { Agent, CreateAgentInput } from '../../types/index.js';
import { AgentManager } from '../agent/manager.js';
import { MessageBus } from '../communication/bus.js';
import { analyzeRequirements } from './analyzer.js';
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
  name: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  optionalSkills?: string[];
  parent?: string;
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
  }
  
  /**
   * 初始化 Orchestrator
   */
  async initialize(): Promise<Agent> {
    // 创建主智能体
    const input: CreateAgentInput = {
      name: '主智能体',
      role: 'orchestrator',
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
    
    // 调用分析器
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
    
    // 按层级创建智能体
    for (const role of analysis.orgStructure.roles) {
      const input: CreateAgentInput = {
        name: role.name,
        role: role.name.toLowerCase().replace(/\s+/g, '-'),
        parentId: this.orchestratorAgent.id,
        responsibilities: role.responsibilities,
        skills: role.requiredSkills,
      };
      
      const agent = this.agentManager.createAgent(input);
      createdAgents.push(agent);
    }
    
    return createdAgents;
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
   * 关闭 Orchestrator
   */
  shutdown(): void {
    this.messageBus.shutdown();
  }
}
