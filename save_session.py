import subprocess, json, sys

project = "dayuanren-dashboard"
script  = r"C:\Users\60496\.workbuddy\skills\session-memory\scripts\capture_session.py"

events = [
    {
        "event": "file_edited",
        "data": {
            "file": "server.js",
            "summary": (
                "重写大猿人全部接口。"
                "1) dyrSign签名函数：参数字典排序拼接 &apikey=xxx，urldecode 后 MD5 大写，与文档完全一致。"
                "2) dyrRequest通用封装：自动用 new URL() 解析 api_domain，只取 protocol+host，"
                "修复用户填写 http://ip/yrapi.php 导致路径重复的 BUG（API接口不存在错误）。"
                "3) test-connect 改用 /yrapi.php/index/user 接口，返回账号名+余额。"
                "4) sync-products 参数改为 type/cate_id，正确解析嵌套结构（data是分类数组含products子数组），铺平+附带分类信息。"
                "5) 新增 /recharge 充值下单接口（out_trade_num+product_id+mobile+notify_url）。"
                "6) 新增 /order-query 订单查询接口（out_trade_nums，支持逗号分隔多单）。"
            )
        }
    },
    {
        "event": "file_edited",
        "data": {
            "file": "dashboard-ui/charts.js",
            "summary": (
                "更新 supApiSyncProducts 函数："
                "过滤参数改为 type/cate_id（与文档对齐）；"
                "产品表格列改为：产品ID/名称/分类/运营商(移动电信联通)/价格/原价/充值方式(自动or手动)/标签；"
                "ISP 运营商用彩色 badge 展示（1移动橙/2电信蓝/3联通红/4虚拟紫）。"
            )
        }
    },
    {
        "event": "file_edited",
        "data": {
            "file": "dashboard-ui/index.html",
            "summary": (
                "产品同步区域：sup-sync-class 改为 sup-sync-cate（对应文档 cate_id）；"
                "表头更新为8列：产品ID/产品名称/分类/运营商/价格/原价/充值方式/标签；"
                "表格最大高度由280px改为320px。"
            )
        }
    },
    {
        "event": "bug_fixed",
        "data": {
            "bug": "测试连接返回【API接口不存在】",
            "root_cause": "用户在 API域名 字段填入 http://38.246.248.159/yrapi.php（含路径），代码再拼接 /yrapi.php/index/user，最终 URL 变成 .../yrapi.php/yrapi.php/index/user",
            "fix": "dyrRequest 中用 new URL() 解析域名，只保留 protocol+host，自动丢弃多余路径"
        }
    },
    {
        "event": "architecture_decision",
        "data": {
            "decision": "大猿人 API 接口路径约定",
            "detail": (
                "基础地址只存 IP/域名（不带 /yrapi.php），后端统一拼接路径：\n"
                "  /yrapi.php/index/user     - 查询用户信息（连接测试）\n"
                "  /yrapi.php/index/product  - 产品列表同步\n"
                "  /yrapi.php/index/recharge - 充值下单\n"
                "  /yrapi.php/index/check    - 订单查询\n"
                "签名参数字段名：apikey（不是 key）"
            )
        }
    }
]

for ev in events:
    data_str = json.dumps(ev["data"], ensure_ascii=False)
    result = subprocess.run(
        [sys.executable, script, "capture",
         "--project", project,
         "--event", ev["event"],
         "--data", data_str],
        capture_output=True, text=True, encoding="utf-8"
    )
    print(f"[{ev['event']}]", result.stdout.strip() or result.stderr.strip())

print("\n所有事件保存完毕！")
