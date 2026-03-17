# 配置云函数 HTTP 触发器指南

## 📋 当前状态

✅ 云函数已部署：`cyd-server`
✅ 前端网站已部署：https://longxia-2gdgbb5782e17db6-1253809809.tcloudbaseapp.com
⚠️ 需要配置 HTTP 触发器连接前后端

---

## 🔧 配置步骤（通过 CloudBase 控制台）

### 步骤 1：打开云开发控制台

点击以下链接进入云函数管理页面：
https://tcb.cloud.tencent.com/dev?envId=longxia-2gdgbb5782e17db6#/scf

### 步骤 2：选择云函数

在云函数列表中找到 `cyd-server`，点击进入

### 步骤 3：配置触发器

1. 点击 **"触发管理"** 标签页
2. 点击 **"创建触发器"** 按钮
3. 选择触发器类型：**"Web 触发器"**（HTTP 触发）
4. 配置参数：
   - **触发器名称**：cyd-server-http
   - **请求方式**：POST（或 ALL）
   - **鉴权方式**：免鉴权（或根据需求选择）
5. 点击 **"确定"** 创建

### 步骤 4：获取访问路径

创建成功后，会显示触发器的访问路径，类似：
```
https://longxia-2gdgbb5782e17db6.service.tcloudbaseapp.com/cyd-server
```

---

## 🔄 更新前端配置

配置完成后，需要更新前端的 API 地址：

### 方法 1：修改 dashboard-ui/index.html

找到前端的 API 配置部分，将后端地址更新为触发器访问路径：

```javascript
// 原来的本地地址
const API_BASE_URL = 'http://localhost:8080/api';

// 改为 CloudBase 触发器地址
const API_BASE_URL = 'https://longxia-2gdgbb5782e17db6.service.tcloudbaseapp.com/cyd-server';
```

### 方法 2：重新部署前端

修改完成后，重新部署前端：

```powershell
tcb hosting deploy ./dashboard-ui -e longxia-2gdgbb5782e17db6
```

---

## 🧪 测试

1. 重新访问前端网站
2. 尝试登录功能
3. 检查是否能正常连接后端

---

## 📊 完整架构

```
用户浏览器
    ↓
前端网站（静态托管）
    ↓ HTTP 请求
云函数（HTTP 触发）
    ↓
后端 API 处理
    ↓
返回结果
```

---

## ❓ 常见问题

### Q: 为什么不使用 Framework 自动配置？
A: CloudBase Framework 的插件安装有问题，手动配置更可靠。

### Q: HTTP 触发器需要费用吗？
A: CloudBase 提供免费额度，测试阶段通常足够使用。

### Q: 如何查看云函数日志？
A: 在控制台的云函数详情页，点击"日志查询"标签页。

---

## 📞 需要帮助？

如果配置过程中遇到问题，请告诉我具体的错误信息！
