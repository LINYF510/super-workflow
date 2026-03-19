/**
 * RoleSkillMapper Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoleSkillMapper, createRoleSkillMapper } from '../src/services/skill/mapper.js';

describe('RoleSkillMapper', () => {
  let mapper: RoleSkillMapper;

  beforeEach(() => {
    mapper = createRoleSkillMapper();
  });

  describe('getMappingByRole', () => {
    it('should find mapping by role name', () => {
      const mapping = mapper.getMappingByRole('前端开发工程师');

      expect(mapping).toBeDefined();
      expect(mapping?.roleId).toBe('frontend-developer');
      expect(mapping?.essentialSkills).toContain('vercel-labs/agent-skills@vercel-react-best-practices');
    });

    it('should find mapping by role id', () => {
      const mapping = mapper.getMappingByRole('backend-developer');

      expect(mapping).toBeDefined();
      expect(mapping?.roleName).toBe('后端开发工程师');
    });

    it('should do fuzzy matching', () => {
      const mapping = mapper.getMappingByRole('前端');

      expect(mapping).toBeDefined();
      expect(mapping?.roleId).toBe('frontend-developer');
    });

    it('should return null for unknown role', () => {
      const mapping = mapper.getMappingByRole('未知角色');

      expect(mapping).toBeNull();
    });
  });

  describe('getSkillsForRole', () => {
    it('should return skills for known role', () => {
      const skills = mapper.getSkillsForRole('测试工程师');

      expect(skills.essential).toContain('obra/superpowers@test-driven-development');
      expect(skills.essential).toContain('obra/superpowers@systematic-debugging');
      expect(skills.common).toContain('obra/superpowers@brainstorming');
    });

    it('should return common skills for unknown role', () => {
      const skills = mapper.getSkillsForRole('未知角色');

      expect(skills.essential).toEqual([]);
      expect(skills.optional).toEqual([]);
      expect(skills.common).toHaveLength(2);
    });
  });

  describe('addMapping', () => {
    it('should add custom mapping', () => {
      mapper.addMapping({
        roleId: 'data-scientist',
        roleName: '数据科学家',
        keywords: ['data', 'ml', 'ai', 'python'],
        essentialSkills: ['obra/superpowers@brainstorming'],
        optionalSkills: [],
      });

      const mapping = mapper.getMappingByRole('数据科学家');

      expect(mapping).toBeDefined();
      expect(mapping?.roleId).toBe('data-scientist');
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings', () => {
      const mappings = mapper.getAllMappings();

      expect(mappings.length).toBeGreaterThanOrEqual(6);
      expect(mappings.find(m => m.roleId === 'frontend-developer')).toBeDefined();
      expect(mappings.find(m => m.roleId === 'backend-developer')).toBeDefined();
      expect(mappings.find(m => m.roleId === 'product-manager')).toBeDefined();
    });
  });

  describe('keyword-based inference', () => {
    // 测试关键词匹配（不使用 AI）
    it('should match frontend keywords', () => {
      const skills = mapper.getSkillsForRole('前端开发工程师');
      expect(skills.essential.length).toBeGreaterThan(0);
    });

    it('should match backend keywords', () => {
      const skills = mapper.getSkillsForRole('后端开发工程师');
      expect(skills.essential.length).toBeGreaterThan(0);
    });

    it('should match product manager keywords', () => {
      const skills = mapper.getSkillsForRole('产品经理');
      expect(skills.essential.length).toBeGreaterThan(0);
    });

    it('should match test engineer keywords', () => {
      const skills = mapper.getSkillsForRole('测试工程师');
      expect(skills.essential.length).toBeGreaterThan(0);
    });
  });
});
