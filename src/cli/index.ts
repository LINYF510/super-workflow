#!/usr/bin/env node

/**
 * Super Workflow CLI
 * 
 * 基于 iFlow CLI 的动态工作流系统
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { agentsCommand } from './commands/agents.js';
import { chatCommand } from './commands/chat.js';
import { assignCommand } from './commands/assign.js';
import { tasksCommand } from './commands/tasks.js';

const program = new Command();

program
  .name('iflow')
  .description('基于 iFlow CLI 的动态工作流系统 - 按需生成智能体、动态分配任务、自动发现技能')
  .version('0.1.0');

// 注册命令
program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(agentsCommand);
program.addCommand(chatCommand);
program.addCommand(assignCommand);
program.addCommand(tasksCommand);

// 错误处理
program.exitOverride((err) => {
  if (err.code === 'commander.help' || err.code === 'commander.version') {
    process.exit(0);
  }
  if (err.code === 'commander.helpDisplayed') {
    process.exit(0);
  }
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
});

// 解析命令行参数
program.parse();
