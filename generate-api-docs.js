#!/usr/bin/env node

/**
 * generate-api-docs.js — API 文档自动生成 (P2 优化)
 * 功能：
 *   1. 从代码注释自动生成 API 文档
 *   2. 生成 Markdown 格式的 API 文档
 *   3. 生成 OpenAPI/Swagger 规范
 * 
 * 使用：
 *   node generate-api-docs.js markdown   # 生成 Markdown 文档
 *   node generate-api-docs.js swagger    # 生成 Swagger JSON
 *   node generate-api-docs.js html       # 生成 HTML 页面
 */

const fs = require('fs');
const path = require('path');

// API 端点定义
const API_ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/auth/login',
    summary: '用户登录',
    description: '使用用户名和密码登录系统',
    parameters: [
      { name: 'username', type: 'string', required: true, description: '用户名（3-20字符）' },
      { name: 'password', type: 'string', required: true, description: '密码（6-50字符）' }
    ],
    response: {
      code: 0,
      msg: '登录成功',
      data: { token: 'xxx', user_id: 1, role: 'admin' }
    },
    tags: ['认证'],
    version: 'v1'
  },
  {
    method: 'GET',
    path: '/api/products',
    summary: '获取产品列表',
    description: '分页获取所有产品列表（支持搜索、筛选）',
    parameters: [
      { name: 'page', type: 'number', required: false, description: '页码（默认1）' },
      { name: 'pageSize', type: 'number', required: false, description: '每页数量（默认20）' },
      { name: 'kw', type: 'string', required: false, description: '搜索关键词' },
      { name: 'cat_id', type: 'number', required: false, description: '分类ID' }
    ],
    response: {
      code: 0,
      msg: '获取成功',
      data: {
        items: [],
        total: 100,
        page: 1,
        pageSize: 20
      }
    },
    cached: true,
    cacheTime: '5分钟',
    tags: ['产品'],
    version: 'v1'
  },
  {
    method: 'POST',
    path: '/api/orders',
    summary: '创建订单',
    description: '创建新的订单',
    parameters: [
      { name: 'member_id', type: 'number', required: true, description: '会员ID' },
      { name: 'order_type', type: 'string', required: true, description: '订单类型（consume/recharge）' },
      { name: 'amount', type: 'number', required: true, description: '订单金额' },
      { name: 'product_id', type: 'number', required: false, description: '产品ID（消费订单必填）' }
    ],
    response: {
      code: 0,
      msg: '订单创建成功',
      data: { order_id: 1, order_no: 'ORD20260318001', status: 0 }
    },
    tags: ['订单'],
    version: 'v1'
  },
  {
    method: 'GET',
    path: '/api/monitor/request-logs',
    summary: '获取请求日志',
    description: '获取最近的 API 请求日志（仅管理员）',
    parameters: [
      { name: 'limit', type: 'number', required: false, description: '返回记录数（最多500）' }
    ],
    response: {
      code: 0,
      msg: '获取成功',
      data: {
        logs: [],
        stats: { total: 1000, avgDuration: 45 }
      }
    },
    auth: 'admin',
    tags: ['监控'],
    version: 'v1'
  },
  {
    method: 'GET',
    path: '/api/version',
    summary: 'API 版本信息',
    description: '获取当前 API 版本和支持的版本列表',
    response: {
      code: 0,
      msg: '获取成功',
      data: {
        current_version: 'v1',
        supported_versions: { v1: '初始版本', v2: '新增缓存、验证、监控' }
      }
    },
    tags: ['系统'],
    version: 'v1'
  },
  {
    method: 'GET',
    path: '/api/health',
    summary: '健康检查',
    description: '系统健康检查端点（无需认证）',
    response: {
      code: 0,
      msg: '获取成功',
      data: {
        status: 'healthy',
        uptime: 86400,
        cache: { hits: 1000, misses: 200, hit_rate: '83.33%' }
      }
    },
    tags: ['系统'],
    version: 'v1'
  }
];

// 生成 Markdown 文档
function generateMarkdown() {
  let doc = `# API 文档

**生成时间**: ${new Date().toLocaleString('zh-CN')}

## 目录

`;

  // 生成目录
  API_ENDPOINTS.forEach((endpoint, idx) => {
    doc += `- [${endpoint.method} ${endpoint.path}](#${idx}-${endpoint.path})\n`;
  });

  doc += '\n---\n\n';

  // 生成详细文档
  API_ENDPOINTS.forEach((endpoint, idx) => {
    doc += `## ${idx + 1}. ${endpoint.method} ${endpoint.path}\n\n`;
    doc += `**摘要**: ${endpoint.summary}\n\n`;
    doc += `**描述**: ${endpoint.description}\n\n`;
    doc += `**版本**: ${endpoint.version}\n\n`;

    if (endpoint.tags) {
      doc += `**标签**: ${endpoint.tags.join(', ')}\n\n`;
    }

    if (endpoint.auth) {
      doc += `**认证**: ${endpoint.auth}\n\n`;
    }

    if (endpoint.cached) {
      doc += `**缓存**: 是（${endpoint.cacheTime}）\n\n`;
    }

    if (endpoint.parameters && endpoint.parameters.length > 0) {
      doc += `### 请求参数\n\n`;
      doc += `| 参数名 | 类型 | 必需 | 描述 |\n`;
      doc += `|--------|------|------|------|\n`;
      endpoint.parameters.forEach(param => {
        doc += `| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${param.description} |\n`;
      });
      doc += '\n';
    }

    doc += `### 响应示例\n\n`;
    doc += '```json\n';
    doc += JSON.stringify(endpoint.response, null, 2);
    doc += '\n```\n\n';
  });

  doc += `---\n\n## 错误码\n\n`;
  doc += `| 错误码 | HTTP状态 | 描述 |\n`;
  doc += `|--------|----------|------|\n`;
  doc += `| 0 | 200 | 成功 |\n`;
  doc += `| -1 | 401 | 未登录或登录已过期 |\n`;
  doc += `| -2 | 403 | 无权限 |\n`;
  doc += `| -3 | 400 | 请求参数错误 |\n`;
  doc += `| -4 | 429 | 请求过于频繁 |\n`;
  doc += `| -5 | 500 | 服务器内部错误 |\n`;
  doc += `| -6 | 504 | 请求超时 |\n\n`;

  return doc;
}

// 生成 Swagger JSON
function generateSwagger() {
  const swagger = {
    openapi: '3.0.0',
    info: {
      title: '充易达管理系统 API',
      version: '1.0.0',
      description: '充易达管理系统后端 API 文档',
      contact: {
        name: 'API 支持',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8899',
        description: '本地开发服务器'
      },
      {
        url: 'https://api.example.com',
        description: '生产环境'
      }
    ],
    paths: {},
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 0 },
            msg: { type: 'string', example: '成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    }
  };

  // 添加端点
  API_ENDPOINTS.forEach(endpoint => {
    const pathKey = endpoint.path;
    const methodKey = endpoint.method.toLowerCase();

    if (!swagger.paths[pathKey]) {
      swagger.paths[pathKey] = {};
    }

    swagger.paths[pathKey][methodKey] = {
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags || ['Default'],
      parameters: endpoint.parameters ? endpoint.parameters.map(p => ({
        name: p.name,
        in: methodKey === 'get' ? 'query' : 'body',
        required: p.required,
        schema: { type: p.type },
        description: p.description
      })) : [],
      responses: {
        200: {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/ApiResponse' },
                  { type: 'object', properties: { data: { type: 'object' } } }
                ]
              },
              example: endpoint.response
            }
          }
        }
      }
    };

    if (endpoint.auth) {
      swagger.paths[pathKey][methodKey].security = [{ bearerAuth: [] }];
    }
  });

  return swagger;
}

// 生成 HTML 文档
function generateHTML() {
  const markdown = generateMarkdown();
  
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>充易达管理系统 - API 文档</title>
  <link href="https://cdn.jsdelivr.net/npm/github-markdown-css@5.2.0/github-markdown.css" rel="stylesheet">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #24292e;
      background: #f6f8fa;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .markdown-body {
      font-family: inherit;
    }
    .header {
      border-bottom: 2px solid #eaecef;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .footer {
      text-align: center;
      color: #6a737d;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eaecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>充易达管理系统 API 文档</h1>
      <p>自动生成于 ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    <div class="markdown-body">
      ${markdownToHTML(markdown)}
    </div>
    <div class="footer">
      <p>© 2026 充易达管理系统 - API 文档自动生成</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

// 简单的 Markdown 到 HTML 转换
function markdownToHTML(md) {
  let html = md
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^```json\n([\s\S]*?)\n```/gm, '<pre><code>$1</code></pre>')
    .replace(/^\| (.*?)\|/gm, '<tr><td>$1</td></tr>')
    .replace(/\n---\n/g, '<hr>');
  
  return `<p>${html}</p>`;
}

// 主函数
const command = process.argv[2] || 'markdown';
const outputDir = path.join(__dirname, 'docs');

// 创建输出目录
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`📝 生成 API 文档...`);

switch (command) {
  case 'markdown':
    const mdDoc = generateMarkdown();
    const mdPath = path.join(outputDir, 'API.md');
    fs.writeFileSync(mdPath, mdDoc, 'utf8');
    console.log(`✅ Markdown 文档已生成: ${mdPath}`);
    break;
  
  case 'swagger':
    const swagger = generateSwagger();
    const swaggerPath = path.join(outputDir, 'swagger.json');
    fs.writeFileSync(swaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
    console.log(`✅ Swagger 文档已生成: ${swaggerPath}`);
    break;
  
  case 'html':
    const htmlDoc = generateHTML();
    const htmlPath = path.join(outputDir, 'index.html');
    fs.writeFileSync(htmlPath, htmlDoc, 'utf8');
    console.log(`✅ HTML 文档已生成: ${htmlPath}`);
    break;
  
  case 'all':
    const md = generateMarkdown();
    fs.writeFileSync(path.join(outputDir, 'API.md'), md, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'swagger.json'), JSON.stringify(generateSwagger(), null, 2), 'utf8');
    fs.writeFileSync(path.join(outputDir, 'index.html'), generateHTML(), 'utf8');
    console.log(`✅ 所有文档已生成到: ${outputDir}`);
    break;
  
  default:
    console.error('❌ 未知命令:', command);
    console.log('用法: node generate-api-docs.js [markdown|swagger|html|all]');
    process.exit(1);
}
