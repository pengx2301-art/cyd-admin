const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const crypto = require('crypto');
const path = require('path');

// 数据库路径
const DB_PATH = path.join(__dirname, 'data/cyd.json');
const adapter = new FileSync(DB_PATH);
const db = low(adapter);

// 密码哈希函数
function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}

// 当前时间函数
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// 检查test用户是否存在
const existingUser = db.get('members').find({ username: 'test' }).value();

if (existingUser) {
  console.log('测试用户已存在：', existingUser);
  console.log('用户ID：', existingUser.id);
  console.log('用户名：', existingUser.username);
  console.log('余额：', existingUser.balance);
} else {
  // 生成密码哈希
  const { hash, salt } = hashPassword('123456');
  
  // 生成新ID
  const members = db.get('members').value();
  const newId = members.length > 0 ? Math.max(...members.map(m => m.id || 0)) + 1 : 1;
  
  // 创建测试用户
  const testUser = {
    id: newId,
    username: 'test',
    email: 'test@example.com',
    password: hash,
    salt: salt,
    realname: '测试用户',
    avatar: '',
    phone: '',
    user_type: '普通用户',
    level_id: null,
    agent_no: '',
    commission_rate: 0,
    parent_id: null,
    referrer: '',
    is_anonymous: 0,
    status: 1,
    balance: 10000,
    created_at: now(),
    updated_at: now()
  };
  
  // 添加到数据库
  db.get('members').push(testUser).write();
  
  console.log('测试用户创建成功！');
  console.log('用户ID：', testUser.id);
  console.log('用户名：', testUser.username);
  console.log('密码：123456');
  console.log('余额：', testUser.balance);
}
