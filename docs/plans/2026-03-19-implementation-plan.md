# Super Workflow 实施计划

**版本**: 2.0.0  
**日期**: 2026-03-19  
**状态**: 实施中

---

## 一、技术决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 技术栈 | Node.js + TypeScript | 与前端 React 技术栈统一 |
| 数据库 | SQLite (better-sqlite3) | 嵌入式，无需额外部署 |
| CLI 框架 | Commander.js | 成熟稳定，社区活跃 |
| 测试框架 | Vitest | 快速，原生 ESM 支持 |
| AI 能力 | iFlow SDK | 提供 AI 推理、工具调用等核心能力 |

### 运行时要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | >= 22.0 | iFlow SDK 要求 |
| iFlow CLI | >= 0.2.24 | 提供 AI 能力 |

---

## 二、目录结构

```
super-workflow/
├── src/
│   ├── cli/                    # CLI 命令入口
│   │   ├── index.ts            # CLI 主入口
│   │   ├── commands/           # 各命令实现
│   │   │   ├── init.ts
│   │   │   ├── start.ts
│   │   │   ├── agents.ts
│   │   │   ├── chat.ts
│   │   │   ├── assign.ts
│   │   │   └── tasks.ts
│   │   └── interactive.ts      # 交互模式
│   │
│   ├── core/                   # 核心引擎
│   │   ├── orchestrator/       # 主智能体
│   │   │   ├── index.ts
│   │   │   ├── analyzer.ts     # 需求分析
│   │   │   └── dispatcher.ts   # 任务分配
│   │   ├── agent/              # 智能体管理
│   │   │   ├── tree.ts         # AgentTree 实现
│   │   │   ├── manager.ts      # CRUD 操作
│   │   │   ├── generator.ts    # 动态生成
│   │   │   └── registry.ts
│   │   ├── workflow/           # 工作流引擎
│   │   │   ├── engine.ts       # 执行引擎
│   │   │   ├── parser.ts       # YAML 解析
│   │   │   ├── executor.ts     # 步骤执行
│   │   │   └── state-machine.ts
│   │   └── communication/      # 通信机制
│   │       ├── bus.ts          # 消息总线
│   │       └── types.ts
│   │
│   ├── services/               # 服务层
│   │   ├── iflow/              # iFlow SDK 集成 ⭐ 新增
│   │   │   ├── client.ts       # AICapabilityProvider
│   │   │   ├── prompts.ts      # 提示词模板
│   │   │   └── types.ts
│   │   ├── storage/            # 数据持久化
│   │   │   ├── database.ts     # SQLite
│   │   │   ├── migrations.ts
│   │   │   └── repositories/
│   │   ├── skill/              # Skill 服务
│   │   │   ├── finder.ts       # 发现
│   │   │   ├── installer.ts    # 安装
│   │   │   ├── mapper.ts       # 职位映射
│   │   │   └── registry.ts
│   │   └── server/             # 可选服务模式
│   │       ├── api.ts
│   │       └── websocket.ts
│   │
│   └── types/                  # 类型定义
│       ├── agent.ts
│       ├── task.ts
│       ├── workflow.ts
│       ├── message.ts
│       ├── skill.ts
│       ├── iflow.ts            # ⭐ 新增
│       └── index.ts
│
├── tests/                      # 测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
└── docs/
    └── plans/
```

---

## 三、实施阶段

### Phase 0: 项目初始化

**状态**: 部分完成，需更新

**已完成任务**:
- [x] `package.json` - 依赖配置（⚠️ 需更新 Node.js 版本要求）
- [x] `tsconfig.json` - TypeScript 配置
- [x] `.gitignore` - Git 忽略规则
- [x] `src/types/*.ts` - 核心类型定义（6 个文件）
- [x] 设计文档 v2.0.0
- [x] 编译产物 `dist/`

**待更新任务**:
- [ ] 更新 `package.json` 的 `engines.node` 为 `>=22.0.0`
- [ ] 添加 `@iflow-ai/iflow-cli-sdk` 依赖

**当前文件结构**:
```
src/
├── cli/
│   ├── index.ts ✅
│   └── commands/
│       ├── init.ts ✅
│       ├── start.ts ✅
│       ├── agents.ts ✅
│       ├── chat.ts ✅
│       ├── assign.ts ✅
│       └── tasks.ts ✅
├── core/
│   ├── index.ts ✅
│   ├── agent/
│   ├── communication/
│   ├── orchestrator/
│   └── workflow/
├── services/
│   ├── skill/
│   └── storage/
│       ├── database.ts ✅
│       ├── migrations.ts ✅
│       └── repositories/
└── types/
    ├── agent.ts ✅
    ├── task.ts ✅
    ├── workflow.ts ✅
    ├── message.ts ✅
    ├── skill.ts ✅
    └── index.ts ✅

缺失目录:
src/services/iflow/    ❌ Phase 1 新增
src/core/agent/tree.ts ❌ Phase 3 重构
```

**验证方式**:
```bash
npm install
npx tsc --noEmit
```

---

### Phase 1: iFlow SDK 集成 ⭐ 新增

**目标**: 实现 AI 能力适配层

**前置条件**:
```bash
# 安装 iFlow CLI
npm install -g @iflow-ai/iflow-cli

# 安装 iFlow SDK
npm install @iflow-ai/iflow-cli-sdk
```

**文件清单**:

| 文件 | 说明 |
|------|------|
| `src/services/iflow/client.ts` | AICapabilityProvider 实现 |
| `src/services/iflow/prompts.ts` | 分析、执行提示词模板 |
| `src/services/iflow/types.ts` | iFlow 相关类型定义 |
| `src/types/iflow.ts` | 导出类型 |

**核心实现**:

```typescript
// src/services/iflow/client.ts
export class AICapabilityProvider {
  // AI 分析需求，生成角色定义
  async analyzeRequirements(description: string): Promise<RoleDefinition[]>;
  
  // 执行任务（带角色上下文）
  async executeWithRole(role: RoleDefinition, task: string): Promise<string>;
  
  // 调用 Skill
  async invokeSkill(skillName: string, input: Record<string, unknown>): Promise<SkillOutput>;
  
  // 收集响应
  private async collectResponse(): Promise<string>;
}
```

**验证方式**:
```bash
# 配置 iFlow 认证
iflow

# 测试 AI 能力
npm test -- --grep "AICapabilityProvider"
```

---

### Phase 2: 存储层

**目标**: 实现数据持久化

**文件清单**:

| 文件 | 说明 |
|------|------|
| `src/services/storage/database.ts` | SQLite 连接管理 |
| `src/services/storage/migrations.ts` | 表结构迁移 |
| `src/services/storage/repositories/base.ts` | 基础 Repository |
| `src/services/storage/repositories/agent-repo.ts` | 智能体仓库 |
| `src/services/storage/repositories/task-repo.ts` | 任务仓库 |
| `src/services/storage/repositories/message-repo.ts` | 消息仓库 |
| `src/services/storage/repositories/checkpoint-repo.ts` | 检查点仓库 |
| `src/services/storage/index.ts` | 存储层入口 |

**数据库表结构**:

```sql
-- 智能体表（增加层级和角色上下文字段）
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    parent_id TEXT,
    depth INTEGER DEFAULT 0,        -- ⭐ 层级深度
    status TEXT DEFAULT 'idle',
    workflow_path TEXT,
    skills TEXT,                    -- JSON array
    responsibilities TEXT,          -- JSON array
    system_prompt TEXT,             -- ⭐ AI 角色上下文
    metadata TEXT,                  -- JSON
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (parent_id) REFERENCES agents(id)
);

-- 创建索引
CREATE INDEX idx_agents_parent ON agents(parent_id);
CREATE INDEX idx_agents_depth ON agents(depth);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    parent_task_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    input TEXT,                     -- JSON
    output TEXT,                    -- JSON
    error TEXT,
    created_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

-- 消息表
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    content TEXT,                   -- JSON
    requires_response INTEGER DEFAULT 0,
    task_id TEXT,
    reply_to TEXT,
    created_at TEXT,
    read_at TEXT
);

-- 检查点表
CREATE TABLE checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    step_index INTEGER,
    state TEXT,                     -- JSON
    created_at TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Skill 缓存表
CREATE TABLE skill_cache (
    query TEXT PRIMARY KEY,
    results TEXT,                   -- JSON
    cached_at TEXT,
    expires_at TEXT
);

-- 创建索引
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_messages_to ON messages(to_agent);
CREATE INDEX idx_messages_from ON messages(from_agent);
```

**验证方式**:
```bash
npm run build
node dist/services/storage/migrations.js
```

---

### Phase 3: 核心引擎

**目标**: 实现核心业务逻辑

#### 3.1 Orchestrator (主智能体)

| 文件 | 说明 |
|------|------|
| `src/core/orchestrator/index.ts` | 主入口 |
| `src/core/orchestrator/analyzer.ts` | 需求分析（调用 iFlow） |
| `src/core/orchestrator/dispatcher.ts` | 任务分配 |

**职责**:
- 调用 iFlow SDK 分析用户需求
- 获取 AI 生成的角色定义
- 构建 AgentTree
- 分配任务给子智能体

#### 3.2 AgentTree (智能体树) ⭐ 重构

| 文件 | 说明 |
|------|------|
| `src/core/agent/tree.ts` | AgentTree 实现 |
| `src/core/agent/manager.ts` | CRUD 操作 |
| `src/core/agent/generator.ts` | 动态生成智能体 |
| `src/core/agent/registry.ts` | 注册表 |

**核心实现**:

```typescript
// src/core/agent/tree.ts
interface AgentNode {
  id: string;
  role: RoleDefinition;
  parentId: string | null;
  children: AgentNode[];
  status: 'idle' | 'busy' | 'waiting';
  currentTask: Task | null;
}

export class AgentTree {
  private root: AgentNode;
  private nodeMap: Map<string, AgentNode>;
  private maxDepth: number = 5;
  
  // 创建智能体节点
  createAgent(role: RoleDefinition, parentId: string | null): AgentNode;
  
  // 递归创建子树
  createSubtree(parentId: string, roles: RoleDefinition[]): void;
  
  // 查找智能体
  findAgent(id: string): AgentNode | null;
  
  // 获取层级
  getDepth(agentId: string): number;
  
  // 获取所有下属
  getDescendants(agentId: string): AgentNode[];
  
  // 获取上级链
  getAncestors(agentId: string): AgentNode[];
}
```

#### 3.3 WorkflowEngine (工作流引擎)

| 文件 | 说明 |
|------|------|
| `src/core/workflow/parser.ts` | YAML 解析 |
| `src/core/workflow/engine.ts` | 执行引擎 |
| `src/core/workflow/executor.ts` | 步骤执行器（调用 iFlow） |
| `src/core/workflow/state-machine.ts` | 状态管理 |

**Executor 集成 iFlow**:

```typescript
// src/core/workflow/executor.ts
export class WorkflowExecutor {
  private aiProvider: AICapabilityProvider;  // ⭐ 注入
  private agentTree: AgentTree;
  private messageBus: MessageBus;
  
  async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepOutput> {
    switch (step.action) {
      case 'invoke_skill':
        return this.executeInvokeSkill(step, context);  // 调用 iFlow
      
      case 'create_agents':
        return this.executeCreateAgents(step, context);  // 创建子智能体
      
      // ...
    }
  }
}
```

#### 3.4 Communication (通信)

| 文件 | 说明 |
|------|------|
| `src/core/communication/bus.ts` | 消息总线 |
| `src/core/communication/types.ts` | 消息类型 |

**验证方式**:
```bash
npm test
```

---

### Phase 4: CLI 界面

**目标**: 实现用户交互界面

**文件清单**:

| 文件 | 命令 | 说明 |
|------|------|------|
| `src/cli/index.ts` | - | CLI 入口 |
| `src/cli/commands/init.ts` | `sw init` | 初始化项目 |
| `src/cli/commands/start.ts` | `sw start` | 启动主智能体 |
| `src/cli/commands/agents.ts` | `sw agents` | 查看智能体树 |
| `src/cli/commands/chat.ts` | `sw chat` | 与智能体交互 |
| `src/cli/commands/assign.ts` | `sw assign` | 分配任务 |
| `src/cli/commands/tasks.ts` | `sw tasks` | 查看任务 |
| `src/cli/interactive.ts` | - | 交互模式 REPL |

**命令设计**:

```bash
# 项目管理
sw init <project-name>              # 初始化新项目
sw start [--project <name>]         # 启动主智能体

# 智能体管理
sw agents [--tree] [--status]       # 查看智能体树
sw chat <agent-id>                  # 与智能体交互

# 任务管理
sw assign <agent-id> "任务"         # 分配任务
sw tasks [--agent] [--status]       # 查看任务

# 导出
sw export [--format]                # 导出项目配置
```

**验证方式**:
```bash
npm run build
npm link
sw init test-project
```

---

### Phase 5: Skill 服务

**目标**: 实现 Skill 自动发现与安装

**文件清单**:

| 文件 | 说明 |
|------|------|
| `src/services/skill/finder.ts` | 搜索 skills |
| `src/services/skill/installer.ts` | 安装 skills |
| `src/services/skill/mapper.ts` | 职位→技能映射 |
| `src/services/skill/registry.ts` | 管理已安装 skills |

**Skill 映射配置**:

```yaml
skill_mapping:
  前端开发:
    keywords: [react, vue, frontend, css, typescript]
    essential_skills:
      - vercel-labs/agent-skills@react-best-practices
    optional_skills:
      - vercel-labs/agent-skills@tailwind

  后端开发:
    keywords: [backend, api, database, server]
    essential_skills:
      - vercel-labs/agent-skills@api-design

  common_skills:
    - obra/superpowers@brainstorming
```

**质量过滤条件**:
- 安装量 >= 100
- 来源可信（vercel-labs, obra, anthropic）
- 匹配度 >= 0.7

**验证方式**:
```bash
npm test -- --grep "SkillService"
```

---

### Phase 6: 测试与文档

**目标**: 确保质量和可维护性

**测试文件**:

| 文件 | 说明 |
|------|------|
| `tests/unit/iflow-client.test.ts` | iFlow SDK 集成测试 |
| `tests/unit/agent-tree.test.ts` | AgentTree 单元测试 |
| `tests/unit/workflow-engine.test.ts` | 工作流引擎单元测试 |
| `tests/unit/storage.test.ts` | 存储层单元测试 |
| `tests/integration/full-workflow.test.ts` | 完整工作流集成测试 |
| `tests/e2e/cli-commands.test.ts` | CLI 命令端到端测试 |

**测试覆盖率目标**: 80%

**性能目标**:
- CLI 启动时间 < 1s
- 数据库查询 < 100ms
- AI 响应时间 < 30s

---

## 四、模块依赖关系

```
┌─────────────────────────────────────────────────────────┐
│                       CLI (Phase 4)                      │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Orchestrator │  │   Agent      │  │   Workflow   │
│  (Phase 3)   │  │   Tree       │  │   Engine     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│     Storage      │         │   iFlow SDK      │
│    (Phase 2)     │         │   (Phase 1)      │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         └─────────────┬──────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │      Types       │
              │    (Phase 0)     │
              └──────────────────┘
```

**依赖规则**:
1. Phase 0 无依赖
2. Phase 1 依赖 Phase 0
3. Phase 2 依赖 Phase 0
4. Phase 3 依赖 Phase 1 + Phase 2
5. Phase 4、5 依赖 Phase 3
6. Phase 6 依赖所有前置阶段

---

## 五、工作量估算

| 阶段 | 预估代码量 | 说明 |
|------|-----------|------|
| Phase 0 | 已完成 | 项目初始化 |
| Phase 1 | ~300 行 | iFlow SDK 集成 |
| Phase 2 | ~300 行 | SQLite 存储 |
| Phase 3 | ~1000 行 | 核心引擎 |
| Phase 4 | ~200 行 | CLI 界面 |
| Phase 5 | ~300 行 | Skill 服务 |
| Phase 6 | ~200 行 | 测试 |
| **总计** | **~2300 行** | |

---

## 六、风险与缓解

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| iFlow CLI 未安装 | 高 | 启动时检查，提示安装 |
| iFlow 认证失败 | 高 | 友好错误提示，引导登录 |
| AI 响应超时 | 中 | 可配置超时时间，重试机制 |
| SQLite 并发写入冲突 | 中 | 使用 WAL 模式，写入队列 |
| 智能体无限递归 | 高 | 最大深度限制 5 层 |
| Skill 安装失败 | 中 | 网络重试机制，本地缓存 |
| YAML 解析错误 | 低 | Schema 验证，友好错误提示 |

---

## 七、下一步

1. ✅ Phase 0 已完成
2. 🔄 开始 Phase 1: 实现 iFlow SDK 集成

---

## 附录：参考文档

- [设计文档 v2.0.0](../superpowers/specs/2026-03-18-dynamic-workflow-system-design.md)
- [iFlow CLI 文档](https://platform.iflow.cn/cli/)
- [iFlow SDK TypeScript](https://platform.iflow.cn/cli/sdk/sdk-typescript)
- [swarm-ide](https://github.com/chmod777john/swarm-ide)
- [skills.sh](https://skills.sh/)