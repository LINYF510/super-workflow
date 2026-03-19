/**
 * Role-Skill Mapper
 * 
 * 职位到技能的映射
 */

import type { RoleSkillMapping } from '../../types/index.js';

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
   * 根据描述推断角色并获取技能
   */
  inferSkillsFromDescription(description: string): {
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
