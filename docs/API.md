# API 文档

**生成时间**: 2026/3/18 09:55:35

## 目录

- [POST /api/auth/login](#0-/api/auth/login)
- [GET /api/products](#1-/api/products)
- [POST /api/orders](#2-/api/orders)
- [GET /api/monitor/request-logs](#3-/api/monitor/request-logs)
- [GET /api/version](#4-/api/version)
- [GET /api/health](#5-/api/health)

---

## 1. POST /api/auth/login

**摘要**: 用户登录

**描述**: 使用用户名和密码登录系统

**版本**: v1

**标签**: 认证

### 请求参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| username | string | 是 | 用户名（3-20字符） |
| password | string | 是 | 密码（6-50字符） |

### 响应示例

```json
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "token": "xxx",
    "user_id": 1,
    "role": "admin"
  }
}
```

## 2. GET /api/products

**摘要**: 获取产品列表

**描述**: 分页获取所有产品列表（支持搜索、筛选）

**版本**: v1

**标签**: 产品

**缓存**: 是（5分钟）

### 请求参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| page | number | 否 | 页码（默认1） |
| pageSize | number | 否 | 每页数量（默认20） |
| kw | string | 否 | 搜索关键词 |
| cat_id | number | 否 | 分类ID |

### 响应示例

```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

## 3. POST /api/orders

**摘要**: 创建订单

**描述**: 创建新的订单

**版本**: v1

**标签**: 订单

### 请求参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| member_id | number | 是 | 会员ID |
| order_type | string | 是 | 订单类型（consume/recharge） |
| amount | number | 是 | 订单金额 |
| product_id | number | 否 | 产品ID（消费订单必填） |

### 响应示例

```json
{
  "code": 0,
  "msg": "订单创建成功",
  "data": {
    "order_id": 1,
    "order_no": "ORD20260318001",
    "status": 0
  }
}
```

## 4. GET /api/monitor/request-logs

**摘要**: 获取请求日志

**描述**: 获取最近的 API 请求日志（仅管理员）

**版本**: v1

**标签**: 监控

**认证**: admin

### 请求参数

| 参数名 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| limit | number | 否 | 返回记录数（最多500） |

### 响应示例

```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    "logs": [],
    "stats": {
      "total": 1000,
      "avgDuration": 45
    }
  }
}
```

## 5. GET /api/version

**摘要**: API 版本信息

**描述**: 获取当前 API 版本和支持的版本列表

**版本**: v1

**标签**: 系统

### 响应示例

```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    "current_version": "v1",
    "supported_versions": {
      "v1": "初始版本",
      "v2": "新增缓存、验证、监控"
    }
  }
}
```

## 6. GET /api/health

**摘要**: 健康检查

**描述**: 系统健康检查端点（无需认证）

**版本**: v1

**标签**: 系统

### 响应示例

```json
{
  "code": 0,
  "msg": "获取成功",
  "data": {
    "status": "healthy",
    "uptime": 86400,
    "cache": {
      "hits": 1000,
      "misses": 200,
      "hit_rate": "83.33%"
    }
  }
}
```

---

## 错误码

| 错误码 | HTTP状态 | 描述 |
|--------|----------|------|
| 0 | 200 | 成功 |
| -1 | 401 | 未登录或登录已过期 |
| -2 | 403 | 无权限 |
| -3 | 400 | 请求参数错误 |
| -4 | 429 | 请求过于频繁 |
| -5 | 500 | 服务器内部错误 |
| -6 | 504 | 请求超时 |

