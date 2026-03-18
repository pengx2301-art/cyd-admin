#!/usr/bin/env node
/**
 * 性能压力测试 - 测试缓存效能和速率限制
 * Performance & Stress Test Suite
 * 
 * 使用方式:
 *   node performance-test.js        # 运行所有性能测试
 *   node performance-test.js quick  # 快速测试
 *   node performance-test.js stress # 压力测试
 */

const http = require('http');

const SERVER_URL = 'http://localhost:8899';
const TEST_TIMEOUT = 30000;

// ═══════════════════════════════════════════════════════════════
// 性能测试工具
// ═══════════════════════════════════════════════════════════════

class PerformanceTest {
  constructor(name) {
    this.name = name;
    this.results = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTimes: [],
      errors: []
    };
  }

  makeRequest(method, path) {
    return new Promise((resolve, reject) => {
      const url = new URL(SERVER_URL + path);
      const startTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        timeout: TEST_TIMEOUT
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const duration = Date.now() - startTime;
          resolve({
            status: res.statusCode,
            duration,
            cacheHeader: res.headers['x-cache-status']
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  async runTest(testFn) {
    try {
      await testFn();
      this.printResults();
    } catch (err) {
      console.error(`❌ 测试错误: ${err.message}`);
      process.exit(1);
    }
  }

  printResults() {
    const avgTime = this.results.responseTimes.length > 0
      ? (this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length).toFixed(2)
      : 0;

    const minTime = Math.min(...this.results.responseTimes) || 0;
    const maxTime = Math.max(...this.results.responseTimes) || 0;
    const successRate = ((this.results.successRequests / this.results.totalRequests) * 100).toFixed(2);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 ${this.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总请求数: ${this.results.totalRequests}`);
    console.log(`成功: ${this.results.successRequests} | 失败: ${this.results.failedRequests}`);
    console.log(`成功率: ${successRate}%`);
    console.log(`\n⏱️  响应时间:`);
    console.log(`  平均: ${avgTime}ms`);
    console.log(`  最小: ${minTime}ms`);
    console.log(`  最大: ${maxTime}ms`);

    if (this.results.cacheHits > 0 || this.results.cacheMisses > 0) {
      const hitRate = ((this.results.cacheHits / (this.results.cacheHits + this.results.cacheMisses)) * 100).toFixed(2);
      console.log(`\n💾 缓存效能:`);
      console.log(`  命中: ${this.results.cacheHits}`);
      console.log(`  未命中: ${this.results.cacheMisses}`);
      console.log(`  命中率: ${hitRate}%`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\n⚠️  错误:`);
      this.results.errors.slice(0, 5).forEach(err => {
        console.log(`  - ${err}`);
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 测试场景
// ═══════════════════════════════════════════════════════════════

// 测试 1: 缓存效能 - 同一个 URL 重复请求
async function testCachePerformance() {
  const test = new PerformanceTest('缓存效能测试 (100 个重复请求)');

  await test.runTest(async () => {
    const path = '/api/health';
    
    for (let i = 0; i < 100; i++) {
      try {
        const res = await test.makeRequest('GET', path);
        test.results.totalRequests++;
        
        if (res.status === 200) {
          test.results.successRequests++;
          test.results.responseTimes.push(res.duration);

          if (res.cacheHeader === 'HIT') {
            test.results.cacheHits++;
          } else if (res.cacheHeader === 'MISS') {
            test.results.cacheMisses++;
          } else {
            test.results.cacheMisses++; // 默认算 miss
          }
        } else {
          test.results.failedRequests++;
        }

        // 显示进度
        if ((i + 1) % 25 === 0) {
          process.stdout.write(`  进度: ${i + 1}/100\r`);
        }
      } catch (err) {
        test.results.failedRequests++;
        test.results.errors.push(err.message);
      }
    }
    console.log(`  进度: 100/100 ✓`);
  });
}

// 测试 2: 并发压力测试
async function testConcurrentRequests() {
  const test = new PerformanceTest('并发压力测试 (50 个并发请求)');

  await test.runTest(async () => {
    const concurrency = 50;
    const promises = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        test.makeRequest('GET', `/api/health`)
          .then(res => {
            test.results.totalRequests++;
            if (res.status === 200) {
              test.results.successRequests++;
              test.results.responseTimes.push(res.duration);
            } else {
              test.results.failedRequests++;
            }
          })
          .catch(err => {
            test.results.failedRequests++;
            test.results.errors.push(err.message);
          })
      );
    }

    await Promise.all(promises);
  });
}

// 测试 3: 不同路由的性能
async function testMultipleRoutes() {
  const test = new PerformanceTest('多路由性能测试 (20 个请求/路由)');

  const routes = [
    '/api/health',
    '/api/version',
    '/api/products',
  ];

  await test.runTest(async () => {
    for (const route of routes) {
      for (let i = 0; i < 20; i++) {
        try {
          const res = await test.makeRequest('GET', route);
          test.results.totalRequests++;
          
          if (res.status === 200 || res.status === 401) {
            test.results.successRequests++;
            test.results.responseTimes.push(res.duration);
          } else {
            test.results.failedRequests++;
          }
        } catch (err) {
          test.results.failedRequests++;
          test.results.errors.push(err.message);
        }
      }
      process.stdout.write(`  ${route}: 20/20 ✓\n`);
    }
  });
}

// 测试 4: 长期稳定性测试
async function testStability() {
  const test = new PerformanceTest('稳定性测试 (120 秒，尽可能多的请求)');
  const duration = 120000; // 2 分钟
  const startTime = Date.now();

  await test.runTest(async () => {
    let requestCount = 0;
    while (Date.now() - startTime < duration) {
      try {
        const res = await test.makeRequest('GET', '/api/health');
        test.results.totalRequests++;
        
        if (res.status === 200) {
          test.results.successRequests++;
          test.results.responseTimes.push(res.duration);
        } else {
          test.results.failedRequests++;
        }

        requestCount++;
        if (requestCount % 50 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`  已运行 ${elapsed}s，${requestCount} 个请求\r`);
        }
      } catch (err) {
        test.results.failedRequests++;
        test.results.errors.push(err.message);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// 主函数
// ═══════════════════════════════════════════════════════════════

async function runAllTests(mode = 'full') {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║     🏃 性能与压力测试 - P0/P1/P2 优化验证          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\n⏱️  测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`🌐 服务器: ${SERVER_URL}\n`);

  try {
    // 快速健康检查
    console.log('⏳ 检查服务器连接...');
    const healthRes = await new Promise((resolve, reject) => {
      const req = http.request(SERVER_URL + '/api/health', (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(3000, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });

    if (!healthRes) {
      console.error('❌ 服务器无响应，请确保 Node 服务器正在运行');
      process.exit(1);
    }

    console.log('✅ 服务器连接正常\n');

    if (mode === 'quick') {
      await testCachePerformance();
      await testMultipleRoutes();
    } else if (mode === 'stress') {
      await testConcurrentRequests();
      await testStability();
    } else {
      await testCachePerformance();
      await testConcurrentRequests();
      await testMultipleRoutes();
      // 可选：稳定性测试（耗时 2 分钟）
      // await testStability();
    }

    console.log('\n✨ 所有性能测试完成!\n');
  } catch (err) {
    console.error('❌ 性能测试失败:', err.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════
// 入口
// ═══════════════════════════════════════════════════════════════

const mode = process.argv[2] || 'full';
const validModes = ['quick', 'full', 'stress'];

if (!validModes.includes(mode)) {
  console.error(`❌ 无效的测试模式: ${mode}`);
  console.error(`✅ 有效选项: ${validModes.join(', ')}`);
  process.exit(1);
}

runAllTests(mode).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
