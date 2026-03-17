var raw = 'http://38.246.248.159/yrapi.php';
var u = new URL(raw);
var base = u.protocol + '//' + u.host;
console.log('原始域名:', raw);
console.log('修正后 base:', base);
console.log('最终 URL:', base + '/yrapi.php/index/user');
