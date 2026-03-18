# Super Workflow - 动态工作流系统设计文档

**版本**: 1.0.0  
**日期**: 2026-03-18  
**状态**: 设计阶段

## 概述

Super Workflow 是一个基于 iFlow CLI 的动态工作流系统，参考 swarm-ide 的"液态拓扑"理念，实现按需生成智能体、动态分配任务、自动发现技能的完整工作流管理方案。

### 核心理念

- **按需递归生成** — 主智能体根据需求动态创建子智能体，子智能体可继续创建下级
- **虚拟公司模型** — 模拟真实组织架构，每个智能体对应一个"职位"
- **原子化分解** — 任务分解到可独立执行的粒度
- **自动技能发现** — 根据职位需求自动查找并安装相关 skills

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  CLI 交互   │  │  命令行入口 │  │  Web UI     │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼──────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    核心引擎层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 主智能体管理 │  │ 动态智能体  │  │ Workflow     │       │
│  │ (Orchestrator)│  │ 创建/调度   │  │ 执行引擎     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    服务层（可选）                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 状态管理     │  │ 任务队列    │  │ 智能体通信   │       │
│  │ (SQLite)     │  │ (内存/持久) │  │ (消息总线)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    存储层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ .iflow/      │  │ skills/     │  │ workspaces/  │       │
│  │ (配置/状态)  │  │ (技能库)    │  │ (项目数据)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **Orchestrator** | 主智能体，系统入口点，负责理解需求、分析行业、分配任务 |
| **Agent** | 智能体，对应一个"职位"，拥有职责、workflow 和 skills |
| **Workflow** | 工作流，定义智能体如何执行任务，包含步骤、依赖、skill 调用 |
| **Skill** | 技能单元，原子化能力，通过 `npx skills` 动态获取 |

### 架构模式

采用**混合架构**：CLI 内核 + 可选服务模式。

- **默认模式**：纯文件驱动，所有配置存储在 `.iflow/` 目录
- **服务模式**：可选启动本地服务，增强状态管理和多任务并行能力
- **数据库**：嵌入式 SQLite，无需额外部署

---

## 二、目录结构

```
super-workflow/
├── .iflow/
│   ├── config.yaml              # 系统配置
│   ├── orchestrator.yaml        # 主智能体定义
│   ├── agents/                  # 动态生成的智能体
│   │   └── {agent-id}/
│   │       ├── agent.yaml       # 智能体元数据
│   │       ├── workflow.md      # 工作流文档（人类可读）
│   │       └── workflow.yaml    # 工作流配置（可执行）
│   ├── workflows/               # 通用工作流模板
│   │   └── {template-name}.yaml
│   └── state.db                 # SQLite 状态数据库
│
├── skills/                      # 已安装的 skills
│   ├── brainstorming/
│   ├── requirements-analysis/
│   └── ...
│
├── workspaces/                  # 项目工作空间
│   └── {project-name}/
│       ├── project.yaml         # 项目需求与分析
│       ├── org-structure.md     # 组织架构文档
│       └── outputs/             # 各智能体输出产物
│
├── skills-lock.json             # skills 依赖锁定
└── package.json                 # 项目依赖
```

---

## 三、数据持久化

### 持久化层级

| 层级 | 数据类型 | 存储方式 | 生命周期 |
|------|----------|----------|----------|
| 静态配置 | 智能体定义、workflow、skills | 文件系统 | 永久 |
| 项目数据 | 需求文档、输出产物 | 文件系统 | 永久 |
| 运行时状态 | 任务进度、消息记录、执行历史 | SQLite | 会话级/项目级 |
| 缓存数据 | skill 搜索结果、行业模板缓存 | SQLite + 内存 | 临时 |

### 数据库表结构

```sql
-- 智能体表
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,           -- 职位名称
    parent_id TEXT,      -- 上级智能体
    status TEXT,         -- active/idle/terminated
    workflow_path TEXT,  -- workflow 文件路径
    skills TEXT,         -- JSON array
    created_at TIMESTAMP,
    metadata TEXT        -- JSON
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    parent_task_id TEXT,
    title TEXT,
    description TEXT,
    status TEXT,         -- pending/running/completed/failed
    priority INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result TEXT          -- JSON output
);

-- 消息表
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    from_agent TEXT,
    to_agent TEXT,
    type TEXT,           -- task_assign/status_update/result_report
    content TEXT,
    created_at TIMESTAMP
);

-- 执行检查点
CREATE TABLE checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    step_index INTEGER,
    state TEXT,          -- JSON snapshot
    created_at TIMESTAMP
);

-- Skill 缓存
CREATE TABLE skill_cache (
    query TEXT PRIMARY KEY,
    results TEXT,
    cached_at TIMESTAMP,
    expires_at TIMESTAMP
);
```

---

## 四、动态智能体生成流程

```
用户输入项目需求
        │
        ▼
┌───────────────────┐
│  主智能体分析需求  │
│  - 识别行业领域    │
│  - 分析工作流程    │
│  - 分解职位角色    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  生成组织架构文档  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  创建第一层子智能体│
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │  循环处理  │
    │  每个职位  │
    └─────┬─────┘
          │
    ┌─────┴─────────────────┐
    │                        │
    ▼                        ▼
┌─────────────┐      ┌─────────────┐
│ 查找 skills │      │ 生成        │
│ npx skills  │      │ workflow    │
│ find {role} │      │ 文档+配置   │
└──────┬──────┘      └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│ 自动安装    │      │ 写入        │
│ 缺失 skills │      │ agents/     │
└──────┬──────┘      └──────┬──────┘
       │                    │
       └────────────────────┘
                │
                ▼
        ┌─────────────────┐
        │ 智能体准备就绪  │
        └─────────────────┘
```

### Agent 定义格式

```yaml
# agent.yaml
id: frontend-dev-001
name: 前端开发工程师
role: frontend-developer
parent: tech-lead-001
status: idle

responsibilities:
  - 实现用户界面组件
  - 前端性能优化
  - 与后端 API 对接

skills:
  - brainstorming
  - react-best-practices
  - testing

workflow: .iflow/agents/frontend-dev-001/workflow.yaml

created_at: 2026-03-18T10:00:00Z
```

---

## 五、Workflow 执行引擎

### Workflow YAML 格式

```yaml
id: frontend-dev-workflow
name: 前端开发工作流
version: 1.0.0

triggers:
  - task_assigned
  - parent_request

inputs:
  - name: task_description
    type: string
    required: true
  - name: design_spec
    type: file
    required: false

steps:
  - id: analyze
    name: 分析需求
    skill: requirements-analysis
    action: invoke_skill
    input:
      description: ${inputs.task_description}
    output:
      analyzed_requirements: result.requirements
      sub_tasks: result.sub_tasks
    on_failure: report_to_parent

  - id: check_complexity
    name: 检查任务复杂度
    action: evaluate
    condition: ${analyze.output.sub_tasks.length > 3}
    on_true: create_sub_agents
    on_false: execute_directly

  - id: create_sub_agents
    name: 创建子智能体
    action: create_agents
    agents:
      - role: UI设计师
        tasks: ${analyze.output.sub_tasks.ui}
      - role: 测试工程师
        tasks: ${analyze.output.sub_tasks.testing}
    wait_for_completion: true
    next: merge_results

  - id: execute_directly
    name: 直接开发
    skill: frontend-development
    action: invoke_skill
    input:
      requirements: ${analyze.output.analyzed_requirements}
    next: report_completion

  - id: merge_results
    name: 合并子任务结果
    action: aggregate
    sources: ${create_sub_agents.child_outputs}
    next: report_completion

  - id: report_completion
    name: 汇报完成
    action: send_message
    to: ${agent.parent}
    type: task_completed
    content: ${merge_results.output}

outputs:
  - deliverables
  - documentation

error_handling:
  retry_count: 3
  fallback: report_to_parent
  escalation_threshold: 2
```

### 执行引擎能力

| 能力 | 说明 |
|------|------|
| 变量插值 | `${inputs.xxx}`, `${steps.id.output.xxx}` |
| 条件分支 | `condition` + `on_true/on_false` |
| 并行执行 | 无依赖的步骤可并行 |
| 子任务等待 | `wait_for_completion` 控制 |
| 错误重试 | 可配置重试次数和回退策略 |
| 断点续传 | 通过 checkpoints 表保存中间状态 |

### 执行状态机

```
pending → running → completed
    │         │
    │         ├──→ failed → retry → running
    │         │
    │         └──→ paused → resume → running
    │
    └──→ cancelled
```

---

## 六、智能体通信机制

### 核心原语

| 原语 | 说明 |
|------|------|
| `create_agent` | 创建子智能体 |
| `send_message` | 向任意智能体发送消息 |
| `broadcast` | 广播消息给所有下属 |
| `query_status` | 查询智能体状态 |

### 消息类型

| 类型 | 方向 | 用途 |
|------|------|------|
| `task_assign` | 上级 → 下级 | 分配任务 |
| `task_accept` | 下级 → 上级 | 接受任务 |
| `task_reject` | 下级 → 上级 | 拒绝任务 |
| `progress_update` | 下级 → 上级 | 进度汇报 |
| `help_request` | 下级 → 上级/同级 | 请求协助 |
| `task_completed` | 下级 → 上级 | 任务完成 |
| `intervention` | 用户 → 任意 | 用户介入 |
| `query` | 任意 → 任意 | 信息查询 |
| `response` | 任意 → 任意 | 查询响应 |

### 通信规则

1. **默认向上汇报** — 任务状态、进度自动上报
2. **允许同级协作** — 同级智能体可直接通信
3. **用户可介入任意节点** — 用户可以与任何智能体直接对话
4. **请求-响应模式** — 非紧急消息使用异步请求-响应
5. **紧急广播** — `broadcast` 可快速通知所有相关方

---

## 七、Skill 自动发现与安装

### 发现流程

1. 分析职位所需技能（基于 role + responsibilities）
2. 检查本地已安装 skills（skills-lock.json）
3. 缺失 skill → 构建搜索关键词
4. 执行 `npx skills find {keywords}`
5. 过滤结果（安装量 >= 100、来源可信、匹配度 >= 0.7）
6. 自动安装 `npx skills add {selected} -y`
7. 更新 skills-lock.json

### Skill 映射模板

```yaml
skill_mapping:
  前端开发:
    keywords: [react, vue, frontend, css, typescript]
    essential_skills:
      - vercel-labs/agent-skills@react-best-practices
      - vercel-labs/agent-skills@typescript
    optional_skills:
      - vercel-labs/agent-skills@tailwind
      - vercel-labs/agent-skills@testing

  后端开发:
    keywords: [backend, api, database, server]
    essential_skills:
      - vercel-labs/agent-skills@api-design
      - vercel-labs/agent-skills@database

  产品经理:
    keywords: [product, requirements, roadmap]
    essential_skills:
      - jwynia/agent-skills@requirements-analysis

  测试工程师:
    keywords: [testing, qa, e2e, unit-test]
    essential_skills:
      - vercel-labs/agent-skills@testing

  common_skills:
    - obra/superpowers@brainstorming
```

### 质量过滤条件

| 条件 | 阈值 | 说明 |
|------|------|------|
| 安装量 | >= 100 | 排除冷门 skill |
| 来源可信 | vercel-labs, obra 等 | 优先官方来源 |
| 匹配度 | >= 0.7 | 关键词相似度 |
| 安全评分 | Low Risk | 参考 skills.sh 评估 |

---

## 八、CLI 命令设计

### 核心命令

```bash
# 项目管理
iflow init <project-name>           # 初始化新项目
iflow start [--project <name>]      # 启动主智能体

# 智能体管理
iflow agents [--tree] [--status]    # 查看智能体
iflow chat <agent-id>               # 与智能体交互

# 任务管理
iflow assign <agent-id> "任务"      # 分配任务
iflow tasks [--agent] [--status]    # 查看任务

# 消息
iflow messages [--agent]            # 查看消息历史

# 服务模式
iflow serve [--port]                # 启动后端服务

# 导出
iflow export [--format]             # 导出项目配置
```

### 交互模式示例

```
$ iflow start

🚀 Super Workflow 启动
📦 项目: my-app (电商平台)

┌─ 主智能体 ─────────────────────────────────────────┐
│ 我已分析您的电商项目需求，识别出以下职位：         │
│                                                     │
│  组织架构:                                          │
│  ├─ 技术主管                                        │
│  │  ├─ 前端开发                                     │
│  │  ├─ 后端开发                                     │
│  │  └─ 测试工程师                                   │
│  ├─ 产品经理                                        │
│  └─ 设计主管                                        │
│                                                     │
│ 已自动安装 6 个相关 skills                          │
│ 请告诉我您要做什么？                                │
└─────────────────────────────────────────────────────┘

> 开发用户登录功能

📋 正在分析任务...
🔀 已分配给: 技术主管 (tech-lead-001)
...
```

---

## 九、UI 扩展设计

### API 接口

```yaml
# REST API
POST   /api/projects                 # 创建项目
GET    /api/projects/:id             # 获取项目信息
GET    /api/projects/:id/agents      # 获取智能体列表
POST   /api/agents                   # 创建智能体
POST   /api/agents/:id/tasks         # 分配任务
GET    /api/tasks/:id                # 获取任务状态
POST   /api/messages                 # 发送消息
GET    /api/messages                 # 获取消息列表

# WebSocket 事件
ws://localhost:3000/events
  - agent:created
  - agent:status
  - task:progress
  - message:received
  - workflow:step
```

### UI 功能规划

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 智能体树视图 | 可视化组织架构 | P0 |
| 实时消息流 | 多窗口对话 | P0 |
| 任务看板 | Kanban 风格管理 | P1 |
| 进度可视化 | 进度条、状态图标 | P1 |
| Workflow 图谱 | 动态图谱展示 | P2 |
| 代码预览 | 实时查看生成代码 | P2 |
| 多项目管理 | 同时管理多项目 | P3 |

### 技术栈建议

| 组件 | 技术选择 |
|------|----------|
| 后端框架 | Node.js (Express/Fastify) 或 Python (FastAPI) |
| 前端框架 | React + TypeScript |
| 实时通信 | WebSocket (Socket.io) |
| 数据库 | SQLite (better-sqlite3) |
| CLI 框架 | Commander.js / oclif |
| UI 组件库 | Ant Design / shadcn/ui |

---

## 十、总结

| 模块 | 核心要点 |
|------|----------|
| 架构 | 混合架构：CLI 核心 + 可选服务 + UI 扩展接口 |
| 存储 | 文件系统（配置）+ SQLite（状态） |
| 智能体 | 按需递归生成，无限嵌套 |
| Workflow | YAML 定义，支持分支、并行、子任务 |
| 通信 | 极简原语 + 多种消息类型 |
| Skill | 自动发现、自动安装、质量过滤 |
| CLI | 完整命令集 + 交互模式 |
| UI | API 预留，渐进式功能规划 |

---

## 附录：参考资料

- [swarm-ide](https://github.com/chmod777john/swarm-ide) — 动态智能体蜂群 IDE
- [skills.sh](https://skills.sh/) — Agent Skills 生态系统
- iFlow CLI — 交互式命令行智能体
