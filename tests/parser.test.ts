/**
 * Workflow Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseWorkflow } from '../src/core/workflow/parser.js';

describe('parseWorkflow', () => {
  it('should parse a simple workflow', () => {
    const yaml = `
id: test-workflow
name: Test Workflow
version: 1.0.0
description: A test workflow
triggers:
  - task_assigned
steps:
  - id: step1
    name: First Step
    action: invoke_skill
    skill: test-skill
`;
    const result = parseWorkflow(yaml);
    
    expect(result.id).toBe('test-workflow');
    expect(result.name).toBe('Test Workflow');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('A test workflow');
    expect(result.triggers).toContain('task_assigned');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.id).toBe('step1');
  });

  it('should throw error when id is missing', () => {
    const yaml = `
name: Test Workflow
steps:
  - id: step1
    action: invoke_skill
`;
    expect(() => parseWorkflow(yaml)).toThrow('Workflow must have an "id" field');
  });

  it('should throw error when name is missing', () => {
    const yaml = `
id: test-workflow
steps:
  - id: step1
    action: invoke_skill
`;
    expect(() => parseWorkflow(yaml)).toThrow('Workflow must have a "name" field');
  });

  it('should throw error when steps is missing', () => {
    const yaml = `
id: test-workflow
name: Test Workflow
`;
    expect(() => parseWorkflow(yaml)).toThrow('Workflow must have a "steps" array');
  });

  it('should detect duplicate step ids', () => {
    const yaml = `
id: test-workflow
name: Test Workflow
steps:
  - id: step1
    action: invoke_skill
  - id: step1
    action: invoke_skill
`;
    expect(() => parseWorkflow(yaml)).toThrow('Duplicate step id: step1');
  });

  it('should detect invalid step references', () => {
    const yaml = `
id: test-workflow
name: Test Workflow
steps:
  - id: step1
    action: invoke_skill
    next: non-existent-step
`;
    expect(() => parseWorkflow(yaml)).toThrow('references non-existent next step');
  });

  it('should use default values for optional fields', () => {
    const yaml = `
id: test-workflow
name: Test Workflow
steps:
  - id: step1
    action: invoke_skill
`;
    const result = parseWorkflow(yaml);
    
    expect(result.version).toBe('1.0.0');
    expect(result.triggers).toEqual([]);
    expect(result.inputs).toEqual([]);
    expect(result.outputs).toEqual([]);
    expect(result.errorHandling.retryCount).toBe(3);
    expect(result.errorHandling.fallback).toBe('report_to_parent');
  });
});
