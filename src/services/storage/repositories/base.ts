/**
 * 基础 Repository
 * 
 * 提供通用的 CRUD 操作
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database.js';

/** 基础实体接口 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 创建输入接口 */
export interface CreateInput {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** 查询选项 */
export interface FindOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * 基础 Repository 抽象类
 */
export abstract class BaseRepository<T extends BaseEntity, CreateInputType> {
  /** 表名 */
  protected abstract tableName: string;
  
  /** 列名映射（TypeScript 属性名 -> 数据库列名） */
  protected abstract columnMap: Record<keyof T, string>;
  
  /**
   * 将数据库行转换为实体
   */
  protected abstract rowToEntity(row: Record<string, unknown>): T;
  
  /**
   * 将实体转换为数据库行
   */
  protected abstract entityToRow(entity: Partial<T>): Record<string, unknown>;
  
  /**
   * 生成 UUID
   */
  protected generateId(): string {
    return uuidv4();
  }
  
  /**
   * 查找单个实体
   */
  findById(id: string): T | null {
    const db = getDatabase();
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const row = db.prepare(sql).get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToEntity(row) : null;
  }
  
  /**
   * 查找所有实体
   */
  findAll(options?: FindOptions): T[] {
    const db = getDatabase();
    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection ?? 'ASC'}`;
    }
    
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    
    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }
    
    const rows = db.prepare(sql).all() as Record<string, unknown>[];
    return rows.map((row) => this.rowToEntity(row));
  }
  
  /**
   * 按条件查找
   */
  findWhere(conditions: Partial<Record<keyof T, unknown>>): T[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined) {
        const column = this.columnMap[key as keyof T];
        whereClauses.push(`${column} = ?`);
        values.push(value);
      }
    }
    
    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClauses.join(' AND ')}`;
    const rows = db.prepare(sql).all(...values) as Record<string, unknown>[];
    return rows.map((row) => this.rowToEntity(row));
  }
  
  /**
   * 创建实体
   */
  create(input: CreateInputType): T {
    const db = getDatabase();
    const entity = this.buildEntity(input);
    const row = this.entityToRow(entity);
    
    const columns = Object.keys(row).join(', ');
    const placeholders = Object.keys(row).map(() => '?').join(', ');
    const values = Object.values(row);
    
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    db.prepare(sql).run(...values);
    
    return entity;
  }
  
  /**
   * 更新实体
   */
  update(id: string, updates: Partial<T>): T | null {
    const db = getDatabase();
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }
    
    const row = this.entityToRow({ ...updates, updatedAt: new Date() } as Partial<T>);
    const setClauses = Object.keys(row)
      .filter((key) => key !== 'id')
      .map((key) => `${key} = ?`);
    const values = [...Object.values(row).filter((_, i) => Object.keys(row)[i] !== 'id'), id];
    
    const sql = `UPDATE ${this.tableName} SET ${setClauses.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
    
    return this.findById(id);
  }
  
  /**
   * 删除实体
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = db.prepare(sql).run(id);
    return result.changes > 0;
  }
  
  /**
   * 计数
   */
  count(conditions?: Partial<Record<keyof T, unknown>>): number {
    const db = getDatabase();
    
    if (!conditions || Object.keys(conditions).length === 0) {
      const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const row = db.prepare(sql).get() as { count: number };
      return row.count;
    }
    
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    
    for (const [key, value] of Object.entries(conditions)) {
      if (value !== undefined) {
        const column = this.columnMap[key as keyof T];
        whereClauses.push(`${column} = ?`);
        values.push(value);
      }
    }
    
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClauses.join(' AND ')}`;
    const row = db.prepare(sql).get(...values) as { count: number };
    return row.count;
  }
  
  /**
   * 构建实体（由子类实现）
   */
  protected abstract buildEntity(input: CreateInputType): T;
}
