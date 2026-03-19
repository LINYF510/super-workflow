/**
 * 存储层入口
 * 
 * 统一导出存储层所有模块
 */

// Database
import {
  getDatabase,
  initDatabase,
  closeDatabase,
  transaction,
  queryAll,
  queryOne,
  execute,
  insert,
  batchExecute,
} from './database.js';

export type { DatabaseConfig } from './database.js';

export {
  getDatabase,
  initDatabase,
  closeDatabase,
  transaction,
  queryAll,
  queryOne,
  execute,
  insert,
  batchExecute,
};

// Migrations
import { runMigrations, resetDatabase } from './migrations.js';
export { runMigrations, resetDatabase };

// Repositories
import { BaseRepository } from './repositories/base.js';
import { AgentRepository } from './repositories/agent-repo.js';
import { TaskRepository } from './repositories/task-repo.js';
import { MessageRepository } from './repositories/message-repo.js';
import { CheckpointRepository } from './repositories/checkpoint-repo.js';

export { BaseRepository, AgentRepository, TaskRepository, MessageRepository, CheckpointRepository };
export type { BaseEntity, CreateInput, FindOptions } from './repositories/base.js';
export type { CreateCheckpointInput } from './repositories/checkpoint-repo.js';

/**
 * 创建所有 Repository 实例
 */
export function createRepositories() {
  return {
    agents: new AgentRepository(),
    tasks: new TaskRepository(),
    messages: new MessageRepository(),
    checkpoints: new CheckpointRepository(),
  };
}

/**
 * 存储层初始化
 * 初始化数据库并返回 Repository 实例
 */
export function initStorage(config?: Parameters<typeof initDatabase>[0]) {
  initDatabase(config);
  return createRepositories();
}
