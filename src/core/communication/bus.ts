/**
 * Message Bus
 * 
 * 智能体间消息传递总线
 */

import { MessageRepository } from '../../services/storage/index.js';
import type { Message, CreateMessageInput, MessageType } from '../../types/index.js';

/** 消息监听器 */
type MessageListener = (message: Message) => void | Promise<void>;

/**
 * MessageBus 类
 */
export class MessageBus {
  private messageRepo: MessageRepository;
  private listeners: Map<string, Set<MessageListener>>;
  
  constructor() {
    this.messageRepo = new MessageRepository();
    this.listeners = new Map();
  }
  
  /**
   * 发送消息
   */
  async send(input: CreateMessageInput): Promise<Message> {
    const message = this.messageRepo.create(input);
    
    // 通知监听器
    await this.notifyListeners(message);
    
    return message;
  }
  
  /**
   * 获取消息
   */
  getMessage(id: string): Message | null {
    return this.messageRepo.findById(id);
  }
  
  /**
   * 获取智能体收件箱
   */
  getInbox(agentId: string, unreadOnly = false): Message[] {
    return this.messageRepo.getInbox(agentId, unreadOnly);
  }
  
  /**
   * 获取智能体发件箱
   */
  getOutbox(agentId: string): Message[] {
    return this.messageRepo.getOutbox(agentId);
  }
  
  /**
   * 获取对话
   */
  getConversation(agent1Id: string, agent2Id: string): Message[] {
    return this.messageRepo.getConversation(agent1Id, agent2Id);
  }
  
  /**
   * 标记消息已读
   */
  markAsRead(messageId: string): Message | null {
    return this.messageRepo.markAsRead(messageId);
  }
  
  /**
   * 批量标记已读
   */
  markAllAsRead(agentId: string): number {
    return this.messageRepo.markAllAsRead(agentId);
  }
  
  /**
   * 获取未读数量
   */
  getUnreadCount(agentId: string): number {
    return this.messageRepo.getUnreadCount(agentId);
  }
  
  /**
   * 订阅消息
   */
  subscribe(agentId: string, listener: MessageListener): () => void {
    if (!this.listeners.has(agentId)) {
      this.listeners.set(agentId, new Set());
    }
    
    this.listeners.get(agentId)!.add(listener);
    
    // 返回取消订阅函数
    return () => {
      this.listeners.get(agentId)?.delete(listener);
    };
  }
  
  /**
   * 通知监听器
   */
  private async notifyListeners(message: Message): Promise<void> {
    const listeners = this.listeners.get(message.toAgent);
    if (!listeners) return;
    
    for (const listener of listeners) {
      try {
        await listener(message);
      } catch (error) {
        console.error(`Message listener error: ${error}`);
      }
    }
  }
  
  /**
   * 广播消息给所有下属
   */
  async broadcast(
    fromAgent: string,
    toAgents: string[],
    type: MessageType,
    content: Record<string, unknown>
  ): Promise<Message[]> {
    const messages: Message[] = [];
    
    for (const toAgent of toAgents) {
      const message = await this.send({
        fromAgent,
        toAgent,
        type,
        content,
      });
      messages.push(message);
    }
    
    return messages;
  }
  
  /**
   * 关闭消息总线
   */
  shutdown(): void {
    this.listeners.clear();
  }
}
