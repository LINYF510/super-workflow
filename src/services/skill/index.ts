/**
 * Skill 服务入口
 * 
 * 统一导出 skill 服务模块
 */

export { findSkills, calculateQualityScore, sortSkillsByQuality, recommendSkills, findAndRecommendSkills } from './finder.js';

export { installSkill, installSkills, isSkillInstalled, getInstalledSkills, uninstallSkill } from './installer.js';

export { SkillRegistry, createSkillRegistry } from './registry.js';

export { RoleSkillMapper, createRoleSkillMapper } from './mapper.js';
