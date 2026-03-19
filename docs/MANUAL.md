# Super Workflow 开发者手册

**版本**: 2.0.0  
**更新日期**: 2026-03-20  
**状态**: 实施中

---

## 目录

1. [概述](#1-概述)
2. [快速开始](#2-快速开始)
3. [CLI 命令参考](#3-cli-命令参考)
4. [核心 API](#4-核心-api)
5. [扩展开发指南](#5-扩展开发指南)
6. [部署与运维](#6-部署与运维)
7. [附录](#附录)

---

## 1. 概述

### 1.1 项目简介

Super Workflow 是一个基于 iFlow SDK 的动态工作流系统，参考 swarm-ide 的"液态拓扑"理念，实现按需生成智能体、动态分配任务、自动发现技能的完整工作流管理方案。

**核心能力**：
- **按需递归生成智能体** — 主智能体根据需求动态创建子智能体，最多支持 5 层深度
- **虚拟公司模型** — 模拟真实组织架构，每个智能体对应一个"职位"
- **AI 能力集成** — 通过 iFlow SDK 获得多模型 AI 推理、工具执行等核心能力
- **自动技能发现** — 根据职位需求自动查找并安装相关 skills

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| **Orchestrator** | 主智能体，系统入口点，负责理解需求、分析行业、分配任务 |
| **Agent** | 智能体，对应一个"职位"，拥有职责、workflow 和 skills |
| **AgentTree** | 智能体树，管理递归嵌套的父子关系（最多 5 层） |
| **Workflow** | 工作流，定义智能体如何执行任务，包含步骤、依赖、skill 调用 |
| **Skill** | 技能单元，原子化能力，通过 `npx skills` 动态获取 |
| **AICapabilityProvider** | AI 能力提供者，封装 iFlow SDK 提供推理能力 |

### 1.3 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户层 (CLI)                            │
│  sw init | start | chat | agents | assign | tasks          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Super Workflow 核心层                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Orchestrator │  │  AgentTree   │  │  Workflow    │       │
│  │   主智能体    │  │  智能体树    │  │   执行引擎    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  MessageBus  │  │  SkillMapper │  │ SQLite 存储  │       │
│  │   通信总线    │  │  技能映射    │  │   持久化     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    iFlow SDK 能力层                          │
│      AI 推理 │ 工具调用 │ 文件操作 │ Shell 执行 │ 流式响应    │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 目录结构

```
super-workflow/
├── src/
│   ├── cli/                    # CLI 命令入口
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── init.ts         # sw init
│   │       ├── start.ts        # sw start
│   │       ├── chat.ts         # sw chat
│   │       ├── agents.ts       # sw agents
│   │       ├── assign.ts       # sw assign
│   │       └── tasks.ts        # sw tasks
│   │
│   ├── core/                   # 核心引擎
│   │   ├── orchestrator/       # 主智能体
│   │   ├── agent/              # 智能体管理
│   │   ├── workflow/           # 工作流引擎
│   │   └── communication/      # 通信机制
│   │
│   ├── services/               # 服务层
│   │   ├── iflow/              # iFlow SDK 集成
│   │   ├── storage/            # 数据持久化
│   │   └── skill/              # Skill 服务
│   │
│   └── types/                  # 类型定义
│
├── tests/                      # 测试文件
├── docs/                       # 文档
└── skills/                     # 已安装的 skills
```

---

## 2. 快速开始

### 2.1 环境要求

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 22.0.0 | iFlow SDK 要求 |
| iFlow CLI | >= 0.2.24 | 提供 AI 能力 |
| npm | >= 10.0 | 包管理器 |

**安装 iFlow CLI**：
```bash
npm install -g @iflow-ai/iflow-cli
```

### 2.2 安装步骤

```bash
# 克隆仓库
git clone https://github.com/LINYF510/super-workflow.git
cd super-workflow

# 安装依赖
npm install

# 编译项目
npm run build

# 全局链接（开发模式）
npm link
```

### 2.3 第一个项目

```bash
# 1. 初始化项目
sw init my-project

# 2. 进入项目目录
cd my-project

# 3. 启动主智能体
sw start

# 4. 输入需求，AI 会分析并建议组织架构
> 我需要开发一个电商平台，包含用户管理、商品管理、订单系统

# 5. 确认创建组织架构后，可以与智能体对话
sw chat <agent-id>
```

---

## 3. CLI 命令参考

### 3.1 sw init

初始化新项目。

```bash
sw init <project-name> [options]
```

**参数**：
| 参数 | 说明 |
|------|------|
| `<project-name>` | 项目名称 |

**选项**：
| 选项 | 说明 |
|------|------|
| `-d, --description <desc>` | 项目描述 |

**示例**：
```bash
sw init my-ecommerce -d "电商平台项目"
```

---

### 3.2 sw start

启动主智能体，进入交互模式。

```bash
sw start [options]
```

**选项**：
| 选项 | 说明 |
|------|------|
| `-p, --project <name>` | 项目名称或路径 |
| `-d, --description <desc>` | 项目描述（新项目） |

**交互命令**：
| 命令 | 说明 |
|------|------|
| `help` | 显示帮助 |
| `agents` | 查看所有智能体 |
| `tree` | 查看智能体树 |
| `status` | 查看系统状态 |
| `exit` | 退出程序 |

**示例**：
```bash
sw start
> help
> agents
> tree
> exit
```

---

### 3.3 sw chat

与智能体交互对话。

```bash
sw chat [agent-id] [options]
```

**参数**：
| 参数 | 说明 |
|------|------|
| `[agent-id]` | 智能体 ID（可选，不提供则显示选择列表） |

**交互命令**：
| 命令 | 说明 |
|------|------|
| `exit` | 退出对话 |

**示例**：
```bash
# 选择智能体对话
sw chat

# 直接指定智能体
sw chat agent-abc123
```

---

### 3.4 sw agents

查看智能体列表。

```bash
sw agents [options]
```

**选项**：
| 选项 | 说明 |
|------|------|
| `-t, --tree` | 显示树形结构 |
| `-s, --status <status>` | 按状态过滤 (active\|idle\|terminated) |
| `-d, --depth <number>` | 按深度过滤 |
| `-j, --json` | JSON 格式输出 |

**示例**：
```bash
# 表格格式
sw agents

# 树形结构
sw agents --tree

# 按状态过滤
sw agents -s active

# JSON 输出
sw agents -j
```

---

### 3.5 sw assign

向智能体分配任务。

```bash
sw assign <agent-id> <task-description>
```

**参数**：
| 参数 | 说明 |
|------|------|
| `<agent-id>` | 目标智能体 ID |
| `<task-description>` | 任务描述 |

**示例**：
```bash
sw assign agent-abc123 "实现用户登录功能"
```

---

### 3.6 sw tasks

查看任务列表。

```bash
sw tasks [options]
```

**选项**：
| 选项 | 说明 |
|------|------|
| `-s, --status <status>` | 按状态过滤 |
| `-a, --agent <id>` | 按智能体过滤 |
| `-j, --json` | JSON 格式输出 |

---

## 4. 核心 API

### 4.1 AICapabilityProvider

AI 能力提供者，封装 iFlow SDK。

**导入**：
```typescript
import { AICapabilityProvider, getAICapabilityProvider } from './services/iflow/index.js';
```

**配置**：
```typescript
interface AICapabilityConfig {
  timeout?: number;          // 超时时间（毫秒），默认 60000
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';  // 日志级别
  cwd?: string;              // 工作目录
}
```

**方法**：

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `connect()` | 连接到 iFlow | `Promise<void>` |
| `disconnect()` | 断开连接 | `Promise<void>` |
| `analyzeRequirements(description)` | 分析需求，生成角色定义 | `Promise<AnalysisResult>` |
| `executeWithRole(role, task, context?)` | 带角色上下文执行任务 | `Promise<string>` |
| `invokeSkill(skillName, input)` | 调用 skill | `Promise<SkillOutput>` |
| `decomposeTask(task, constraints?)` | 分解任务 | `Promise<SubTask[]>` |
| `aggregateResults(results)` | 聚合结果 | `Promise<string>` |

**示例**：
```typescript
const provider = new AICapabilityProvider({ timeout: 30000 });
await provider.connect();

// 分析需求
const analysis = await provider.analyzeRequirements('开发电商平台');
console.log(analysis.roles);  // RoleDefinition[]

// 执行任务
const result = await provider.executeWithRole(
  {
    name: '前端开发',
    description: '负责 UI 开发',
    responsibilities: ['组件开发', '样式编写'],
    skills: ['vercel-react-best-practices'],
  },
  '实现登录表单组件',
  { agentId: 'agent-001', summary: '电商项目前端开发' }
);

await provider.disconnect();
```

---

### 4.2 Orchestrator

主智能体，系统入口点。

**导入**：
```typescript
import { Orchestrator } from './core/orchestrator/index.js';
```

**配置**：
```typescript
interface OrchestratorConfig {
  projectName: string;           // 项目名称
  projectDescription?: string;   // 项目描述
  maxDepth?: number;             // 最大深度，默认 5
  autoInstallSkills?: boolean;   // 自动安装 skills，默认 true
  aiConfig?: {
    timeout?: number;
    logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
}
```

**方法**：

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `initialize()` | 初始化主智能体 | `Promise<Agent>` |
| `analyzeProject(description)` | 分析项目需求 | `Promise<AnalysisResult>` |
| `createOrganization(analysis)` | 创建组织架构 | `Promise<Agent[]>` |
| `assignTask(agentId, description)` | 分配任务 | `Promise<string>` |
| `getOrchestratorAgent()` | 获取主智能体 | `Agent \| null` |
| `getAllAgents()` | 获取所有智能体 | `Agent[]` |
| `getAgentTree()` | 获取智能体树 | `Agent[]` |
| `shutdown()` | 关闭系统 | `void` |

**示例**：
```typescript
const orchestrator = new Orchestrator({
  projectName: 'my-project',
  projectDescription: '电商平台',
  maxDepth: 5,
});

// 初始化
const mainAgent = await orchestrator.initialize();

// 分析需求
const analysis = await orchestrator.analyzeProject(
  '开发电商平台，包含用户管理、商品管理、订单系统'
);

// 创建组织
const agents = await orchestrator.createOrganization(analysis);

// 分配任务
const taskId = await orchestrator.assignTask(
  agents[0].id,
  '实现用户注册功能'
);

// 关闭
orchestrator.shutdown();
```

---

### 4.3 AgentTree

智能体树管理器。

**导入**：
```typescript
import { AgentTree } from './core/agent/tree.js';
```

**类型**：
```typescript
interface AgentNode {
  agent: Agent;           // 智能体
  children: AgentNode[];  // 子节点
  parent: AgentNode | null;  // 父节点
}
```

**方法**：

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `createAgent(input)` | 创建智能体节点 | `AgentNode` |
| `findAgent(id)` | 查找智能体 | `Agent \| null` |
| `findNode(id)` | 查找节点 | `AgentNode \| null` |
| `getChildren(id)` | 获取直接子节点 | `AgentNode[]` |
| `getDescendants(id)` | 获取所有后代 | `AgentNode[]` |
| `getAncestors(id)` | 获取祖先链 | `AgentNode[]` |
| `getRootNodes()` | 获取根节点 | `AgentNode[]` |
| `getAllNodes()` | 获取所有节点 | `AgentNode[]` |
| `getStats()` | 获取统计信息 | `TreeStats` |
| `deleteNode(id)` | 删除节点及子树 | `boolean` |
| `printTree(rootId?)` | 打印树形结构 | `string` |

**示例**：
```typescript
const tree = new AgentTree();

// 创建智能体
const root = tree.createAgent({
  name: '技术总监',
  role: 'tech-lead',
  responsibilities: ['技术决策', '团队管理'],
});

const child = tree.createAgent({
  name: '前端开发',
  role: 'frontend-developer',
  parentId: root.agent.id,
  responsibilities: ['UI 开发'],
});

// 查询
const children = tree.getChildren(root.agent.id);
const stats = tree.getStats();
console.log(stats);
// { totalAgents: 2, maxDepth: 1, byDepth: { 0: 1, 1: 1 }, ... }

// 打印树
console.log(tree.printTree());
// 技术总监 (depth: 0)
// └── ○ 前端开发 (depth: 1)
```

---

### 4.4 WorkflowEngine

工作流执行引擎。

**导入**：
```typescript
import { WorkflowEngine } from './core/workflow/engine.js';
import { parseWorkflow } from './core/workflow/parser.js';
```

**类型**：
```typescript
type StepAction =
  | 'invoke_skill'     // 调用 skill
  | 'evaluate'         // 条件评估
  | 'create_agents'    // 创建子智能体
  | 'aggregate'        // 聚合结果
  | 'send_message'     // 发送消息
  | 'wait'             // 等待
  | 'parallel';        // 并行执行

interface Workflow {
  id: string;
  name: string;
  version: string;
  triggers: WorkflowTrigger[];
  inputs: WorkflowInput[];
  outputs: WorkflowOutput[];
  steps: WorkflowStep[];
  errorHandling: WorkflowErrorHandling;
}
```

**方法**：

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `execute(workflow, inputs, context)` | 执行工作流 | `Promise<WorkflowResult>` |
| `pause(taskId)` | 暂停执行 | `void` |
| `resume(taskId)` | 恢复执行 | `void` |
| `getCheckpoint(taskId)` | 获取检查点 | `Checkpoint \| null` |

**示例**：
```typescript
import { parseWorkflow } from './core/workflow/parser.js';
import { WorkflowEngine } from './core/workflow/engine.js';

// 解析 YAML 工作流
const yaml = `
id: deploy-workflow
name: Deploy Workflow
version: 1.0.0
triggers:
  - manual
steps:
  - id: build
    name: Build
    action: invoke_skill
    skill: deploy
  - id: notify
    name: Notify
    action: send_message
    to: team-lead
`;

const workflow = parseWorkflow(yaml);
const engine = new WorkflowEngine();

const result = await engine.execute(workflow, {}, { agentId: 'agent-001' });
```

---

### 4.5 RoleSkillMapper

角色-技能映射器。

**导入**：
```typescript
import { RoleSkillMapper, createRoleSkillMapper } from './services/skill/mapper.js';
```

**方法**：

| 方法 | 说明 | 返回类型 |
|------|------|----------|
| `getMappingByRole(roleName)` | 获取角色映射 | `RoleSkillMapping \| null` |
| `getSkillsForRole(roleName)` | 获取角色技能 | `{ essential, optional, common }` |
| `inferSkillsFromDescription(desc)` | 从描述推断技能 | `Promise<InferenceResult>` |
| `addMapping(mapping)` | 添加自定义映射 | `void` |
| `getAllMappings()` | 获取所有映射 | `RoleSkillMapping[]` |

**示例**：
```typescript
const mapper = createRoleSkillMapper();

// 获取角色技能
const skills = mapper.getSkillsForRole('前端开发工程师');
console.log(skills.essential);
// ['vercel-labs/agent-skills@vercel-react-best-practices', ...]

// 从描述推断
const result = await mapper.inferSkillsFromDescription(
  '我需要一个 React 前端开发工程师'
);
console.log(result.roleName);  // '前端开发工程师'
console.log(result.aiGenerated);  // true/false
```

---

## 5. 扩展开发指南

### 5.1 自定义 Workflow

创建自定义工作流 YAML 文件：

```yaml
# .iflow/workflows/my-workflow.yaml
id: my-custom-workflow
name: My Custom Workflow
version: 1.0.0
description: 自定义工作流示例

triggers:
  - task_assigned
  - manual

inputs:
  - name: targetFile
    type: file
    required: true
    description: 目标文件路径

outputs:
  - name: result
    type: string
    description: 处理结果

steps:
  - id: analyze
    name: Analyze File
    action: invoke_skill
    skill: requirements-analysis
    input:
      file: ${inputs.targetFile}
    next: process

  - id: process
    name: Process Content
    action: evaluate
    condition: ${steps.analyze.output.isValid}
    onTrue: create_child
    onFalse: report_error

  - id: create_child
    name: Create Child Agents
    action: create_agents
    agents:
      - role: developer
        tasks:
          - 实现分析结果
        skills:
          - brainstorming
    waitForCompletion: true
    next: aggregate

  - id: aggregate
    name: Aggregate Results
    action: aggregate

  - id: report_error
    name: Report Error
    action: send_message
    to: parent
    messageType: error
    content: 文件分析失败

errorHandling:
  retryCount: 3
  retryDelay: 1000
  fallback: report_to_parent
  escalationThreshold: 3
```

### 5.2 添加新 Skill

1. **发现 Skill**：
```bash
npx skills find <query>
```

2. **安装 Skill**：
```bash
npx skills add <owner/repo@skill> -y
```

3. **配置角色映射**（可选）：
```typescript
import { createRoleSkillMapper } from './services/skill/mapper.js';

const mapper = createRoleSkillMapper();
mapper.addMapping({
  roleId: 'my-custom-role',
  roleName: '自定义角色',
  keywords: ['keyword1', 'keyword2'],
  essentialSkills: ['owner/repo@skill-name'],
  optionalSkills: [],
});
```

### 5.3 贡献代码

1. Fork 仓库
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -m 'feat: add my feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

**代码规范**：
- 使用 TypeScript strict 模式
- 遵循 ESLint 规则
- 编写单元测试（覆盖率 > 80%）
- 更新相关文档

---

## 6. 部署与运维

### 6.1 生产环境配置

**环境变量**：
```bash
# .env
IFLOW_TIMEOUT=120000
IFLOW_LOG_LEVEL=INFO
DATABASE_PATH=/var/lib/super-workflow/state.db
```

**启动命令**：
```bash
# 构建
npm run build

# 启动（需要 iFlow CLI 后台运行）
iflow &
sw start -p /path/to/project
```

### 6.2 数据库管理

**数据库位置**：`<project>/.iflow/state.db`

**备份**：
```bash
cp .iflow/state.db .iflow/state.db.backup
```

**重置**：
```bash
rm .iflow/state.db
sw start  # 会自动重建
```

### 6.3 故障排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| AI 连接失败 | iFlow CLI 未运行 | 运行 `iflow` 启动服务 |
| 创建智能体失败 | 超过最大深度 | 检查深度限制（MAX_DEPTH=5） |
| Skill 调用失败 | Skill 未安装 | 运行 `npx skills add <skill>` |
| 数据库锁定 | 并发访问 | 确保单实例运行 |

**日志查看**：
```bash
# 启用 DEBUG 日志
IFLOW_LOG_LEVEL=DEBUG sw start
```

---

## 附录

### A. 术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| 主智能体 | Orchestrator | 系统入口点，负责整体协调 |
| 智能体 | Agent | 执行任务的实体，对应一个职位 |
| 工作流 | Workflow | 定义任务执行步骤的模板 |
| 技能 | Skill | 原子化能力单元 |
| 深度 | Depth | 智能体在树中的层级 |

### B. 变更日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 2.0.0 | 2026-03-19 | 重构为混合架构，集成 iFlow SDK |
| 1.0.0 | 2026-03-18 | 初始设计文档 |

### C. 参考链接

- [iFlow CLI 文档](https://platform.iflow.cn/cli/)
- [iFlow SDK 文档](https://platform.iflow.cn/cli/sdk/)
- [Skills 生态系统](https://skills.sh/)
- [GitHub 仓库](https://github.com/LINYF510/super-workflow)

---

*本文档由 Super Workflow 团队维护*
