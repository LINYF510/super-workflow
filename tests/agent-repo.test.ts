/**
 * AgentRepository Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentRepository } from '../src/services/storage/repositories/agent-repo.js';
import { initDatabase, closeDatabase } from '../src/services/storage/index.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import type { Agent } from '../src/types/index.js';

describe('AgentRepository', () => {
  let repo: AgentRepository;
  let tempDir: string;

  beforeEach(() => {
    // 创建临时目录
    tempDir = mkdtempSync(join(tmpdir(), 'sw-test-'));
    initDatabase({ path: join(tempDir, 'test.db') });
    repo = new AgentRepository();
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('should create an agent with basic fields', () => {
      const agent = repo.create({
        name: '测试智能体',
        role: 'developer',
      });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('测试智能体');
      expect(agent.role).toBe('developer');
      expect(agent.status).toBe('idle');
      expect(agent.depth).toBe(0);
      expect(agent.systemPrompt).toBeNull();
    });

    it('should create an agent with parent and calculate depth', () => {
      const parent = repo.create({
        name: '父智能体',
        role: 'lead',
      });

      const child = repo.create({
        name: '子智能体',
        role: 'developer',
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
      expect(child.depth).toBe(1);
    });

    it('should create an agent with custom depth', () => {
      const agent = repo.create({
        name: '自定义深度',
        role: 'test',
        depth: 3,
      });

      expect(agent.depth).toBe(3);
    });

    it('should create an agent with systemPrompt', () => {
      const agent = repo.create({
        name: '带提示词的智能体',
        role: 'assistant',
        systemPrompt: '你是一个专业的助手',
      });

      expect(agent.systemPrompt).toBe('你是一个专业的助手');
    });
  });

  describe('findById', () => {
    it('should find an agent by id', () => {
      const created = repo.create({
        name: '查找测试',
        role: 'test',
      });

      const found = repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('查找测试');
    });

    it('should return null for non-existent id', () => {
      const found = repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findByParentId', () => {
    it('should find children of a parent', () => {
      const parent = repo.create({ name: 'Parent', role: 'lead' });
      const child1 = repo.create({ name: 'Child 1', role: 'dev', parentId: parent.id });
      const child2 = repo.create({ name: 'Child 2', role: 'dev', parentId: parent.id });
      repo.create({ name: 'Other', role: 'dev' }); // no parent

      const children = repo.findByParentId(parent.id);

      expect(children).toHaveLength(2);
      expect(children.map(c => c.id)).toContain(child1.id);
      expect(children.map(c => c.id)).toContain(child2.id);
    });
  });

  describe('getAgentTree', () => {
    it('should return all agents when no rootId', () => {
      repo.create({ name: 'Agent 1', role: 'test' });
      repo.create({ name: 'Agent 2', role: 'test' });
      repo.create({ name: 'Agent 3', role: 'test' });

      const tree = repo.getAgentTree();

      expect(tree).toHaveLength(3);
    });

    it('should return subtree when rootId specified', () => {
      const root = repo.create({ name: 'Root', role: 'lead' });
      const child = repo.create({ name: 'Child', role: 'dev', parentId: root.id });
      const grandchild = repo.create({ name: 'Grandchild', role: 'dev', parentId: child.id });
      repo.create({ name: 'Other', role: 'dev' }); // different tree

      const tree = repo.getAgentTree(root.id);

      expect(tree).toHaveLength(3);
      expect(tree.find(a => a.id === root.id)).toBeDefined();
      expect(tree.find(a => a.id === child.id)).toBeDefined();
      expect(tree.find(a => a.id === grandchild.id)).toBeDefined();
      expect(tree.find(a => a.name === 'Other')).toBeUndefined();
    });
  });

  describe('getAgentDepth', () => {
    it('should return 0 for root agent', () => {
      const agent = repo.create({ name: 'Root', role: 'test' });
      expect(repo.getAgentDepth(agent.id)).toBe(0);
    });

    it('should return correct depth for nested agents', () => {
      const l0 = repo.create({ name: 'L0', role: 'test' });
      const l1 = repo.create({ name: 'L1', role: 'test', parentId: l0.id });
      const l2 = repo.create({ name: 'L2', role: 'test', parentId: l1.id });
      const l3 = repo.create({ name: 'L3', role: 'test', parentId: l2.id });

      expect(repo.getAgentDepth(l0.id)).toBe(0);
      expect(repo.getAgentDepth(l1.id)).toBe(1);
      expect(repo.getAgentDepth(l2.id)).toBe(2);
      expect(repo.getAgentDepth(l3.id)).toBe(3);
    });
  });

  describe('canCreateChild', () => {
    it('should allow child creation within depth limit', () => {
      const parent = repo.create({ name: 'Parent', role: 'test' });
      expect(repo.canCreateChild(parent.id)).toBe(true);
    });

    it('should not allow child creation at max depth', () => {
      // 创建深度为 4 的链
      let current = repo.create({ name: 'L0', role: 'test' });
      for (let i = 1; i <= 4; i++) {
        current = repo.create({ name: `L${i}`, role: 'test', parentId: current.id });
      }

      // 深度为 4 的智能体可以创建子节点（子节点深度将为 5）
      expect(current.depth).toBe(4);
      expect(repo.canCreateChild(current.id)).toBe(true);

      // 创建深度为 5 的子节点
      const maxDepthAgent = repo.create({ name: 'L5', role: 'test', parentId: current.id });
      expect(maxDepthAgent.depth).toBe(5);

      // 深度为 5 的智能体不能创建子节点
      expect(repo.canCreateChild(maxDepthAgent.id)).toBe(false);
    });
  });

  describe('setSystemPrompt', () => {
    it('should update systemPrompt', () => {
      const agent = repo.create({ name: 'Test', role: 'test' });
      expect(agent.systemPrompt).toBeNull();

      const updated = repo.setSystemPrompt(agent.id, '新的系统提示词');

      expect(updated?.systemPrompt).toBe('新的系统提示词');
    });
  });

  describe('updateStatus', () => {
    it('should update agent status', () => {
      const agent = repo.create({ name: 'Test', role: 'test' });
      expect(agent.status).toBe('idle');

      const updated = repo.updateStatus(agent.id, 'active');

      expect(updated?.status).toBe('active');
    });
  });

  describe('addSkill / removeSkill', () => {
    it('should add a skill', () => {
      const agent = repo.create({ name: 'Test', role: 'test' });
      expect(agent.skills).toEqual([]);

      const updated = repo.addSkill(agent.id, 'brainstorming');

      expect(updated?.skills).toContain('brainstorming');
    });

    it('should not duplicate skills', () => {
      const agent = repo.create({ name: 'Test', role: 'test', skills: ['skill1'] });
      
      const updated = repo.addSkill(agent.id, 'skill1');

      expect(updated?.skills).toHaveLength(1);
    });

    it('should remove a skill', () => {
      const agent = repo.create({ name: 'Test', role: 'test', skills: ['skill1', 'skill2'] });
      
      const updated = repo.removeSkill(agent.id, 'skill1');

      expect(updated?.skills).toEqual(['skill2']);
    });
  });

  describe('delete', () => {
    it('should delete an agent', () => {
      const agent = repo.create({ name: 'Test', role: 'test' });
      
      const result = repo.delete(agent.id);
      
      expect(result).toBe(true);
      expect(repo.findById(agent.id)).toBeNull();
    });
  });
});
