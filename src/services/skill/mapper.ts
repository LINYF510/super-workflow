/**
 * Role-Skill Mapper
 * 
 * 职位到技能的映射，支持 AI 驱动的智能映射
 */

import type { RoleSkillMapping } from '../../types/index.js';
import { AICapabilityProvider, getAICapabilityProvider } from '../iflow/index.js';

/** 默认角色-技能映射 */
const DEFAULT_MAPPINGS: RoleSkillMapping[] = [
  {
    roleId: 'frontend-developer',
    roleName: '前端开发工程师',
    keywords: ['react', 'vue', 'frontend', 'css', 'typescript', 'javascript', 'ui'],
    essentialSkills: [
      'vercel-labs/agent-skills@vercel-react-best-practices',
      'vercel-labs/agent-skills@vercel-composition-patterns',
    ],
    optionalSkills: [
      'vercel-labs/agent-skills@web-design-guidelines',
      'wshobson/agents@typescript-advanced-types',
    ],
  },
  {
    roleId: 'backend-developer',
    roleName: '后端开发工程师',
    keywords: ['backend', 'api', 'database', 'server', 'node', 'python'],
    essentialSkills: [
      'martinholovsky/claude-skills-generator@SQLite Database Expert',
    ],
    optionalSkills: [],
  },
  {
    roleId: 'product-manager',
    roleName: '产品经理',
    keywords: ['product', 'requirements', 'roadmap', 'user', 'feature'],
    essentialSkills: [
      'jwynia/agent-skills@requirements-analysis',
      'obra/superpowers@brainstorming',
    ],
    optionalSkills: [],
  },
  {
    roleId: 'test-engineer',
    roleName: '测试工程师',
    keywords: ['testing', 'qa', 'e2e', 'unit-test', 'integration'],
    essentialSkills: [
      'obra/superpowers@test-driven-development',
      'obra/superpowers@systematic-debugging',
    ],
    optionalSkills: [],
  },
  {
    roleId: 'tech-lead',
    roleName: '技术主管',
    keywords: ['lead', 'architect', 'code-review', 'technical'],
    essentialSkills: [
      'obra/superpowers@brainstorming',
      'obra/superpowers@requesting-code-review',
      'obra/superpowers@receiving-code-review',
    ],
    optionalSkills: [],
  },
  {
    roleId: 'designer',
    roleName: '设计师',
    keywords: ['design', 'ui', 'ux', 'visual', 'prototype'],
    essentialSkills: [
      'vercel-labs/agent-skills@web-design-guidelines',
    ],
    optionalSkills: [
      'vercel-labs/agent-skills@vercel-composition-patterns',
    ],
  },
];

/** 通用技能 */
const COMMON_SKILLS = [
  'obra/superpowers@brainstorming',
  'obra/superpowers@verification-before-completion',
];

/**
 * 角色技能映射器
 */
export class RoleSkillMapper {
  private mappings: Map<string, RoleSkillMapping>;
  private aiProvider: AICapabilityProvider | null = null;
  
  constructor(customMappings?: RoleSkillMapping[]) {
    this.mappings = new Map();
    
    // 加载默认映射
    for (const mapping of DEFAULT_MAPPINGS) {
      this.mappings.set(mapping.roleId, mapping);
    }
    
    // 加载自定义映射
    if (customMappings) {
      for (const mapping of customMappings) {
        this.mappings.set(mapping.roleId, mapping);
      }
    }
  }
  
  /**
   * 设置 AI 提供者
   */
  setAIProvider(provider: AICapabilityProvider): void {
    this.aiProvider = provider;
  }
  
  /**
   * 获取 AI 提供者
   */
  private async getAIProvider(): Promise<AICapabilityProvider | null> {
    if (!this.aiProvider) {
      try {
        this.aiProvider = getAICapabilityProvider();
        await this.aiProvider.connect();
      } catch {
        return null;
      }
    }
    return this.aiProvider;
  }
  
  /**
   * 根据角色名称获取技能映射
   */
  getMappingByRole(roleName: string): RoleSkillMapping | null {
    // 直接匹配
    for (const [, mapping] of this.mappings) {
      if (mapping.roleName === roleName || mapping.roleId === roleName) {
        return mapping;
      }
    }
    
    // 模糊匹配
    const lowerRoleName = roleName.toLowerCase();
    for (const [, mapping] of this.mappings) {
      if (mapping.roleName.toLowerCase().includes(lowerRoleName) ||
          mapping.roleId.includes(lowerRoleName)) {
        return mapping;
      }
    }
    
    return null;
  }
  
  /**
   * 根据角色获取推荐的技能
   */
  getSkillsForRole(roleName: string): {
    essential: string[];
    optional: string[];
    common: string[];
  } {
    const mapping = this.getMappingByRole(roleName);
    
    return {
      essential: mapping?.essentialSkills ?? [],
      optional: mapping?.optionalSkills ?? [],
      common: COMMON_SKILLS,
    };
  }
  
  /**
   * 根据描述推断角色并获取技能（支持 AI 增强）
   */
  async inferSkillsFromDescription(description: string): Promise<{
    roleId: string;
    roleName: string;
    skills: {
      essential: string[];
      optional: string[];
      common: string[];
    };
    aiGenerated: boolean;
  }> {
    // 尝试使用 AI 推断
    const aiProvider = await this.getAIProvider();
    if (aiProvider) {
      try {
        const aiResult = await this.aiInferSkills(aiProvider, description);
        if (aiResult) {
          return { ...aiResult, aiGenerated: true };
        }
      } catch {
        // AI 失败，回退到关键词匹配
      }
    }
    
    // 关键词匹配（备用）
    const result = this.keywordInferSkills(description);
    return { ...result, aiGenerated: false };
  }
  
  /**
   * AI 推断技能
   */
  private async aiInferSkills(
    aiProvider: AICapabilityProvider,
    description: string
  ): Promise<{
    roleId: string;
    roleName: string;
    skills: {
      essential: string[];
      optional: string[];
      common: string[];
    };
  } | null> {
    const prompt = `基于以下角色描述，推荐适合的 agent skills：

角色描述：${description}

请分析该角色需要的技能，从以下已知技能中选择：
- brainstorming: 创意工作前的头脑风暴
- requirements-analysis: 需求分析和诊断
- test-driven-development: 测试驱动开发
- systematic-debugging: 系统化调试
- vercel-react-best-practices: React 最佳实践
- vercel-composition-patterns: React 组合模式
- web-design-guidelines: Web 设计指南
- sqlite-database-expert: SQLite 数据库专家
- requesting-code-review: 请求代码审查
- receiving-code-review: 接收代码审查
- typescript-advanced-types: TypeScript 高级类型

请返回 JSON 格式：
{
  "roleName": "角色名称",
  "essentialSkills": ["必需技能列表"],
  "optionalSkills": ["可选技能列表"]
}`;
    
    const response = await aiProvider.executeWithRole(
      {
        name: '技能映射专家',
        description: '根据角色描述推荐合适的技能',
        responsibilities: ['分析角色需求', '匹配技能', '提供推荐'],
        skills: ['requirements-analysis'],
        systemPrompt: '你是一个技能映射专家，负责根据角色描述推荐合适的 agent skills。',
      },
      prompt,
      { agentId: 'skill-mapper', summary: '技能映射任务' }
    );
    
    // 解析 AI 响应
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          roleId: parsed.roleName?.toLowerCase().replace(/\s+/g, '-') ?? 'custom',
          roleName: parsed.roleName ?? '自定义角色',
          skills: {
            essential: (parsed.essentialSkills ?? []).map((s: string) => this.normalizeSkillName(s)),
            optional: (parsed.optionalSkills ?? []).map((s: string) => this.normalizeSkillName(s)),
            common: COMMON_SKILLS,
          },
        };
      }
    } catch {
      // 解析失败
    }
    
    return null;
  }
  
  /**
   * 规范化技能名称
   */
  private normalizeSkillName(skill: string): string {
    // 如果已经是完整格式，直接返回
    if (skill.includes('/')) return skill;
    
    // 映射到已知的技能包
    const skillMap: Record<string, string> = {
      'brainstorming': 'obra/superpowers@brainstorming',
      'requirements-analysis': 'jwynia/agent-skills@requirements-analysis',
      'test-driven-development': 'obra/superpowers@test-driven-development',
      'systematic-debugging': 'obra/superpowers@systematic-debugging',
      'vercel-react-best-practices': 'vercel-labs/agent-skills@vercel-react-best-practices',
      'vercel-composition-patterns': 'vercel-labs/agent-skills@vercel-composition-patterns',
      'web-design-guidelines': 'vercel-labs/agent-skills@web-design-guidelines',
      'sqlite-database-expert': 'martinholovsky/claude-skills-generator@SQLite Database Expert',
      'requesting-code-review': 'obra/superpowers@requesting-code-review',
      'receiving-code-review': 'obra/superpowers@receiving-code-review',
      'typescript-advanced-types': 'wshobson/agents@typescript-advanced-types',
    };
    
    return skillMap[skill.toLowerCase()] ?? skill;
  }
  
  /**
   * 关键词推断技能（备用）
   */
  private keywordInferSkills(description: string): {
    roleId: string;
    roleName: string;
    skills: {
      essential: string[];
      optional: string[];
      common: string[];
    };
  } {
    const lowerDesc = description.toLowerCase();
    let bestMatch: RoleSkillMapping | null = null;
    let bestScore = 0;
    
    for (const [, mapping] of this.mappings) {
      const score = mapping.keywords.reduce((count, keyword) => {
        return count + (lowerDesc.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = mapping;
      }
    }
    
    if (bestMatch) {
      return {
        roleId: bestMatch.roleId,
        roleName: bestMatch.roleName,
        skills: {
          essential: bestMatch.essentialSkills,
          optional: bestMatch.optionalSkills,
          common: COMMON_SKILLS,
        },
      };
    }
    
    // 没有匹配时返回通用技能
    return {
      roleId: 'general',
      roleName: '通用角色',
      skills: {
        essential: [],
        optional: [],
        common: COMMON_SKILLS,
      },
    };
  }
  
  /**
   * 添加自定义映射
   */
  addMapping(mapping: RoleSkillMapping): void {
    this.mappings.set(mapping.roleId, mapping);
  }
  
  /**
   * 获取所有映射
   */
  getAllMappings(): RoleSkillMapping[] {
    return Array.from(this.mappings.values());
  }
}

/**
 * 创建角色技能映射器
 */
export function createRoleSkillMapper(customMappings?: RoleSkillMapping[]): RoleSkillMapper {
  return new RoleSkillMapper(customMappings);
}
