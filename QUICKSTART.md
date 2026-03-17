# 快速开始 - CloudBase 部署

## 🚀 一键部署（推荐）

### 步骤 1：登录腾讯云

打开终端，执行：

```powershell
cd C:\Users\60496\WorkBuddy\20260317184320\WorkBuddy\20260315203305
tcb login
```

浏览器会自动打开，请使用腾讯云账号登录并授权。

### 步骤 2：运行自动化脚本

```powershell
.\deploy_automated.ps1
```

脚本会自动：
- 检查登录状态
- 列出可用环境
- 让您选择环境 ID
- 更新配置文件
- 部署项目

---

## 📋 详细文档

如果需要查看完整的部署说明和故障排查，请打开：

📄 `deploy_guide.md`

---

## 📦 项目结构

```
WorkBuddy/
├── cloudbaserc.json          # CloudBase 配置文件
├── cloudfunctions/           # 云函数目录
│   └── cyd-server/          # 充易达管理系统云函数
│       ├── index.js          # 云函数入口
│       ├── db.js             # 数据库操作
│       └── package.json      # 依赖配置
├── dashboard-ui/             # 前端界面
├── server.js                 # 本地开发服务器
├── deploy_automated.ps1      # 自动化部署脚本
└── deploy_guide.md           # 详细部署指南
```

---

## 🔧 需要帮助？

1. **登录问题**：确保使用腾讯云账号登录
2. **没有环境**：访问 https://console.cloud.tencent.com/tcb 创建
3. **部署失败**：查看 `deploy_guide.md` 的故障排查章节

---

## ✅ 部署完成后

您将获得：
- 前端访问地址（例如：`https://xxx.service.tcloudbase.com/`）
- 云函数 API 端点
- 云开发控制台访问权限

---

**准备好开始了吗？** 执行 `tcb login`，然后运行 `.\deploy_automated.ps1`！
