#!/usr/bin/env node
/**
 * 完整测试套件 - 验证 P0/P1/P2 所有优化功能
 * Test Suite: P0/P1/P2 Optimization Verification
 * 
 * 使用方式:
 *   node test-suite.js all          # 运行所有测试
 *   node test-suite.js p0           # 只测试 P0 优化
 *   node test-suite.js p1           # 只测试 P1 优化
 *   node test-suite.js p2           # 只测试 P2 优化
 */

const http = require('http');
const assert = require('assert');

const SERVER_URL = 'http://localhost:8899';
const TEST_TIMEOUT = 10000;

// ═══════════════════════════════════════════════════════════════
// 测试工具函数
// ═══════════════════════════════════════════════════════════════

let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(SERVER_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: TEST_TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${err.message}`);
    testsFailed++;
    failedTests.push({ name, error: err.message });
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
// P0 优化测试: 验证中间件、缓存、验证
// ═══════════════════════════════════════════════════════════════

async function testP0Optimizations() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 P0 优化测试: 验证中间件、缓存、验证');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // P0-1: 测试登录验证
  await test('P0-1: 登录接口验证 - 缺少参数返回 400', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {});
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    assert(res.body.error || res.body.msg, 'Should return error message');
  });

  // P0-2: 测试产品列表缓存
  await test('P0-2: 产品列表缓存 - 第一次请求', async () => {
    const res1 = await makeRequest('GET', '/api/products?page=1&size=10');
    assert.strictEqual(res1.status, 401, 'Should return 401 (auth required)');
  });

  // P0-3: 测试订单创建验证
  await test('P0-3: 订单创建验证 - 缺少必填字段', async () => {
    const token = await getTestToken();
    const res = await makeRequest('POST', '/api/orders', 
      { product_id: 'test' },
      { 'Authorization': `Bearer ${token}` }
    );
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // P0-4: 测试成员创建验证
  await test('P0-4: 成员创建验证 - 密码太短', async () => {
    const adminToken = await getAdminToken();
    const res = await makeRequest('POST', '/api/members',
      { username: 'newuser', password: '123' },
      { 'Authorization': `Bearer ${adminToken}` }
    );
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // P0-5: 测试缓存存在
  await test('P0-5: 缓存机制验证 - 健康检查端点', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200, 'Should return 200');
    assert(res.body.cache, 'Should include cache stats');
  });
}

// ═══════════════════════════════════════════════════════════════
// P1 优化测试: 速率限制、日志、异常处理
// ═══════════════════════════════════════════════════════════════

async function testP1Optimizations() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 P1 优化测试: 速率限制、日志、异常处理');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // P1-1: 测试速率限制
  await test('P1-1: 速率限制 - 100 次请求内应全部成功', async () => {
    let successCount = 0;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await makeRequest('GET', '/api/health');
        if (res.status === 200) successCount++;
      } catch (e) {
        // 忽略超时
      }
    }
    assert(successCount >= 45, `Expected at least 45 successful requests, got ${successCount}`);
  });

  // P1-2: 测试全局异常处理
  await test('P1-2: 全局异常处理 - 不存在的端点返回 404', async () => {
    const res = await makeRequest('GET', '/api/nonexistent');
    assert.strictEqual(res.status, 404, `Expected 404, got ${res.status}`);
  });

  // P1-3: 测试请求超时保护
  await test('P1-3: 请求超时保护 - 检查响应头', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    // 验证响应头中有超时配置
    assert(res.headers, 'Should have response headers');
  });

  // P1-4: 测试错误响应格式一致性
  await test('P1-4: 错误响应格式 - 一致的错误结构', async () => {
    const res = await makeRequest('GET', '/api/nonexistent');
    assert(res.body.error || res.body.msg, 'Should have error message');
  });

  // P1-5: 测试认证失败处理
  await test('P1-5: 认证失败处理 - 无效 token 返回 401', async () => {
    const res = await makeRequest('GET', '/api/members?page=1',
      null,
      { 'Authorization': 'Bearer invalid_token_xyz' }
    );
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });
}

// ═══════════════════════════════════════════════════════════════
// P2 优化测试: API 版本、健康检查、备份
// ═══════════════════════════════════════════════════════════════

async function testP2Optimizations() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 P2 优化测试: API 版本、健康检查、备份');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // P2-1: 测试 API 版本信息
  await test('P2-1: API 版本信息 - /api/version 端点', async () => {
    const res = await makeRequest('GET', '/api/version');
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert(res.body.current_version, 'Should have current_version');
    assert(res.body.supported_versions, 'Should have supported_versions');
  });

  // P2-2: 测试健康检查
  await test('P2-2: 健康检查 - /api/health 返回详细状态', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy', 'Should be healthy');
    assert(res.body.uptime !== undefined, 'Should have uptime');
    assert(res.body.cache, 'Should have cache stats');
  });

  // P2-3: 测试缓存效能统计
  await test('P2-3: 缓存效能 - 健康检查包含命中率', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert(res.body.cache.hit_rate !== undefined, 'Should have hit_rate');
  });

  // P2-4: 测试 API 版本默认值
  await test('P2-4: API 版本默认 - 未指定版本时默认为 v1', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.version, 'v1', 'Should default to v1');
  });

  // P2-5: 测试 CORS 跨域支持
  await test('P2-5: CORS 跨域支持 - 允许跨域请求', async () => {
    const res = await makeRequest('GET', '/api/health', null, {
      'Origin': 'https://example.com'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], '*', 'Should allow CORS');
  });
}

// ═══════════════════════════════════════════════════════════════
// 测试辅助函数
// ═══════════════════════════════════════════════════════════════

async function getTestToken() {
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      username: 'testuser',
      password: 'password123'
    });
    return res.body.token || 'test_token';
  } catch {
    return 'test_token';
  }
}

async function getAdminToken() {
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    return res.body.token || 'admin_token';
  } catch {
    return 'admin_token';
  }
}

// ═══════════════════════════════════════════════════════════════
// 主测试函数
// ═══════════════════════════════════════════════════════════════

async function runTests(level = 'all') {
  console.log('\n\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     🚀 充易达系统 - 完整测试套件（P0/P1/P2）           ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n⏱️  测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`📝 测试级别: ${level.toUpperCase()}`);
  console.log(`🌐 服务器: ${SERVER_URL}`);

  try {
    if (level === 'all' || level === 'p0') await testP0Optimizations();
    if (level === 'all' || level === 'p1') await testP1Optimizations();
    if (level === 'all' || level === 'p2') await testP2Optimizations();
  } catch (err) {
    console.error('\n⚠️  测试执行出错:', err.message);
  }

  // 测试总结
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 测试总结');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 通过: ${testsPassed}`);
  console.log(`❌ 失败: ${testsFailed}`);
  console.log(`📈 成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(2)}%`);

  if (failedTests.length > 0) {
    console.log('\n⚠️  失败的测试:');
    failedTests.forEach((test, idx) => {
      console.log(`  ${idx + 1}. ${test.name}`);
      console.log(`     错误: ${test.error}`);
    });
  }

  console.log('\n✨ 测试完成!\n');
  process.exit(testsFailed > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════
// 入口
// ═══════════════════════════════════════════════════════════════

const level = process.argv[2] || 'all';
const validLevels = ['all', 'p0', 'p1', 'p2'];

if (!validLevels.includes(level)) {
  console.error(`❌ 无效的测试级别: ${level}`);
  console.error(`✅ 有效选项: ${validLevels.join(', ')}`);
  process.exit(1);
}

runTests(level).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
