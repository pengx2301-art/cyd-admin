const fs = require('fs');

// 读取文件（GBK编码的HTML）
const buf = fs.readFileSync('C:/Users/60496/WorkBuddy/20260315203305/api_doc.html');

// 用iconv-lite转换（如果没有则用Buffer直接转）
let html;
try {
  const iconv = require('iconv-lite');
  html = iconv.decode(buf, 'gbk');
} catch(e) {
  // 没有iconv-lite，尝试latin1然后检查
  html = buf.toString('latin1');
}

// 提取纯文本
const text = html
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&gt;/g, '>')
  .replace(/&lt;/g, '<')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

console.log('===文档内容（前8000字）===');
console.log(text.substring(0, 8000));
console.log('\n===中间部分===');
console.log(text.substring(8000, 16000));
console.log('\n===后续部分===');
console.log(text.substring(16000, 24000));
