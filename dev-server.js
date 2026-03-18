/**
 * dev-server.js - 开发服务器启动脚本
 * 用于测试和验证所有 API 路由
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const SERVER_PORT = 8899;
const TEST_DELAY = 3000; // 等待服务器启动时间

console.log('🚀 启动订单管理系统服务器...\n');

// 启动 server.js
const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('❌ 服务器启动失败:', err);
  process.exit(1);
});

// 等待服务器启动后进行测试
setTimeout(() => {
  console.log('\n📝 开始验证 API 路由...\n');
  runTests();
}, TEST_DELAY);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 关闭服务器...');
  serverProcess.kill();
  process.exit(0);
});

/**
 * 运行 API 测试
 */
async function runTests() {
  const tests = [
    { name: '健康检查', method: 'GET', path: '/', expectedCode: 200 },
    { name: '登录', method: 'POST', path: '/api/auth/login', body: { username: 'admin', password: '123456' } },
    { name: '订单列表', method: 'GET', path: '/api/orders', requireAuth: true },
    { name: '用户列表', method: 'GET', path: '/api/members', requireAuth: true },
    { name: '产品列表', method: 'GET', path: '/api/products', requireAuth: true },
    { name: '数据统计', method: 'GET', path: '/api/dashboard/stats', requireAuth: true },
  ];

  let token = null;

  for (const test of tests) {
    try {
      const response = await testAPI(
        test.method,
        test.path,
        test.body || null,
        test.requireAuth ? token : null
      );

      if (test.name === '登录' && response.data && response.data.token) {
        token = response.data.token;
        console.log(`✅ ${test.name}: 成功（Token: ${token.substring(0, 20)}...）`);
      } else if (response.code === 0 || response.status === 'ok') {
        console.log(`✅ ${test.name}: 成功`);
      } else {
        console.log(`⚠️  ${test.name}: ${response.msg || response.message || 'API 响应'}`);
      }
    } catch (err) {
      console.log(`❌ ${test.name}: 失败 - ${err.message}`);
    }
  }

  // 测试余额查询 API（关键路由）
  console.log('\n🔍 测试关键路由 - 余额查询 API:\n');
  try {
    const balanceRes = await testAPI('GET', '/api/orders/3/balance', null, token);
    console.log(`✅ 余额查询 API (/api/orders/:id/balance): ${JSON.stringify(balanceRes, null, 2)}`);
  } catch (err) {
    console.log(`❌ 余额查询 API: ${err.message}`);
  }

  console.log('\n🎉 测试完成！服务器仍在运行，按 Ctrl+C 退出。\n');
}

/**
 * 发送 API 请求
 */
function testAPI(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: data });
        }
      });
    });

    req.on('error', reject);

    if (body && method !== 'GET') {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}
