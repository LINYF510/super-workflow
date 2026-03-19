# Super Workflow 项目上下文

## 项目概述

Super Workflow 是一个基于 iFlow CLI 的动态工作流系统，目前处于**设计阶段**。项目参考 swarm-ide 的"液态拓扑"理念，旨在实现：

- **按需递归生成智能体** — 主智能体根据需求动态创建子智能体，子智能体可继续创建下级
- **虚拟公司模型** — 模拟真实组织架构，每个智能体对应一个"职位"
- **原子化分解** — 任务分解到可独立执行的粒度
- **自动技能发现** — 根据职位需求自动查找并安装相关 skills

## 目录结构

```
super-workflow/
├── .agents/                    # 本地安装的 skills
│   └── skills/
│       ├── brainstorming/      # 头脑风暴技能
│       ├── find-skills/        # 技能发现技能
│       └── requirements-analysis/  # 需求分析技能
├── .iflow/                     # iFlow 配置目录（运行时生成）
├── docs/
│   └── superpowers/
│       └── specs/              # 设计规范文档
├── skills/                     # 已安装的 skills 链接/副本
├── skills-lock.json            # skills 依赖锁定文件
└── AGENTS.md                   # 本文件
```

## 核心概念

| 概念 | 说明 |
|------|------|
| **Orchestrator** | 主智能体，系统入口点，负责理解需求、分析行业、分配任务 |
| **Agent** | 智能体，对应一个"职位"，拥有职责、workflow 和 skills |
| **Workflow** | 工作流，定义智能体如何执行任务，包含步骤、依赖、skill 调用 |
| **Skill** | 技能单元，原子化能力，通过 `npx skills` 动态获取 |

## 已安装的 Skills

### brainstorming (obra/superpowers)
**用途：** 在任何创意工作之前使用 — 创建功能、构建组件、添加功能或修改行为。

**核心流程：**
1. 探索项目上下文
2. 逐一提问澄清问题
3. 提出 2-3 个方案并给出建议
4. 分段呈现设计并获取用户批准
5. 编写设计文档并提交
6. 规范审查循环
7. 转入实现阶段

**重要：** 在用户批准设计之前，不得调用任何实现技能或编写代码。

### requirements-analysis (jwynia/agent-skills)
**用途：** 诊断需求问题，引导发现真实需求和约束。

**状态诊断流程：**
- RA0: 无问题陈述 — 用户从解决方案开始
- RA1: 解决方案优先思维 — 需求描述实现而非需要
- RA2: 模糊需求 — 无法测试的需求
- RA3: 隐藏约束 — 实施中途发现阻碍
- RA4: 范围蔓延预防 — 需求无限扩展
- RA5: 需求已验证 — 可以转入系统设计

### find-skills (vercel-labs/skills)
**用途：** 帮助用户发现和安装 agent skills。

**关键命令：**
```bash
npx skills find [query]    # 搜索技能
npx skills add <package>   # 安装技能
npx skills check           # 检查更新
npx skills update          # 更新所有技能
```

## 设计规范

当前设计文档位于 `docs/superpowers/specs/2026-03-18-dynamic-workflow-system-design.md`，包含：

- 整体架构设计
- 目录结构规范
- 数据持久化方案
- 动态智能体生成流程
- Workflow 执行引擎
- 智能体通信机制
- Skill 自动发现与安装
- CLI 命令设计
- UI 扩展设计

## 开发约定

### 文档位置
- 设计规范：`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- 需求分析输出：`docs/requirements/` 或项目根目录

### Skill 安装
使用 Skills CLI 管理技能依赖：

```bash
# 安装新技能
npx skills add <owner/repo@skill> -y

# 全局安装（用户级别）
npx skills add <owner/repo@skill> -g -y
```

### 质量过滤条件
安装 skill 时应检查：
- 安装量 >= 100
- 来源可信（vercel-labs, obra, anthropic 等官方来源）
- 匹配度 >= 0.7

## 当前状态

项目处于**设计阶段**，尚未开始实现。设计文档已完成，下一步：
1. 用户审查设计规范
2. 创建实现计划
3. 开始核心功能开发

## 技术栈规划

| 组件 | 计划技术 |
|------|----------|
| 后端框架 | Node.js (Express/Fastify) 或 Python (FastAPI) |
| 前端框架 | React + TypeScript |
| 实时通信 | WebSocket (Socket.io) |
| 数据库 | SQLite (better-sqlite3) |
| CLI 框架 | Commander.js / oclif |

## 参考资料

- [swarm-ide](https://github.com/chmod777john/swarm-ide) — 动态智能体蜂群 IDE
- [skills.sh](https://skills.sh/) — Agent Skills 生态系统
- iFlow CLI — 交互式命令行智能体
