/**
 * CloudBase 云函数入口
 * 对应原项目的 server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 引入数据库逻辑
const db = require('../../db');

const BASE = path.join(__dirname, '../dashboard-ui');
const PORT = process.env.PORT || 8080;

// MIME 类型
const MIME = {
  html: 'text/html; charset=utf-8',
  css:  'text/css; charset=utf-8',
  js:   'application/javascript; charset=utf-8',
  png:  'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif:  'image/gif', svg: 'image/svg+xml', ico: 'image/x-icon',
  json: 'application/json; charset=utf-8',
};

// Session 管理
const sessions = new Map();
const SESSION_TTL = 24 * 60 * 60 * 1000;

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    role: user.role,
    expires: Date.now() + SESSION_TTL,
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

// 响应工具
const json = (res, code, data) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
};
const ok   = (res, data = {}, msg = 'ok') => json(res, 200, { code: 0, msg, data });
const fail = (res, msg = '操作失败', code = 400) => json(res, code, { code: -1, msg, data: null });

// CORS
const setCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// 主请求处理
const handleRequest = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API 路由
  if (pathname.startsWith('/api/')) {
    await handleApi(req, res, pathname, url);
    return;
  }

  // 静态文件
  serveStatic(req, res, pathname);
};

// API 处理
const handleApi = async (req, res, pathname, url) => {
  const session = getSession(getToken(req));

  // 登录（不需要 session）
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { username, password } = JSON.parse(body);
        const user = db.data.users.find(u =>
          u.username === username && db.verifyPassword(password, u.password, u.salt)
        );
        if (user && user.status === 1) {
          const token = createSession(user);
          const { password: _, salt: __, ...safeUser } = user;
          ok(res, { token, user: safeUser }, '登录成功');
        } else {
          fail(res, '用户名或密码错误', 401);
        }
      } catch (e) {
        fail(res, '参数错误');
      }
    });
    return;
  }

  // 其他 API 需要 session
  if (!session) {
    fail(res, '请先登录', 401);
    return;
  }

  // Dashboard 数据
  if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
    const orders = db.data.orders;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(new Date().toISOString().split('T')[0])).length;
    ok(res, { totalRevenue, todayOrders, totalOrders: orders.length });
    return;
  }

  // 其他路由...
  fail(res, 'API 未实现', 404);
};

// 静态文件服务
const serveStatic = (req, res, pathname) => {
  let filepath = pathname === '/' ? path.join(BASE, 'index.html') : path.join(BASE, pathname);

  if (!fs.existsSync(filepath)) {
    filepath = path.join(BASE, 'index.html');
  }

  if (!fs.existsSync(filepath)) {
    json(res, 404, { error: 'Not Found' });
    return;
  }

  const ext = path.extname(filepath).slice(1);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filepath, (err, data) => {
    if (err) {
      json(res, 500, { error: 'Internal Error' });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
};

// CloudBase 云函数入口
exports.main_handler = async (event, context) => {
  // 模拟 HTTP 请求
  const req = {
    method: event.httpMethod,
    url: event.path + (event.queryString ? '?' + event.queryString : ''),
    headers: event.headers || {},
    body: event.body,
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    writeHead: (code, headers) => {
      res.statusCode = code;
      res.headers = { ...res.headers, ...headers };
    },
    end: (data) => {
      res.body = data;
    },
    setHeader: (name, value) => {
      res.headers[name] = value;
    }
  };

  await handleRequest(req, res);

  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body,
    isBase64Encoded: false
  };
};

// 本地运行（开发时使用）
if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
