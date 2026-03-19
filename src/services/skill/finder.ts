/**
 * Skill Finder
 * 
 * 搜索和发现 skills
 */

import { execSync } from 'child_process';
import type { SkillSearchResult, SkillSearchFilter, SkillQualityScore } from '../../types/index.js';

/** 可信来源 */
const TRUSTED_SOURCES = [
  'vercel-labs',
  'obra',
  'anthropic',
  'jwynia',
  'martinholovsky',
];

/**
 * 搜索 skills
 */
export async function findSkills(filter: SkillSearchFilter): Promise<SkillSearchResult[]> {
  const { query, minInstalls = 100, verified, tags } = filter;
  
  try {
    // 调用 npx skills find 命令
    const result = execSync(`npx skills find "${query}" --json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    // 解析结果
    let skills: SkillSearchResult[] = [];
    try {
      const parsed = JSON.parse(result);
      skills = Array.isArray(parsed) ? parsed : parsed.skills ?? [];
    } catch {
      // 如果不是 JSON 格式，解析文本输出
      skills = parseTextOutput(result);
    }
    
    // 应用过滤条件
    skills = skills.filter(skill => {
      // 最小安装量
      if (skill.installs < minInstalls) return false;
      
      // 验证状态
      if (verified !== undefined && skill.verified !== verified) return false;
      
      // 标签过滤
      if (tags && tags.length > 0) {
        const skillTags = skill.tags ?? [];
        if (!tags.some(tag => skillTags.includes(tag))) return false;
      }
      
      return true;
    });
    
    return skills;
    
  } catch (error) {
    console.error('Skill search failed:', error);
    return [];
  }
}

/**
 * 解析文本输出
 */
function parseTextOutput(text: string): SkillSearchResult[] {
  const lines = text.split('\n').filter(line => line.trim());
  const results: SkillSearchResult[] = [];
  
  for (const line of lines) {
    // 尝试解析 "name - description (installs)" 格式
    const match = line.match(/^(.+?)\s*-\s*(.+?)\s*\((\d+)\s*installs?\)/);
    if (match && match[1] && match[2] && match[3]) {
      results.push({
        name: match[1].trim(),
        source: match[1].trim(),
        description: match[2].trim(),
        installs: parseInt(match[3], 10),
        tags: [],
        verified: false,
      });
    }
  }
  
  return results;
}

/**
 * 计算技能质量评分
 */
export function calculateQualityScore(
  skill: SkillSearchResult,
  query: string
): SkillQualityScore {
  // 安装量评分 (0-100)
  const installsScore = Math.min(100, Math.log10(skill.installs + 1) * 20);
  
  // 信任评分
  const isTrusted = TRUSTED_SOURCES.some(source => 
    skill.source.toLowerCase().includes(source.toLowerCase())
  );
  const trustScore = isTrusted ? 100 : 50;
  
  // 相关性评分 (基于名称和描述与查询的匹配度)
  const queryLower = query.toLowerCase();
  const nameMatch = skill.name.toLowerCase().includes(queryLower) ? 50 : 0;
  const descMatch = skill.description.toLowerCase().includes(queryLower) ? 30 : 0;
  const relevanceScore = Math.min(100, nameMatch + descMatch);
  
  // 综合评分
  const overallScore = (installsScore * 0.3) + (trustScore * 0.3) + (relevanceScore * 0.4);
  
  return {
    name: skill.name,
    installsScore,
    trustScore,
    relevanceScore,
    overallScore,
  };
}

/**
 * 按质量排序技能
 */
export function sortSkillsByQuality(
  skills: SkillSearchResult[],
  query: string
): Array<SkillSearchResult & { qualityScore: SkillQualityScore }> {
  const withScores = skills.map(skill => ({
    ...skill,
    qualityScore: calculateQualityScore(skill, query),
  }));
  
  return withScores.sort((a, b) => 
    b.qualityScore.overallScore - a.qualityScore.overallScore
  );
}

/**
 * 推荐最佳技能
 */
export function recommendSkills(
  skills: SkillSearchResult[],
  query: string,
  topN = 3
): Array<SkillSearchResult & { qualityScore: SkillQualityScore }> {
  const sorted = sortSkillsByQuality(skills, query);
  return sorted.slice(0, topN);
}

/**
 * 搜索并推荐技能
 */
export async function findAndRecommendSkills(
  query: string,
  options: Partial<SkillSearchFilter> = {}
): Promise<Array<SkillSearchResult & { qualityScore: SkillQualityScore }>> {
  const skills = await findSkills({ query, ...options });
  return recommendSkills(skills, query);
}
