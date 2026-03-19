/**
 * iflow init 命令
 * 
 * 初始化新项目
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { initDatabase, closeDatabase } from '../../services/storage/index.js';

export const initCommand = new Command('init')
  .description('初始化新项目')
  .argument('<project-name>', '项目名称')
  .option('-d, --description <desc>', '项目描述')
  .option('-f, --force', '强制覆盖已存在的项目')
  .action(async (projectName: string, options: { description?: string; force?: boolean }) => {
    const spinner = ora('正在初始化项目...').start();
    
    try {
      // 处理 "." 作为项目名的情况
      const actualProjectName = projectName === '.' 
        ? process.cwd().split('/').pop() || 'my-project'
        : projectName;
      
      const projectDir = projectName === '.' 
        ? process.cwd() 
        : join(process.cwd(), projectName);
      
      const iflowDir = join(projectDir, '.iflow');
      
      // 检查是否已初始化（.iflow 目录存在）
      if (existsSync(iflowDir) && !options.force) {
        spinner.fail(chalk.red(`项目已初始化: ${actualProjectName}`));
        console.log(chalk.gray('使用 --force 选项强制重新初始化'));
        process.exit(1);
      }
      
      // 创建项目目录
      if (!existsSync(projectDir)) {
        mkdirSync(projectDir, { recursive: true });
      }
      
      // 创建 .iflow 目录
      if (!existsSync(iflowDir)) {
        mkdirSync(iflowDir, { recursive: true });
      }
      
      // 初始化数据库
      process.chdir(projectDir);
      initDatabase({ path: join(iflowDir, 'state.db') });
      
      // 创建项目配置文件
      const projectConfig = {
        name: actualProjectName,
        description: options.description ?? '',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      };
      
      writeFileSync(
        join(iflowDir, 'project.json'),
        JSON.stringify(projectConfig, null, 2)
      );
      
      // 创建 orchestrator 配置
      const orchestratorConfig = {
        id: 'orchestrator-001',
        name: '主智能体',
        role: 'orchestrator',
        status: 'idle',
        createdAt: new Date().toISOString(),
      };
      
      writeFileSync(
        join(iflowDir, 'orchestrator.json'),
        JSON.stringify(orchestratorConfig, null, 2)
      );
      
      closeDatabase();
      
      spinner.succeed(chalk.green(`项目 ${actualProjectName} 初始化成功！`));
      
      console.log();
      console.log(chalk.bold('下一步:'));
      if (projectName !== '.') {
        console.log(chalk.gray(`  cd ${projectName}`));
      }
      console.log(chalk.gray('  sw start'));
      console.log();
      
    } catch (error) {
      spinner.fail(chalk.red('初始化失败'));
      console.error(error);
      process.exit(1);
    }
  });
