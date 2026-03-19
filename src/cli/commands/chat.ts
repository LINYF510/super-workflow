/**
 * sw chat 命令
 * 
 * 与智能体交互，集成 AI 能力
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { join } from 'path';
import { existsSync } from 'fs';
import { initDatabase, closeDatabase, AgentRepository, MessageRepository } from '../../services/storage/index.js';
import { AICapabilityProvider } from '../../services/iflow/index.js';
import type { Agent } from '../../types/index.js';

export const chatCommand = new Command('chat')
  .description('与智能体交互')
  .argument('[agent-id]', '智能体 ID')
  .action(async (agentId?: string) => {
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
              name: `${a.name} (${a.role})`,
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
      
      console.log();
      console.log(chalk.bold.blue(`💬 与 ${agent.name} 对话`));
      console.log(chalk.gray(`角色: ${agent.role}`));
      console.log(chalk.gray('输入 "exit" 退出对话'));
      console.log();
      
      // 进入对话模式
      await chatLoop(agent, messageRepo);
      
      closeDatabase();
      
    } catch (error) {
      console.error(chalk.red('对话失败'));
      console.error(error);
      closeDatabase();
      process.exit(1);
    }
  });

/**
 * 对话循环
 */
async function chatLoop(
  agent: Agent,
  messageRepo: MessageRepository
): Promise<void> {
  // 初始化 AI 能力
  let aiProvider: AICapabilityProvider | null = null;
  try {
    aiProvider = new AICapabilityProvider();
    await aiProvider.connect();
  } catch (error) {
    console.log(chalk.yellow('AI 服务连接失败，将使用离线模式'));
  }
  
  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: chalk.cyan('你:'),
        prefix: '',
      },
    ]);
    
    if (input.trim().toLowerCase() === 'exit') {
      console.log(chalk.gray('对话结束'));
      break;
    }
    
    if (!input.trim()) continue;
    
    // 发送消息
    messageRepo.create({
      fromAgent: 'user',
      toAgent: agent.id,
      type: 'query',
      content: { text: input },
    });
    
    console.log();
    
    // 使用 AI 处理
    if (aiProvider && agent.systemPrompt) {
      const spinner = ora('思考中...').start();
      try {
        const response = await aiProvider.executeWithRole(
          {
            name: agent.name,
            description: agent.role,
            responsibilities: agent.responsibilities,
            skills: agent.skills,
            systemPrompt: agent.systemPrompt,
          },
          input,
          {
            agentId: agent.id,
            summary: `你是一个 ${agent.role}，负责 ${agent.responsibilities.join('、')}`,
          }
        );
        spinner.stop();
        
        console.log(chalk.green(`${agent.name}:`));
        console.log(response);
        console.log();
        
        // 保存回复
        messageRepo.create({
          fromAgent: agent.id,
          toAgent: 'user',
          type: 'response',
          content: { text: response },
        });
      } catch (error) {
        spinner.fail(chalk.red('处理失败'));
        console.error(error);
      }
    } else {
      // 离线模式
      console.log(chalk.green(`${agent.name}:`));
      console.log(chalk.gray('收到您的消息。当前处于离线模式，无法提供智能回复。'));
      console.log(chalk.gray('请确保 iFlow CLI 已安装并运行。'));
      console.log();
    }
  }
}
