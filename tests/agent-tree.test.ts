/**
 * AgentTree Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AgentTree } from '../src/core/agent/tree.js';
import { initDatabase, closeDatabase } from '../src/services/storage/index.js';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';

describe('AgentTree', () => {
  let tree: AgentTree;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sw-tree-test-'));
    initDatabase({ path: join(tempDir, 'test.db') });
    tree = new AgentTree();
  });

  afterEach(() => {
    closeDatabase();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createAgent', () => {
    it('should create root agent with depth 0', () => {
      const node = tree.createAgent({
        name: 'Root Agent',
        role: 'orchestrator',
      });

      expect(node.agent.depth).toBe(0);
      expect(node.agent.parentId).toBeNull();
    });

    it('should create child with correct depth', () => {
      const root = tree.createAgent({ name: 'Root', role: 'lead' });
      const child = tree.createAgent({
        name: 'Child',
        role: 'dev',
        parentId: root.agent.id,
      });

      expect(child.agent.depth).toBe(1);
      expect(child.agent.parentId).toBe(root.agent.id);
    });

    it('should throw error when exceeding max depth', () => {
      // 创建深度链到最大深度 - 1
      let current = tree.createAgent({ name: 'L0', role: 'test' });
      for (let i = 1; i <= 4; i++) {
        current = tree.createAgent({
          name: `L${i}`,
          role: 'test',
          parentId: current.agent.id,
        });
      }
      // current.depth = 4, can still create depth 5 child
      
      // 创建深度为 5 的子节点
      const depth5Node = tree.createAgent({
        name: 'L5',
        role: 'test',
        parentId: current.agent.id,
      });
      expect(depth5Node.agent.depth).toBe(5);
      
      // 尝试创建深度为 6 的子节点应该失败
      expect(() => {
        tree.createAgent({
          name: 'Too Deep',
          role: 'test',
          parentId: depth5Node.agent.id,
        });
      }).toThrow('Maximum agent depth');
    });
  });

  describe('findAgent', () => {
    it('should find agent by id', () => {
      const node = tree.createAgent({ name: 'Test', role: 'test' });
      
      const found = tree.findAgent(node.agent.id);
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test');
    });

    it('should return null for non-existent id', () => {
      const found = tree.findAgent('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants', () => {
      const root = tree.createAgent({ name: 'Root', role: 'lead' });
      const child1 = tree.createAgent({ name: 'Child1', role: 'dev', parentId: root.agent.id });
      const child2 = tree.createAgent({ name: 'Child2', role: 'dev', parentId: root.agent.id });
      tree.createAgent({ name: 'Grandchild', role: 'dev', parentId: child1.agent.id });
      tree.createAgent({ name: 'Other', role: 'dev' }); // separate tree

      const descendants = tree.getDescendants(root.agent.id);

      expect(descendants).toHaveLength(3);
      expect(descendants.map(d => d.agent.name)).toContain('Child1');
      expect(descendants.map(d => d.agent.name)).toContain('Child2');
      expect(descendants.map(d => d.agent.name)).toContain('Grandchild');
      expect(descendants.map(d => d.agent.name)).not.toContain('Other');
    });
  });

  describe('getAncestors', () => {
    it('should return all ancestors', () => {
      const l0 = tree.createAgent({ name: 'L0', role: 'lead' });
      const l1 = tree.createAgent({ name: 'L1', role: 'dev', parentId: l0.agent.id });
      const l2 = tree.createAgent({ name: 'L2', role: 'dev', parentId: l1.agent.id });
      const l3 = tree.createAgent({ name: 'L3', role: 'dev', parentId: l2.agent.id });

      const ancestors = tree.getAncestors(l3.agent.id);

      expect(ancestors).toHaveLength(3);
      expect(ancestors[0]?.agent.name).toBe('L2');
      expect(ancestors[1]?.agent.name).toBe('L1');
      expect(ancestors[2]?.agent.name).toBe('L0');
    });

    it('should return empty array for root agent', () => {
      const root = tree.createAgent({ name: 'Root', role: 'lead' });

      const ancestors = tree.getAncestors(root.agent.id);

      expect(ancestors).toHaveLength(0);
    });
  });

  describe('getChildren', () => {
    it('should return direct children only', () => {
      const root = tree.createAgent({ name: 'Root', role: 'lead' });
      const child1 = tree.createAgent({ name: 'Child1', role: 'dev', parentId: root.agent.id });
      const child2 = tree.createAgent({ name: 'Child2', role: 'dev', parentId: root.agent.id });
      tree.createAgent({ name: 'Grandchild', role: 'dev', parentId: child1.agent.id });

      const children = tree.getChildren(root.agent.id);

      expect(children).toHaveLength(2);
      expect(children.map(c => c.agent.name)).toContain('Child1');
      expect(children.map(c => c.agent.name)).toContain('Child2');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const root1 = tree.createAgent({ name: 'Root1', role: 'lead' });
      tree.createAgent({ name: 'Root2', role: 'lead' });
      const child = tree.createAgent({ name: 'Child', role: 'dev', parentId: root1.agent.id });
      tree.createAgent({ name: 'Grandchild', role: 'dev', parentId: child.agent.id });

      const stats = tree.getStats();

      expect(stats.totalAgents).toBe(4);
      expect(stats.maxDepth).toBe(2);
      expect(stats.byDepth[0]).toBe(2); // 2 roots
      expect(stats.byDepth[1]).toBe(1); // 1 child
      expect(stats.byDepth[2]).toBe(1); // 1 grandchild
    });
  });
});
