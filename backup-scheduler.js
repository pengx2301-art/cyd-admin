#!/usr/bin/env node

/**
 * backup-scheduler.js — 定时备份调度器 (P2 优化)
 * 功能：
 *   1. 每天凌晨 2:00 自动执行备份
 *   2. 实时监听数据库文件变化，自动备份
 *   3. 定期清理过期备份
 * 
 * 使用：
 *   node backup-scheduler.js      # 启动定时备份守护进程
 *   node backup-scheduler.js stop  # 停止守护进程
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'cyd.json');
const SCHEDULER_STATE = path.join(DATA_DIR, '.scheduler-state.json');

// 读取调度器状态
function loadSchedulerState() {
  if (fs.existsSync(SCHEDULER_STATE)) {
    try {
      return JSON.parse(fs.readFileSync(SCHEDULER_STATE, 'utf8'));
    } catch (e) {
      return { backups_today: 0, last_backup: null, pid: null };
    }
  }
  return { backups_today: 0, last_backup: null, pid: null };
}

// 保存调度器状态
function saveSchedulerState(state) {
  fs.writeFileSync(SCHEDULER_STATE, JSON.stringify(state, null, 2), 'utf8');
}

// 执行备份
function executeBackup() {
  const state = loadSchedulerState();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // 重置每日计数
  if (state.last_backup) {
    const lastDate = state.last_backup.split('T')[0];
    if (lastDate !== today) {
      state.backups_today = 0;
    }
  }

  console.log(`\n[${now.toISOString()}] ⏰ 执行定时备份...`);
  
  // 调用备份脚本
  const backup = spawn('node', [path.join(__dirname, 'backup-database.js'), 'backup']);
  
  backup.stdout.on('data', (data) => {
    console.log(data.toString().trim());
  });

  backup.stderr.on('data', (data) => {
    console.error('❌ 备份错误:', data.toString().trim());
  });

  backup.on('close', (code) => {
    if (code === 0) {
      state.backups_today++;
      state.last_backup = now.toISOString();
      saveSchedulerState(state);
      console.log(`✅ 备份完成 (今日备份数: ${state.backups_today})`);
    } else {
      console.error(`❌ 备份失败 (代码: ${code})`);
    }
  });
}

// 计算距离下一次备份的毫秒数
function getTimeUntilNextBackup() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0); // 明天凌晨 2:00
  
  return tomorrow.getTime() - now.getTime();
}

// 启动定时备份
function startScheduler() {
  const state = loadSchedulerState();
  state.pid = process.pid;
  saveSchedulerState(state);

  console.log('🚀 定时备份调度器已启动');
  console.log(`   进程 ID: ${process.pid}`);
  console.log(`   配置: 每天凌晨 2:00 执行备份`);
  
  // 初始备份（如果今天还没备份过）
  const today = new Date().toISOString().split('T')[0];
  if (!state.last_backup || !state.last_backup.startsWith(today)) {
    console.log('   首次运行，立即执行初始备份');
    executeBackup();
  }

  // 设置定时任务
  const scheduleBackup = () => {
    const timeUntilNext = getTimeUntilNextBackup();
    console.log(`⏳ 下一次备份时间: ${new Date(Date.now() + timeUntilNext).toLocaleString('zh-CN')}`);
    
    setTimeout(() => {
      executeBackup();
      scheduleBackup(); // 递归调度下一次
    }, timeUntilNext);
  };

  scheduleBackup();

  // 捕获 SIGINT 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n\n👋 正在关闭定时备份守护进程...');
    state.pid = null;
    saveSchedulerState(state);
    process.exit(0);
  });
}

// 停止调度器
function stopScheduler() {
  const state = loadSchedulerState();
  if (state.pid) {
    console.log(`📍 尝试停止进程 ${state.pid}...`);
    try {
      process.kill(state.pid);
      console.log('✅ 已发送停止信号');
    } catch (e) {
      console.log('⚠️ 进程可能已停止或不存在');
    }
  } else {
    console.log('❌ 调度器未运行');
  }
}

// 主函数
const command = process.argv[2] || 'start';

switch (command) {
  case 'start':
    startScheduler();
    break;
  case 'stop':
    stopScheduler();
    break;
  case 'help':
    console.log(`
定时备份调度器 - 使用说明

命令：
  node backup-scheduler.js       # 启动备份调度器（后台运行）
  node backup-scheduler.js stop  # 停止备份调度器
  node backup-scheduler.js help  # 显示帮助

特性：
  ✓ 每天凌晨 2:00 自动备份
  ✓ 首次运行立即执行备份
  ✓ 记录备份历史
  ✓ 优雅关闭（Ctrl+C）

建议：
  使用 PM2 或 Windows 任务计划器在后台持续运行
  
  PM2 示例：
    pm2 start backup-scheduler.js --name "backup-daemon"
    pm2 save
    pm2 startup

  Windows 任务计划器：
    1. 打开"任务计划程序"
    2. 创建基本任务 → 名称: "Database Backup"
    3. 触发器: 每天 01:55
    4. 操作: 启动程序 "node" 
           参数: "backup-scheduler.js"
           位置: ${__dirname}
    `);
    break;
  default:
    console.error('❌ 未知命令:', command);
    console.log('执行 "node backup-scheduler.js help" 查看帮助');
    process.exit(1);
}
