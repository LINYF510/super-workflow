/**
 * 核心引擎入口
 * 
 * 统一导出核心引擎模块
 */

// Orchestrator
export { Orchestrator } from './orchestrator/index.js';
export type { OrchestratorConfig, AnalysisResult, RoleDefinition, OrgStructure } from './orchestrator/index.js';

// Agent Manager
export { AgentManager } from './agent/manager.js';

// Message Bus
export { MessageBus } from './communication/bus.js';
