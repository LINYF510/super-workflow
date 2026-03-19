/**
 * iflow start 命令
 * 
 * 启动主智能体
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { initDatabase, closeDatabase } from '../../services/storage/index.js';
import { Orchestrator } from '../../core/orchestrator/index.js';

export const startCommand = new Command('start')
  .description('启动主智能体')
  .option('-p, --project <name>', '项目名称或路径')
  .option('-d, --description <desc>', '项目描述（新项目）')
  .action(async (options: { project?: string; description?: string }) => {
    const spinner = ora('正在启动...').start();
    
    try {
      // 确定项目目录
      let projectDir = options.project 
        ? join(process.cwd(), options.project)
        : process.cwd();
      
      // 检查是否在项目目录中
      const iflowDir = join(projectDir, '.iflow');
      if (!existsSync(iflowDir)) {
        spinner.fail(chalk.red('未找到项目配置目录 .iflow/'));
        console.log(chalk.gray('请先运行 iflow init <project-name> 初始化项目'));
        process.exit(1);
      }
      
      // 切换到项目目录
      process.chdir(projectDir);
      
      // 初始化数据库
      initDatabase({ path: join(iflowDir, 'state.db') });
      
      // 读取项目配置
      const projectConfig = JSON.parse(
        readFileSync(join(iflowDir, 'project.json'), 'utf-8')
      );
      
      spinner.succeed(chalk.green('项目加载成功'));
      
      // 创建 Orchestrator
      const orchestrator = new Orchestrator({
        projectName: projectConfig.name,
        projectDescription: projectConfig.description || options.description,
      });
      
      await orchestrator.initialize();
      
      console.log();
      console.log(chalk.bold.blue('🚀 Super Workflow 启动'));
      console.log(chalk.gray(`📦 项目: ${projectConfig.name}`));
      console.log();
      
      // 进入交互模式
      await interactiveMode(orchestrator);
      
    } catch (error) {
      spinner.fail(chalk.red('启动失败'));
      console.error(error);
      closeDatabase();
      process.exit(1);
    }
  });

/**
 * 交互模式
 */
async function interactiveMode(orchestrator: Orchestrator): Promise<void> {
  console.log(chalk.bold('主智能体已就绪，请告诉我您要做什么？'));
  console.log(chalk.gray('输入 "help" 查看帮助，"exit" 退出'));
  console.log();
  
  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.blue('>'),
        prefix: '',
      },
    ]);
    
    const command = input.trim().toLowerCase();
    
    if (command === 'exit' || command === 'quit') {
      console.log(chalk.gray('再见！'));
      orchestrator.shutdown();
      closeDatabase();
      break;
    }
    
    if (command === 'help') {
      showHelp();
      continue;
    }
    
    if (command === 'agents') {
      showAgents(orchestrator);
      continue;
    }
    
    if (command === 'tree') {
      showAgentTree(orchestrator);
      continue;
    }
    
    if (command === 'status') {
      showStatus(orchestrator);
      continue;
    }
    
    // 分析需求
    if (input.trim()) {
      console.log();
      console.log(chalk.gray('📋 正在分析需求...'));
      
      try {
        const analysis = await orchestrator.analyzeProject(input);
        
        console.log();
        console.log(chalk.bold('识别结果:'));
        console.log(chalk.gray(`  行业领域: ${analysis.industry}`));
        console.log(chalk.gray(`  建议职位: ${analysis.roles.map(r => r.name).join(', ')}`));
        console.log();
        
        const { createOrg } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'createOrg',
            message: '是否创建组织架构？',
            default: true,
          },
        ]);
        
        if (createOrg) {
          const agents = await orchestrator.createOrganization(analysis);
          
          console.log();
          console.log(chalk.bold.green('✓ 组织架构创建成功'));
          console.log(chalk.gray(`  已创建 ${agents.length} 个智能体`));
          console.log();
          
          showAgentTree(orchestrator);
        }
        
      } catch (error) {
        console.log(chalk.red('分析失败'));
        console.error(error);
      }
    }
    
    console.log();
  }
}

/**
 * 显示帮助
 */
function showHelp(): void {
  console.log();
  console.log(chalk.bold('命令:'));
  console.log(chalk.gray('  agents    - 查看所有智能体'));
  console.log(chalk.gray('  tree      - 查看智能体树'));
  console.log(chalk.gray('  status    - 查看系统状态'));
  console.log(chalk.gray('  help      - 显示帮助'));
  console.log(chalk.gray('  exit      - 退出程序'));
  console.log();
  console.log(chalk.bold('交互:'));
  console.log(chalk.gray('  输入项目需求描述，主智能体会分析并建议组织架构'));
  console.log();
}

/**
 * 显示智能体列表
 */
function showAgents(orchestrator: Orchestrator): void {
  const agents = orchestrator.getAllAgents();
  
  console.log();
  console.log(chalk.bold(`智能体列表 (${agents.length}):`));
  
  for (const agent of agents) {
    const status = agent.status === 'active' ? chalk.green('●') : 
                   agent.status === 'idle' ? chalk.yellow('○') : 
                   chalk.red('○');
    console.log(`  ${status} ${agent.name} (${agent.role})`);
  }
  console.log();
}

/**
 * 显示智能体树
 */
function showAgentTree(orchestrator: Orchestrator): void {
  const agents = orchestrator.getAgentTree();
  
  console.log();
  console.log(chalk.bold('组织架构:'));
  
  const printTree = (parentId: string | null, indent: string = '') => {
    const children = agents.filter(a => a.parentId === parentId);
    for (const child of children) {
      const status = child.status === 'active' ? chalk.green('●') : chalk.yellow('○');
      console.log(`${indent}${status} ${child.name}`);
      printTree(child.id, indent + '  ');
    }
  };
  
  printTree(null);
  console.log();
}

/**
 * 显示状态
 */
function showStatus(orchestrator: Orchestrator): void {
  const mainAgent = orchestrator.getOrchestratorAgent();
  const agents = orchestrator.getAllAgents();
  
  console.log();
  console.log(chalk.bold('系统状态:'));
  console.log(chalk.gray(`  主智能体: ${mainAgent?.name ?? '未初始化'}`));
  console.log(chalk.gray(`  智能体数量: ${agents.length}`));
  console.log(chalk.gray(`  活跃: ${agents.filter(a => a.status === 'active').length}`));
  console.log(chalk.gray(`  空闲: ${agents.filter(a => a.status === 'idle').length}`));
  console.log();
}
