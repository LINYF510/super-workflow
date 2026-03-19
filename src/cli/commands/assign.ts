/**
 * iflow assign 命令
 * 
 * 分配任务
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { join } from 'path';
import { existsSync } from 'fs';
import { initDatabase, closeDatabase, AgentRepository, TaskRepository, MessageRepository } from '../../services/storage/index.js';

export const assignCommand = new Command('assign')
  .description('分配任务')
  .argument('[agent-id]', '智能体 ID')
  .argument('[task]', '任务描述')
  .option('-p, --priority <priority>', '优先级 (low|medium|high|critical)', 'medium')
  .action(async (agentId?: string, task?: string, options?: { priority?: string }) => {
    try {
      // 初始化数据库
      const iflowDir = join(process.cwd(), '.iflow');
      if (!existsSync(iflowDir)) {
        console.log(chalk.red('未找到项目配置目录 .iflow/'));
        console.log(chalk.gray('请先运行 iflow init <project-name> 初始化项目'));
        process.exit(1);
      }
      
      initDatabase({ path: join(iflowDir, 'state.db') });
      
      const agentRepo = new AgentRepository();
      const taskRepo = new TaskRepository();
      const messageRepo = new MessageRepository();
      
      // 如果没有指定智能体，让用户选择
      if (!agentId) {
        const agents = agentRepo.findAll();
        
        if (agents.length === 0) {
          console.log(chalk.gray('暂无智能体'));
          closeDatabase();
          return;
        }
        
        const { selectedAgent } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedAgent',
            message: '选择智能体:',
            choices: agents.map(a => ({
              name: `${a.name} (${a.role}) - ${a.status}`,
              value: a.id,
            })),
          },
        ]);
        
        agentId = selectedAgent as string;
      }
      
      const agent = agentRepo.findById(agentId);
      if (!agent) {
        console.log(chalk.red(`智能体不存在: ${agentId}`));
        closeDatabase();
        return;
      }
      
      // 如果没有指定任务，让用户输入
      if (!task) {
        const { taskInput } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'taskInput',
            message: '输入任务描述:',
          },
        ]);
        
        task = taskInput as string;
      }
      
      // 创建任务
      const firstLine = task.split('\n')[0] ?? '';
      const priority = options?.priority as 'low' | 'medium' | 'high' | 'critical' | undefined;
      const newTask = taskRepo.create({
        agentId: agent.id,
        title: firstLine.substring(0, 50),
        description: task,
        ...(priority !== undefined ? { priority } : {}),
      });
      
      // 发送消息
      const messagePriority = priority === 'critical' ? 'urgent' : priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal';
      messageRepo.create({
        fromAgent: 'user',
        toAgent: agent.id,
        type: 'task_assign',
        priority: messagePriority,
        content: {
          taskId: newTask.id,
          title: newTask.title,
          description: newTask.description,
        },
        requiresResponse: true,
      });
      
      // 更新智能体状态
      agentRepo.updateStatus(agent.id, 'active');
      
      closeDatabase();
      
      console.log();
      console.log(chalk.green('✓ 任务已分配'));
      console.log(chalk.gray(`  智能体: ${agent.name}`));
      console.log(chalk.gray(`  任务 ID: ${newTask.id}`));
      console.log(chalk.gray(`  优先级: ${newTask.priority}`));
      console.log();
      
    } catch (error) {
      console.error(chalk.red('分配失败'));
      console.error(error);
      closeDatabase();
      process.exit(1);
    }
  });
