/**
 * server.js — 充易达管理系统后端服务
 * 端口：8899   数据库：lowdb（JSON 文件，./data/cyd.json）
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { db, hashPassword, verifyPassword, nextId, now, createOrder, updateOrderStatus, addBalanceLog, addOperationLog, updateMemberBalance } = require('./db');

const BASE = path.join(__dirname, 'dashboard-ui');
const PORT = 8899;

/* ── MIME ──────────────────────────────────────────────────── */
const MIME = {
  html: 'text/html; charset=utf-8',
  css:  'text/css; charset=utf-8',
  js:   'application/javascript; charset=utf-8',
  png:  'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif:  'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon',
  json: 'application/json; charset=utf-8', webp: 'image/webp',
};

/* ── Session（内存 Map，24h TTL） ──────────────────────────── */
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000;

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId:   user.id,
    username: user.username,
    nickname: user.nickname,
    role:     user.role,
    expires:  Date.now() + SESSION_TTL,
  });
  return token;
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expires) { sessions.delete(token); return null; }
  return s;
}

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

/* ── 响应工具 ──────────────────────────────────────────────── */
const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
const ok   = (res, data = {}, msg = 'ok') => json(res, 200, { code: 0, msg, data });

// 增强错误处理 - 支持错误代码和上下文信息 (P0 优化)
const fail = (res, msg = '操作失败', httpCode = 400, errorData = {}) => {
  const response = {
    code: -1,
    msg,
    data: null,
    ...(errorData.errorCode && { errorCode: errorData.errorCode }),
    ...(errorData.context && { context: errorData.context }),
    timestamp: new Date().toISOString()
  };
  json(res, httpCode, response);
};

/* ── 读取 Body ──────────────────────────────────────────────── */
function readBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 2e6) b = b.slice(0, 2e6); });
    req.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
  });
}

/* ── 请求验证中间件 (P0 优化) ──────────────────────────────── */
const validate = (data, schema) => {
  const errors = [];
  Object.entries(schema).forEach(([key, rules]) => {
    const value = data[key];
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} 不能为空`);
    }
    if (value !== undefined && value !== null && rules.type && typeof value !== rules.type) {
      errors.push(`${key} 类型错误，期望 ${rules.type}，实际 ${typeof value}`);
    }
    
    // 对于字符串，检查长度；对于数字，直接比较值
    if (value !== undefined && value !== null && rules.min !== undefined) {
      const checkValue = typeof value === 'string' ? value.length : value;
      if (checkValue < rules.min) {
        errors.push(`${key} 最小值: ${rules.min}`);
      }
    }
    if (value !== undefined && value !== null && rules.max !== undefined) {
      const checkValue = typeof value === 'string' ? value.length : value;
      if (checkValue > rules.max) {
        errors.push(`${key} 最大值: ${rules.max}`);
      }
    }
    
    if (value !== undefined && value !== null && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${key} 格式错误: ${rules.patternMsg || ''}`);
    }
  });
  return errors;
};

/* ── 缓存管理器 (P0 优化) ────────────────────────────────── */
class CacheManager {
  constructor(ttl = 5 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return item.value;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  clear() {
    this.cache.clear();
  }

  stats() {
    const total = this.hits + this.misses;
    const hitRate = total === 0 ? 0 : ((this.hits / total) * 100).toFixed(2);
    return { hits: this.hits, misses: this.misses, total, hitRate: `${hitRate}%`, size: this.cache.size };
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }
}

const apiCache = new CacheManager();

/* ── 速率限制器 (P1 优化) ────────────────────────────────── */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;  // 最大请求数
    this.windowMs = windowMs;         // 时间窗口（毫秒）
    this.requests = new Map();        // IP -> 请求时间戳数组
  }

  isAllowed(ip) {
    const now = Date.now();
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    let timestamps = this.requests.get(ip);
    // 清除窗口外的请求
    timestamps = timestamps.filter(t => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      return false; // 超过限制
    }

    timestamps.push(now);
    this.requests.set(ip, timestamps);
    return true;
  }

  getStatus(ip) {
    const now = Date.now();
    let timestamps = this.requests.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < this.windowMs);
    return {
      requests: timestamps.length,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - timestamps.length)
    };
  }
}

const rateLimiter = new RateLimiter(300, 60 * 1000); // 每分钟 300 个请求

/* ── 请求日志记录器 (P1 优化) ────────────────────────────── */
class RequestLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(method, path, status, duration, ip, userId = null) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      method,
      path,
      status,
      duration: `${duration}ms`,
      ip,
      userId,
      ua: ''
    });

    // 保持日志大小在合理范围内
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getRecentLogs(limit = 50) {
    return this.logs.slice(-limit).reverse();
  }

  getStats() {
    const total = this.logs.length;
    const statusGroups = {};
    let totalDuration = 0;

    this.logs.forEach(log => {
      const status = log.status;
      statusGroups[status] = (statusGroups[status] || 0) + 1;
      
      // 解析并累加时长
      const duration = parseInt(log.duration);
      totalDuration += duration;
    });

    return {
      total,
      avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
      statusDistribution: statusGroups
    };
  }

  clear() {
    this.logs = [];
  }
}

const requestLogger = new RequestLogger();

/* ── API 版本控制 (P2 优化) ──────────────────────────────── */
const API_VERSIONS = {
  v1: { deprecated: false, description: '初始版本' },
  v2: { deprecated: false, description: '新增缓存、验证、监控' }
};

// 提取 API 版本
function getAPIVersion(pathname) {
  const match = pathname.match(/^\/api\/v(\d+)\//);
  return match ? `v${match[1]}` : 'v1'; // 默认 v1
}

// API 版本不兼容处理
function handleVersionDeprecation(pathname, version) {
  if (API_VERSIONS[version]?.deprecated) {
    return {
      warning: `API 版本 ${version} 已弃用`,
      suggestion: `请升级到最新版本`,
      deprecated_at: '2026-03-01',
      remove_at: '2026-06-01'
    };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   API 路由
   ══════════════════════════════════════════════════════════════ */
async function handleAPI(req, res, pathname) {
  const requestStart = Date.now();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const ip = req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';

  // P2 优化: API 版本检查和兼容性处理
  const apiVersion = getAPIVersion(pathname);
  const versionWarning = handleVersionDeprecation(pathname, apiVersion);
  if (versionWarning) {
    res.setHeader('X-API-Deprecation-Warning', versionWarning.warning);
  }

  // P1 优化: 速率限制检查 (P1 Optimization: Rate limiting)
  if (!rateLimiter.isAllowed(ip)) {
    const duration = Date.now() - requestStart;
    requestLogger.log(req.method, pathname, 429, duration, ip);
    return fail(res, '请求过于频繁，请稍后再试', 429, {
      errorCode: 'RATE_LIMIT_EXCEEDED',
      context: { 
        remaining: rateLimiter.getStatus(ip).remaining,
        retryAfter: 60
      }
    });
  }

  /* ── POST /api/auth/login ─── */
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    
    // P0 优化: 应用请求验证 (P0 Optimization: Apply request validation)
    const validationErrors = validate(body, {
      username: { required: true, type: 'string', min: 3, max: 20 },
      password: { required: true, type: 'string', min: 6, max: 50 }
    });
    if (validationErrors.length > 0) {
      return fail(res, '请求参数验证失败', 400, {
        errorCode: 'VALIDATION_ERROR',
        context: { errors: validationErrors }
      });
    }
    
    const { username, password } = body;

    // 检查IP地址
    if (!ip) {
      return fail(res, '无法获取IP地址');
    }

    // 检查最近的失败登录次数（防暴力破解）
    const recentFailures = db.get('login_logs')
      .filter(l =>
        l.username === username &&
        l.result === 'fail' &&
        l.created_at > now().slice(0, 11) + '00:00:00'
      )
      .value().length;

    if (recentFailures >= 5) {
      db.get('login_logs').push({
        id: nextId('login_logs'),
        username,
        ip,
        ua,
        result: 'fail',
        reason: '登录失败次数过多，账户已临时锁定',
        created_at: now()
      }).write();
      return fail(res, '登录失败次数过多，请24小时后再试');
    }

    const user = db.get('sys_users').find({ username }).value();

    if (!user || user.status !== 1) {
      db.get('login_logs').push({
        id: nextId('login_logs'),
        username,
        ip,
        ua,
        result: 'fail',
        reason: user ? '账号已禁用' : '账号不存在',
        created_at: now()
      }).write();
      return fail(res, user ? '账号已被禁用，请联系管理员' : '账号不存在');
    }

    if (!verifyPassword(password, user.password, user.salt)) {
      db.get('login_logs').push({
        id: nextId('login_logs'),
        username,
        ip,
        ua,
        result: 'fail',
        reason: '密码错误',
        created_at: now()
      }).write();
      return fail(res, '密码错误，请重试');
    }

    // 成功登录
    const token = createSession(user);
    db.get('sys_users').find({ id: user.id }).assign({ last_login: now() }).write();
    db.get('login_logs').push({
      id: nextId('login_logs'),
      user_id: user.id,
      username,
      ip,
      ua,
      result: 'success',
      created_at: now()
    }).write();

    // 记录操作日志
    addOperationLog({
      user_id: user.id,
      username: user.username,
      action: 'login',
      target_type: 'user',
      target_id: user.id,
      detail: `用户登录成功, IP: ${ip}`,
      ip,
      user_agent: ua
    });

    return ok(res, {
      token,
      user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role, avatar: user.avatar }
    }, '登录成功');
  }

  /* ── POST /api/auth/logout ─── */
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const t = getToken(req);
    if (t) sessions.delete(t);
    return ok(res, {}, '已退出登录');
  }

  /* ── 以下需要登录 ─── */
  const token = getToken(req);
  const sess  = getSession(token);
  if (!sess) return fail(res, '未登录或登录已过期，请重新登录', 401);

  /* ── GET /api/auth/me ─── */
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = db.get('sys_users').find({ id: sess.userId }).value();
    if (!user) return fail(res, '用户不存在', 404);
    const { password, salt, ...safe } = user;
    return ok(res, safe);
  }

  /* ── PUT /api/auth/profile ─── */
  if (pathname === '/api/auth/profile' && req.method === 'PUT') {
    const { username, nickname, email, phone } = await readBody(req);

    if (username && username !== sess.username) {
      const exist = db.get('sys_users').find(u => u.username === username && u.id !== sess.userId).value();
      if (exist) return fail(res, '该账号名已被占用');
    }

    const patch = { updated_at: now() };
    if (username !== undefined) patch.username = username.trim();
    if (nickname !== undefined) patch.nickname = nickname.trim();
    if (email    !== undefined) patch.email    = email.trim();
    if (phone    !== undefined) patch.phone    = phone.trim();

    db.get('sys_users').find({ id: sess.userId }).assign(patch).write();
    if (patch.username) sess.username = patch.username;

    return ok(res, {}, '账号信息已更新');
  }

  /* ── PUT /api/auth/password ─── */
  if (pathname === '/api/auth/password' && req.method === 'PUT') {
    const { oldPassword, newPassword } = await readBody(req);
    if (!oldPassword || !newPassword) return fail(res, '旧密码和新密码不能为空');
    if (newPassword.length < 6)       return fail(res, '新密码不能少于6位');
    if (newPassword.length > 32)      return fail(res, '新密码不能超过32位');

    const user = db.get('sys_users').find({ id: sess.userId }).value();
    if (!verifyPassword(oldPassword, user.password, user.salt)) return fail(res, '旧密码不正确');

    const { hash, salt } = hashPassword(newPassword);
    db.get('sys_users').find({ id: sess.userId }).assign({ password: hash, salt, updated_at: now() }).write();
    sessions.delete(token);

    return ok(res, {}, '密码已修改，请重新登录');
  }

  /* ── GET /api/config/brand ─── */
  if (pathname === '/api/config/brand' && req.method === 'GET') {
    const cfg = db.get('brand').value();
    return ok(res, cfg);
  }

  /* ── POST /api/config/brand ─── */
  if (pathname === '/api/config/brand' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限，仅管理员可修改品牌配置', 403);
    const body = await readBody(req);
    db.set('brand', Object.assign(db.get('brand').value(), body)).write();
    return ok(res, {}, '品牌配置已保存');
  }

  /* ── GET /api/sys-users ─── 管理员账号列表 */
  if (pathname === '/api/sys-users' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const users = db.get('sys_users').map(({ password, salt, ...u }) => u).value();
    return ok(res, users);
  }

  /* ── POST /api/sys-users ─── 新增管理员 */
  if (pathname === '/api/sys-users' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { username, nickname, password: rawPwd, role: newRole, email, phone } = body;
    if (!username || !username.trim()) return fail(res, '登录账号不能为空');
    if (!rawPwd || rawPwd.length < 6)  return fail(res, '密码不能少于6位');
    const exist = db.get('sys_users').find(u => u.username === username.trim()).value();
    if (exist) return fail(res, '该账号名已存在');
    const { hash, salt } = hashPassword(rawPwd);
    const sysUser = {
      id:         nextId('sys_users'),
      username:   username.trim(),
      nickname:   (nickname || username).trim(),
      email:      (email || '').trim(),
      phone:      (phone  || '').trim(),
      role:       ['admin', 'operator', 'finance', 'support'].includes(newRole) ? newRole : 'operator',
      password:   hash,
      salt,
      status:     1,
      created_at: now(),
    };
    db.get('sys_users').push(sysUser).write();
    const { password, salt: s2, ...safe } = sysUser;
    return ok(res, safe, '管理员已创建');
  }

  /* ── PUT /api/sys-users/:id ─── 编辑管理员 */
  const sysUserEditMatch = pathname.match(/^\/api\/sys-users\/(\d+)$/);
  if (sysUserEditMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(sysUserEditMatch[1]);
    const body = await readBody(req);
    const user = db.get('sys_users').find({ id }).value();
    if (!user) return fail(res, '管理员不存在', 404);
    // 不允许禁用或降级自己
    if (id === sess.userId && body.status === 0) return fail(res, '不能禁用自己的账号');
    if (id === sess.userId && body.role && body.role !== 'admin') return fail(res, '不能修改自己的角色');
    const patch = { updated_at: now() };
    if (body.username !== undefined) {
      if (!body.username.trim()) return fail(res, '账号名不能为空');
      const dup = db.get('sys_users').find(u => u.username === body.username.trim() && u.id !== id).value();
      if (dup) return fail(res, '账号名已被占用');
      patch.username = body.username.trim();
    }
    if (body.nickname  !== undefined) patch.nickname = body.nickname.trim();
    if (body.email     !== undefined) patch.email    = body.email.trim();
    if (body.phone     !== undefined) patch.phone    = body.phone.trim();
    if (body.status    !== undefined) patch.status   = body.status === 0 ? 0 : 1;
    if (body.role      !== undefined && ['admin','operator','finance','support'].includes(body.role))
      patch.role = body.role;
    if (body.password && body.password.trim().length >= 6) {
      const { hash, salt } = hashPassword(body.password.trim());
      patch.password = hash;
      patch.salt     = salt;
    }
    db.get('sys_users').find({ id }).assign(patch).write();
    const updated = db.get('sys_users').find({ id }).value();
    const { password, salt, ...safe } = updated;
    return ok(res, safe, '管理员信息已更新');
  }

  /* ── DELETE /api/sys-users/:id ─── 删除管理员 */
  const sysUserDelMatch = pathname.match(/^\/api\/sys-users\/(\d+)$/);
  if (sysUserDelMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(sysUserDelMatch[1]);
    if (id === sess.userId) return fail(res, '不能删除自己的账号');
    const user = db.get('sys_users').find({ id }).value();
    if (!user) return fail(res, '管理员不存在', 404);
    db.get('sys_users').remove({ id }).write();
    return ok(res, {}, '管理员已删除');
  }

  /* ── GET /api/users ─── 后台系统用户列表（兼容旧接口） */
  if (pathname === '/api/users' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const users = db.get('sys_users').map(({ password, salt, ...u }) => u).value();
    return ok(res, users);
  }

  /* ══════════════════════════════════════════════════════
     会员用户管理 /api/members
     ══════════════════════════════════════════════════════ */

  /* ── GET /api/members ─── 列表（支持分页与关键字搜索） */
  if (pathname === '/api/members' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const qs        = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const keyword   = (qs.get('keyword') || '').trim().toLowerCase();
    const status    = qs.get('status');      // '0' | '1' | ''
    const user_type = qs.get('user_type') || '';  // '代理' | '普通用户' | ''
    const level_id  = qs.get('level_id') || '';   // 级别ID
    const page      = Math.max(1, parseInt(qs.get('page')  || '1'));
    const size      = Math.min(50, Math.max(1, parseInt(qs.get('size') || '20')));

    // P0 优化: 缓存查询结果
    const memberCacheKey = `members:kw=${keyword}:status=${status}:type=${user_type}:level=${level_id}:page=${page}:size=${size}`;
    const memberCached = apiCache.get(memberCacheKey);
    if (memberCached) return ok(res, memberCached);

    let list = db.get('members').value().map(({ password, salt, ...m }) => m);

    if (keyword) {
      list = list.filter(m =>
        (m.username  || '').toLowerCase().includes(keyword) ||
        (m.email     || '').toLowerCase().includes(keyword) ||
        (m.realname  || '').toLowerCase().includes(keyword) ||
        (m.agent_no  || '').toLowerCase().includes(keyword) ||
        (m.phone     || '').toLowerCase().includes(keyword) ||
        String(m.id) === keyword
      );
    }
    if (status !== null && status !== '') {
      list = list.filter(m => String(m.status) === status);
    }
    if (user_type) {
      list = list.filter(m => m.user_type === user_type);
    }
    if (level_id) {
      list = list.filter(m => String(m.level_id) === level_id);
    }

    // 注入级别名称
    const levels = db.get('agent_levels').value();
    list = list.map(m => {
      const lv = levels.find(l => l.id === m.level_id);
      return { ...m, level_name: lv ? lv.name : '', level_color: lv ? lv.color : '' };
    });

    const total = list.length;
    const items = list.slice((page - 1) * size, page * size);
    const memberResult = { total, page, size, items };
    // 缓存查询结果 (TTL 3 分钟)
    apiCache.set(memberCacheKey, memberResult, 3 * 60 * 1000);
    return ok(res, memberResult);
  }

  /* ── POST /api/members ─── 新增会员 */
  if (pathname === '/api/members' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);

    // P0 优化: 请求验证
    const memberValidErrors = validate(body, {
      username: { required: true, type: 'string', min: 3, max: 32 },
      password: { required: true, type: 'string', min: 6, max: 64 },
      email:    { type: 'string' },
      phone:    { type: 'string' },
      realname: { type: 'string' },
      user_type: { type: 'string' }
    });
    if (memberValidErrors.length > 0) {
      return fail(res, '请求参数验证失败', 400, {
        errorCode: 'VALIDATION_ERROR',
        context: { errors: memberValidErrors }
      });
    }

    const { username, email, password: rawPwd, realname, avatar, phone,
            user_type, level_id, agent_no, commission_rate, parent_id,
            referrer, is_anonymous } = body;

    if (!username || !username.trim()) return fail(res, '用户名不能为空');
    if (!rawPwd  || rawPwd.length < 6) return fail(res, '密码不能少于6位');

    const exist = db.get('members').find(m => m.username === username.trim()).value();
    if (exist) return fail(res, '该用户名已存在');

    // 代理编号唯一性检查
    if (agent_no && agent_no.trim()) {
      const agentNoExist = db.get('members').find(m => m.agent_no === agent_no.trim()).value();
      if (agentNoExist) return fail(res, '该代理编号已存在');
    }

    const { hash, salt } = hashPassword(rawPwd);
    const member = {
      id:              nextId('members'),
      username:        username.trim(),
      email:           (email    || '').trim(),
      password:        hash,
      salt,
      realname:        (realname || '').trim(),
      avatar:          (avatar   || '').trim(),
      phone:           (phone    || '').trim(),
      user_type:       user_type  || '普通用户',
      level_id:        level_id ? parseInt(level_id) : null,
      agent_no:        (agent_no || '').trim(),
      commission_rate: parseFloat(commission_rate) || 0,
      parent_id:       parent_id ? parseInt(parent_id) : null,
      referrer:        (referrer || '').trim(),
      is_anonymous:    is_anonymous ? 1 : 0,
      status:          1,
      balance:         0,
      created_at:      now(),
    };
    db.get('members').push(member).write();
    // P0 优化: 清空成员缓存
    apiCache.invalidate('members');
    const { password, salt: s2, ...safe } = member;
    return ok(res, safe, '用户已创建');
  }

  /* ── PUT /api/members/:id ─── 编辑会员 */
  const memberEditMatch = pathname.match(/^\/api\/members\/(\d+)$/);
  if (memberEditMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(memberEditMatch[1]);
    const body = await readBody(req);
    const member = db.get('members').find({ id }).value();
    if (!member) return fail(res, '用户不存在', 404);

    const patch = { updated_at: now() };
    const allowed = ['username', 'email', 'realname', 'avatar', 'phone',
                     'user_type', 'level_id', 'agent_no', 'commission_rate',
                     'parent_id', 'referrer', 'is_anonymous', 'status'];
    allowed.forEach(k => { if (body[k] !== undefined) patch[k] = body[k]; });

    // 如果要改用户名，检查重名
    if (patch.username && patch.username !== member.username) {
      const dup = db.get('members').find(m => m.username === patch.username && m.id !== id).value();
      if (dup) return fail(res, '该用户名已被占用');
    }
    // 如果要改代理编号，检查重复
    if (patch.agent_no && patch.agent_no !== member.agent_no) {
      const dup = db.get('members').find(m => m.agent_no === patch.agent_no && m.id !== id).value();
      if (dup) return fail(res, '该代理编号已被占用');
    }
    // 类型转换
    if (patch.level_id !== undefined)        patch.level_id        = patch.level_id ? parseInt(patch.level_id) : null;
    if (patch.commission_rate !== undefined) patch.commission_rate = parseFloat(patch.commission_rate) || 0;
    if (patch.parent_id !== undefined)       patch.parent_id       = patch.parent_id ? parseInt(patch.parent_id) : null;

    // 如果传了新密码，更新密码
    if (body.password && body.password.trim().length >= 6) {
      const { hash, salt } = hashPassword(body.password.trim());
      patch.password = hash;
      patch.salt     = salt;
    }

    db.get('members').find({ id }).assign(patch).write();
    // P0 优化: 清空成员缓存
    apiCache.invalidate('members');
    const updated = db.get('members').find({ id }).value();
    const { password, salt, ...safe } = updated;
    return ok(res, safe, '用户信息已更新');
  }



  /* ── PATCH /api/members/:id/status ─── 切换状态 */
  const memberStatusMatch = pathname.match(/^\/api\/members\/(\d+)\/status$/);
  if (memberStatusMatch && req.method === 'PATCH') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id     = parseInt(memberStatusMatch[1]);
    const body   = await readBody(req);
    const member = db.get('members').find({ id }).value();
    if (!member) return fail(res, '用户不存在', 404);
    const newStatus = body.status === 0 ? 0 : 1;
    db.get('members').find({ id }).assign({ status: newStatus, updated_at: now() }).write();
    return ok(res, { id, status: newStatus }, newStatus === 1 ? '用户已启用' : '用户已停用');
  }

  /* ── POST /api/members/:id/balance ─── 调整余额 */
  const memberBalanceMatch = pathname.match(/^\/api\/members\/(\d+)\/balance$/);
  if (memberBalanceMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id     = parseInt(memberBalanceMatch[1]);
    const body   = await readBody(req);
    const member = db.get('members').find({ id }).value();
    if (!member) return fail(res, '用户不存在', 404);

    const type   = body.type;      // 'add' | 'sub'
    const amount = parseFloat(body.amount);
    const remark = (body.remark || '').trim();

    if (!['add', 'sub'].includes(type))  return fail(res, '类型参数错误');
    if (isNaN(amount) || amount <= 0)    return fail(res, '金额必须大于 0');
    if (amount > 999999)                 return fail(res, '单次调整金额不能超过999999');
    if (!remark)                          return fail(res, '请填写调整原因');

    // 使用带事务的余额更新函数
    const changeAmount = type === 'add' ? amount : -amount;
    const changeType = type === 'add' ? 'admin_add' : 'admin_sub';
    const result = updateMemberBalance(id, changeAmount, changeType, `管理员手动调整: ${remark}`);

    if (!result.success) {
      return fail(res, result.message);
    }

    // 记录操作日志
    addOperationLog({
      user_id: sess.userId,
      username: sess.username,
      action: 'manual_adjust_balance',
      target_type: 'member',
      target_id: id,
      detail: `手动调整用户 ${member.username} 余额: ${type === 'add' ? '+' : '-'}¥${amount}, 原因: ${remark}`,
      ip,
      user_agent: ua
    });

    return ok(res, {
      before: result.oldBalance,
      after: result.newBalance,
      change: changeAmount
    }, '余额调整成功');
  }

  /* ── GET /api/balance-logs ─── 余额变动日志 */
  if (pathname === '/api/balance-logs' && req.method === 'GET') {
    const qs    = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const page  = parseInt(qs.get('page')) || 1;
    const limit = parseInt(qs.get('limit')) || 20;
    const kw    = (qs.get('keyword') || '').trim().toLowerCase();

    let list = db.get('balance_logs').orderBy(['id'], ['desc']).value();

    if (kw) {
      list = list.filter(l =>
        (l.username || '').toLowerCase().includes(kw) ||
        (l.remark || '').toLowerCase().includes(kw)
      );
    }

    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);

    return ok(res, { total, page, limit, items });
  }

  /* ── GET /api/operation-logs ─── 操作日志（安全审计） */
  if (pathname === '/api/operation-logs' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const qs    = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const page  = parseInt(qs.get('page')) || 1;
    const limit = parseInt(qs.get('limit')) || 20;
    const kw    = (qs.get('search') || '').trim().toLowerCase();
    const action = qs.get('action') || '';
    const date = qs.get('date') || '';

    let list = db.get('operation_logs').orderBy(['id'], ['desc']).value();

    if (kw) {
      list = list.filter(l =>
        (l.username || '').toLowerCase().includes(kw) ||
        (l.action || '').toLowerCase().includes(kw) ||
        (l.detail || '').toLowerCase().includes(kw)
      );
    }

    if (action) {
      list = list.filter(l => l.action === action);
    }

    if (date) {
      list = list.filter(l => (l.created_at || '').startsWith(date.replace(/-/g, ' ').split(' ')[0]));
    }

    const total = list.length;
    const items = list.slice((page - 1) * limit, page * limit);

    return ok(res, { total, page, limit, items });
  }

  /* ══════════════════════════════════════════════════════
     角色管理 /api/roles
     ══════════════════════════════════════════════════════ */

  /* ── GET /api/permissions/meta ─── 权限节点元数据 */
  if (pathname === '/api/permissions/meta' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    return ok(res, db.get('_permissions_meta').value());
  }

  /* ── GET /api/roles ─── 角色列表 */
  if (pathname === '/api/roles' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    return ok(res, db.get('roles').value());
  }

  /* ── POST /api/roles ─── 新建角色 */
  if (pathname === '/api/roles' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { name, desc, permissions } = body;
    if (!name || !name.trim()) return fail(res, '角色名不能为空');
    const dup = db.get('roles').find(r => r.name === name.trim()).value();
    if (dup) return fail(res, '角色名已存在');

    const role = {
      id:          nextId('roles'),
      name:        name.trim(),
      desc:        (desc || '').trim(),
      builtin:     0,
      permissions: Array.isArray(permissions) ? permissions : [],
      created_at:  now(),
    };
    db.get('roles').push(role).write();
    return ok(res, role, '角色已创建');
  }

  /* ── PUT /api/roles/:id ─── 编辑角色 */
  const roleEditMatch = pathname.match(/^\/api\/roles\/(\d+)$/);
  if (roleEditMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(roleEditMatch[1]);
    const body = await readBody(req);
    const role = db.get('roles').find({ id }).value();
    if (!role) return fail(res, '角色不存在', 404);
    if (role.builtin && body.permissions) {
      // 内置超管角色只允许改描述，权限不可删
    }
    const patch = { updated_at: now() };
    if (body.name !== undefined) {
      if (!body.name.trim()) return fail(res, '角色名不能为空');
      const dup = db.get('roles').find(r => r.name === body.name.trim() && r.id !== id).value();
      if (dup) return fail(res, '角色名已被占用');
      patch.name = body.name.trim();
    }
    if (body.desc        !== undefined) patch.desc        = body.desc.trim();
    if (body.permissions !== undefined && !role.builtin) patch.permissions = body.permissions;
    if (body.permissions !== undefined &&  role.builtin)  patch.permissions = db.get('_permissions_meta').value().map(p=>p.key);

    db.get('roles').find({ id }).assign(patch).write();
    return ok(res, db.get('roles').find({ id }).value(), '角色已更新');
  }

  /* ── DELETE /api/roles/:id ─── 删除角色 */
  const roleDeleteMatch = pathname.match(/^\/api\/roles\/(\d+)$/);
  if (roleDeleteMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(roleDeleteMatch[1]);
    const role = db.get('roles').find({ id }).value();
    if (!role)         return fail(res, '角色不存在', 404);
    if (role.builtin)  return fail(res, '内置角色不可删除');
    db.get('roles').remove({ id }).write();
    return ok(res, {}, '角色已删除');
  }

  /* ══════════════════════════════════════════════════════
     余额管理统计 /api/balance/overview
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/balance/overview' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const qs       = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const kw       = (qs.get('kw') || '').trim().toLowerCase();
    const typeF    = qs.get('type') || '';
    const sort     = qs.get('sort') === 'asc' ? 'asc' : 'desc';
    const page     = Math.max(1, parseInt(qs.get('page')) || 1);
    const pageSize = 20;

    let all = db.get('members').value();

    // 统计卡片数据
    const totalBalance     = all.reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
    const agentBalance     = all.filter(m => m.user_type === '代理').reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
    const userBalance      = all.filter(m => m.user_type !== '代理').reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
    const withBalanceCount = all.filter(m => (parseFloat(m.balance) || 0) > 0).length;

    // Top10 余额用户（用于图表）
    const top10 = [...all].sort((a, b) => (parseFloat(b.balance)||0) - (parseFloat(a.balance)||0))
      .slice(0, 10).map(m => ({ username: m.username, balance: parseFloat(m.balance)||0, user_type: m.user_type }));

    // 过滤
    if (kw)    all = all.filter(m => m.username.toLowerCase().includes(kw) || (m.agent_no||'').toLowerCase().includes(kw));
    if (typeF) all = all.filter(m => typeF === '代理' ? m.user_type === '代理' : m.user_type !== '代理');

    // 排序
    all.sort((a, b) => sort === 'asc'
      ? (parseFloat(a.balance)||0) - (parseFloat(b.balance)||0)
      : (parseFloat(b.balance)||0) - (parseFloat(a.balance)||0));

    const total = all.length;
    const list  = all.slice((page-1)*pageSize, page*pageSize).map(m => ({
      id: m.id, username: m.username, realname: m.realname||'',
      agent_no: m.agent_no||'', user_type: m.user_type||'普通用户',
      balance: parseFloat(m.balance)||0, status: m.status,
      updated_at: m.updated_at||m.created_at||'',
    }));

    return ok(res, {
      stats: {
        totalBalance:     Math.round(totalBalance*100)/100,
        agentBalance:     Math.round(agentBalance*100)/100,
        userBalance:      Math.round(userBalance*100)/100,
        withBalanceCount,
      },
      top10,
      list, total, page, pageSize,
    });
  }

  /* ══════════════════════════════════════════════════════
     订单管理 /api/orders
     ══════════════════════════════════════════════════════ */
  /* ── GET /api/orders ─── 获取订单列表 */
  if (pathname === '/api/orders' && req.method === 'GET') {
    const qs     = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const status = qs.get('status') !== null ? parseInt(qs.get('status')) : null;
    const type   = qs.get('type') || '';
    const page   = parseInt(qs.get('page')) || 1;
    const limit  = parseInt(qs.get('limit')) || 20;
    const kw     = (qs.get('keyword') || '').trim().toLowerCase();

    // P0 优化: 缓存查询结果 (P0 Optimization: Cache query results)
    const cacheKey = `orders:status=${status}:type=${type}:page=${page}:limit=${limit}:kw=${kw}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return ok(res, cached);

    let list = db.get('orders').orderBy(['id'], ['desc']).value();

    if (status !== null) list = list.filter(o => o.status === status);
    if (type)            list = list.filter(o => o.order_type === type);
    if (kw)              list = list.filter(o =>
      (o.order_no || '').toLowerCase().includes(kw) ||
      (o.member_name || '').toLowerCase().includes(kw) ||
      (o.product_name || '').toLowerCase().includes(kw)
    );

    const total   = list.length;
    const items   = list.slice((page - 1) * limit, page * limit);
    const pending = db.get('orders').filter({ status: 0 }).value().length;
    const processing = db.get('orders').filter({ status: 1 }).value().length;
    const success = db.get('orders').filter({ status: 2 }).value().length;
    const failed  = db.get('orders').filter({ status: 3 }).value().length;
    const refunded = db.get('orders').filter({ status: 4 }).value().length;

    const result = { total, pending, processing, success, failed, refunded, page, limit, items };
    
    // 缓存结果
    apiCache.set(cacheKey, result);
    return ok(res, result);
  }

  /* ── POST /api/orders ─── 创建订单 */
  if (pathname === '/api/orders' && req.method === 'POST') {
    const body = await readBody(req);
    
    // P0 优化: 应用请求验证 (P0 Optimization: Apply request validation)
    const validationErrors = validate(body, {
      member_id: { required: true, type: 'number', min: 1 },
      order_type: { required: true, type: 'string' },
      amount: { required: true, type: 'number', min: 0.01 },
      product_id: { type: 'number' },
      member_name: { type: 'string' },
      product_name: { type: 'string' },
      remark: { type: 'string' },
      account: { type: 'string' }
    });
    if (validationErrors.length > 0) {
      return fail(res, '请求参数验证失败', 400, {
        errorCode: 'VALIDATION_ERROR',
        context: { errors: validationErrors }
      });
    }
    
    const { member_id, member_name, order_type, amount, product_id, product_name, remark, account } = body;

    // 业务逻辑验证
    if (order_type === 'consume' && !product_id) {
      return fail(res, '消费订单必须指定产品', 400, {
        errorCode: 'INVALID_ORDER_TYPE',
        context: { order_type, product_id }
      });
    }

    // 如果是消费订单，获取产品名称
    let actualProductname = product_name;
    if (order_type === 'consume' && product_id && !product_name) {
      const product = db.get('products').find({ id: parseInt(product_id) }).value();
      if (product) actualProductname = product.name;
    }

    // 获取用户信息
    const member = db.get('members').find({ id: parseInt(member_id) }).value();
    let actualMembername = member_name;
    if (!member_name && member) {
      actualMembername = member.username;
    }

    // 如果是消费订单，创建订单时先扣除余额
    if (order_type === 'consume') {
      if (!member) return fail(res, '用户不存在');
      const balance = parseFloat(member.balance) || 0;
      if (balance < parseFloat(amount)) {
        return fail(res, '余额不足');
      }

      // 扣除余额
      const balanceAfter = balance - parseFloat(amount);
      db.get('members').find({ id: parseInt(member_id) })
        .assign({ balance: Math.round(balanceAfter * 100) / 100 }).write();

      // 记录余额变动日志
      addBalanceLog({
        member_id: parseInt(member_id),
        member_name: actualMembername,
        change_type: 'consume',
        amount: amount,
        balance_before: balance,
        balance_after: balanceAfter,
        remark: `消费订单 ${product_name} 待处理`
      });
    }

    // 创建订单
    const order = createOrder({
      member_id,
      member_name: actualMembername,
      order_type,
      amount,
      product_id: order_type === 'consume' ? product_id : null,
      product_name: actualProductname,
      remark: remark || (account ? `充值账号: ${account}` : '')
    });

    // 记录操作日志
    addOperationLog({
      user_id: sess.userId,
      username: sess.username,
      action: 'create_order',
      target_type: 'order',
      target_id: order.id,
      detail: `创建${order_type === 'consume' ? '消费' : '充值'}订单 ${order.order_no}, 金额 ¥${amount}${account ? `, 账号 ${account}` : ''}`,
      ip,
      user_agent: ua
    });

    // P0 优化: 清空订单缓存 (P0 Optimization: Invalidate cache)
    apiCache.invalidate('orders');
    return ok(res, order, '订单创建成功');
  }

  /* ── GET /api/orders/:id ─── 获取订单详情 */
  const orderDetailMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (orderDetailMatch && req.method === 'GET') {
    const id = parseInt(orderDetailMatch[1]);
    const order = db.get('orders').find({ id }).value();
    if (!order) return fail(res, '订单不存在', 404);

    // 获取用户信息
    const member = db.get('members').find({ id: order.member_id }).value();
    if (member) {
      order.member_info = {
        id: member.id,
        username: member.username,
        balance: member.balance,
        role: member.role
      };
    }

    // 获取产品信息
    if (order.product_id) {
      const product = db.get('products').find({ id: order.product_id }).value();
      if (product) {
        order.product_info = {
          id: product.id,
          name: product.name,
          cost_price: product.cost_price,
          price: product.price
        };
      }
    }

    return ok(res, order);
  }

  /* ── GET /api/orders/:id/balance ─── 查询订单用户余额 */
  const orderBalanceMatch = pathname.match(/^\/api\/orders\/(\d+)\/balance$/);
  if (orderBalanceMatch && req.method === 'GET') {
    const id = parseInt(orderBalanceMatch[1]);
    const order = db.get('orders').find({ id }).value();
    if (!order) return fail(res, '订单不存在', 404);

    const member = db.get('members').find({ id: order.member_id }).value();
    if (!member) {
      return ok(res, {
        balance: 0,
        member_name: order.member_name,
        account: order.remark ? order.remark.replace(/^充值账号:\s*/, '') : '—'
      }, '查询成功');
    }

    const account = order.remark ? order.remark.replace(/^充值账号:\s*/, '') : '—';

    return ok(res, {
      balance: parseFloat(member.balance) || 0,
      member_name: member.username,
      account: account,
      member_id: member.id,
      user_type: member.user_type,
      freeze_balance: parseFloat(member.freeze_balance) || 0
    }, '查询成功');
  }

  /* ── POST /api/orders/:id/recharge ─── 发起接口充值 */
  const orderRechargeMatch = pathname.match(/^\/api\/orders\/(\d+)\/recharge$/);
  if (orderRechargeMatch && req.method === 'POST') {
    const id = parseInt(orderRechargeMatch[1]);
    const body = await readBody(req);

    const order = db.get('orders').find({ id }).value();
    if (!order) return fail(res, '订单不存在', 404);

    // 检查订单状态：只有待处理或失败的订单才能重新充值
    if (order.status !== 0 && order.status !== 3) {
      return fail(res, '订单状态不允许充值，当前状态: ' + (['待处理', '处理中', '成功', '失败', '已退款'][order.status] || order.status));
    }

    // 获取产品信息
    const product = order.product_id ? db.get('products').find({ id: order.product_id }).value() : null;

    // 更新订单状态为处理中
    updateOrderStatus(order.order_no, 1, '手动发起充值');

    // 获取充值账号
    const account = order.remark ? order.remark.replace(/^充值账号:\s*/, '') : '';

    // 模拟调用上游充值接口（实际业务中这里应该调用真实的充值API）
    // 这里我们只是更新订单状态，实际充值逻辑需要根据具体业务实现

    return ok(res, {
      order_id: order.id,
      order_no: order.order_no,
      account: account,
      product_name: product ? product.name : order.product_name,
      amount: order.amount,
      status: 1,
      message: '充值请求已提交，正在处理中'
    }, '充值请求已提交');
  }

  /* ── PUT /api/orders/:id/status ─── 更新订单状态 */
  const orderStatusMatch = pathname.match(/^\/api\/orders\/(\d+)\/status$/);
  if (orderStatusMatch && req.method === 'PUT') {
    const id   = parseInt(orderStatusMatch[1]);
    const body = await readBody(req);
    const { status, remark, auto_refund } = body;  // 新增 auto_refund 参数

    const order = db.get('orders').find({ id }).value();
    if (!order) return fail(res, '订单不存在', 404);

    const oldStatus = order.status;
    if (!updateOrderStatus(order.order_no, status, remark)) {
      return fail(res, '更新订单状态失败');
    }

    // 处理订单状态变更时的余额变动
    const member = db.get('members').find({ id: order.member_id }).value();
    if (member) {
      const balanceBefore = parseFloat(member.balance) || 0;

      // 消费订单：根据 auto_refund 参数决定是否退款
      if (order.order_type === 'consume') {
        // 退款状态：总是退还余额
        if (status === 4 && oldStatus !== 4) {
          const balanceAfter = balanceBefore + parseFloat(order.amount);
          db.get('members').find({ id: order.member_id })
            .assign({ balance: Math.round(balanceAfter * 100) / 100 }).write();

          addBalanceLog({
            member_id: order.member_id,
            member_name: order.member_name,
            change_type: 'refund',
            amount: order.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            remark: `消费订单 ${order.order_no} 退款`
          });
        }
        // 失败状态：只有 auto_refund=true 时才退款
        else if (status === 3 && oldStatus !== 3 && auto_refund === true) {
          const balanceAfter = balanceBefore + parseFloat(order.amount);
          db.get('members').find({ id: order.member_id })
            .assign({ balance: Math.round(balanceAfter * 100) / 100 }).write();

          addBalanceLog({
            member_id: order.member_id,
            member_name: order.member_name,
            change_type: 'refund',
            amount: order.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            remark: `消费订单 ${order.order_no} 失败（上游回调自动退款）`
          });
        }
        // 失败状态：auto_refund=false 时不退款（管理员手动操作）
      }

      // 充值订单：成功时增加余额，退款时扣除余额
      if (order.order_type === 'recharge') {
        if (status === 2 && oldStatus !== 2) {
          // 充值成功：增加余额
          const balanceAfter = balanceBefore + parseFloat(order.amount);
          db.get('members').find({ id: order.member_id })
            .assign({ balance: Math.round(balanceAfter * 100) / 100 }).write();

          addBalanceLog({
            member_id: order.member_id,
            member_name: order.member_name,
            change_type: 'recharge',
            amount: order.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            remark: '充值订单 ' + order.order_no + ' 成功'
          });
        } else if (status === 4 && oldStatus !== 4 && oldStatus === 2) {
          // 充值退款：扣除余额（因为之前已经加过了）
          const balanceAfter = balanceBefore - parseFloat(order.amount);
          db.get('members').find({ id: order.member_id })
            .assign({ balance: Math.round(balanceAfter * 100) / 100 }).write();

          addBalanceLog({
            member_id: order.member_id,
            member_name: order.member_name,
            change_type: 'refund',
            amount: order.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            remark: '充值订单 ' + order.order_no + ' 退款'
          });
        }
        // 充值失败（status=3）不增加余额
      }
    }

    // 记录操作日志
    addOperationLog({
      user_id: sess.userId,
      username: sess.username,
      action: 'update_order_status',
      target_type: 'order',
      target_id: order.id,
      detail: `更新订单 ${order.order_no} 状态: ${oldStatus} -> ${status}`,
      ip,
      user_agent: ua
    });

    return ok(res, {}, '订单状态已更新');
  }

  /* ══════════════════════════════════════════════════════
     财务概览 /api/finance/overview
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/finance/overview' && req.method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);   // "2026-03"

    // 从真实的orders表读取财务数据
    const monthlyRevenue = db.get('orders')
      .filter(o => o.order_type === 'recharge' && o.status === 2 && o.created_at.startsWith(month))
      .reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    // 今日流水（成功的充值订单）
    const todayRevenue = db.get('orders')
      .filter(o => o.order_type === 'recharge' && o.status === 2 && o.created_at.startsWith(today))
      .reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    // 今日订单数（所有订单）
    const todayOrders = db.get('orders').filter(o => o.created_at.startsWith(today)).value().length;

    // 今日成功的订单数
    const todaySuccessOrders = db.get('orders')
      .filter(o => o.status === 2 && o.created_at.startsWith(today))
      .value().length;

    // 代理总余额（从 members 表取，user_type=代理）
    const agentBalance = db.get('members').filter(m => m.user_type === '代理')
      .reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);
    // 全部用户总余额
    const totalBalance = db.get('members')
      .reduce((s, m) => s + (parseFloat(m.balance) || 0), 0);

    // 从orders表生成当日营业走势（按小时）
    const todayOrdersList = db.get('orders')
      .filter(o => o.status === 2 && o.created_at.startsWith(today))
      .value();

    const hours = Array.from({length: 24}, (_, i) => {
      const hourOrders = todayOrdersList.filter(o => {
        const hour = parseInt(o.created_at.split(' ')[1]?.split(':')[0]) || 0;
        return hour === i;
      });
      const revenue = hourOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
      return { hour: i, revenue: Math.round(revenue * 100) / 100, orders: hourOrders.length };
    });

    // 供应商余额占比
    const suppliers = db.get('suppliers').filter(s => s.status === 1).map(s => ({
      name: s.name, balance: parseFloat(s.balance) || 0
    })).value();

    // 计算利润（收入 - 成本）
    const monthlyOrders = db.get('orders')
      .filter(o => o.status === 2 && o.created_at.startsWith(month))
      .value();
    const monthlyProfit = monthlyOrders.reduce((s, o) => {
      if (o.order_type === 'recharge') return s + parseFloat(o.amount || 0);
      if (o.order_type === 'consume') {
        // 消费订单利润 = 销售价 - 成本价
        const product = db.get('products').find({ id: o.product_id }).value();
        if (product) {
          const cost = parseFloat(product.cost_price) || 0;
          const price = parseFloat(o.amount) || 0;
          return s + (price - cost);
        }
      }
      return s;
    }, 0);

    return ok(res, {
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      monthlyProfit:  Math.round(monthlyProfit * 100) / 100,
      todayRevenue:   Math.round(todayRevenue * 100) / 100,
      todayOrders,
      todaySuccessOrders,
      agentBalance:   Math.round(agentBalance * 100) / 100,
      totalBalance:   Math.round(totalBalance * 100) / 100,
      dailyRevenue:   hours,
      supplierBalances: suppliers,
    });
  }

  /* ══════════════════════════════════════════════════════
     充值申请 /api/recharge-applies
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/recharge-applies' && req.method === 'GET') {
    const qs     = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const status = qs.get('status') || '';
    const kw     = (qs.get('keyword') || '').trim().toLowerCase();
    let list = db.get('recharge_applies').orderBy(['id'], ['desc']).value();
    if (status) list = list.filter(r => r.status === status);
    if (kw) list = list.filter(r =>
      (r.sn || '').toLowerCase().includes(kw) ||
      (r.agent_name || '').toLowerCase().includes(kw)
    );
    const total    = list.length;
    const pending  = db.get('recharge_applies').filter({ status: 'pending' }).value().length;
    const approved = db.get('recharge_applies').filter({ status: 'approved' }).value().length;
    const rejected = db.get('recharge_applies').filter({ status: 'rejected' }).value().length;
    return ok(res, { total, pending, approved, rejected, items: list });
  }

  /* ── POST /api/recharge-applies ─── 新建充值申请（代理侧，后台也可代建） */
  if (pathname === '/api/recharge-applies' && req.method === 'POST') {
    const body = await readBody(req);
    const { agent_id, agent_name, amount, pay_type, voucher, remark } = body;
    if (!agent_id)             return fail(res, '代理不能为空');
    if (!amount || amount <= 0) return fail(res, '金额必须大于0');
    const sn = 'RA' + Date.now();
    const apply = {
      id: nextId('recharge_applies'), sn,
      agent_id: parseInt(agent_id), agent_name: agent_name || '',
      amount: parseFloat(amount), pay_type: pay_type || '',
      voucher: voucher || '', remark: remark || '',
      status: 'pending', created_at: now(), reviewed_at: '', review_note: ''
    };
    db.get('recharge_applies').push(apply).write();
    return ok(res, apply, '充值申请已提交');
  }

  /* ── PUT /api/recharge-applies/:id/review ─── 审核 */
  const rcApplyMatch = pathname.match(/^\/api\/recharge-applies\/(\d+)\/review$/);
  if (rcApplyMatch && req.method === 'PUT') {
    const id   = parseInt(rcApplyMatch[1]);
    const body = await readBody(req);
    const { action, note } = body;  // action: 'approve' | 'reject'
    const apply = db.get('recharge_applies').find({ id }).value();
    if (!apply)                 return fail(res, '申请不存在', 404);
    if (apply.status !== 'pending') return fail(res, '该申请已审核');
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.get('recharge_applies').find({ id }).assign({
      status: newStatus, reviewed_at: now(), review_note: note || ''
    }).write();
    // 通过时给用户加余额（从members表）
    if (newStatus === 'approved') {
      const result = updateMemberBalance(
        apply.agent_id,
        apply.amount,
        'recharge',
        '充值申请 ' + apply.sn + ' 审核通过'
      );

      if (!result.success) {
        return fail(res, result.message);
      }

      // 创建充值订单
      createOrder({
        member_id: apply.agent_id,
        member_name: apply.agent_name,
        order_type: 'recharge',
        amount: apply.amount,
        remark: '充值申请审核通过'
      });

      // 记录操作日志
      addOperationLog({
        user_id: sess.userId,
        username: sess.username,
        action: 'approve_recharge',
        target_type: 'recharge_apply',
        target_id: apply.id,
        detail: `审核通过充值申请 ${apply.sn}, 金额 ¥${apply.amount}`,
        ip,
        user_agent: ua
      });
    }

    // 记录操作日志（拒绝情况）
    if (newStatus === 'rejected') {
      addOperationLog({
        user_id: sess.userId,
        username: sess.username,
        action: 'reject_recharge',
        target_type: 'recharge_apply',
        target_id: apply.id,
        detail: `拒绝充值申请 ${apply.sn}, 原因: ${note || ''}`,
        ip,
        user_agent: ua
      });
    }

    return ok(res, {}, newStatus === 'approved' ? '已通过，用户余额已增加' : '已拒绝');
  }

  /* ── PUT /api/recharge-applies/:id/voucher ─── 上传凭证（base64） */
  const rcVoucherMatch = pathname.match(/^\/api\/recharge-applies\/(\d+)\/voucher$/);
  if (rcVoucherMatch && req.method === 'PUT') {
    const id   = parseInt(rcVoucherMatch[1]);
    const body = await readBody(req);
    const { voucher } = body;
    if (!voucher) return fail(res, '凭证不能为空');
    const apply = db.get('recharge_applies').find({ id }).value();
    if (!apply) return fail(res, '申请不存在', 404);
    db.get('recharge_applies').find({ id }).assign({ voucher }).write();
    return ok(res, {}, '凭证已上传');
  }

  /* ══════════════════════════════════════════════════════
     提现申请 /api/withdraw-applies
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/withdraw-applies' && req.method === 'GET') {
    const qs     = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const status = qs.get('status') || '';
    const kw     = (qs.get('keyword') || '').trim().toLowerCase();
    let list = db.get('withdraw_applies').orderBy(['id'], ['desc']).value();
    if (status) list = list.filter(r => r.status === status);
    if (kw) list = list.filter(r =>
      (r.sn || '').toLowerCase().includes(kw) ||
      (r.agent_name || '').toLowerCase().includes(kw)
    );
    const total    = list.length;
    const pending  = db.get('withdraw_applies').filter({ status: 'pending' }).value().length;
    const approved = db.get('withdraw_applies').filter({ status: 'approved' }).value().length;
    const rejected = db.get('withdraw_applies').filter({ status: 'rejected' }).value().length;
    return ok(res, { total, pending, approved, rejected, items: list });
  }

  /* ── POST /api/withdraw-applies ─── 新建提现申请 */
  if (pathname === '/api/withdraw-applies' && req.method === 'POST') {
    const body = await readBody(req);
    const { agent_id, agent_name, amount, pay_type, account, account_name, remark } = body;
    if (!agent_id)             return fail(res, '用户不能为空');
    if (!amount || amount <= 0) return fail(res, '金额必须大于0');
    if (!account)               return fail(res, '收款账号不能为空');
    // 检查用户余额（从members表）
    const member = db.get('members').find({ id: parseInt(agent_id) }).value();
    if (member && parseFloat(member.balance) < parseFloat(amount)) return fail(res, '用户余额不足');
    const sn = 'WD' + Date.now();
    const apply = {
      id: nextId('withdraw_applies'), sn,
      agent_id: parseInt(agent_id), agent_name: agent_name || '',
      amount: parseFloat(amount), pay_type: pay_type || '',
      account: account || '', account_name: account_name || '',
      remark: remark || '',
      status: 'pending', created_at: now(), handled_at: '', handle_note: ''
    };
    db.get('withdraw_applies').push(apply).write();
    return ok(res, apply, '提现申请已提交');
  }

  /* ── PUT /api/withdraw-applies/:id/handle ─── 处理提现 */
  const wdApplyMatch = pathname.match(/^\/api\/withdraw-applies\/(\d+)\/handle$/);
  if (wdApplyMatch && req.method === 'PUT') {
    const id   = parseInt(wdApplyMatch[1]);
    const body = await readBody(req);
    const { action, note } = body;  // action: 'approve' | 'reject'
    const apply = db.get('withdraw_applies').find({ id }).value();
    if (!apply)                 return fail(res, '申请不存在', 404);
    if (apply.status !== 'pending') return fail(res, '该申请已处理');
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    db.get('withdraw_applies').find({ id }).assign({
      status: newStatus, handled_at: now(), handle_note: note || ''
    }).write();
    // 通过时扣用户余额（从members表）
    if (newStatus === 'approved') {
      const result = updateMemberBalance(
        apply.agent_id,
        -apply.amount,
        'withdraw',
        '提现申请 ' + apply.sn + ' 审核通过'
      );

      if (!result.success) {
        return fail(res, result.message);
      }

      // 创建提现订单
      createOrder({
        member_id: apply.agent_id,
        member_name: apply.agent_name,
        order_type: 'consume',
        amount: apply.amount,
        remark: '提现申请审核通过'
      });

      // 记录操作日志
      addOperationLog({
        user_id: sess.userId,
        username: sess.username,
        action: 'approve_withdraw',
        target_type: 'withdraw_apply',
        target_id: apply.id,
        detail: `审核通过提现申请 ${apply.sn}, 金额 ¥${apply.amount}`,
        ip,
        user_agent: ua
      });
    }

    // 记录操作日志（拒绝情况）
    if (newStatus === 'rejected') {
      addOperationLog({
        user_id: sess.userId,
        username: sess.username,
        action: 'reject_withdraw',
        target_type: 'withdraw_apply',
        target_id: apply.id,
        detail: `拒绝提现申请 ${apply.sn}, 原因: ${note || ''}`,
        ip,
        user_agent: ua
      });
    }

    return ok(res, {}, newStatus === 'approved' ? '已通过，用户余额已扣除' : '已拒绝');
  }

  /* ══════════════════════════════════════════════════════
     收款方式 /api/payment-methods
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/payment-methods' && req.method === 'GET') {
    const list = db.get('payment_methods').orderBy(['sort'], ['asc']).value();
    return ok(res, list);
  }

  if (pathname === '/api/payment-methods' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { type, name, account, account_name, qrcode, remark, sort } = body;
    if (!type)    return fail(res, '收款类型不能为空');
    if (!account) return fail(res, '账号不能为空');
    const pm = {
      id: nextId('payment_methods'),
      type: type || '', name: name || '', account: account || '',
      account_name: account_name || '', qrcode: qrcode || '',
      status: 1, sort: parseInt(sort) || 99, remark: remark || '',
      created_at: now()
    };
    db.get('payment_methods').push(pm).write();
    return ok(res, pm, '收款方式已添加');
  }

  const pmEditMatch = pathname.match(/^\/api\/payment-methods\/(\d+)$/);
  if (pmEditMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(pmEditMatch[1]);
    const body = await readBody(req);
    const pm   = db.get('payment_methods').find({ id }).value();
    if (!pm) return fail(res, '收款方式不存在', 404);
    const patch = { updated_at: now() };
    ['type','name','account','account_name','qrcode','remark','sort','status'].forEach(k => {
      if (body[k] !== undefined) patch[k] = k === 'sort' || k === 'status' ? parseInt(body[k]) : body[k];
    });
    db.get('payment_methods').find({ id }).assign(patch).write();
    return ok(res, db.get('payment_methods').find({ id }).value(), '已更新');
  }

  if (pmEditMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(pmEditMatch[1]);
    db.get('payment_methods').remove({ id }).write();
    return ok(res, {}, '已删除');
  }

  /* ── GET /api/agents ─── 代理列表（简要，供下拉） */
  if (pathname === '/api/agents' && req.method === 'GET') {
    // 优先从 members 中取代理用户（type=代理），兼容旧 agents 表
    const agentMembers = db.get('members').filter(m => m.user_type === '代理' && m.status === 1)
      .map(({ password, salt, ...m }) => ({
        id:      m.id,
        name:    m.realname || m.username,
        contact: m.realname || m.username,
        phone:   m.phone || '',
        balance: m.balance || 0,
        status:  m.status,
        agent_no: m.agent_no || '',
      })).value();
    return ok(res, agentMembers);
  }

  /* ══════════════════════════════════════════════════════
     代理级别管理 /api/agent-levels
     ══════════════════════════════════════════════════════ */
  if (pathname === '/api/agent-levels' && req.method === 'GET') {
    return ok(res, db.get('agent_levels').orderBy(['sort'], ['asc']).value());
  }

  if (pathname === '/api/agent-levels' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { name, desc, color, sort } = body;
    if (!name || !name.trim()) return fail(res, '级别名称不能为空');
    const dup = db.get('agent_levels').find(l => l.name === name.trim()).value();
    if (dup) return fail(res, '该级别名称已存在');
    const level = {
      id:         nextId('agent_levels'),
      name:       name.trim(),
      desc:       (desc  || '').trim(),
      color:      color  || 'indigo',
      sort:       parseInt(sort) || 99,
      created_at: now(),
    };
    db.get('agent_levels').push(level).write();
    return ok(res, level, '级别已创建');
  }

  const agentLevelMatch = pathname.match(/^\/api\/agent-levels\/(\d+)$/);
  if (agentLevelMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(agentLevelMatch[1]);
    const body = await readBody(req);
    const level = db.get('agent_levels').find({ id }).value();
    if (!level) return fail(res, '级别不存在', 404);
    const patch = { updated_at: now() };
    ['name','desc','color','sort'].forEach(k => { if (body[k] !== undefined) patch[k] = k === 'sort' ? parseInt(body[k]) : body[k]; });
    db.get('agent_levels').find({ id }).assign(patch).write();
    return ok(res, db.get('agent_levels').find({ id }).value(), '级别已更新');
  }

  if (agentLevelMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(agentLevelMatch[1]);
    // 检查是否有代理在用
    const inUse = db.get('members').find(m => m.level_id === id).value();
    if (inUse) return fail(res, '该级别下还有代理用户，无法删除');
    db.get('agent_levels').remove({ id }).write();
    return ok(res, {}, '级别已删除');
  }

  /* ══════════════════════════════════════════════════════
     产品分类 /api/categories  /api/categories/:id
     ══════════════════════════════════════════════════════ */
  const catIdMatch = pathname.match(/^\/api\/categories\/(\d+)$/);

  // GET /api/categories — 全部分类（树形）
  if (pathname === '/api/categories' && req.method === 'GET') {
    const all = db.get('categories').value();
    return ok(res, all);
  }

  // POST /api/categories — 新增分类
  if (pathname === '/api/categories' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { name, parent_id, sort, order_tip } = body;
    if (!name || !name.trim()) return fail(res, '分类名不能为空');
    const item = {
      id: nextId('categories'),
      name: name.trim(),
      parent_id: parseInt(parent_id) || 0,
      sort: parseInt(sort) || 99,
      order_tip: (order_tip || '').trim(),
      status: 1,
      created_at: now(),
    };
    db.get('categories').push(item).write();
    return ok(res, item, '分类已添加');
  }

  // PUT /api/categories/:id — 编辑分类
  if (catIdMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(catIdMatch[1]);
    const body = await readBody(req);
    const cat = db.get('categories').find({ id }).value();
    if (!cat) return fail(res, '分类不存在', 404);
    const patch = {};
    ['name','parent_id','sort','status','order_tip'].forEach(k => {
      if (body[k] !== undefined) patch[k] = ['parent_id','sort','status'].includes(k) ? parseInt(body[k]) : body[k];
    });
    db.get('categories').find({ id }).assign(patch).write();
    return ok(res, db.get('categories').find({ id }).value(), '分类已更新');
  }

  // DELETE /api/categories/:id — 删除分类
  if (catIdMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(catIdMatch[1]);
    // 有子分类不可删
    const hasChild = db.get('categories').find(c => c.parent_id === id).value();
    if (hasChild) return fail(res, '该分类下有子分类，请先删除子分类');
    // 有产品不可删
    const hasProd = db.get('products').find(p => p.category_id === id).value();
    if (hasProd) return fail(res, '该分类下有产品，请先移除产品');
    db.get('categories').remove({ id }).write();
    return ok(res, {}, '分类已删除');
  }

  /* ══════════════════════════════════════════════════════
     供应商 /api/suppliers  /api/suppliers/:id
     ══════════════════════════════════════════════════════ */
  const supIdMatch = pathname.match(/^\/api\/suppliers\/(\d+)$/);

  // GET /api/suppliers — 列表
  if (pathname === '/api/suppliers' && req.method === 'GET') {
    return ok(res, db.get('suppliers').value());
  }

  // POST /api/suppliers — 新增
  if (pathname === '/api/suppliers' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { name, contact, phone } = body;
    if (!name || !name.trim()) return fail(res, '供应商名称不能为空');
    const item = {
      id: nextId('suppliers'),
      name: name.trim(),
      contact: contact || '',
      phone: phone || '',
      balance: 0,
      status: 1,
      created_at: now(),
    };
    db.get('suppliers').push(item).write();
    return ok(res, item, '供应商已添加');
  }

  // DELETE /api/suppliers/:id — 删除
  if (supIdMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(supIdMatch[1]);
    const hasProd = db.get('products').find(p => p.supplier_id === id).value();
    if (hasProd) return fail(res, '该供应商下有产品，请先移除产品');
    db.get('suppliers').remove({ id }).write();
    return ok(res, {}, '供应商已删除');
  }

  // PUT /api/suppliers/:id — 编辑供应商基础信息
  if (supIdMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(supIdMatch[1]);
    const body = await readBody(req);
    const sup  = db.get('suppliers').find({ id }).value();
    if (!sup) return fail(res, '供应商不存在', 404);
    const patch = { updated_at: now() };
    ['name','contact','phone','remark'].forEach(k => { if (body[k] !== undefined) patch[k] = body[k]; });
    db.get('suppliers').find({ id }).assign(patch).write();
    return ok(res, db.get('suppliers').find({ id }).value(), '供应商已更新');
  }

  /* ── GET /api/suppliers/:id/api-config ── 读取接口配置 */
  const supApiConfigMatch = pathname.match(/^\/api\/suppliers\/(\d+)\/api-config$/);
  if (supApiConfigMatch && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supApiConfigMatch[1]);
    const sup = db.get('suppliers').find({ id }).value();
    if (!sup) return fail(res, '供应商不存在', 404);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value() || {};
    // 隐藏 key 后半段（安全展示）
    const safeCfg = { ...cfg };
    if (safeCfg.api_key && safeCfg.api_key.length > 8) {
      safeCfg.api_key_masked = safeCfg.api_key.slice(0, 4) + '****' + safeCfg.api_key.slice(-4);
    }
    return ok(res, safeCfg);
  }

  /* ── POST /api/suppliers/:id/api-config ── 保存接口配置 */
  if (supApiConfigMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id   = parseInt(supApiConfigMatch[1]);
    const body = await readBody(req);
    const sup  = db.get('suppliers').find({ id }).value();
    if (!sup) return fail(res, '供应商不存在', 404);

    const { api_type, api_domain, userid, api_key, notify_url, enabled } = body;
    if (!api_domain || !api_domain.trim()) return fail(res, 'API域名不能为空');
    if (!userid     || !userid.trim())     return fail(res, '商户ID不能为空');
    if (!api_key    || !api_key.trim())    return fail(res, 'API密钥不能为空');

    const exist = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    const cfgData = {
      supplier_id: id,
      api_type:    api_type || 'dayuanren',
      api_domain:  api_domain.trim().replace(/\/$/, ''),
      userid:      userid.trim(),
      api_key:     api_key.trim(),
      notify_url:  (notify_url || '').trim(),
      enabled:     enabled === false ? 0 : 1,
      updated_at:  now(),
    };
    if (exist) {
      db.get('supplier_api_configs').find({ supplier_id: id }).assign(cfgData).write();
    } else {
      cfgData.id         = nextId('supplier_api_configs');
      cfgData.created_at = now();
      db.get('supplier_api_configs').push(cfgData).write();
    }
    // 标记供应商已配置接口
    db.get('suppliers').find({ id }).assign({ api_configured: 1, updated_at: now() }).write();
    return ok(res, {}, '接口配置已保存');
  }

  /* ════════════════════════════════════════════════════════════════
     大猿人公共签名函数
     文档规范：参数按字典(ASCII)排序 → 拼接 key=val&... → 末尾追加 &apikey=xxx
              → URL解码 → MD5 → 大写
     ════════════════════════════════════════════════════════════════ */
  function dyrSign(params, apikey) {
    const crypto = require('crypto');
    const qs     = require('querystring');
    // 字典排序（不含 sign 本身）
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort();
    // 用 qs.stringify 保证编码一致，再 decodeURIComponent 还原（文档要求 urldecode）
    const signStr = decodeURIComponent(qs.stringify(
      sorted.reduce((o, k) => { o[k] = params[k]; return o; }, {})
    )) + `&apikey=${apikey}`;
    return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  }

  /* 通用大猿人 HTTP 请求封装 */
  function dyrRequest(cfg, path, params, timeoutMs) {
    const qs   = require('querystring');
    const http = require('http');
    const https = require('https');
    const sign = dyrSign(params, cfg.api_key);
    const postData = qs.stringify({ ...params, sign });
    // 只取协议+host，去掉域名里用户可能多填的路径部分（如 /yrapi.php）
    let rawDomain = cfg.api_domain.startsWith('http') ? cfg.api_domain : `http://${cfg.api_domain}`;
    try {
      const u = new URL(rawDomain);
      rawDomain = `${u.protocol}//${u.host}`;
    } catch(e) { /* 格式异常时保持原值 */ }
    const fullUrl  = `${rawDomain}${path}`;
    return new Promise((resolve, reject) => {
      const urlObj = new URL(fullUrl);
      const mod    = urlObj.protocol === 'https:' ? https : http;
      const options = {
        hostname: urlObj.hostname,
        port:     urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path:     urlObj.pathname + urlObj.search,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: timeoutMs || 10000,
      };
      const req = mod.request(options, r => {
        let data = '';
        r.on('data', c => data += c);
        r.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`响应非 JSON：${data.slice(0, 200)}`)); }
        });
      });
      req.on('error',   e  => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(postData);
      req.end();
    });
  }

  /* ── POST /api/suppliers/:id/test-connect ── 测试接口连通性 */
  const supTestMatch = pathname.match(/^\/api\/suppliers\/(\d+)\/test-connect$/);
  if (supTestMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supTestMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');
    if (!cfg.userid)   return fail(res, '配置缺少商户 ID');
    if (!cfg.api_key)  return fail(res, '配置缺少 API 密钥');

    try {
      // 使用 /user 接口（查询用户信息）验证连通性，参数仅 userid
      const j = await dyrRequest(cfg, '/yrapi.php/index/user', { userid: cfg.userid }, 10000);
      if (j.errno === '0' || j.errno === 0) {
        db.get('suppliers').find({ id })
          .assign({ last_test: now(), test_status: 'ok', balance: j.data?.balance || '' })
          .write();
        return ok(res, {
          username: j.data?.username || '',
          balance:  j.data?.balance  || '',
          userid:   j.data?.id       || cfg.userid,
        }, '连接成功');
      } else {
        db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
        return fail(res, `接口返回错误：${j.errmsg || ('errno=' + j.errno)}`);
      }
    } catch (e) {
      db.get('suppliers').find({ id }).assign({ last_test: now(), test_status: 'fail' }).write();
      return fail(res, `连接失败：${e.message}`);
    }
  }

  /* ── POST /api/suppliers/:id/sync-products ── 同步供应商产品列表 */
  const supSyncMatch = pathname.match(/^\/api\/suppliers\/(\d+)\/sync-products$/);
  if (supSyncMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supSyncMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');

    const body = await readBody(req);
    // 可选过滤参数：type=产品类型ID, cate_id=分类ID（文档字段名）
    const params = { userid: cfg.userid };
    if (body.type)    params.type    = body.type;
    if (body.cate_id) params.cate_id = body.cate_id;

    try {
      const j = await dyrRequest(cfg, '/yrapi.php/index/product', params, 20000);
      if ((j.errno === '0' || j.errno === 0) && j.data) {
        // 文档返回结构：data 是分类数组，每个分类下有 products 数组
        // 将所有分类的产品铺平，并附带分类信息
        let list = [];
        const raw = Array.isArray(j.data) ? j.data : [];
        raw.forEach(cate => {
          const cName = cate.cate || '';
          const cId   = cate.id   || '';
          const type  = cate.type || '';
          const tName = cate.type_name || '';
          if (Array.isArray(cate.products)) {
            cate.products.forEach(p => {
              list.push({
                id:           p.id,
                name:         p.name         || '',
                desc:         p.desc         || '',
                price:        p.price        || '0',
                y_price:      p.y_price      || '0',
                max_price:    p.max_price    || '0',
                api_open:     p.api_open     || '',
                isp:          p.isp          || '',
                ys_tag:       p.ys_tag       || '',
                cate_id:      cId,
                cate_name:    cName,
                type:         type,
                type_name:    tName,
              });
            });
          }
        });
        return ok(res, { total: list.length, list, raw }, `获取到 ${list.length} 个产品`);
      } else {
        return fail(res, `接口返回错误：${j.errmsg || ('errno=' + j.errno)}`);
      }
    } catch (e) {
      return fail(res, `请求失败：${e.message}`);
    }
  }

  /* ── POST /api/suppliers/:id/recharge ── 大猿人充值下单 */
  const supRechargeMatch = pathname.match(/^\/api\/suppliers\/(\d+)\/recharge$/);
  if (supRechargeMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supRechargeMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');

    const body = await readBody(req);
    const { out_trade_num, product_id, mobile, notify_url, amount, price, param1, param2, param3 } = body;
    if (!out_trade_num) return fail(res, '缺少商户订单号 out_trade_num');
    if (!product_id)    return fail(res, '缺少产品 ID product_id');
    if (!mobile)        return fail(res, '缺少充值号码 mobile');

    const params = {
      userid:        cfg.userid,
      out_trade_num: out_trade_num,
      product_id:    product_id,
      mobile:        mobile,
      notify_url:    notify_url || cfg.notify_url || '',
    };
    if (amount)  params.amount  = amount;
    if (price)   params.price   = price;
    if (param1)  params.param1  = param1;
    if (param2)  params.param2  = param2;
    if (param3)  params.param3  = param3;

    try {
      const j = await dyrRequest(cfg, '/yrapi.php/index/recharge', params, 15000);
      if (j.errno === '0' || j.errno === 0) {
        return ok(res, j.data, '下单成功');
      } else {
        return fail(res, `下单失败：${j.errmsg || ('errno=' + j.errno)}`);
      }
    } catch (e) {
      return fail(res, `请求失败：${e.message}`);
    }
  }

  /* ── POST /api/suppliers/:id/order-query ── 大猿人订单查询 */
  const supOrderQueryMatch = pathname.match(/^\/api\/suppliers\/(\d+)\/order-query$/);
  if (supOrderQueryMatch && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id  = parseInt(supOrderQueryMatch[1]);
    const cfg = db.get('supplier_api_configs').find({ supplier_id: id }).value();
    if (!cfg) return fail(res, '请先保存接口配置');

    const body = await readBody(req);
    const { out_trade_nums } = body;
    if (!out_trade_nums) return fail(res, '缺少商户订单号 out_trade_nums');

    try {
      const j = await dyrRequest(cfg, '/yrapi.php/index/check', {
        userid:        cfg.userid,
        out_trade_nums: out_trade_nums,
      }, 10000);
      if (j.errno === '0' || j.errno === 0) {
        return ok(res, j.data, '查询成功');
      } else {
        return fail(res, `查询失败：${j.errmsg || ('errno=' + j.errno)}`);
      }
    } catch (e) {
      return fail(res, `请求失败：${e.message}`);
    }
  }

  /* ══════════════════════════════════════════════════════
     产品列表 /api/products  /api/products/:id
     /api/products/:id/status  — 上下架
     ══════════════════════════════════════════════════════ */
  const prodIdMatch    = pathname.match(/^\/api\/products\/(\d+)$/);
  const prodStatusMatch = pathname.match(/^\/api\/products\/(\d+)\/status$/);
  const prodDirectMatch = pathname.match(/^\/api\/products\/(\d+)\/direct$/);

  // GET /api/products — 带分页+过滤
  if (pathname === '/api/products' && req.method === 'GET') {
    const qs       = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const kw       = (qs.get('kw') || '').trim().toLowerCase();
    const catId    = parseInt(qs.get('cat_id') || '0');
    const supId    = parseInt(qs.get('sup_id') || '0');
    const status   = qs.get('status'); // '1'=上架 '0'=下架 ''=全部
    const page     = Math.max(1, parseInt(qs.get('page') || '1'));
    const pageSize = 20;
    
    // P0 优化: 缓存查询结果 (P0 Optimization: Cache query results)
    const cacheKey = `products:kw=${kw}:cat=${catId}:sup=${supId}:status=${status}:page=${page}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return ok(res, cached);
    
    let list = db.get('products').value();
    if (kw)      list = list.filter(p => p.name.toLowerCase().includes(kw));
    if (catId)   list = list.filter(p => p.category_id === catId);
    if (supId)   list = list.filter(p => p.supplier_id === supId);
    if (status !== null && status !== '') list = list.filter(p => p.status === parseInt(status));
    const total = list.length;
    const data  = list.slice((page-1)*pageSize, page*pageSize);
    const result = { items: data, total, page, pageSize };
    
    // 缓存结果
    apiCache.set(cacheKey, result);
    return ok(res, result);
  }

  // POST /api/products — 新增产品
  if (pathname === '/api/products' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const {
      name, category_id, supplier_id, supplier_item_id,
      face_value, cost_price, agent_price, retail_price,
      operators, status, sort,
      daily_limit, monthly_limit, allow_order_in_progress,
      charge_mode, delay_submit, sync_price, sync_status,
    } = body;
    if (!name || !name.trim()) return fail(res, '产品名称不能为空');
    const cat = db.get('categories').find({ id: parseInt(category_id) }).value();
    const supId = parseInt(supplier_id) || 0;
    // supplier_id==-1 代表"直冲商品"
    const sup = supId > 0 ? db.get('suppliers').find({ id: supId }).value() : null;
    const isDirect = supId === -1 ? 1 : 0;
    const item = {
      id:                     nextId('products'),
      name:                   name.trim(),
      category_id:            parseInt(category_id) || 0,
      category:               cat ? cat.name : '',
      supplier_id:            supId,
      supplier:               sup ? sup.name : (isDirect ? '直冲' : ''),
      supplier_item_id:       isDirect ? '' : (supplier_item_id || '').toString().trim(),
      face_value:             parseFloat(face_value) || 0,
      cost_price:             parseFloat(cost_price) || 0,
      agent_price:            parseFloat(agent_price) || 0,
      retail_price:           parseFloat(retail_price) || 0,
      operators:              Array.isArray(operators) ? operators : [],
      status:                 parseInt(status) === 0 ? 0 : 1,
      sort:                   parseInt(sort) || 99,
      daily_limit:            parseInt(daily_limit)   || 0,
      monthly_limit:          parseInt(monthly_limit) || 0,
      allow_order_in_progress: parseInt(allow_order_in_progress) === 1 ? 1 : 0,
      charge_mode:            ['direct','supplier'].includes(charge_mode) ? charge_mode : (isDirect ? 'direct' : 'supplier'),
      delay_submit:           parseFloat(delay_submit) || 0,
      sync_price:             parseInt(sync_price)  === 1 ? 1 : 0,
      sync_status:            parseInt(sync_status) === 1 ? 1 : 0,
      is_direct:              isDirect,
      created_at:             now(),
    };
    db.get('products').push(item).write();
    // P0 优化: 清空产品缓存 (P0 Optimization: Invalidate cache)
    apiCache.invalidate('products');
    return ok(res, item, '产品已添加');
  }

  // PUT /api/products/:id — 编辑产品
  if (prodIdMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(prodIdMatch[1]);
    const body = await readBody(req);
    const prod = db.get('products').find({ id }).value();
    if (!prod) return fail(res, '产品不存在', 404);
    const patch = {};
    const cat = body.category_id ? db.get('categories').find({ id: parseInt(body.category_id) }).value() : null;
    const supId = body.supplier_id !== undefined ? parseInt(body.supplier_id) : undefined;
    const sup = supId > 0 ? db.get('suppliers').find({ id: supId }).value() : null;
    // 基础价格字段
    ['name','face_value','cost_price','agent_price','retail_price'].forEach(k => {
      if (body[k] !== undefined) patch[k] = k === 'name' ? body[k] : parseFloat(body[k]);
    });
    if (body.category_id !== undefined) { patch.category_id = parseInt(body.category_id); if (cat) patch.category = cat.name; }
    if (supId !== undefined) {
      patch.supplier_id = supId;
      patch.supplier    = sup ? sup.name : (supId === -1 ? '直冲' : '');
      patch.is_direct   = supId === -1 ? 1 : 0;
    }
    // 新扩展字段
    if (body.supplier_item_id  !== undefined) patch.supplier_item_id       = body.supplier_item_id.toString().trim();
    if (body.operators         !== undefined) patch.operators               = Array.isArray(body.operators) ? body.operators : [];
    if (body.status            !== undefined) patch.status                  = parseInt(body.status) === 0 ? 0 : 1;
    if (body.sort              !== undefined) patch.sort                    = parseInt(body.sort) || 99;
    if (body.daily_limit       !== undefined) patch.daily_limit             = parseInt(body.daily_limit)   || 0;
    if (body.monthly_limit     !== undefined) patch.monthly_limit           = parseInt(body.monthly_limit) || 0;
    if (body.allow_order_in_progress !== undefined) patch.allow_order_in_progress = parseInt(body.allow_order_in_progress) === 1 ? 1 : 0;
    if (body.charge_mode       !== undefined) patch.charge_mode             = ['direct','supplier'].includes(body.charge_mode) ? body.charge_mode : 'supplier';
    if (body.delay_submit      !== undefined) patch.delay_submit            = parseFloat(body.delay_submit) || 0;
    if (body.sync_price        !== undefined) patch.sync_price              = parseInt(body.sync_price)  === 1 ? 1 : 0;
    if (body.sync_status       !== undefined) patch.sync_status             = parseInt(body.sync_status) === 1 ? 1 : 0;
    db.get('products').find({ id }).assign(patch).write();
    // P0 优化: 清空产品缓存 (P0 Optimization: Invalidate cache)
    apiCache.invalidate('products');
    return ok(res, db.get('products').find({ id }).value(), '产品已更新');
  }

  // DELETE /api/products/:id — 删除产品
  if (prodIdMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(prodIdMatch[1]);
    db.get('products').remove({ id }).write();
    // P0 优化: 清空产品缓存 (P0 Optimization: Invalidate cache)
    apiCache.invalidate('products');
    return ok(res, {}, '产品已删除');
  }

  // PATCH /api/products/:id/status — 上下架切换
  if (prodStatusMatch && req.method === 'PATCH') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(prodStatusMatch[1]);
    const prod = db.get('products').find({ id }).value();
    if (!prod) return fail(res, '产品不存在', 404);
    const newStatus = prod.status === 1 ? 0 : 1;
    db.get('products').find({ id }).assign({ status: newStatus }).write();
    return ok(res, { status: newStatus }, newStatus === 1 ? '已上架' : '已下架');
  }

  // PATCH /api/products/:id/direct — 设置/取消直冲
  if (prodDirectMatch && req.method === 'PATCH') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(prodDirectMatch[1]);
    const prod = db.get('products').find({ id }).value();
    if (!prod) return fail(res, '产品不存在', 404);
    const newDirect = prod.is_direct === 1 ? 0 : 1;
    db.get('products').find({ id }).assign({ is_direct: newDirect }).write();
    return ok(res, { is_direct: newDirect }, newDirect === 1 ? '已设为直冲' : '已取消直冲');
  }

  /* ══════════════════════════════════════════════════════
     直冲产品 /api/direct-products  /api/direct-products/:id
     ══════════════════════════════════════════════════════ */
  const dpIdMatch     = pathname.match(/^\/api\/direct-products\/(\d+)$/);
  const dpSaleMatch   = pathname.match(/^\/api\/direct-products\/(\d+)\/sale$/);

  // GET /api/direct-products — 列表（带分页）
  if (pathname === '/api/direct-products' && req.method === 'GET') {
    const qs       = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const kw       = (qs.get('kw') || '').trim().toLowerCase();
    const onSale   = qs.get('on_sale');
    const page     = Math.max(1, parseInt(qs.get('page') || '1'));
    const pageSize = 20;
    let list = db.get('direct_products').value();
    if (kw)    list = list.filter(p => p.name.toLowerCase().includes(kw));
    if (onSale !== null && onSale !== '') list = list.filter(p => p.on_sale === parseInt(onSale));
    const total = list.length;
    const data  = list.slice((page-1)*pageSize, page*pageSize);
    return ok(res, { list: data, total, page, pageSize });
  }

  // POST /api/direct-products — 新增直冲产品
  if (pathname === '/api/direct-products' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { name, charge_type, face_value, direct_price } = body;
    if (!name || !name.trim()) return fail(res, '产品名称不能为空');
    const item = {
      id:           nextId('direct_products'),
      name:         name.trim(),
      charge_type:  charge_type || '账号直充',
      face_value:   parseFloat(face_value) || 0,
      direct_price: parseFloat(direct_price) || 0,
      on_sale:      1,
      created_at:   now(),
    };
    db.get('direct_products').push(item).write();
    return ok(res, item, '直冲产品已添加');
  }

  // PUT /api/direct-products/:id — 编辑
  if (dpIdMatch && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(dpIdMatch[1]);
    const body = await readBody(req);
    const p = db.get('direct_products').find({ id }).value();
    if (!p) return fail(res, '产品不存在', 404);
    const patch = {};
    ['name','charge_type'].forEach(k => { if (body[k] !== undefined) patch[k] = body[k]; });
    ['face_value','direct_price'].forEach(k => { if (body[k] !== undefined) patch[k] = parseFloat(body[k]); });
    db.get('direct_products').find({ id }).assign(patch).write();
    return ok(res, db.get('direct_products').find({ id }).value(), '已更新');
  }

  // DELETE /api/direct-products/:id — 删除
  if (dpIdMatch && req.method === 'DELETE') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(dpIdMatch[1]);
    db.get('direct_products').remove({ id }).write();
    return ok(res, {}, '已删除');
  }

  // PATCH /api/direct-products/:id/sale — 在售/停售切换
  if (dpSaleMatch && req.method === 'PATCH') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const id = parseInt(dpSaleMatch[1]);
    const p = db.get('direct_products').find({ id }).value();
    if (!p) return fail(res, '产品不存在', 404);
    const newSale = p.on_sale === 1 ? 0 : 1;
    db.get('direct_products').find({ id }).assign({ on_sale: newSale }).write();
    return ok(res, { on_sale: newSale }, newSale === 1 ? '已设为在售' : '已设为停售');
  }

  /* ══════════════════════════════════════════════════════
     代理产品定价 /api/agent-pricing
     ══════════════════════════════════════════════════════ */

  /* GET /api/agent-pricing?member_id=1 — 某代理的产品定价列表 */
  if (pathname === '/api/agent-pricing' && req.method === 'GET') {
    const qs        = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const member_id = parseInt(qs.get('member_id') || '0');
    if (!member_id) return fail(res, 'member_id 不能为空');
    const list = db.get('agent_pricing').filter({ member_id }).value();
    return ok(res, list);
  }

  /* PUT /api/agent-pricing — 保存（批量 upsert）单个代理的产品价格 */
  if (pathname === '/api/agent-pricing' && req.method === 'PUT') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    // body: { member_id, items: [{ product_id, product_name, category, face_value, base_price, agent_price }] }
    const { member_id, items } = body;
    if (!member_id || !Array.isArray(items)) return fail(res, '参数错误');
    const mid = parseInt(member_id);
    items.forEach(item => {
      const exist = db.get('agent_pricing').find({ member_id: mid, product_id: item.product_id }).value();
      if (exist) {
        db.get('agent_pricing').find({ member_id: mid, product_id: item.product_id })
          .assign({ agent_price: parseFloat(item.agent_price), updated_at: now() }).write();
      } else {
        db.get('agent_pricing').push({
          id:           nextId('agent_pricing'),
          member_id:    mid,
          product_id:   item.product_id,
          product_name: item.product_name || '',
          category:     item.category || '',
          face_value:   parseFloat(item.face_value) || 0,
          base_price:   parseFloat(item.base_price) || 0,
          agent_price:  parseFloat(item.agent_price) || 0,
          created_at:   now(),
        }).write();
      }
    });
    return ok(res, {}, '价格已保存');
  }

  /* POST /api/agent-pricing/batch-markup — 批量按百分比加价（对指定代理/所有代理）
     body: { member_ids: [1,2,3] | 'all', percent: 5, direction: 'up'|'down' }
  */
  if (pathname === '/api/agent-pricing/batch-markup' && req.method === 'POST') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const body = await readBody(req);
    const { member_ids, percent, direction } = body;
    if (percent === undefined || percent === null) return fail(res, '加价百分比不能为空');
    const pct  = parseFloat(percent);
    if (isNaN(pct) || pct < 0 || pct > 100) return fail(res, '百分比范围 0~100');
    const dir  = direction === 'down' ? -1 : 1;
    const rate = 1 + dir * pct / 100;

    let targets = db.get('agent_pricing').value();
    if (member_ids !== 'all' && Array.isArray(member_ids) && member_ids.length > 0) {
      const ids = member_ids.map(Number);
      targets = targets.filter(t => ids.includes(t.member_id));
    }

    targets.forEach(t => {
      const newPrice = Math.round(t.base_price * rate * 100) / 100;
      db.get('agent_pricing').find({ id: t.id }).assign({ agent_price: newPrice, updated_at: now() }).write();
    });

    return ok(res, { affected: targets.length },
      `已${dir > 0 ? '上调' : '下调'}${pct}%，共影响 ${targets.length} 条定价`);
  }

  /* ── 监控接口 (P1 优化) ──────────────────────────────────── */
  if (pathname === '/api/monitor/cache-stats' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    return ok(res, {
      cache: apiCache.stats(),
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/monitor/request-logs' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    const qs = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const limit = Math.min(parseInt(qs.get('limit')) || 50, 500);
    return ok(res, {
      logs: requestLogger.getRecentLogs(limit),
      stats: requestLogger.getStats(),
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/monitor/rate-limit' && req.method === 'GET') {
    if (sess.role !== 'admin') return fail(res, '无权限', 403);
    return ok(res, {
      ip,
      status: rateLimiter.getStatus(ip),
      timestamp: new Date().toISOString()
    });
  }

  /* ── API 版本信息 (P2 优化) ──────────────────────────────── */
  if (pathname === '/api/version' && req.method === 'GET') {
    return ok(res, {
      current_version: apiVersion,
      supported_versions: API_VERSIONS,
      api_docs: 'https://docs.example.com/api',
      timestamp: new Date().toISOString()
    });
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    // 健康检查端点（无需认证）
    return ok(res, {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: apiVersion,
      cache: {
        hits: apiCache.hits,
        misses: apiCache.misses,
        hit_rate: apiCache.hits + apiCache.misses > 0 
          ? `${((apiCache.hits / (apiCache.hits + apiCache.misses)) * 100).toFixed(2)}%` 
          : 'N/A'
      }
    });
  }

  return fail(res, 'API 接口不存在', 404);
}

/* ══════════════════════════════════════════════════════════════
   静态文件
   ══════════════════════════════════════════════════════════════ */
function handleStatic(req, res, pathname) {
  // 根路径重定向到登录页
  const filePath = path.join(BASE, pathname === '/' ? 'login.html' : pathname);
  try {
    const data = fs.readFileSync(filePath);
    const ext  = path.extname(filePath).slice(1).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

/* ══════════════════════════════════════════════════════════════
   启动
   ══════════════════════════════════════════════════════════════ */
const server = http.createServer(async (req, res) => {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  
  // P1 优化: 请求超时保护 (30 秒超时)
  const reqTimeout = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`[TIMEOUT] ${req.method} ${pathname} exceeded 30s`);
      fail(res, '请求超时，请稍后再试', 504, { errorCode: 'REQUEST_TIMEOUT' });
    }
  }, 30000);
  res.on('finish', () => clearTimeout(reqTimeout));

  if (pathname.startsWith('/api/')) {
    try {
      await handleAPI(req, res, pathname);
    } catch (err) {
      // P1 优化: 全局异常处理 (Global error handler)
      console.error(`[UNCAUGHT ERROR] ${req.method} ${pathname}:`, err.message);
      if (!res.headersSent) {
        fail(res, '服务器内部错误，请稍后再试', 500, {
          errorCode: 'INTERNAL_SERVER_ERROR',
          context: { path: pathname, method: req.method }
        });
      }
    }
  } else {
    handleStatic(req, res, pathname);
  }
});

server.listen(PORT, () => {
  console.log('\n🚀 充易达管理系统已启动');
  console.log(`   地址：   http://localhost:${PORT}`);
  console.log(`   登录页：http://localhost:${PORT}/login.html`);
  console.log(`   账号：admin   密码：123456\n`);
});
