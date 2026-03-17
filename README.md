# 充易达管理系统

## 📋 项目简介

充易达管理系统（Chongyida Admin System）是一个基于 Node.js + LowDB 的轻量级后台管理系统。

### 技术栈
- **后端**: Node.js + Express + LowDB (JSON 数据库)
- **前端**: HTML + CSS + JavaScript (原生)
- **部署**: 腾讯云 CloudBase

### 版本
- v2.5.0

---

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

服务器将在 `http://localhost:8080` 启动。

---

## 📦 项目结构

```
充易达管理系统/
├── server.js                 # 主服务器文件
├── db.js                     # 数据库操作
├── package.json              # 依赖配置
├── cloudfunctions/           # CloudBase 云函数
│   └── cyd-server/          # 云函数代码
│       ├── index.js
│       ├── db.js
│       └── package.json
├── dashboard-ui/            # 前端界面
│   ├── index.html
│   ├── login.html
│   ├── style.css
│   └── charts.js
├── data/                    # 数据库文件（.gitignore）
└── docs/                   # 文档
```

---

## 🌐 部署

### CloudBase 部署

#### 前端网站（静态托管）
```bash
tcb hosting deploy ./dashboard-ui -e longxia-2gdgbb5782e17db6
```

#### 云函数
```bash
tcb fn deploy cyd-server --dir ./cloudfunctions/cyd-server
```

### 访问地址

- **前端**: https://longxia-2gdgbb5782e17db6-1253809809.tcloudbaseapp.com
- **控制台**: https://tcb.cloud.tencent.com/dev?envId=longxia-2gdgbb5782e17db6#/scf

---

## 📝 API 文档

### 用户认证
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `GET /api/user` - 获取用户信息

### 数据管理
- `GET /api/data` - 获取数据列表
- `POST /api/data` - 添加数据
- `PUT /api/data/:id` - 更新数据
- `DELETE /api/data/:id` - 删除数据

---

## 🔧 开发环境要求

- Node.js >= 12.0.0
- npm >= 6.0.0

---

## 📄 许可证

MIT License

---

## 👤 作者

pengx2301

---

## 📞 联系方式

邮箱: pengx2301@gmail.com

---

## 🔄 更新日志

### v2.5.0 (2026-03-17)
- 项目恢复和重构
- 添加 CloudBase 云函数支持
- 优化前端界面
- 添加数据可视化功能
