/**
 * AI Capability Provider
 *
 * iFlow SDK 封装，提供 AI 能力
 */

import { IFlowClient, MessageType } from '@iflow-ai/iflow-cli-sdk';
import type {
  RoleDefinition,
  AgentContext,
  SkillOutput,
  AICapabilityConfig,
  AnalysisResult,
} from './types.js';
import {
  buildAnalysisPrompt,
  buildRoleExecutionPrompt,
  buildSkillInvocationPrompt,
  buildTaskDecompositionPrompt,
  buildAggregationPrompt,
  buildErrorHandlingPrompt,
} from './prompts.js';

/**
 * AI 能力提供者
 *
 * 封装 iFlow SDK，为 Super Workflow 提供 AI 推理能力
 */
export class AICapabilityProvider {
  private client: IFlowClient | null = null;
  private config: AICapabilityConfig;
  private connected: boolean = false;

  constructor(config: AICapabilityConfig = {}) {
    this.config = {
      timeout: 60000,
      logLevel: 'INFO',
      ...config,
    };
  }

  /**
   * 连接到 iFlow
   */
  async connect(): Promise<void> {
    if (this.connected && this.client) {
      return;
    }

    // 构建 options，只包含定义的属性
    const options: { timeout?: number; logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'; cwd?: string } = {};
    
    if (this.config.timeout !== undefined) {
      options.timeout = this.config.timeout;
    }
    if (this.config.logLevel !== undefined) {
      options.logLevel = this.config.logLevel;
    }
    if (this.config.cwd !== undefined) {
      options.cwd = this.config.cwd;
    }

    this.client = new IFlowClient(options);

    await this.client.connect();
    this.connected = true;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.connected = false;
      this.client = null;
    }
  }

  /**
   * 分析需求，生成角色定义
   */
  async analyzeRequirements(description: string): Promise<AnalysisResult> {
    await this.ensureConnection();

    const prompt = buildAnalysisPrompt(description);
    await this.client!.sendMessage(prompt);

    const response = await this.collectResponse();
    const roles = this.parseRoleDefinitions(response);

    return {
      industry: this.extractIndustry(description),
      roles,
      orgStructure: this.buildOrgStructure(roles),
      suggestedWorkflows: this.suggestWorkflows(roles),
    };
  }

  /**
   * 执行任务（带角色上下文）
   */
  async executeWithRole(
    role: RoleDefinition,
    task: string,
    context?: AgentContext
  ): Promise<string> {
    await this.ensureConnection();

    const prompt = buildRoleExecutionPrompt(
      role,
      task,
      context?.summary
    );

    await this.client!.sendMessage(prompt);
    return await this.collectResponse();
  }

  /**
   * 调用 Skill
   */
  async invokeSkill(
    skillName: string,
    input: Record<string, unknown>
  ): Promise<SkillOutput> {
    await this.ensureConnection();

    const prompt = buildSkillInvocationPrompt(skillName, input);
    await this.client!.sendMessage(prompt);

    const response = await this.collectResponse();

    return {
      success: true,
      result: this.parseSkillResult(response),
      rawResponse: response,
    };
  }

  /**
   * 分解任务
   */
  async decomposeTask(
    task: string,
    availableRoles: string[]
  ): Promise<{
    subTasks: Array<{ role: string; task: string; priority: string }>;
    needsSubAgents: boolean;
    reasoning: string;
  }> {
    await this.ensureConnection();

    const prompt = buildTaskDecompositionPrompt(task, availableRoles);
    await this.client!.sendMessage(prompt);

    const response = await this.collectResponse();
    return this.parseTaskDecomposition(response);
  }

  /**
   * 聚合结果
   */
  async aggregateResults(
    originalTask: string,
    results: Array<{ role: string; output: string }>
  ): Promise<string> {
    await this.ensureConnection();

    const prompt = buildAggregationPrompt(originalTask, results);
    await this.client!.sendMessage(prompt);

    return await this.collectResponse();
  }

  /**
   * 处理错误
   */
  async handleError(
    task: string,
    error: string,
    retryCount: number
  ): Promise<{
    shouldRetry: boolean;
    adjustments?: string;
    alternative?: string;
  }> {
    await this.ensureConnection();

    const prompt = buildErrorHandlingPrompt(task, error, retryCount);
    await this.client!.sendMessage(prompt);

    const response = await this.collectResponse();
    return this.parseErrorHandling(response);
  }

  /**
   * 通用查询
   */
  async query(prompt: string): Promise<string> {
    await this.ensureConnection();
    await this.client!.sendMessage(prompt);
    return await this.collectResponse();
  }

  /**
   * 收集响应
   */
  private async collectResponse(): Promise<string> {
    if (!this.client) {
      throw new Error('Not connected to iFlow');
    }

    let result = '';

    try {
      for await (const message of this.client.receiveMessages()) {
        if (message.type === MessageType.ASSISTANT && message.chunk.text) {
          result += message.chunk.text;
        } else if (message.type === MessageType.TASK_FINISH) {
          break;
        } else if (message.type === MessageType.ERROR) {
          throw new Error(`iFlow error: ${JSON.stringify(message)}`);
        }
      }
    } catch (error) {
      // 如果是连接错误，尝试重连
      if (this.isConnectionError(error)) {
        await this.reconnect();
        // 重试一次
        return await this.collectResponse();
      }
      throw error;
    }

    return result;
  }

  /**
   * 确保已连接
   */
  private async ensureConnection(): Promise<void> {
    if (!this.connected || !this.client) {
      await this.connect();
    }
  }

  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    this.connected = false;
    this.client = null;
    await this.connect();
  }

  /**
   * 检查是否是连接错误
   */
  private isConnectionError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('WebSocket')
      );
    }
    return false;
  }

  /**
   * 解析角色定义
   */
  private parseRoleDefinitions(response: string): RoleDefinition[] {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch {
      console.error('Failed to parse role definitions:', response);
      return [];
    }
  }

  /**
   * 解析 Skill 结果
   */
  private parseSkillResult(response: string): unknown {
    try {
      // 尝试解析为 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { rawText: response };
    } catch {
      return { rawText: response };
    }
  }

  /**
   * 解析任务分解
   */
  private parseTaskDecomposition(response: string): {
    subTasks: Array<{ role: string; task: string; priority: string }>;
    needsSubAgents: boolean;
    reasoning: string;
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 忽略解析错误
    }

    return {
      subTasks: [],
      needsSubAgents: false,
      reasoning: response,
    };
  }

  /**
   * 解析错误处理
   */
  private parseErrorHandling(response: string): {
    shouldRetry: boolean;
    adjustments?: string;
    alternative?: string;
  } {
    const shouldRetry = response.toLowerCase().includes('应该重试') ||
      response.toLowerCase().includes('should retry');

    return {
      shouldRetry,
      adjustments: response,
    };
  }

  /**
   * 提取行业领域
   */
  private extractIndustry(description: string): string {
    // 简单的关键词匹配
    const industries: Record<string, string[]> = {
      '电商': ['电商', '购物', '订单', '商品', '支付', '物流'],
      '金融': ['金融', '银行', '投资', '理财', '股票', '基金'],
      '教育': ['教育', '学习', '课程', '学生', '教师', '考试'],
      '医疗': ['医疗', '医院', '诊断', '病历', '挂号', '问诊'],
      '社交': ['社交', '聊天', '好友', '动态', '评论', '点赞'],
      '企业服务': ['企业', 'OA', '审批', '流程', '文档', '协作'],
    };

    const lowerDesc = description.toLowerCase();

    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(kw => lowerDesc.includes(kw))) {
        return industry;
      }
    }

    return '通用';
  }

  /**
   * 构建组织架构描述
   */
  private buildOrgStructure(roles: RoleDefinition[]): string {
    if (roles.length === 0) {
      return '无';
    }

    const roots = roles.filter(r => !r.parent);
    const buildTree = (role: RoleDefinition, indent: number = 0): string => {
      const prefix = '  '.repeat(indent) + (indent > 0 ? '└─ ' : '');
      const children = roles.filter(r => r.parent === role.name);
      const childStr = children.map(c => buildTree(c, indent + 1)).join('\n');
      return `${prefix}${role.name}${childStr ? '\n' + childStr : ''}`;
    };

    return roots.map(r => buildTree(r)).join('\n');
  }

  /**
   * 建议工作流
   */
  private suggestWorkflows(roles: RoleDefinition[]): string[] {
    const workflows: Set<string> = new Set();

    for (const role of roles) {
      if (role.skills.includes('requirements-analysis')) {
        workflows.add('需求分析工作流');
      }
      if (role.skills.includes('brainstorming')) {
        workflows.add('设计协作工作流');
      }
      if (role.skills.includes('test-driven-development')) {
        workflows.add('测试驱动开发工作流');
      }
      if (role.skills.some(s => s.includes('react') || s.includes('frontend'))) {
        workflows.add('前端开发工作流');
      }
      if (role.skills.some(s => s.includes('api') || s.includes('backend'))) {
        workflows.add('后端开发工作流');
      }
    }

    return Array.from(workflows);
  }
}

// 导出单例（可选）
let defaultProvider: AICapabilityProvider | null = null;

export function getAICapabilityProvider(
  config?: AICapabilityConfig
): AICapabilityProvider {
  if (!defaultProvider) {
    defaultProvider = new AICapabilityProvider(config);
  }
  return defaultProvider;
}

export function resetAICapabilityProvider(): void {
  if (defaultProvider) {
    defaultProvider.disconnect().catch(() => {});
    defaultProvider = null;
  }
}
