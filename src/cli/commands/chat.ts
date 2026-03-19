/**
 * iflow chat 命令
 * 
 * 与智能体交互
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { join } from 'path';
import { existsSync } from 'fs';
import { initDatabase, closeDatabase, AgentRepository, MessageRepository } from '../../services/storage/index.js';

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
  agent: ReturnType<AgentRepository['findById']>,
  messageRepo: MessageRepository
): Promise<void> {
  if (!agent) return;
  
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
    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] 消息已发送`));
    
    // 模拟智能体响应
    // TODO: 实际调用智能体处理逻辑
    console.log(chalk.green(`${agent.name}:`));
    console.log(chalk.gray('收到您的消息，正在处理中...'));
    console.log();
  }
}
