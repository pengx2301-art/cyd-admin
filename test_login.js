const http = require('http');
const body = JSON.stringify({ username: 'admin', password: '123456' });
const req = http.request({
  hostname: 'localhost', port: 8899,
  path: '/api/auth/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('HTTP', res.statusCode, d));
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
