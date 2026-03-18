#!/usr/bin/env node

/**
 * backup-database.js — 数据库自动备份脚本 (P2 优化)
 * 功能：
 *   1. 每天自动备份 cyd.json 到 backups/ 目录
 *   2. 保留最近 30 天的备份
 *   3. 生成备份索引
 *   4. 支持手动备份和恢复
 * 
 * 使用：
 *   node backup-database.js backup     # 立即备份
 *   node backup-database.js restore    # 列出所有备份
 *   node backup-database.js restore <timestamp>  # 恢复指定备份
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(__dirname, 'backups');
const DB_FILE = path.join(DATA_DIR, 'cyd.json');
const BACKUP_INDEX = path.join(BACKUP_DIR, 'backup-index.json');
const MAX_BACKUPS = 30; // 保留最近 30 天

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log(`✓ 创建备份目录: ${BACKUP_DIR}`);
}

// 计算文件 MD5
function calculateMD5(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(content).digest('hex');
}

// 加载备份索引
function loadBackupIndex() {
  if (fs.existsSync(BACKUP_INDEX)) {
    try {
      return JSON.parse(fs.readFileSync(BACKUP_INDEX, 'utf8'));
    } catch (e) {
      console.warn('⚠️ 备份索引损坏，重新创建');
      return { backups: [] };
    }
  }
  return { backups: [] };
}

// 保存备份索引
function saveBackupIndex(index) {
  fs.writeFileSync(BACKUP_INDEX, JSON.stringify(index, null, 2), 'utf8');
}

// 执行备份
function backup() {
  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ 数据库文件不存在:', DB_FILE);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
  const backupFile = path.join(BACKUP_DIR, `cyd_${timestamp}.json`);
  
  // 读取原文件
  const dbContent = fs.readFileSync(DB_FILE, 'utf8');
  const md5 = calculateMD5(DB_FILE);
  
  // 写入备份
  fs.writeFileSync(backupFile, dbContent, 'utf8');
  
  // 更新索引
  const index = loadBackupIndex();
  index.backups.push({
    timestamp: new Date().toISOString(),
    filename: path.basename(backupFile),
    size: fs.statSync(backupFile).size,
    md5,
    description: '自动备份'
  });

  // 清理过期备份（保留最近 30 天）
  if (index.backups.length > MAX_BACKUPS) {
    const toDelete = index.backups.slice(0, index.backups.length - MAX_BACKUPS);
    toDelete.forEach(backup => {
      const oldFile = path.join(BACKUP_DIR, backup.filename);
      if (fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
        console.log(`🗑️  删除过期备份: ${backup.filename}`);
      }
    });
    index.backups = index.backups.slice(-MAX_BACKUPS);
  }

  saveBackupIndex(index);
  
  console.log(`✅ 备份成功`);
  console.log(`   文件: ${path.basename(backupFile)}`);
  console.log(`   大小: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
  console.log(`   MD5: ${md5}`);
  console.log(`   保留备份数: ${index.backups.length}/${MAX_BACKUPS}`);
}

// 列出所有备份
function listBackups() {
  const index = loadBackupIndex();
  if (index.backups.length === 0) {
    console.log('📭 暂无备份');
    return;
  }

  console.log(`\n📦 备份列表（共 ${index.backups.length} 个）\n`);
  console.log('序号 | 时间                     | 文件                          | 大小      | MD5');
  console.log('-'.repeat(90));
  
  index.backups.forEach((backup, idx) => {
    const time = new Date(backup.timestamp).toLocaleString('zh-CN');
    const size = (backup.size / 1024).toFixed(2);
    const md5Short = backup.md5.substring(0, 8);
    console.log(`${idx + 1}    | ${time} | ${backup.filename.padEnd(28)} | ${size.padStart(6)} KB | ${md5Short}...`);
  });
}

// 恢复备份
function restore(backupTimestamp) {
  const index = loadBackupIndex();
  
  if (!backupTimestamp) {
    console.log('❌ 请指定要恢复的备份时间戳或序号');
    console.log('用法: node backup-database.js restore <timestamp_or_index>');
    listBackups();
    process.exit(1);
  }

  let backupFile = null;
  const backupIndex = parseInt(backupTimestamp);
  
  if (!isNaN(backupIndex) && backupIndex > 0 && backupIndex <= index.backups.length) {
    // 使用序号
    backupFile = index.backups[backupIndex - 1].filename;
  } else {
    // 搜索时间戳
    const backup = index.backups.find(b => b.filename.includes(backupTimestamp));
    if (backup) {
      backupFile = backup.filename;
    }
  }

  if (!backupFile) {
    console.error('❌ 找不到备份:', backupTimestamp);
    listBackups();
    process.exit(1);
  }

  const backupPath = path.join(BACKUP_DIR, backupFile);
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ 备份文件不存在:', backupPath);
    process.exit(1);
  }

  // 创建当前数据的备份（以防恢复出错）
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
  const recoveryBackup = path.join(BACKUP_DIR, `cyd_recovery_${timestamp}.json`);
  fs.copyFileSync(DB_FILE, recoveryBackup);
  
  // 恢复备份
  const backupContent = fs.readFileSync(backupPath, 'utf8');
  fs.writeFileSync(DB_FILE, backupContent, 'utf8');
  
  console.log(`✅ 恢复成功`);
  console.log(`   备份文件: ${backupFile}`);
  console.log(`   恢复备份: ${path.basename(recoveryBackup)}`);
  console.log(`\n⚠️  原数据已备份到: ${path.basename(recoveryBackup)}`);
  console.log(`   如需撤销恢复，可执行: node backup-database.js restore ${timestamp.split('_')[0]}`);
}

// 主函数
const command = process.argv[2] || 'backup';
const arg = process.argv[3];

switch (command) {
  case 'backup':
    backup();
    break;
  case 'list':
    listBackups();
    break;
  case 'restore':
    restore(arg);
    break;
  case 'help':
    console.log(`
数据库备份工具 - 使用说明

命令：
  node backup-database.js backup              # 立即备份数据库
  node backup-database.js list                # 列出所有备份
  node backup-database.js restore <id>        # 恢复指定备份（使用序号或时间戳）
  node backup-database.js help                # 显示帮助

示例：
  node backup-database.js backup              # 创建新备份
  node backup-database.js list                # 查看备份列表
  node backup-database.js restore 1           # 恢复第 1 个备份
  node backup-database.js restore 2026-03-18  # 恢复指定日期的备份

配置：
  - 最大保留备份数: ${MAX_BACKUPS} 个
  - 备份位置: ${BACKUP_DIR}
  - 数据库文件: ${DB_FILE}
    `);
    break;
  default:
    console.error('❌ 未知命令:', command);
    console.log('执行 "node backup-database.js help" 查看帮助');
    process.exit(1);
}
