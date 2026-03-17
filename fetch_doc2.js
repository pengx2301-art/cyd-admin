const http = require('http');
const fs = require('fs');

http.get('http://dyr.xyquanyi.cn/uploads/api.html', (r) => {
  const chunks = [];
  r.on('data', c => chunks.push(c));
  r.on('end', () => {
    const buf = Buffer.concat(chunks);
    // 保存原始buffer
    fs.writeFileSync('C:/Users/60496/WorkBuddy/20260315203305/api_raw.html', buf);
    
    // 使用iconv-lite解码gb2312/gbk
    const iconv = require('iconv-lite');
    const html = iconv.decode(buf, 'gb2312');
    
    // 保存正确编码的文件
    fs.writeFileSync('C:/Users/60496/WorkBuddy/20260315203305/api_utf8.html', html, 'utf8');
    
    // 提取纯文本
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    fs.writeFileSync('C:/Users/60496/WorkBuddy/20260315203305/api_text.txt', text, 'utf8');
    console.log('文档长度:', text.length);
    console.log('=== 第1-5000字 ===');
    console.log(text.substring(0, 5000));
    console.log('\n=== 5000-10000字 ===');
    console.log(text.substring(5000, 10000));
    console.log('\n=== 10000-15000字 ===');
    console.log(text.substring(10000, 15000));
    console.log('\n=== 15000-20000字 ===');
    console.log(text.substring(15000, 20000));
  });
}).on('error', e => console.error('ERROR:', e.message));
