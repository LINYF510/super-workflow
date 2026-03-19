/**
 * SQLite 数据库管理
 * 
 * 提供数据库连接、初始化和迁移功能
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { runMigrations } from './migrations.js';

/** 数据库配置 */
export interface DatabaseConfig {
  /** 数据库文件路径 */
  path: string;
  /** 是否启用 WAL 模式 */
  walMode?: boolean;
  /** 是否启用外键约束 */
  foreignKeys?: boolean;
  /** 是否自动迁移 */
  autoMigrate?: boolean;
}

/** 默认数据库路径 */
const DEFAULT_DB_PATH = '.iflow/state.db';

/** 数据库实例 */
let db: Database.Database | null = null;

/**
 * 获取数据库实例
 * 如果数据库未初始化，则自动初始化
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * 初始化数据库
 * @param config 数据库配置
 */
export function initDatabase(config?: Partial<DatabaseConfig>): Database.Database {
  const dbPath = config?.path ?? getDefaultDbPath();
  
  // 确保目录存在
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }
  
  // 创建数据库连接
  db = new Database(dbPath);
  
  // 配置 WAL 模式（提高并发性能）
  if (config?.walMode !== false) {
    db.pragma('journal_mode = WAL');
  }
  
  // 启用外键约束
  if (config?.foreignKeys !== false) {
    db.pragma('foreign_keys = ON');
  }
  
  // 自动迁移
  if (config?.autoMigrate !== false) {
    runMigrations(db);
  }
  
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 获取默认数据库路径
 */
function getDefaultDbPath(): string {
  // 在项目根目录下创建 .iflow/state.db
  return join(process.cwd(), DEFAULT_DB_PATH);
}

/**
 * 执行事务
 * @param fn 事务函数
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * 执行查询并返回所有结果
 */
export function queryAll<T = unknown>(sql: string, params: unknown[] = []): T[] {
  const database = getDatabase();
  return database.prepare(sql).all(...params) as T[];
}

/**
 * 执行查询并返回第一条结果
 */
export function queryOne<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
  const database = getDatabase();
  return database.prepare(sql).get(...params) as T | undefined;
}

/**
 * 执行插入/更新/删除操作
 * @returns 受影响的行数
 */
export function execute(sql: string, params: unknown[] = []): number {
  const database = getDatabase();
  const result = database.prepare(sql).run(...params);
  return result.changes;
}

/**
 * 执行插入操作并返回最后插入的 ID
 */
export function insert(sql: string, params: unknown[] = []): number {
  const database = getDatabase();
  const result = database.prepare(sql).run(...params);
  return result.lastInsertRowid as number;
}

/**
 * 批量执行语句
 */
export function batchExecute(statements: Array<{ sql: string; params?: unknown[] }>): void {
  const database = getDatabase();
  const insertMany = database.transaction((items: typeof statements) => {
    for (const { sql, params = [] } of items) {
      database.prepare(sql).run(...params);
    }
  });
  insertMany(statements);
}
