/**
 * Skill Registry
 * 
 * 管理已安装的 skills
 */

import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import type { Skill, SkillMetadata, SkillsLockFile } from '../../types/index.js';

/** Skills 目录 */
const SKILLS_DIR = '.agents/skills';

/**
 * Skill Registry 类
 */
export class SkillRegistry {
  private skillsDir: string;
  private lockFile: SkillsLockFile | null = null;
  
  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir ?? join(process.cwd(), SKILLS_DIR);
    this.loadLockFile();
  }
  
  /**
   * 加载 skills-lock.json
   */
  private loadLockFile(): void {
    const lockPath = join(process.cwd(), 'skills-lock.json');
    
    if (existsSync(lockPath)) {
      try {
        const content = readFileSync(lockPath, 'utf-8');
        this.lockFile = JSON.parse(content);
      } catch {
        this.lockFile = null;
      }
    }
  }
  
  /**
   * 获取所有已安装的 skills
   */
  getAllSkills(): Skill[] {
    if (!existsSync(this.skillsDir)) {
      return [];
    }
    
    const skills: Skill[] = [];
    const entries = readdirSync(this.skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const skillPath = join(this.skillsDir, entry.name);
      const skill = this.loadSkill(entry.name, skillPath);
      
      if (skill) {
        skills.push(skill);
      }
    }
    
    return skills;
  }
  
  /**
   * 加载单个 skill
   */
  private loadSkill(name: string, path: string): Skill | null {
    const skillMdPath = join(path, 'SKILL.md');
    
    if (!existsSync(skillMdPath)) {
      return null;
    }
    
    try {
      const content = readFileSync(skillMdPath, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      
      const lockEntry = this.lockFile?.skills[name];
      
      const skill: Skill = {
        name: (frontmatter.name as string) ?? name,
        displayName: name,
        description: (frontmatter.description as string) ?? '',
        metadata: parseMetadata(frontmatter.metadata) ?? {},
        source: lockEntry?.source ?? 'unknown',
        sourceType: lockEntry?.sourceType ?? 'local',
        installPath: path,
        computedHash: lockEntry?.computedHash ?? '',
        status: 'installed',
        installedAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Only add optional properties if they have values
      if (frontmatter.license !== undefined) {
        skill.license = frontmatter.license as string;
      }
      
      return skill;
      
    } catch (error) {
      console.error(`Failed to load skill ${name}:`, error);
      return null;
    }
  }
  
  /**
   * 按 ID 获取 skill
   */
  getSkill(name: string): Skill | null {
    const skillPath = join(this.skillsDir, name);
    
    if (!existsSync(skillPath)) {
      return null;
    }
    
    return this.loadSkill(name, skillPath);
  }
  
  /**
   * 检查 skill 是否存在
   */
  hasSkill(name: string): boolean {
    const skillPath = join(this.skillsDir, name);
    return existsSync(skillPath);
  }
  
  /**
   * 按标签搜索 skills
   */
  findByTag(tag: string): Skill[] {
    return this.getAllSkills().filter(skill => 
      skill.metadata?.tags?.includes(tag)
    );
  }
  
  /**
   * 按领域搜索 skills
   */
  findByDomain(domain: string): Skill[] {
    return this.getAllSkills().filter(skill =>
      skill.metadata?.domain === domain
    );
  }
  
  /**
   * 按类型搜索 skills
   */
  findByType(type: string): Skill[] {
    return this.getAllSkills().filter(skill =>
      skill.metadata?.type === type
    );
  }
  
  /**
   * 搜索 skills
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getAllSkills().filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

/**
 * 解析 YAML frontmatter
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!match || !match[1] || match[2] === undefined) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterText = match[1];
  const body = match[2];
  
  // 简单的 YAML 解析（不使用 yaml 库）
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterText.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      frontmatter[key] = value;
    }
  }
  
  return { frontmatter, body };
}

/**
 * 解析元数据
 */
function parseMetadata(metadata: unknown): SkillMetadata | undefined {
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  
  const meta = metadata as Record<string, unknown>;
  
  const result: SkillMetadata = {};
  
  // Only add optional properties if they have values
  if (typeof meta.author === 'string') result.author = meta.author;
  if (typeof meta.version === 'string') result.version = meta.version;
  if (typeof meta.domain === 'string') result.domain = meta.domain;
  if (typeof meta.cluster === 'string') result.cluster = meta.cluster;
  
  // Type and mode need special handling for exactOptionalPropertyTypes
  if (meta.type === 'diagnostic' || meta.type === 'generative' || 
      meta.type === 'transformative' || meta.type === 'assistive') {
    result.type = meta.type;
  }
  if (meta.mode === 'assistive' || meta.mode === 'autonomous' || meta.mode === 'interactive') {
    result.mode = meta.mode;
  }
  
  if (Array.isArray(meta.tags)) result.tags = meta.tags as string[];
  
  return result;
}

/**
 * 创建 Skill Registry 实例
 */
export function createSkillRegistry(skillsDir?: string): SkillRegistry {
  return new SkillRegistry(skillsDir);
}
