/**
 * Skill - 技能类型定义
 * 
 * 技能单元是原子化能力，通过 `npx skills` 动态获取
 */

/** Skill 来源类型 */
export type SkillSourceType = 'github' | 'npm' | 'local';

/** Skill 安装状态 */
export type SkillInstallStatus = 'installed' | 'pending' | 'failed' | 'updating';

/** Skill 元数据（来自 SKILL.md frontmatter） */
export interface SkillMetadata {
  author?: string;
  version?: string;
  domain?: string;
  cluster?: string;
  type?: 'diagnostic' | 'generative' | 'transformative' | 'assistive';
  mode?: 'autonomous' | 'assistive' | 'interactive';
  tags?: string[];
}

/** Skill 定义 */
export interface Skill {
  /** 技能名称（来自 frontmatter） */
  name: string;
  /** 显示名称（目录名） */
  displayName: string;
  /** 描述 */
  description: string;
  /** 许可证 */
  license?: string;
  /** 元数据 */
  metadata?: SkillMetadata;
  /** 来源 */
  source: string;
  /** 来源类型 */
  sourceType: SkillSourceType;
  /** 安装路径 */
  installPath: string;
  /** 内容哈希 */
  computedHash: string;
  /** 安装状态 */
  status: SkillInstallStatus;
  /** 安装时间 */
  installedAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/** skills-lock.json 中的条目 */
export interface SkillLockEntry {
  source: string;
  sourceType: SkillSourceType;
  computedHash: string;
}

/** skills-lock.json 格式 */
export interface SkillsLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
}

/** Skill 搜索结果 */
export interface SkillSearchResult {
  name: string;
  source: string;
  description: string;
  installs: number;
  rating?: number;
  tags: string[];
  verified: boolean;
}

/** Skill 搜索过滤器 */
export interface SkillSearchFilter {
  query: string;
  minInstalls?: number;
  verified?: boolean;
  domain?: string;
  tags?: string[];
}

/** Skill 质量评分 */
export interface SkillQualityScore {
  name: string;
  installsScore: number;
  trustScore: number;
  relevanceScore: number;
  overallScore: number;
}

/** 职位到技能的映射 */
export interface RoleSkillMapping {
  /** 职位标识 */
  roleId: string;
  /** 职位名称 */
  roleName: string;
  /** 搜索关键词 */
  keywords: string[];
  /** 必需技能 */
  essentialSkills: string[];
  /** 可选技能 */
  optionalSkills: string[];
}

/** Skill 安装配置 */
export interface SkillInstallConfig {
  /** 来源（owner/repo@skill 或 npm 包名） */
  source: string;
  /** 来源类型 */
  sourceType: SkillSourceType;
  /** 是否全局安装 */
  global?: boolean;
  /** 是否跳过确认 */
  yes?: boolean;
}

/** Skill 质量过滤条件 */
export interface SkillQualityFilter {
  /** 最小安装量 */
  minInstalls: number;
  /** 可信来源列表 */
  trustedSources: string[];
  /** 最小匹配度 */
  minRelevance: number;
}
