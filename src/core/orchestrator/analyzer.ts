/**
 * Requirements Analyzer
 * 
 * 分析项目需求，识别行业领域和职位角色
 * 使用 iFlow SDK 提供 AI 能力
 */

import { AICapabilityProvider, getAICapabilityProvider } from '../../services/iflow/index.js';
import type { AnalysisResult, RoleDefinition, OrgStructure } from './index.js';

/** 行业关键词映射（备用） */
const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  '电商': ['电商', '购物', '订单', '商品', '支付', '物流', '购物车', '结算'],
  '金融': ['金融', '银行', '投资', '理财', '股票', '基金', '贷款', '风控'],
  '教育': ['教育', '学习', '课程', '学生', '教师', '考试', '培训', '在线课堂'],
  '医疗': ['医疗', '医院', '诊断', '病历', '挂号', '问诊', '处方', '健康'],
  '社交': ['社交', '聊天', '好友', '动态', '评论', '点赞', '关注', '私信'],
  '企业服务': ['企业', 'OA', '审批', '流程', '文档', '协作', '权限', '组织'],
  '内容': ['内容', '文章', '视频', '音频', '直播', '媒体', '发布', '推荐'],
  '工具': ['工具', '效率', '笔记', '日历', '任务', '提醒', '同步', '备份'],
};

/** 职位角色模板（备用） */
const ROLE_TEMPLATES: Record<string, RoleDefinition[]> = {
  '电商': [
    {
      name: '产品经理',
      description: '负责产品规划和需求管理',
      responsibilities: ['需求分析', '产品规划', '原型设计', '需求文档编写'],
      requiredSkills: ['requirements-analysis', 'brainstorming'],
    },
    {
      name: '前端开发',
      description: '负责用户界面开发',
      responsibilities: ['UI开发', '前端性能优化', '与后端API对接'],
      requiredSkills: ['vercel-react-best-practices', 'typescript-advanced-types'],
      parent: '技术主管',
    },
    {
      name: '后端开发',
      description: '负责服务端开发',
      responsibilities: ['API开发', '数据库设计', '服务性能优化'],
      requiredSkills: ['sqlite-database-expert'],
      parent: '技术主管',
    },
    {
      name: '技术主管',
      description: '负责技术架构和团队管理',
      responsibilities: ['技术架构设计', '代码审查', '技术决策'],
      requiredSkills: ['brainstorming', 'requesting-code-review'],
    },
    {
      name: '测试工程师',
      description: '负责质量保障',
      responsibilities: ['测试用例编写', '自动化测试', '缺陷跟踪'],
      requiredSkills: ['test-driven-development', 'systematic-debugging'],
      parent: '技术主管',
    },
  ],
  'default': [
    {
      name: '产品经理',
      description: '负责产品规划和需求管理',
      responsibilities: ['需求分析', '产品规划', '用户研究'],
      requiredSkills: ['requirements-analysis', 'brainstorming'],
    },
    {
      name: '开发工程师',
      description: '负责功能开发',
      responsibilities: ['功能开发', '代码编写', '技术实现'],
      requiredSkills: ['brainstorming'],
    },
    {
      name: '测试工程师',
      description: '负责质量保障',
      responsibilities: ['测试', '质量保障'],
      requiredSkills: ['test-driven-development'],
    },
  ],
};

/** AI 提供者实例 */
let aiProvider: AICapabilityProvider | null = null;

/**
 * 设置 AI 提供者
 */
export function setAIProvider(provider: AICapabilityProvider): void {
  aiProvider = provider;
}

/**
 * 获取 AI 提供者
 */
export function getAIProvider(): AICapabilityProvider {
  if (!aiProvider) {
    aiProvider = getAICapabilityProvider();
  }
  return aiProvider;
}

/**
 * 分析项目需求（使用 AI 能力）
 */
export async function analyzeRequirements(description: string): Promise<AnalysisResult> {
  try {
    // 尝试使用 AI 分析
    const provider = getAIProvider();
    await provider.connect();
    
    const result = await provider.analyzeRequirements(description);
    
    // 如果 AI 返回了角色定义，转换为本地格式
    if (result.roles && result.roles.length > 0) {
      const roles: RoleDefinition[] = result.roles.map(role => {
        const mapped: RoleDefinition = {
          name: role.name,
          description: role.description,
          responsibilities: role.responsibilities,
          requiredSkills: role.requiredSkills ?? role.skills ?? [],
        };
        if (role.parent) {
          mapped.parent = role.parent;
        }
        if (role.optionalSkills) {
          mapped.optionalSkills = role.optionalSkills;
        }
        if (role.systemPrompt) {
          mapped.systemPrompt = role.systemPrompt;
        }
        return mapped;
      });
      
      return {
        industry: result.industry,
        roles,
        orgStructure: buildOrgStructureFromRoles(roles),
        suggestedWorkflows: result.suggestedWorkflows,
      };
    }
  } catch (error) {
    console.warn('AI analysis failed, falling back to keyword-based analysis:', error);
  }
  
  // 备用：基于关键词的分析
  return analyzeRequirementsFallback(description);
}

/**
 * 基于关键词的备用分析
 */
function analyzeRequirementsFallback(description: string): AnalysisResult {
  // 识别行业领域
  const industry = identifyIndustry(description);
  
  // 获取角色模板
  const roles = getRolesForIndustry(industry);
  
  // 构建组织架构
  const orgStructure = buildOrgStructure(industry, roles);
  
  // 建议工作流
  const suggestedWorkflows = suggestWorkflows(industry, roles);
  
  return {
    industry,
    roles,
    orgStructure,
    suggestedWorkflows,
  };
}

/**
 * 识别行业领域
 */
function identifyIndustry(description: string): string {
  const lowerDesc = description.toLowerCase();
  
  let bestMatch = 'default';
  let bestScore = 0;
  
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const score = keywords.reduce((count, keyword) => {
      return count + (lowerDesc.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  
  return bestMatch;
}

/**
 * 获取行业的角色模板
 */
function getRolesForIndustry(industry: string): RoleDefinition[] {
  return ROLE_TEMPLATES[industry] ?? ROLE_TEMPLATES['default']!;
}

/**
 * 从角色列表构建组织架构
 */
function buildOrgStructureFromRoles(roles: RoleDefinition[]): OrgStructure {
  const reportingLines = roles.map((role) => ({
    from: role.name,
    to: role.parent ?? null,
  }));
  
  return {
    name: '项目团队',
    roles,
    reportingLines,
  };
}

/**
 * 构建组织架构
 */
function buildOrgStructure(industry: string, roles: RoleDefinition[]): OrgStructure {
  const reportingLines = roles.map((role) => ({
    from: role.name,
    to: role.parent ?? null,
  }));
  
  return {
    name: `${industry}项目团队`,
    roles,
    reportingLines,
  };
}

/**
 * 建议工作流
 */
function suggestWorkflows(_industry: string, roles: RoleDefinition[]): string[] {
  const workflows: string[] = [];
  
  // 基于角色建议工作流
  for (const role of roles) {
    if (role.requiredSkills.includes('requirements-analysis')) {
      workflows.push('需求分析工作流');
    }
    if (role.requiredSkills.includes('brainstorming')) {
      workflows.push('设计协作工作流');
    }
    if (role.requiredSkills.includes('test-driven-development')) {
      workflows.push('测试驱动开发工作流');
    }
  }
  
  // 去重
  return [...new Set(workflows)];
}
