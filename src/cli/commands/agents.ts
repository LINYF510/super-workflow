/**
 * sw agents 命令
 * 
 * 查看智能体，支持树形结构和深度显示
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { join } from 'path';
import { existsSync } from 'fs';
import { initDatabase, closeDatabase, AgentRepository } from '../../services/storage/index.js';
import type { Agent } from '../../types/index.js';

export const agentsCommand = new Command('agents')
  .description('查看智能体')
  .option('-t, --tree', '显示树形结构')
  .option('-s, --status <status>', '按状态过滤 (active|idle|terminated)')
  .option('-d, --depth <number>', '按深度过滤')
  .option('-j, --json', 'JSON 格式输出')
  .action((options: { tree?: boolean; status?: string; depth?: string; json?: boolean }) => {
    try {
      // 初始化数据库
      const iflowDir = join(process.cwd(), '.iflow');
      if (!existsSync(iflowDir)) {
        console.log(chalk.red('未找到项目配置目录 .iflow/'));
        console.log(chalk.gray('请先运行 sw init <project-name> 初始化项目'));
        process.exit(1);
      }
      
      initDatabase({ path: join(iflowDir, 'state.db') });
      
      const agentRepo = new AgentRepository();
      let agents = agentRepo.findAll({ orderBy: 'created_at', orderDirection: 'ASC' });
      
      // 状态过滤
      if (options.status) {
        agents = agents.filter(a => a.status === options.status);
      }
      
      // 深度过滤
      if (options.depth) {
        const depth = parseInt(options.depth, 10);
        agents = agents.filter(a => a.depth === depth);
      }
      
      closeDatabase();
      
      // JSON 输出
      if (options.json) {
        console.log(JSON.stringify(agents, null, 2));
        return;
      }
      
      // 树形输出
      if (options.tree) {
        printAgentTree(agents);
        return;
      }
      
      // 表格输出
      printAgentTable(agents);
      
    } catch (error) {
      console.error(chalk.red('查询失败'));
      console.error(error);
      closeDatabase();
      process.exit(1);
    }
  });

/**
 * 打印智能体表格
 */
function printAgentTable(agents: Agent[]): void {
  if (agents.length === 0) {
    console.log(chalk.gray('暂无智能体'));
    return;
  }
  
  const data = [
    ['ID', '名称', '角色', '状态', '深度', '技能数'],
    ...agents.map(agent => [
      agent.id.substring(0, 8),
      agent.name,
      agent.role,
      formatStatus(agent.status),
      String(agent.depth),
      String(agent.skills.length),
    ]),
  ];
  
  console.log();
  console.log(table(data));
}

/**
 * 打印智能体树
 */
function printAgentTree(agents: Agent[]): void {
  if (agents.length === 0) {
    console.log(chalk.gray('暂无智能体'));
    return;
  }
  
  console.log();
  console.log(chalk.bold('智能体树:'));
  
  const maxDepth = Math.max(...agents.map(a => a.depth));
  console.log(chalk.gray(`最大深度: ${maxDepth}/5`));
  console.log();
  
  const printNode = (parentId: string | null, indent: string = '') => {
    const children = agents.filter(a => a.parentId === parentId);
    for (const child of children) {
      const index = children.indexOf(child);
      const isLast = index === children.length - 1;
      const prefix = isLast ? '└── ' : '├── ';
      const status = formatStatusDot(child.status);
      const depthInfo = chalk.gray(`[L${child.depth}]`);
      
      console.log(`${indent}${prefix}${status} ${child.name} (${child.role}) ${depthInfo}`);
      
      const childIndent = indent + (isLast ? '    ' : '│   ');
      printNode(child.id, childIndent);
    }
  };
  
  printNode(null);
  
  // 统计信息
  console.log();
  console.log(chalk.gray(`总计: ${agents.length} 个智能体`));
  console.log(chalk.gray(`  活跃: ${agents.filter(a => a.status === 'active').length}`));
  console.log(chalk.gray(`  空闲: ${agents.filter(a => a.status === 'idle').length}`));
  console.log();
}

/**
 * 格式化状态
 */
function formatStatus(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('active');
    case 'idle':
      return chalk.yellow('idle');
    case 'terminated':
      return chalk.red('terminated');
    default:
      return status;
  }
}

/**
 * 格式化状态点
 */
function formatStatusDot(status: string): string {
  switch (status) {
    case 'active':
      return chalk.green('●');
    case 'idle':
      return chalk.yellow('○');
    case 'terminated':
      return chalk.red('○');
    default:
      return '○';
  }
}
