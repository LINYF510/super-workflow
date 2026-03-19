/**
 * Message Repository
 * 
 * 消息数据访问层
 */

import type { Message, MessageType, MessagePriority, CreateMessageInput, MessageFilter } from '../../../types/index.js';
import { BaseRepository } from './base.js';

/**
 * 消息 Repository
 */
export class MessageRepository extends BaseRepository<Message, CreateMessageInput> {
  protected tableName = 'messages';
  
  protected columnMap: Record<keyof Message, string> = {
    id: 'id',
    fromAgent: 'from_agent',
    toAgent: 'to_agent',
    type: 'type',
    priority: 'priority',
    content: 'content',
    requiresResponse: 'requires_response',
    taskId: 'task_id',
    replyTo: 'reply_to',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    readAt: 'read_at',
  };
  
  protected rowToEntity(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      fromAgent: row.from_agent as string,
      toAgent: row.to_agent as string,
      type: row.type as MessageType,
      priority: row.priority as MessagePriority,
      content: JSON.parse(row.content as string) as Record<string, unknown>,
      requiresResponse: row.requires_response === 1,
      taskId: row.task_id as string | null,
      replyTo: row.reply_to as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      readAt: row.read_at ? new Date(row.read_at as string) : null,
    };
  }
  
  protected entityToRow(entity: Partial<Message>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    
    if (entity.id !== undefined) row.id = entity.id;
    if (entity.fromAgent !== undefined) row.from_agent = entity.fromAgent;
    if (entity.toAgent !== undefined) row.to_agent = entity.toAgent;
    if (entity.type !== undefined) row.type = entity.type;
    if (entity.priority !== undefined) row.priority = entity.priority;
    if (entity.content !== undefined) row.content = JSON.stringify(entity.content);
    if (entity.requiresResponse !== undefined) row.requires_response = entity.requiresResponse ? 1 : 0;
    if (entity.taskId !== undefined) row.task_id = entity.taskId;
    if (entity.replyTo !== undefined) row.reply_to = entity.replyTo;
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt.toISOString();
    if (entity.updatedAt !== undefined) row.updated_at = entity.updatedAt.toISOString();
    if (entity.readAt !== undefined) row.read_at = entity.readAt?.toISOString() ?? null;
    
    return row;
  }
  
  protected buildEntity(input: CreateMessageInput): Message {
    const now = new Date();
    return {
      id: this.generateId(),
      fromAgent: input.fromAgent,
      toAgent: input.toAgent,
      type: input.type,
      priority: input.priority ?? 'normal',
      content: input.content,
      requiresResponse: input.requiresResponse ?? false,
      taskId: input.taskId ?? null,
      replyTo: input.replyTo ?? null,
      createdAt: now,
      updatedAt: now,
      readAt: null,
    };
  }
  
  /**
   * 按发送方查找消息
   */
  findByFromAgent(fromAgent: string): Message[] {
    return this.findWhere({ fromAgent });
  }
  
  /**
   * 按接收方查找消息
   */
  findByToAgent(toAgent: string): Message[] {
    return this.findWhere({ toAgent });
  }
  
  /**
   * 获取智能体的收件箱
   */
  getInbox(agentId: string, unreadOnly = false): Message[] {
    const messages = this.findByToAgent(agentId);
    if (unreadOnly) {
      return messages.filter((m) => m.readAt === null);
    }
    return messages;
  }
  
  /**
   * 获取智能体的发件箱
   */
  getOutbox(agentId: string): Message[] {
    return this.findByFromAgent(agentId);
  }
  
  /**
   * 获取两个智能体之间的对话
   */
  getConversation(agent1Id: string, agent2Id: string): Message[] {
    const sent = this.findWhere({ fromAgent: agent1Id, toAgent: agent2Id });
    const received = this.findWhere({ fromAgent: agent2Id, toAgent: agent1Id });
    return [...sent, ...received].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }
  
  /**
   * 按任务查找消息
   */
  findByTaskId(taskId: string): Message[] {
    return this.findWhere({ taskId });
  }
  
  /**
   * 按过滤器查找消息
   */
  findByFilter(filter: MessageFilter): Message[] {
    const conditions: Partial<Record<keyof Message, unknown>> = {};
    
    if (filter.fromAgent) conditions.fromAgent = filter.fromAgent;
    if (filter.toAgent) conditions.toAgent = filter.toAgent;
    if (filter.taskId) conditions.taskId = filter.taskId;
    
    let results = this.findWhere(conditions);
    
    // 类型过滤
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      results = results.filter((m) => types.includes(m.type));
    }
    
    // 未读过滤
    if (filter.unread) {
      results = results.filter((m) => m.readAt === null);
    }
    
    // 时间过滤
    if (filter.createdAfter) {
      results = results.filter((m) => m.createdAt >= filter.createdAfter!);
    }
    if (filter.createdBefore) {
      results = results.filter((m) => m.createdAt <= filter.createdBefore!);
    }
    
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * 标记消息为已读
   */
  markAsRead(id: string): Message | null {
    return this.update(id, { readAt: new Date() });
  }
  
  /**
   * 批量标记为已读
   */
  markAllAsRead(agentId: string): number {
    const messages = this.getInbox(agentId, true);
    for (const message of messages) {
      this.markAsRead(message.id);
    }
    return messages.length;
  }
  
  /**
   * 获取未读数量
   */
  getUnreadCount(agentId: string): number {
    return this.getInbox(agentId, true).length;
  }
}
