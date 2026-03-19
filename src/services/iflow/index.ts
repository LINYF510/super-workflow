/**
 * iFlow Service
 *
 * AI 能力服务入口
 */

export { AICapabilityProvider, getAICapabilityProvider, resetAICapabilityProvider } from './client.js';
export type {
  RoleDefinition,
  AgentContext,
  SkillOutput,
  AICapabilityConfig,
  AnalysisResult,
  ExecutionOptions,
  ConversationTurn,
} from './types.js';
export { MessageTypes } from './types.js';
export {
  buildAnalysisPrompt,
  buildRoleExecutionPrompt,
  buildSkillInvocationPrompt,
  buildTaskDecompositionPrompt,
  buildAggregationPrompt,
  buildErrorHandlingPrompt,
} from './prompts.js';
