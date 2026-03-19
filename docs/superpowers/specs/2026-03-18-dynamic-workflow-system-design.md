# Super Workflow - 动态工作流系统设计文档

**版本**: 2.0.0  
**日期**: 2026-03-19  
**状态**: 设计阶段

## 概述

Super Workflow 是一个基于 iFlow SDK 的动态工作流系统，参考 swarm-ide 的"液态拓扑"理念，实现按需生成智能体、动态分配任务、自动发现技能的完整工作流管理方案。

### 核心理念

- **按需递归生成** — 主智能体根据需求动态创建子智能体，子智能体可继续创建下级（最多5层）
- **虚拟公司模型** — 模拟真实组织架构，每个智能体对应一个"职位"
- **原子化分解** — 任务分解到可独立执行的粒度
- **自动技能发现** — 根据职位需求自动查找并安装相关 skills
- **AI 能力集成** — 通过 iFlow SDK 获得多模型 AI 推理、工具执行、文件操作等核心能力

### 系统定位

Super Workflow 采用**混合架构**：
- **自己实现**：智能体管理、组织架构树、Workflow 引擎、通信机制、持久化存储
- **iFlow SDK 提供**：AI 推理、工具调用、文件/Shell/网络操作、流式响应、Token 管理

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
│                 Super Workflow 核心层                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 主智能体管理 │  │ 动态智能体  │  │ Workflow     │       │
│  │ (Orchestrator)│  │ 创建/调度   │  │ 执行引擎     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ MessageBus   │  │ Task Queue  │  │ SQLite 存储  │       │
│  │ 通信机制     │  │ 任务调度    │  │ 持久化       │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    iFlow SDK 能力层                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ 多模型 AI    │  │ 工具调用系统 │  │ 文件操作     │       │
│  │ 推理能力     │  │              │  │              │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Shell 执行   │  │ 网络功能    │  │ 流式响应     │       │
│  │              │  │ web_search   │  │ Token 管理   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部服务                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Claude API   │  │ GPT API     │  │ 其他 LLM     │       │
│  │ (iFlow 代理) │  │ (iFlow 代理)│  │ (iFlow 代理) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 核心概念

| 概念 | 说明 | 实现方 |
|------|------|--------|
| **Orchestrator** | 主智能体，系统入口点，负责理解需求、分析行业、分配任务 | Super Workflow |
| **Agent** | 智能体，对应一个"职位"，拥有职责、workflow 和 skills | Super Workflow |
| **AgentTree** | 智能体树，管理递归嵌套的父子关系（最多5层） | Super Workflow |
| **Workflow** | 工作流，定义智能体如何执行任务 | Super Workflow |
| **MessageBus** | 消息总线，智能体间通信机制 | Super Workflow |
| **IFlowClient** | AI 能力客户端，提供推理、工具调用等核心能力 | iFlow SDK |
| **Skill** | 技能单元，原子化能力 | skills.sh 生态 |

### 职责划分

| 功能模块 | Super Workflow 负责 | iFlow SDK 负责 |
|----------|---------------------|----------------|
| 智能体数据结构 | ✅ | - |
| 组织架构树管理 | ✅ | - |
| 递归创建子智能体 | ✅ | - |
| Workflow YAML 解析 | ✅ | - |
| 步骤执行器 | ✅ | - |
| MessageBus 通信 | ✅ | - |
| SQLite 持久化 | ✅ | - |
| 任务队列调度 | ✅ | - |
| AI 推理 | - | ✅ |
| 工具调用 | - | ✅ |
| 文件操作 | - | ✅ |
| Shell 执行 | - | ✅ |
| 网络搜索 | - | ✅ |
| Token 管理 | - | ✅ |

---

## 二、系统要求

### 运行环境

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 22.0 | iFlow SDK 要求 |
| iFlow CLI | >= 0.2.24 | 提供 AI 能力 |
| SQLite | 内置 | 无需额外安装 |
| 操作系统 | Windows/macOS/Linux | 跨平台支持 |

### 依赖安装

```bash
# 安装 iFlow CLI
npm install -g @iflow-ai/iflow-cli

# 安装 iFlow SDK
npm install @iflow-ai/iflow-cli-sdk

# 安装项目依赖
npm install
```

### 认证配置

```bash
# 方式1: iFlow 平台登录（推荐）
iflow
# 选择 "Login with iFlow"

# 方式2: API Key 登录
# 访问心流平台生成 API Key
```

---

## 三、目录结构

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
├── src/
│   ├── cli/                     # CLI 命令
│   ├── core/
│   │   ├── orchestrator/        # 主智能体
│   │   ├── agent/               # 智能体管理
│   │   ├── workflow/            # 工作流引擎
│   │   └── communication/       # 消息总线
│   ├── services/
│   │   ├── iflow/               # iFlow SDK 集成
│   │   ├── skill/               # Skill 服务
│   │   └── storage/             # 存储服务
│   └── types/                   # 类型定义
│
├── skills-lock.json             # skills 依赖锁定
├── package.json
└── tsconfig.json
```

---

## 四、iFlow SDK 集成方案

### 架构设计

```typescript
// src/services/iflow/client.ts
import { IFlowClient, MessageType } from '@iflow-ai/iflow-cli-sdk';

/**
 * AI 能力适配器
 * 
 * 将 iFlow SDK 封装为 Super Workflow 需要的接口
 */
export class AICapabilityProvider {
  private client: IFlowClient;
  
  constructor() {
    // 不配置 agents，只用基础 AI 能力
    // 智能体管理由 Super Workflow 自己实现
    this.client = new IFlowClient({
      timeout: 60000,
      logLevel: 'INFO',
    });
  }
  
  /**
   * AI 分析需求，生成角色定义
   */
  async analyzeRequirements(description: string): Promise<RoleDefinition[]> {
    await this.client.connect();
    
    const prompt = this.buildAnalysisPrompt(description);
    await this.client.sendMessage(prompt);
    
    const response = await this.collectResponse();
    
    return this.parseRoleDefinitions(response);
  }
  
  /**
   * 执行任务（带角色上下文）
   */
  async executeWithRole(
    role: RoleDefinition,
    task: string,
    context: AgentContext
  ): Promise<string> {
    await this.client.connect();
    
    const prompt = `
你现在扮演: ${role.name}
职责: ${role.responsibilities.join(', ')}
专业技能: ${role.skills.join(', ')}

上下文:
${context.summary}

任务: ${task}
`;
    
    await this.client.sendMessage(prompt);
    return await this.collectResponse();
  }
  
  /**
   * 调用 Skill
   */
  async invokeSkill(
    skillName: string,
    input: Record<string, unknown>
  ): Promise<SkillOutput> {
    await this.client.connect();
    
    await this.client.sendMessage(`
请使用 ${skillName} skill 执行以下任务：
${JSON.stringify(input, null, 2)}
`);
    
    const response = await this.collectResponse();
    return this.parseSkillOutput(response);
  }
  
  private async collectResponse(): Promise<string> {
    let result = '';
    for await (const msg of this.client.receiveMessages()) {
      if (msg.type === MessageType.ASSISTANT && msg.chunk.text) {
        result += msg.chunk.text;
      } else if (msg.type === MessageType.TASK_FINISH) {
        break;
      }
    }
    return result;
  }
}
```

### AI 能力调用流程

```
Super Workflow 发起请求
        │
        ▼
┌───────────────────┐
│ AICapabilityProvider
│ - analyzeRequirements()
│ - executeWithRole()
│ - invokeSkill()
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   IFlowClient     │
│   (SDK)           │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   iFlow CLI       │
│   - AI 推理       │
│   - 工具调用      │
│   - 文件操作      │
└───────────────────┘
```

---

## 五、动态智能体生成流程

### 完整流程

```
用户输入项目需求
        │
        ▼
┌───────────────────┐
│  AI 分析需求      │  ← iFlow SDK
│  生成角色定义     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  创建 AgentTree   │  ← Super Workflow
│  建立父子关系     │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │  循环处理  │
    │  每个角色  │
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
┌───────────────────────────┐
│ 存入 SQLite               │
│ - agents 表               │
│ - 建立 parent_id 关联     │
└───────────────────────────┘
                │
                ▼
        ┌─────────────────┐
        │ 智能体准备就绪  │
        └─────────────────┘
```

### AI 生成角色定义

```typescript
// 分析提示词模板
const ANALYSIS_PROMPT = `
分析以下项目需求，生成所需的团队角色配置。

项目描述：
{project_description}

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
4. 只输出 JSON，不要其他内容
`;

// AI 返回示例
const roleDefinitions = [
  {
    "name": "技术主管",
    "description": "负责技术架构和团队管理",
    "responsibilities": ["技术架构设计", "代码审查", "技术决策", "团队协调"],
    "skills": ["brainstorming", "requesting-code-review", "systematic-debugging"],
    "systemPrompt": "你是一个经验丰富的技术主管...",
    "parent": null,
    "children": ["前端开发", "后端开发", "测试工程师"]
  },
  {
    "name": "前端开发",
    "description": "负责用户界面开发",
    "responsibilities": ["UI开发", "前端性能优化", "与后端API对接"],
    "skills": ["vercel-react-best-practices", "typescript-advanced-types"],
    "systemPrompt": "你是一个专业的前端开发工程师...",
    "parent": "技术主管",
    "children": []
  }
];
```

### AgentTree 数据结构

```typescript
interface AgentNode {
  id: string;
  role: RoleDefinition;
  parentId: string | null;
  children: AgentNode[];
  status: 'idle' | 'busy' | 'waiting';
  currentTask: Task | null;
}

class AgentTree {
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

---

## 六、Agent 定义格式

### agent.yaml

```yaml
# agent.yaml
id: frontend-dev-001
name: 前端开发工程师
role: frontend-developer
parent: tech-lead-001
status: idle
depth: 2                    # 在树中的层级

responsibilities:
  - 实现用户界面组件
  - 前端性能优化
  - 与后端 API 对接

skills:
  - brainstorming
  - vercel-react-best-practices
  - typescript-advanced-types

workflow: .iflow/agents/frontend-dev-001/workflow.yaml

# AI 角色上下文
systemPrompt: |
  你是一个专业的前端开发工程师...
  
created_at: 2026-03-19T10:00:00Z
```

### SQLite 存储

```sql
-- 智能体表（增加层级字段）
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    parent_id TEXT,
    depth INTEGER,        -- 层级深度
    status TEXT,
    workflow_path TEXT,
    skills TEXT,          -- JSON array
    system_prompt TEXT,   -- AI 角色上下文
    created_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (parent_id) REFERENCES agents(id)
);

-- 创建索引
CREATE INDEX idx_agents_parent ON agents(parent_id);
CREATE INDEX idx_agents_depth ON agents(depth);
```

---

## 七、Workflow 执行引擎

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
    action: invoke_skill
    skill: requirements-analysis
    input:
      description: ${inputs.task_description}
    output:
      analyzed_requirements: result.requirements
      sub_tasks: result.sub_tasks

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
    action: invoke_skill
    skill: frontend-development
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

### 执行器实现

```typescript
// src/core/workflow/executor.ts
import { AICapabilityProvider } from '../../services/iflow/client.js';

export class WorkflowExecutor {
  private aiProvider: AICapabilityProvider;
  private agentTree: AgentTree;
  private messageBus: MessageBus;
  
  async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepOutput> {
    switch (step.action) {
      case 'invoke_skill':
        return this.executeInvokeSkill(step, context);
      
      case 'evaluate':
        return this.executeEvaluate(step, context);
      
      case 'create_agents':
        return this.executeCreateAgents(step, context);
      
      case 'aggregate':
        return this.executeAggregate(step, context);
      
      case 'send_message':
        return this.executeSendMessage(step, context);
      
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }
  
  private async executeInvokeSkill(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepOutput> {
    const agent = this.agentTree.findAgent(context.agentId);
    
    // 使用 iFlow SDK 执行 skill
    const output = await this.aiProvider.invokeSkill(
      step.skill!,
      this.interpolateInput(step.input, context)
    );
    
    // 存储到 SQLite
    this.saveStepOutput(context.taskId, step.id, output);
    
    return output;
  }
  
  private async executeCreateAgents(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepOutput> {
    const childOutputs: string[] = [];
    
    for (const agentDef of step.agents || []) {
      // 检查层级限制
      const parent = this.agentTree.findAgent(context.agentId);
      if (parent && this.agentTree.getDepth(parent.id) >= 5) {
        throw new Error('Maximum agent depth (5) exceeded');
      }
      
      // AI 生成角色定义
      const role = await this.aiProvider.analyzeRequirements(
        `需要创建角色: ${agentDef.role}, 任务: ${agentDef.tasks}`
      ).then(roles => roles[0]);
      
      // 创建智能体节点
      const agent = this.agentTree.createAgent(role, context.agentId);
      
      // 存储到 SQLite
      this.agentRepo.create({
        id: agent.id,
        name: role.name,
        role: role.name,
        parentId: context.agentId,
        systemPrompt: role.systemPrompt,
        skills: JSON.stringify(role.skills),
      });
      
      // 分配任务
      if (step.waitForCompletion) {
        const output = await this.executeChildWorkflow(agent.id, agentDef.tasks);
        childOutputs.push(output);
      } else {
        // 异步执行
        this.messageBus.send({
          from: context.agentId,
          to: agent.id,
          type: 'task_assign',
          content: agentDef.tasks,
        });
      }
    }
    
    return { childOutputs };
  }
}
```

---

## 八、智能体通信机制

### MessageBus 实现

```typescript
// src/core/communication/bus.ts
export class MessageBus {
  private agents: Map<string, AgentMessageHandler>;
  private messageHistory: MessageRepository;
  
  // 发送消息
  async send(message: AgentMessage): Promise<void> {
    // 存储消息
    await this.messageHistory.save(message);
    
    // 路由到目标智能体
    const handler = this.agents.get(message.to);
    if (handler) {
      await handler.handleMessage(message);
    }
  }
  
  // 广播给所有下属
  async broadcast(fromAgentId: string, content: string): Promise<void> {
    const descendants = this.agentTree.getDescendants(fromAgentId);
    for (const agent of descendants) {
      await this.send({
        from: fromAgentId,
        to: agent.id,
        type: 'broadcast',
        content,
      });
    }
  }
  
  // 向上汇报
  async reportUp(fromAgentId: string, type: string, content: string): Promise<void> {
    const ancestors = this.agentTree.getAncestors(fromAgentId);
    if (ancestors.length > 0) {
      await this.send({
        from: fromAgentId,
        to: ancestors[0]!.id,
        type,
        content,
      });
    }
  }
}
```

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

---

## 九、Skill 自动发现与安装

### 发现流程

1. AI 分析职位所需技能
2. 检查本地已安装 skills（skills-lock.json）
3. 缺失 skill → 构建搜索关键词
4. 执行 `npx skills find {keywords}`
5. 过滤结果（安装量 >= 100、来源可信、匹配度 >= 0.7）
6. 自动安装 `npx skills add {selected} -y`
7. 更新 skills-lock.json

### Skill 服务实现

```typescript
// src/services/skill/finder.ts
import { execSync } from 'child_process';

export class SkillFinder {
  // 搜索 skill
  async find(query: string): Promise<SkillSearchResult[]> {
    const result = execSync(`npx skills find "${query}" --json`, {
      encoding: 'utf-8',
    });
    
    return JSON.parse(result);
  }
  
  // 过滤结果
  filterSkills(results: SkillSearchResult[]): SkillSearchResult[] {
    return results.filter(skill => {
      // 安装量 >= 100
      if (skill.installs < 100) return false;
      
      // 来源可信
      const trustedSources = ['vercel-labs', 'obra', 'anthropic', 'jwynia'];
      const isTrusted = trustedSources.some(
        src => skill.package.includes(src)
      );
      if (!isTrusted) return false;
      
      // 匹配度 >= 0.7
      if (skill.score < 0.7) return false;
      
      return true;
    });
  }
}
```

---

## 十、CLI 命令设计

### 核心命令

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

# 消息
sw messages [--agent]               # 查看消息历史

# 导出
sw export [--format]                # 导出项目配置
```

### 交互模式示例

```
$ sw start

🚀 Super Workflow 启动
📦 项目: my-app (电商平台)

┌─ 主智能体 ─────────────────────────────────────────┐
│ 我已分析您的电商项目需求，识别出以下职位：         │
│                                                     │
│  组织架构树:                                        │
│  主智能体 (depth: 0)                               │
│  └─ 技术主管 (depth: 1)                            │
│     ├─ 前端开发 (depth: 2)                         │
│     ├─ 后端开发 (depth: 2)                         │
│     └─ 测试工程师 (depth: 2)                       │
│  ├─ 产品经理 (depth: 1)                            │
│  └─ 设计主管 (depth: 1)                            │
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

## 十一、数据持久化

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
    role TEXT,
    parent_id TEXT,
    depth INTEGER,
    status TEXT,
    workflow_path TEXT,
    skills TEXT,
    system_prompt TEXT,
    created_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (parent_id) REFERENCES agents(id)
);

-- 任务表
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    agent_id TEXT,
    parent_task_id TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    priority INTEGER,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

-- 消息表
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    from_agent TEXT,
    to_agent TEXT,
    type TEXT,
    content TEXT,
    created_at TIMESTAMP
);

-- 执行检查点
CREATE TABLE checkpoints (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    step_index INTEGER,
    state TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Skill 缓存
CREATE TABLE skill_cache (
    query TEXT PRIMARY KEY,
    results TEXT,
    cached_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_agents_parent ON agents(parent_id);
CREATE INDEX idx_agents_depth ON agents(depth);
CREATE INDEX idx_tasks_agent ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_messages_to ON messages(to_agent);
CREATE INDEX idx_messages_from ON messages(from_agent);
```

---

## 十二、总结

### 架构优势

| 维度 | 说明 |
|------|------|
| **职责清晰** | Super Workflow 管理编排，iFlow SDK 提供 AI 能力 |
| **功能完整** | 实现设计文档所有核心特性 |
| **易于维护** | AI 层由 iFlow 统一维护，无需跟进 LLM API 变化 |
| **灵活扩展** | 可独立升级编排层或 AI 层 |

### 核心特性

| 特性 | 实现方式 |
|------|----------|
| 按需递归生成智能体 | ✅ AI 生成角色 + AgentTree 管理 |
| 无限嵌套（最多5层） | ✅ depth 字段 + 层级检查 |
| 虚拟公司模型 | ✅ 组织架构树 + 角色定义 |
| 原子化任务分解 | ✅ AI 分析 + Workflow 引擎 |
| 自动技能发现 | ✅ npx skills + 质量过滤 |
| 智能体间通信 | ✅ MessageBus + 消息类型 |
| 状态持久化 | ✅ SQLite + 文件系统 |

### 开发工作量

| 模块 | 预估代码量 | 说明 |
|------|-----------|------|
| iFlow SDK 集成 | ~300 行 | AI 能力适配 |
| AgentTree 管理 | ~400 行 | 递归创建、层级管理 |
| Workflow 引擎 | ~600 行 | YAML 解析、步骤执行 |
| MessageBus | ~300 行 | 消息路由、存储 |
| SQLite 存储 | ~300 行 | 表结构、Repository |
| CLI 界面 | ~200 行 | 命令解析、交互 |
| **总计** | **~2100 行** | |

---

## 附录

### A. 参考资料

- [iFlow CLI 文档](https://platform.iflow.cn/cli/) — AI 能力提供
- [iFlow SDK TypeScript](https://platform.iflow.cn/cli/sdk/sdk-typescript) — SDK 文档
- [swarm-ide](https://github.com/chmod777john/swarm-ide) — 动态智能体蜂群 IDE
- [skills.sh](https://skills.sh/) — Agent Skills 生态系统

### B. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2026-03-18 | 初始设计 |
| 2.0.0 | 2026-03-19 | 集成 iFlow SDK，采用混合架构 |