/**
 * 数据库迁移
 * 
 * 创建和更新数据库表结构
 */

import Database from 'better-sqlite3';

/** 当前迁移版本 */
export const CURRENT_VERSION = 3;

/** 迁移脚本 */
const migrations: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      -- 智能体表
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        parent_id TEXT,
        status TEXT DEFAULT 'idle',
        workflow_path TEXT,
        skills TEXT DEFAULT '[]',
        responsibilities TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES agents(id) ON DELETE SET NULL
      );

      -- 任务表
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        parent_task_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        input TEXT DEFAULT '{}',
        output TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      -- 消息表
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        from_agent TEXT NOT NULL,
        to_agent TEXT NOT NULL,
        type TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        content TEXT DEFAULT '{}',
        requires_response INTEGER DEFAULT 0,
        task_id TEXT,
        reply_to TEXT,
        created_at TEXT NOT NULL,
        read_at TEXT,
        FOREIGN KEY (from_agent) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (to_agent) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
      );

      -- 检查点表
      CREATE TABLE IF NOT EXISTS checkpoints (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        state TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Skill 缓存表
      CREATE TABLE IF NOT EXISTS skill_cache (
        query TEXT PRIMARY KEY,
        results TEXT DEFAULT '[]',
        cached_at TEXT NOT NULL,
        expires_at TEXT
      );

      -- 迁移版本表
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      -- 索引
      CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id);
      CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
      CREATE INDEX IF NOT EXISTS idx_messages_from_agent ON messages(from_agent);
      CREATE INDEX IF NOT EXISTS idx_messages_to_agent ON messages(to_agent);
      CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
      CREATE INDEX IF NOT EXISTS idx_checkpoints_task_id ON checkpoints(task_id);
    `,
  },
  {
    version: 2,
    sql: `
      -- 添加层级深度字段（用于限制最大递归深度为 5 层）
      ALTER TABLE agents ADD COLUMN depth INTEGER DEFAULT 0;
      
      -- 添加 AI 角色上下文字段（动态生成的 system prompt）
      ALTER TABLE agents ADD COLUMN system_prompt TEXT;
      
      -- 添加层级索引
      CREATE INDEX IF NOT EXISTS idx_agents_depth ON agents(depth);
    `,
  },
  {
    version: 3,
    sql: `
      -- 为 tasks 表添加 updated_at 列
      ALTER TABLE tasks ADD COLUMN updated_at TEXT;
      
      -- 为 messages 表添加 updated_at 列
      ALTER TABLE messages ADD COLUMN updated_at TEXT;
    `,
  },
];

/**
 * 获取当前数据库版本
 */
function getCurrentVersion(db: Database.Database): number {
  try {
    const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get() as 
      { version: number | null } | undefined;
    return row?.version ?? 0;
  } catch {
    // 表不存在，返回 0
    return 0;
  }
}

/**
 * 执行数据库迁移
 * @param db 数据库实例
 */
export function runMigrations(db: Database.Database): void {
  const currentVersion = getCurrentVersion(db);
  
  // 按版本顺序执行未应用的迁移
  const pendingMigrations = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);
  
  if (pendingMigrations.length === 0) {
    return;
  }
  
  // 在事务中执行迁移
  const migrate = db.transaction(() => {
    for (const migration of pendingMigrations) {
      // 执行迁移 SQL
      db.exec(migration.sql);
      
      // 记录迁移版本
      db.prepare(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)'
      ).run(migration.version, new Date().toISOString());
    }
  });
  
  migrate();
}

/**
 * 重置数据库（删除所有表）
 * 警告：此操作不可逆
 */
export function resetDatabase(db: Database.Database): void {
  const tables = [
    'schema_version',
    'skill_cache',
    'checkpoints',
    'messages',
    'tasks',
    'agents',
  ];
  
  const reset = db.transaction(() => {
    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  });
  
  reset();
  
  // 重新运行迁移
  runMigrations(db);
}
