/**
 * db.js — 数据库模块（基于 lowdb 1.x JSON 文件存储）
 * 数据文件：./data/cyd.json
 * 零编译依赖，纯 JS 实现，跨平台
 */

const low    = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const crypto = require('crypto');
const path   = require('path');
const fs     = require('fs');

// 确保 data 目录存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'cyd.json');
const adapter = new FileSync(DB_PATH);
const db      = low(adapter);

/* ═══════════════════════════════════════════════════════
   工具函数
   ═══════════════════════════════════════════════════════ */

/** SHA-256 加盐哈希 */
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}

/** 验证密码 */
function verifyPassword(password, hash, salt) {
  const result = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return result === hash;
}

/** 生成自增 ID */
function nextId(collection) {
  const items = db.get(collection).value();
  if (!items || items.length === 0) return 1;
  return Math.max(...items.map(i => i.id || 0)) + 1;
}

/** 当前时间字符串 */
function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

/* ═══════════════════════════════════════════════════════
   数据库结构初始化
   ═══════════════════════════════════════════════════════ */

// 默认品牌配置
const DEFAULT_BRAND = {
  name:         '充易达',
  tagline:      '高效自动充值系统\n专业的代理商管理平台',
  copyright:    '© 2024 充易达 · 保留所有权利',
  termsText:    '《服务条款》',
  termsUrl:     '#',
  privacyText:  '《隐私政策》',
  privacyUrl:   '#',
  disclaimer:   '',
  logoType:     'emoji',
  logoEmoji:    '⚡',
  logoImage:    '',
};

db.defaults({
  sys_users:         [],
  members:           [],          // 统一用户/代理表（用户即代理，代理即用户）
  roles:             [],          // 角色表
  login_logs:        [],
  balance_logs:      [],          // 余额变动流水
  brand:             DEFAULT_BRAND,
  _permissions_meta: [],
  recharge_applies:  [],          // 充值申请
  withdraw_applies:  [],          // 提现申请
  payment_methods:   [],          // 收款方式（平台收款账号）
  agent_levels:      [],          // 代理级别配置
  agent_pricing:     [],          // 代理产品定价（member_id + product_id → 价格）
  agents:            [],          // 保留旧表（兼容充值/提现申请外键）
  suppliers:         [],          // 供应商
  supplier_api_configs: [],       // 供应商接口配置（大猿人等）
  categories:        [],          // 产品分类（主类目+子类目）
  products:          [],          // 产品列表
  direct_products:   [],          // 直冲产品
  daily_revenue:     [],          // 当日营业额（按时段）
}).write();

/* ═══════════════════════════════════════════════════════
   默认权限节点定义（供前端勾选用）
   ═══════════════════════════════════════════════════════ */
const ALL_PERMISSIONS = [
  { group: '仪表盘',   key: 'dashboard',           label: '查看仪表盘' },
  { group: '订单管理', key: 'orders.view',          label: '查看订单' },
  { group: '订单管理', key: 'orders.edit',          label: '修改订单' },
  { group: '订单管理', key: 'recharge-records.view',label: '充值记录' },
  { group: '订单管理', key: 'callback-logs.view',   label: '回调日志' },
  { group: '产品管理', key: 'products.view',        label: '查看产品' },
  { group: '产品管理', key: 'products.edit',        label: '编辑产品' },
  { group: '产品管理', key: 'categories.view',      label: '产品分类' },
  { group: '产品管理', key: 'suppliers.view',       label: '供应商管理' },
  { group: '代理管理', key: 'agents.view',          label: '代理列表' },
  { group: '代理管理', key: 'agents.edit',          label: '编辑代理' },
  { group: '代理管理', key: 'agent-balance.view',   label: '余额管理' },
  { group: 'API 管理', key: 'api-users.view',       label: 'API 用户' },
  { group: 'API 管理', key: 'api-logs.view',        label: 'API 日志' },
  { group: '财务管理', key: 'finance-overview.view',label: '财务概览' },
  { group: '财务管理', key: 'recharge-apply.view',  label: '充值申请' },
  { group: '财务管理', key: 'withdraw-apply.view',  label: '提现申请' },
  { group: '用户管理', key: 'members.view',         label: '查看用户' },
  { group: '用户管理', key: 'members.edit',         label: '编辑用户' },
  { group: '用户管理', key: 'members.balance',      label: '调整余额' },
  { group: '系统管理', key: 'roles.view',           label: '角色管理' },
  { group: '系统管理', key: 'roles.edit',           label: '编辑角色' },
  { group: '系统管理', key: 'settings.view',        label: '系统设置' },
];
// 挂到 db 上以便 API 返回
db.set('_permissions_meta', ALL_PERMISSIONS).write();

/* ═══════════════════════════════════════════════════════
   初始化默认角色
   ═══════════════════════════════════════════════════════ */
if (db.get('roles').value().length === 0) {
  const allKeys = ALL_PERMISSIONS.map(p => p.key);
  db.get('roles').push(
    { id: 1, name: '超级管理员', desc: '拥有所有权限，不可删除', builtin: 1, permissions: allKeys,           created_at: now() },
    { id: 2, name: '运营',       desc: '可查看订单、产品、用户',  builtin: 0, permissions: ['dashboard','orders.view','recharge-records.view','products.view','members.view'], created_at: now() },
    { id: 3, name: '财务',       desc: '可查看财务相关数据',      builtin: 0, permissions: ['dashboard','finance-overview.view','recharge-apply.view','withdraw-apply.view','agent-balance.view'], created_at: now() },
    { id: 4, name: '客服',       desc: '可查看用户、订单信息',    builtin: 0, permissions: ['dashboard','orders.view','members.view'], created_at: now() }
  ).write();
  console.log('[DB] 默认角色已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化示例会员数据（首次运行时写入）
   ═══════════════════════════════════════════════════════ */
if (db.get('members').value().length === 0) {
  // user_type: '普通用户' | '代理'
  // level_id: 关联 agent_levels 表的级别ID（普通用户为 null）
  // agent_no: 代理编号（AG开头，普通用户为空）
  // commission_rate: 返佣比例 0~1（如 0.05 = 5%）
  // parent_id: 上级代理 member_id（顶级为 null）
  const demoMembers = [
    { id:1, username:'user001', email:'user001@example.com', realname:'张三', avatar:'', phone:'13812340001', user_type:'代理', level_id:1, agent_no:'AG001', commission_rate:0.05, parent_id:null, referrer:'', is_anonymous:0, status:1, balance:15800.00, created_at:'2026-01-10 09:00:00' },
    { id:2, username:'user002', email:'user002@example.com', realname:'李四', avatar:'', phone:'13812340002', user_type:'代理', level_id:1, agent_no:'AG002', commission_rate:0.05, parent_id:null, referrer:'', is_anonymous:0, status:1, balance:8600.00,  created_at:'2026-02-05 14:30:00' },
    { id:3, username:'user003', email:'user003@example.com', realname:'王五', avatar:'', phone:'13812340003', user_type:'代理', level_id:2, agent_no:'AG003', commission_rate:0.03, parent_id:1,    referrer:'user001', is_anonymous:0, status:1, balance:3100.00, created_at:'2026-02-15 14:00:00' },
    { id:4, username:'user004', email:'user004@example.com', realname:'陈六', avatar:'', phone:'13812340004', user_type:'代理', level_id:3, agent_no:'AG004', commission_rate:0.02, parent_id:3,    referrer:'user003', is_anonymous:0, status:1, balance:1200.00, created_at:'2026-03-01 08:00:00' },
    { id:5, username:'user005', email:'user005@example.com', realname:'赵七', avatar:'', phone:'13900000005', user_type:'普通用户', level_id:null, agent_no:'', commission_rate:0, parent_id:null, referrer:'', is_anonymous:0, status:1, balance:100.00, created_at:'2026-03-10 11:45:00' },
    { id:6, username:'anon006', email:'', realname:'', avatar:'', phone:'', user_type:'普通用户', level_id:null, agent_no:'', commission_rate:0, parent_id:null, referrer:'', is_anonymous:1, status:1, balance:0.00, created_at:'2026-03-12 08:20:00' },
  ];
  // 为每个示例用户生成密码哈希（默认密码 123456）
  demoMembers.forEach(m => {
    const { hash, salt } = hashPassword('123456');
    m.password = hash;
    m.salt     = salt;
  });
  db.get('members').push(...demoMembers).write();
  console.log('[DB] 示例会员/代理数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化 admin 账号
   ═══════════════════════════════════════════════════════ */

const existAdmin = db.get('sys_users').find({ username: 'admin' }).value();
if (!existAdmin) {
  const { hash, salt } = hashPassword('123456');
  db.get('sys_users').push({
    id:         1,
    username:   'admin',
    nickname:   '超级管理员',
    password:   hash,
    salt:       salt,
    role:       'admin',
    email:      '',
    phone:      '',
    avatar:     '',
    status:     1,
    last_login: '',
    created_at: now(),
    updated_at: now(),
  }).write();
  console.log('[DB] admin 账号已初始化，密码：123456');
} else {
  console.log('[DB] admin 账号已存在，跳过初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化代理级别配置
   ═══════════════════════════════════════════════════════ */
if (db.get('agent_levels').value().length === 0) {
  db.get('agent_levels').push(
    { id:1, name:'一级代理', desc:'平台直属顶级代理，享受最高折扣', color:'indigo', sort:1, created_at:now() },
    { id:2, name:'二级代理', desc:'由一级代理发展，次级折扣',       color:'cyan',   sort:2, created_at:now() },
    { id:3, name:'三级代理', desc:'由二级代理发展，基础折扣',       color:'emerald',sort:3, created_at:now() }
  ).write();
  console.log('[DB] 代理级别已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化代理产品定价示例
   ═══════════════════════════════════════════════════════ */
if (db.get('agent_pricing').value().length === 0) {
  // member_id 对应 members 表中代理用户，product_id 为示例产品ID
  db.get('agent_pricing').push(
    { id:1, member_id:1, product_id:1, product_name:'中国移动话费 100元', category:'话费充值', face_value:100, base_price:98.00, agent_price:96.50, created_at:now() },
    { id:2, member_id:1, product_id:2, product_name:'中国联通话费 50元',  category:'话费充值', face_value:50,  base_price:49.00, agent_price:48.20, created_at:now() },
    { id:3, member_id:1, product_id:3, product_name:'王者荣耀 648点券',   category:'游戏充值', face_value:648, base_price:600.00, agent_price:588.00, created_at:now() },
    { id:4, member_id:2, product_id:1, product_name:'中国移动话费 100元', category:'话费充值', face_value:100, base_price:98.00, agent_price:97.00, created_at:now() },
    { id:5, member_id:2, product_id:2, product_name:'中国联通话费 50元',  category:'话费充值', face_value:50,  base_price:49.00, agent_price:48.50, created_at:now() },
    { id:6, member_id:3, product_id:1, product_name:'中国移动话费 100元', category:'话费充值', face_value:100, base_price:98.00, agent_price:97.50, created_at:now() }
  ).write();
  console.log('[DB] 代理产品定价示例已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化代理示例数据（agents 旧表，保留兼容）
   ═══════════════════════════════════════════════════════ */
if (db.get('agents').value().length === 0) {
  db.get('agents').push(
    { id:1, name:'深圳充值王', contact:'张老板', phone:'13812340001', balance:15800.00, status:1, created_at:'2026-01-05 10:00:00' },
    { id:2, name:'北京极速充', contact:'李经理', phone:'13812340002', balance:8600.00,  status:1, created_at:'2026-02-01 09:00:00' },
    { id:3, name:'上海优惠充', contact:'王总',   phone:'13812340003', balance:22400.00, status:1, created_at:'2026-02-15 14:00:00' },
    { id:4, name:'广州代理商', contact:'陈先生', phone:'13812340004', balance:5200.00,  status:1, created_at:'2026-03-01 08:00:00' }
  ).write();
  console.log('[DB] 代理示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化供应商示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('suppliers').value().length === 0) {
  db.get('suppliers').push(
    { id:1, name:'大猿人',  contact:'刘总', phone:'13900001111', balance:48000.00, status:1, created_at:'2026-01-01 09:00:00' },
    { id:2, name:'蜜蜂',    contact:'蔡总', phone:'13900002222', balance:25000.00, status:1, created_at:'2026-01-08 10:00:00' },
    { id:3, name:'客客帮',  contact:'周经理', phone:'13900003333', balance:18000.00, status:1, created_at:'2026-02-01 11:00:00' },
    { id:4, name:'直冲平台', contact:'吴总', phone:'13900004444', balance:11500.00, status:1, created_at:'2026-02-20 14:00:00' }
  ).write();
  console.log('[DB] 供应商示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化产品分类示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('categories').value().length === 0) {
  db.get('categories').push(
    { id:1, name:'话费充值', parent_id:0, sort:1, status:1, created_at:now() },
    { id:2, name:'流量充值', parent_id:1, sort:1, status:1, created_at:now() },
    { id:3, name:'游戏充值', parent_id:0, sort:2, status:1, created_at:now() },
    { id:4, name:'卡密游戏', parent_id:3, sort:1, status:1, created_at:now() },
    { id:5, name:'视频会员', parent_id:0, sort:3, status:1, created_at:now() },
    { id:6, name:'音乐会员', parent_id:0, sort:4, status:1, created_at:now() },
    { id:7, name:'其他充值', parent_id:0, sort:5, status:1, created_at:now() }
  ).write();
  console.log('[DB] 产品分类示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化产品列表示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('products').value().length === 0) {
  db.get('products').push(
    { id:1, name:'中国移动话费 10元',  category_id:1, category:'话费充值', supplier_id:1, supplier:'大猿人',  face_value:10,   cost_price:9.50,  agent_price:9.70,  retail_price:9.90,  status:1, is_direct:0, created_at:now() },
    { id:2, name:'中国联通话费 50元',  category_id:1, category:'话费充值', supplier_id:2, supplier:'蜜蜂',    face_value:50,   cost_price:47.50, agent_price:48.50, retail_price:49.00, status:1, is_direct:0, created_at:now() },
    { id:3, name:'中国移动话费 100元', category_id:1, category:'话费充值', supplier_id:1, supplier:'大猿人',  face_value:100,  cost_price:98.00, agent_price:98.50, retail_price:99.00, status:1, is_direct:0, created_at:now() },
    { id:4, name:'王者荣耀点券 648',   category_id:3, category:'游戏充值', supplier_id:3, supplier:'客客帮',  face_value:648,  cost_price:590.00,agent_price:600.00,retail_price:620.00,status:1, is_direct:0, created_at:now() },
    { id:5, name:'爱奇艺视频月卡',     category_id:5, category:'视频会员', supplier_id:4, supplier:'直冲平台',face_value:25,   cost_price:18.00, agent_price:20.00, retail_price:22.00, status:0, is_direct:1, created_at:now() },
    { id:6, name:'腾讯视频月卡',       category_id:5, category:'视频会员', supplier_id:4, supplier:'直冲平台',face_value:20,   cost_price:15.00, agent_price:16.50, retail_price:18.00, status:1, is_direct:1, created_at:now() }
  ).write();
  console.log('[DB] 产品列表示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化直冲产品示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('direct_products').value().length === 0) {
  db.get('direct_products').push(
    { id:1, name:'爱奇艺月度会员', charge_type:'账号直充', face_value:25, direct_price:18.00, on_sale:1, created_at:now() },
    { id:2, name:'腾讯视频月卡',   charge_type:'账号直充', face_value:20, direct_price:15.00, on_sale:1, created_at:now() },
    { id:3, name:'网易云音乐月卡', charge_type:'账号直充', face_value:12, direct_price:8.50,  on_sale:0, created_at:now() }
  ).write();
  console.log('[DB] 直冲产品示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化充值申请示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('recharge_applies').value().length === 0) {
  db.get('recharge_applies').push(
    { id:1, sn:'RA20260315001', agent_id:1, agent_name:'深圳充值王', amount:5000.00,  pay_type:'银行转账', voucher:'', remark:'',      status:'pending',  created_at:'2026-03-15 08:30:00', reviewed_at:'', review_note:'' },
    { id:2, sn:'RA20260315002', agent_id:2, agent_name:'北京极速充', amount:3000.00,  pay_type:'支付宝',  voucher:'', remark:'急用',   status:'pending',  created_at:'2026-03-15 09:00:00', reviewed_at:'', review_note:'' },
    { id:3, sn:'RA20260314001', agent_id:3, agent_name:'上海优惠充', amount:10000.00, pay_type:'微信支付', voucher:'', remark:'',      status:'approved', created_at:'2026-03-14 16:20:00', reviewed_at:'2026-03-14 17:00:00', review_note:'' },
    { id:4, sn:'RA20260313001', agent_id:4, agent_name:'广州代理商', amount:2000.00,  pay_type:'银行转账', voucher:'', remark:'',      status:'rejected', created_at:'2026-03-13 11:00:00', reviewed_at:'2026-03-13 14:00:00', review_note:'凭证不清晰' }
  ).write();
  console.log('[DB] 充值申请示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化提现申请示例数据
   ═══════════════════════════════════════════════════════ */
if (db.get('withdraw_applies').value().length === 0) {
  db.get('withdraw_applies').push(
    { id:1, sn:'WD20260314001', agent_id:4, agent_name:'广州代理商', amount:2000.00, pay_type:'支付宝',  account:'13812340004', account_name:'陈先生', remark:'',    status:'pending',  created_at:'2026-03-14 18:00:00', handled_at:'', handle_note:'' },
    { id:2, sn:'WD20260313001', agent_id:1, agent_name:'深圳充值王', amount:5000.00, pay_type:'银行卡',  account:'6222021234567890',   account_name:'张三', remark:'', status:'approved', created_at:'2026-03-13 10:00:00', handled_at:'2026-03-13 15:00:00', handle_note:'' },
    { id:3, sn:'WD20260312001', agent_id:2, agent_name:'北京极速充', amount:1500.00, pay_type:'微信',    account:'wx_lij_001',  account_name:'李四', remark:'',       status:'rejected', created_at:'2026-03-12 09:00:00', handled_at:'2026-03-12 11:00:00', handle_note:'余额不足' }
  ).write();
  console.log('[DB] 提现申请示例数据已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化收款方式（平台收款账号）
   ═══════════════════════════════════════════════════════ */
if (db.get('payment_methods').value().length === 0) {
  db.get('payment_methods').push(
    { id:1, type:'alipay',    name:'支付宝',   account:'cyd_finance@alipay.com', account_name:'充易达财务', qrcode:'', status:1, sort:1, remark:'',     created_at:now() },
    { id:2, type:'wechat',   name:'微信收款', account:'cyd_wechat_pay',         account_name:'充易达', qrcode:'', status:1, sort:2, remark:'',     created_at:now() },
    { id:3, type:'bank',     name:'银行卡',   account:'6222021234567890',        account_name:'充易达科技有限公司', qrcode:'', status:1, sort:3, remark:'中国银行',  created_at:now() }
  ).write();
  console.log('[DB] 收款方式已初始化');
}

/* ═══════════════════════════════════════════════════════
   初始化当日营业额示例（按小时）
   ═══════════════════════════════════════════════════════ */
if (db.get('daily_revenue').value().length === 0) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0,10);
  const hours = [];
  for (let h = 0; h < 24; h++) {
    // 模拟营业额（白天高，夜间低）
    const base = h >= 8 && h <= 22 ? (Math.random() * 8000 + 2000) : (Math.random() * 500);
    hours.push({ date: dateStr, hour: h, revenue: Math.round(base * 100) / 100, orders: Math.floor(base / 100) });
  }
  db.set('daily_revenue', hours).write();
  console.log('[DB] 当日营业额示例数据已初始化');
}

console.log('[DB] 数据库就绪，文件：' + DB_PATH);

/* ═══════════════════════════════════════════════════════
   导出
   ═══════════════════════════════════════════════════════ */
module.exports = { db, hashPassword, verifyPassword, nextId, now };
