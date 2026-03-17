# CloudBase 部署完整指南

## 第一步：登录腾讯云 CloudBase

在项目目录下执行以下命令：

```bash
cd C:\Users\60496\WorkBuddy\20260317184320\WorkBuddy\20260315203305
tcb login
```

这会自动打开浏览器，请使用腾讯云账号登录并授权。

---

## 第二步：获取环境 ID

登录成功后，执行以下命令查看您的云开发环境：

```bash
tcb env list
```

您会看到类似这样的输出：
```
envId: xxx-xxx-xxx
  name: xxx
  create time: xxx
```

复制 `envId` 的值（例如：`cyd-admin-123456`）

---

## 第三步：更新配置文件

打开 `cloudbaserc.json`，将 `envId` 字段更新为您的实际环境 ID：

```json
{
  "envId": "您的环境ID",
  ...
}
```

---

## 第四步：部署项目

执行部署命令：

```bash
tcb deploy
```

这会自动：
1. 上传云函数代码
2. 部署前端静态网站
3. 配置环境变量

---

## 第五步：测试部署

部署完成后，您会得到访问地址，例如：
- 前端访问：`https://xxx.service.tcloudbase.com/`
- 云函数调用：通过 CloudBase SDK

---

## 常见问题

### 1. 如果没有环境怎么办？
访问 [腾讯云控制台](https://console.cloud.tencent.com/tcb) 创建新环境。

### 2. 免费额度说明
新用户有免费额度，足够测试使用。

### 3. 云函数路径
当前配置指向 `cloudfunctions/cyd-server/index.js`，确保该文件存在。

---

## 下一步

部署成功后，您的项目就可以在线访问了！
