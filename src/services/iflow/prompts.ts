/**
 * iFlow Prompts
 *
 * AI 提示词模板
 */

import type { RoleDefinition } from './types.js';

/**
 * 构建需求分析提示词
 */
export function buildAnalysisPrompt(projectDescription: string): string {
  return `分析以下项目需求，生成所需的团队角色配置。

项目描述：
${projectDescription}

请以 JSON 格式输出角色定义：
[
  {
    "name": "角色名称",
    "description": "角色描述",
    "responsibilities": ["职责1", "职责2"],
    "skills": ["技能1", "技能2"],
    "systemPrompt": "详细的系统提示，定义这个角色应该如何工作",
    "parent": "上级角色名称（如果有）",
    "children": ["下级角色名称（如果需要）"]
  }
]

规则：
1. 角色应该按照真实组织架构设计
2. 每个角色应该有明确的职责边界
3. 嵌套层级不超过5层
4. 只输出 JSON，不要其他内容`;
}

/**
 * 构建角色执行提示词
 */
export function buildRoleExecutionPrompt(
  role: RoleDefinition,
  task: string,
  contextSummary?: string
): string {
  const contextSection = contextSummary
    ? `\n上下文信息：\n${contextSummary}\n`
    : '';

  const skills = role.skills ?? role.requiredSkills ?? [];

  return `你现在扮演: ${role.name}

角色描述: ${role.description}

职责:
${role.responsibilities.map(r => `- ${r}`).join('\n')}

专业技能: ${skills.join(', ')}
${contextSection}
任务: ${task}

请按照你的角色职责来执行这个任务。如果任务超出你的职责范围，请说明原因。`;
}

/**
 * 构建 Skill 调用提示词
 */
export function buildSkillInvocationPrompt(
  skillName: string,
  input: Record<string, unknown>
): string {
  return `请使用 ${skillName} skill 执行以下任务：

输入参数：
${JSON.stringify(input, null, 2)}

请按照 skill 的规范执行任务，并返回结构化的输出结果。`;
}

/**
 * 构建任务分解提示词
 */
export function buildTaskDecompositionPrompt(
  task: string,
  availableRoles: string[]
): string {
  return `请分析以下任务，并决定如何分配：

任务: ${task}

可用的角色:
${availableRoles.map(r => `- ${r}`).join('\n')}

请输出 JSON 格式的分配方案：
{
  "subTasks": [
    {
      "role": "角色名称",
      "task": "子任务描述",
      "priority": "high|medium|low"
    }
  ],
  "needsSubAgents": true|false,
  "reasoning": "分配理由"
}`;
}

/**
 * 构建结果聚合提示词
 */
export function buildAggregationPrompt(
  originalTask: string,
  results: Array<{ role: string; output: string }>
): string {
  return `请汇总以下子任务的执行结果：

原始任务: ${originalTask}

执行结果：
${results.map((r, i) => `
${i + 1}. ${r.role}:
   ${r.output}
`).join('\n')}

请输出：
1. 任务完成总结
2. 关键成果
3. 遗留问题（如果有）
4. 后续建议`;
}

/**
 * 构建错误处理提示词
 */
export function buildErrorHandlingPrompt(
  task: string,
  error: string,
  retryCount: number
): string {
  return `任务执行失败，请分析原因并提供建议：

任务: ${task}

错误信息:
${error}

已重试次数: ${retryCount}

请输出：
1. 错误原因分析
2. 是否应该重试
3. 如果重试，需要调整什么
4. 如果不重试，替代方案是什么`;
}
