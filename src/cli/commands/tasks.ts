/**
 * iflow tasks 命令
 * 
 * 查看任务
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { join } from 'path';
import { existsSync } from 'fs';
import { initDatabase, closeDatabase, TaskRepository, AgentRepository } from '../../services/storage/index.js';
import type { TaskStatus } from '../../types/index.js';

export const tasksCommand = new Command('tasks')
  .description('查看任务')
  .option('-a, --agent <agent-id>', '按智能体过滤')
  .option('-s, --status <status>', '按状态过滤 (pending|running|completed|failed|cancelled)')
  .option('-j, --json', 'JSON 格式输出')
  .option('-l, --limit <number>', '限制数量', '20')
  .action((options: { agent?: string; status?: string; json?: boolean; limit?: string }) => {
    try {
      // 初始化数据库
      const iflowDir = join(process.cwd(), '.iflow');
      if (!existsSync(iflowDir)) {
        console.log(chalk.red('未找到项目配置目录 .iflow/'));
        console.log(chalk.gray('请先运行 iflow init <project-name> 初始化项目'));
        process.exit(1);
      }
      
      initDatabase({ path: join(iflowDir, 'state.db') });
      
      const taskRepo = new TaskRepository();
      const agentRepo = new AgentRepository();
      
      let tasks = taskRepo.findAll({ orderBy: 'created_at', orderDirection: 'DESC' });
      
      // 智能体过滤
      if (options.agent) {
        tasks = tasks.filter(t => t.agentId === options.agent);
      }
      
      // 状态过滤
      if (options.status) {
        tasks = tasks.filter(t => t.status === options.status);
      }
      
      // 数量限制
      const limit = parseInt(options.limit ?? '20', 10);
      tasks = tasks.slice(0, limit);
      
      closeDatabase();
      
      // JSON 输出
      if (options.json) {
        console.log(JSON.stringify(tasks, null, 2));
        return;
      }
      
      // 表格输出
      printTaskTable(tasks, agentRepo);
      
    } catch (error) {
      console.error(chalk.red('查询失败'));
      console.error(error);
      closeDatabase();
      process.exit(1);
    }
  });

/**
 * 打印任务表格
 */
function printTaskTable(
  tasks: ReturnType<TaskRepository['findAll']>,
  agentRepo: AgentRepository
): void {
  if (tasks.length === 0) {
    console.log(chalk.gray('暂无任务'));
    return;
  }
  
  const agentCache = new Map<string, string>();
  
  const getAgentName = (agentId: string): string => {
    if (!agentCache.has(agentId)) {
      const agent = agentRepo.findById(agentId);
      agentCache.set(agentId, agent?.name ?? agentId);
    }
    return agentCache.get(agentId)!;
  };
  
  const data = [
    ['ID', '标题', '智能体', '状态', '优先级', '创建时间'],
    ...tasks.map(task => [
      task.id.substring(0, 8),
      task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
      getAgentName(task.agentId),
      formatStatus(task.status),
      formatPriority(task.priority),
      task.createdAt.toLocaleString(),
    ]),
  ];
  
  console.log();
  console.log(table(data));
}

/**
 * 格式化状态
 */
function formatStatus(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return chalk.gray('pending');
    case 'running':
      return chalk.blue('running');
    case 'completed':
      return chalk.green('completed');
    case 'failed':
      return chalk.red('failed');
    case 'cancelled':
      return chalk.yellow('cancelled');
    case 'paused':
      return chalk.cyan('paused');
    default:
      return status;
  }
}

/**
 * 格式化优先级
 */
function formatPriority(priority: string): string {
  switch (priority) {
    case 'critical':
      return chalk.red('critical');
    case 'high':
      return chalk.yellow('high');
    case 'medium':
      return chalk.blue('medium');
    case 'low':
      return chalk.gray('low');
    default:
      return priority;
  }
}
