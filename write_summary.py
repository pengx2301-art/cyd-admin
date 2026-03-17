summary = """## 大猿人接口重写（2026-03-16）

### 项目路径
C:/Users/60496/WorkBuddy/20260315203305
端口：8899，前端：dashboard-ui/index.html

### 核心改动：server.js
- dyrSign()签名：参数字典排序 → 拼接&apikey=xxx → urldecode → MD5大写（注意是apikey不是key）
- dyrRequest()通用封装：new URL()解析api_domain只保留protocol+host（修复路径重复BUG）
- test-connect：调/yrapi.php/index/user，返回账号名+余额
- sync-products：参数type/cate_id；解析嵌套结构（data=分类数组，分类.products=产品数组），铺平返回
- 新增/recharge：充值下单，参数out_trade_num+product_id+mobile+notify_url
- 新增/order-query：订单查询，参数out_trade_nums（逗号分隔多单）

### 已修复BUG
- 症状：测试连接返回"API接口不存在"
- 原因：用户填http://38.246.248.159/yrapi.php（含路径），代码再拼/yrapi.php/index/user → 路径重复
- 修复：dyrRequest里new URL()只取host，已验证正常

### 大猿人接口路径约定
/yrapi.php/index/user=查询用户 /yrapi.php/index/product=产品列表
/yrapi.php/index/recharge=充值下单 /yrapi.php/index/check=订单查询

### 前端改动
- charts.js supApiSyncProducts：参数改type/cate_id；表格8列：ID/名称/分类/运营商/价格/原价/充值方式/标签
- index.html：sup-sync-class→sup-sync-cate；表头对应更新

### 待续
- 充值下单前端UI
- 回调通知接口/api/callback/dayuanren处理
- 产品同步后导入本地数据库功能
"""

import subprocess, sys
result = subprocess.run(
    [sys.executable,
     r"C:\Users\60496\.workbuddy\skills\session-memory\scripts\summarize_memory.py",
     "--project", "dayuanren-dashboard",
     "update", "--summary", summary],
    capture_output=True, text=True, encoding="utf-8"
)
print(result.stdout or result.stderr)
