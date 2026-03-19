/**
 * Skill Installer
 * 
 * 安装和管理 skills
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import type { SkillInstallConfig, SkillsLockFile, SkillLockEntry } from '../../types/index.js';

/** 默认 skills 目录 */
const DEFAULT_SKILLS_DIR = '.agents/skills';

/** skills-lock.json 路径 */
const SKILLS_LOCK_FILE = 'skills-lock.json';

/**
 * 安装 skill
 */
export async function installSkill(config: SkillInstallConfig): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  const { source, sourceType = 'github', global = false, yes = true } = config;
  
  try {
    // 构建 npx skills add 命令
    let command = `npx skills add ${source}`;
    if (global) command += ' -g';
    if (yes) command += ' -y';
    
    // 执行安装命令
    execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    // 获取安装路径
    const installPath = getInstallPath(source, global);
    
    // 计算内容哈希
    const computedHash = await computeDirectoryHash(installPath);
    
    // 更新 skills-lock.json
    updateSkillsLock(source, sourceType, computedHash);
    
    return {
      success: true,
      path: installPath,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 批量安装 skills
 */
export async function installSkills(
  configs: SkillInstallConfig[]
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>();
  
  for (const config of configs) {
    const result = await installSkill(config);
    results.set(config.source, result);
  }
  
  return results;
}

/**
 * 获取安装路径
 */
function getInstallPath(source: string, global: boolean): string {
  const skillName = extractSkillName(source);
  
  if (global) {
    // 全局安装路径
    const homeDir = process.env.HOME ?? process.env.USERPROFILE;
    const basePath = homeDir ?? '~';
    return join(basePath, '.skills', skillName);
  }
  
  // 本地安装路径
  return join(process.cwd(), DEFAULT_SKILLS_DIR, skillName);
}

/**
 * 从源字符串提取 skill 名称
 */
function extractSkillName(source: string): string {
  // 处理 owner/repo@skill 格式
  const match = source.match(/@?([^/@]+)$/);
  return match?.[1] ?? source;
}

/**
 * 计算目录内容哈希
 */
async function computeDirectoryHash(dirPath: string): Promise<string> {
  if (!existsSync(dirPath)) {
    return '';
  }
  
  const { readdirSync, statSync, readFileSync } = await import('fs');
  const files: string[] = [];
  
  function collectFiles(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        collectFiles(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  collectFiles(dirPath);
  
  const hash = createHash('sha256');
  for (const file of files.sort()) {
    const content = readFileSync(file);
    hash.update(file);
    hash.update(content);
  }
  
  return hash.digest('hex');
}

/**
 * 更新 skills-lock.json
 */
function updateSkillsLock(
  source: string,
  sourceType: string,
  computedHash: string
): void {
  const lockPath = join(process.cwd(), SKILLS_LOCK_FILE);
  let lockFile: SkillsLockFile = { version: 1, skills: {} };
  
  // 读取现有文件
  if (existsSync(lockPath)) {
    try {
      const content = readFileSync(lockPath, 'utf-8');
      lockFile = JSON.parse(content);
    } catch {
      // 忽略解析错误
    }
  }
  
  // 添加或更新条目
  const skillName = extractSkillName(source);
  const entry: SkillLockEntry = {
    source,
    sourceType: sourceType as 'github' | 'npm' | 'local',
    computedHash,
  };
  
  lockFile.skills[skillName] = entry;
  
  // 写入文件
  writeFileSync(lockPath, JSON.stringify(lockFile, null, 2));
}

/**
 * 检查 skill 是否已安装
 */
export function isSkillInstalled(skillName: string): boolean {
  const lockPath = join(process.cwd(), SKILLS_LOCK_FILE);
  
  if (!existsSync(lockPath)) {
    return false;
  }
  
  try {
    const content = readFileSync(lockPath, 'utf-8');
    const lockFile: SkillsLockFile = JSON.parse(content);
    return skillName in lockFile.skills;
  } catch {
    return false;
  }
}

/**
 * 获取已安装的 skills
 */
export function getInstalledSkills(): SkillsLockFile {
  const lockPath = join(process.cwd(), SKILLS_LOCK_FILE);
  
  if (!existsSync(lockPath)) {
    return { version: 1, skills: {} };
  }
  
  try {
    const content = readFileSync(lockPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { version: 1, skills: {} };
  }
}

/**
 * 卸载 skill
 */
export async function uninstallSkill(skillName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 执行卸载命令
    execSync(`npx skills remove ${skillName} -y`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    // 更新 skills-lock.json
    const lockPath = join(process.cwd(), SKILLS_LOCK_FILE);
    if (existsSync(lockPath)) {
      const content = readFileSync(lockPath, 'utf-8');
      const lockFile: SkillsLockFile = JSON.parse(content);
      delete lockFile.skills[skillName];
      writeFileSync(lockPath, JSON.stringify(lockFile, null, 2));
    }
    
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
