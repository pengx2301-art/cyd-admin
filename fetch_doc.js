const http = require('http');
const fs = require('fs');

http.get('http://dyr.xyquanyi.cn/uploads/api.html', (r) => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    fs.writeFileSync('C:/Users/60496/WorkBuddy/20260315203305/api_doc.html', d);
    // 提取纯文本
    const text = d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log(text.substring(0, 5000));
    console.log('---TOTAL LENGTH---', d.length);
  });
}).on('error', e => console.error('ERROR:', e.message));
